import { join } from "jsr:@std/path@1.0.4/join";
import { readAllSync } from "jsr:@std/io@0.224.7/read-all";
import { existsSync } from "jsr:@std/fs@1.0.3/exists";
import { contentType } from "jsr:@std/media-types@1.0.3";

import createRoutes from "./createRoutes.js";
import createRouterController from './createRouterController.js';
import render from "./render.js";


const createHTTPHandler = config => {

    const sockets = [];

    let hotReload = false;
    const routes = config?.router?.disabled !== true ? createRoutes(config?.router?.path) : [];

    (config?.fsWatchers ?? []).forEach(fsWatcher => {

        if(fsWatcher.hotReload) hotReload = true;

        (async () => {
    
            let timeOut = null;

            const watcher = Deno.watchFs(fsWatcher.path || "./");
        
            for await (const event of watcher) {
        
                if(timeOut) clearTimeout(timeOut);

                timeOut = setTimeout(() => {

                    if (event.kind === "modify") {

                        if(fsWatcher.hotReload) {
                            sockets.forEach(socket => {
                                socket.send("Update!");
                            });
                        }
    
                        if(typeof fsWatcher.onModify == "function") fsWatcher.onModify(event);
                    
                    } else if (event.kind === "create") {

                        if(typeof fsWatcher.onCreate == "function") fsWatcher.onCreate(event);

                    } else if (event.kind === "remove") {

                        if(typeof fsWatcher.onRemove == "function") fsWatcher.onRemove(event);

                    }
            
                }, 200);

            }

        })()

    });


    const handleWebSocket = (request) => {
        const { socket, response } = Deno.upgradeWebSocket(request);
    
        socket.addEventListener("open", (event) => {
            // console.log("a client connected!");
            sockets.push(event.target);
        });
    
        socket.addEventListener("close", (event) => {
            // console.log("client disconnected!");
            sockets.splice(sockets.indexOf(event.target), 1);
        });
    
        socket.addEventListener("message", (event) => {
            // console.log(event.data);
            if (event.data === "ping") {
                socket.send("pong");
            }
        });
    
        return response;
    };
    
    const findFile = async (pathname) => {
        for (const dir of [...(config?.assetsDirs ?? ["./public", "./"])]) {
            try {
                const fileName = join(dir.replaceAll("%20", " "), pathname);
    
                if (existsSync(fileName, { isReadable: true, isFile: true })) {
                    return Deno.openSync(fileName, { read: true });
                }
            } catch {
                // Continue searching in the next directory
            }
        }
        return null;
    };
    
    const addHashToImports = async (file, hash) => {
        const decoder = new TextDecoder();
        const content = readAllSync(file);
        const textContent = decoder.decode(content);
    
        return new TextEncoder().encode(
            textContent.replace(/import\s+[^;]+;\s*/g, (match) => {
                const importPath = match.match(/from\s+['"](.*?)['"]/);
                if (importPath) {
                    return match.replace(importPath[1], `${importPath[1]}?hash=${hash}`);
                }
                return match;
            })
        );
    };
    
    const getAppState = async (request) => {
        
        if (config?.router?.disabled !== true) {
            config.controller = createRouterController({ routes, routingDir: config?.router?.path });
        } else if (config && !("controller" in config)) {
            config.controller = () => ({ html: "Error: no controller defined" });
        }
    
        const state = await render({
            model: { ...(config?.model ?? {}), request },
            controller: config?.controller,
            // request: request,
            // apiURL: config?.apiURL ?? "",
            // renderCallback: config?.renderCallback ?? null,
        });
    
        delete state?.model?.request;
    
        return state;

    };
    
    const defaultServer = async (request) => {
        
        if (hotReload && request.headers.get("upgrade") === "websocket") {
            return handleWebSocket(request);
        }
    
        request.cookies = parseCookies(request.headers);
        request.URL = new URL(request.url);
        const pathname = decodeURIComponent(request.URL.pathname);
        let file = await findFile(pathname);
        let body = null;
    
        if (file) {
            if (pathname.endsWith(".js") && request.URL.searchParams.get('hash')) {
                body = await addHashToImports(file, request.URL.searchParams.get('hash') || '');
            } else {
                body = file?.readable;
            }
        } else {
            try {
                
                const state = await getAppState(request);

                if (state instanceof Response) return state;

                if (state.model?.redirect) {
                    return new Response("", {
                        status: 302,
                        headers: { location: state.model.redirect }
                    });
                }
            
                body = (state?.html ?? "") + /*html*/`
                    <div id="scripts">
                        <style id="js-only-style">.js-only {visibility: hidden;} .nojs-only {visibility: visible !important;}</style>
                        <script src="${config?.clientScriptURL || "https://cdn.statically.io/gh/Luxemburgo/journey/main/js/client.js?v=0.10.0"}" type="module"></script>
                        <script>
                            window.journey = {
                                router: {
                                    disabled: ${config?.router?.disabled ?? false},
                                    routes: ${JSON.stringify(routes)},
                                    path: ${config?.router?.path ? `"${config?.router?.path}"` : "null"},
                                },
                                model: ${JSON.stringify(state.model)},
                                hotReload: ${hotReload},
                                ${config?.router?.disabled === true && config?.controller ? `controller: ${config?.controller?.toString()},` : ""}
                                ${config?.renderCallback ? `renderCallback: ${config.renderCallback.toString()},` : ""}
                            };
                        </script>
                    </div>
                `;

            } catch (error) {
                if (error.message !== "Not found") console.log(error);
                return new Response("", { status: 404 });
            }
        }


        const response = new Response(body ?? "", {
            status: 200,
            headers: {
                "Content-Type": `${contentType("." + (pathname?.split(".")?.[1] ?? "html"))}; charset=UTF-8`
            },
        });
    
        if (file) {

            response.headers.set(
                "Cache-Control",
                (typeof config?.cacheControl == "function" ? config.cacheControl(request.URL) : config?.cacheControl) || "public, max-age=360000"
            );

        }
    
        return response;
    };
    

    return async HTTPRequest => {
        
        if(typeof config?.HTTPHandler == "function") {

            return config.HTTPHandler(HTTPRequest, defaultServer);
            
        }else{

            return defaultServer(HTTPRequest);

        }

    }

}



const parseCookies = headers => {
    const cookies = {};
    const cookieHeader = headers.get("Cookie");

    if (cookieHeader) {
        const cookieList = cookieHeader.split(";");

        for (const cookie of cookieList) {
            const [name, value] = cookie.split("=");
            cookies[name.trim()] = value.trim();
        }
    }

    return cookies;
}


export const runServer = config => {
    
    return Deno.serve(config?.serverConfig ?? {}, createHTTPHandler(config));

}
