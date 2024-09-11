import { join } from 'https://deno.land/std/path/mod.ts';
import { readAllSync } from "jsr:@std/io/read-all";
import { existsSync } from "https://deno.land/std/fs/mod.ts";
import { mime } from "https://deno.land/x/mimetypes/mod.ts";

import router from "./router.js";
import createRouting from "./server/routing.js";
import render from "./server/render.js";


const createHTTPHandler = config => {

    const sockets = [];

    let hotReloadOn = false;

    (config.fsWatchers ?? []).forEach(fsWatcher => {

        if(fsWatcher.hotReload) hotReloadOn = true;

        (async () => {
    
            let timeOut = null;

            const watcher = Deno.watchFs(fsWatcher.path ?? "./");
        
            console.log("Observando cambios en el sistema de archivos en " + fsWatcher.path);
        
            for await (const event of watcher) {
                // console.log("Tipo de evento:", event.kind);
                // console.log("Archivos afectados:", event.paths);
        
                if (event.kind === "modify") {
                        
                    if(timeOut) clearTimeout(timeOut);

                    timeOut = setTimeout(() => {

                        console.log("Un archivo ha sido modificado", event.paths);

                        if(fsWatcher.hotReload) {
                            sockets.forEach(socket => {
                                socket.send("Update!");
                            });
                        }
    
                        if(fsWatcher.onModify) fsWatcher.onModify(event);
    
                    }, 200);
                   
                } else if (event.kind === "create") {
                    console.log("Un archivo ha sido creado");
                } else if (event.kind === "remove") {
                    console.log("Un archivo ha sido eliminado");
                }
        
            }
        })()
    });


    const defaultServer = async (request) => {

        if (hotReloadOn && request.headers.get("upgrade") == "websocket") {

            const { socket, response } = Deno.upgradeWebSocket(request);

            
            socket.addEventListener("open", (event) => {
                console.log("a client connected!");
                sockets.push(event.target);
            });
            
            socket.addEventListener("close", (event) => {
                console.log("client disconnected!");
                sockets.splice(sockets.indexOf(event.target), 1);
            });

            socket.addEventListener("message", (event) => {
                console.log(event.data);
                if (event.data === "ping") {
                    socket.send("pong");
                }
            });

            return response;

        }

        const url = new URL(request.url);
        
        const pathname = decodeURIComponent(url.pathname);
    
        let file = null;
        let body = null;
    
        // let lastModified = new Date().toUTCString();
   
        request.cookies = parseCookies(request.headers);
    
        for(const dir of [...(config?.assetsDirs ?? ["./public", "./"])]) {
            try {
                
                const fileName = join(dir.replaceAll("%20", " ")/*.replace(/^\//g, "")*/, pathname);
                
                if(existsSync(fileName, {isReadable: true, isFile: true})) {

                    file = await Deno.openSync(fileName, { read: true });

                    if (fileName.endsWith(".js") && url.searchParams.get('hash')) {
                        
                        const decoder = new TextDecoder();
                        const content = readAllSync(file);
                        const textContent = decoder.decode(content);
                        const hash = url.searchParams.get('hash') || '';
        
                        const modifiedContent = hash == "" ? textContent : textContent.replace(/import\s+[^;]+;\s*/g, (match) => {
                            
                            const importPath = match.match(/from\s+['"](.*?)['"]/);

                            if (importPath) {
                                return match.replace(importPath[1], `${importPath[1]}?hash=${hash}`);
                            }

                            return match;
                        });
        
                        body = new TextEncoder().encode(modifiedContent);

                    }else{

                        body = file?.readable;    
                        
                    }
                    
                    break;
                }
    
                // const fileInfo = await Deno.stat("./src" + pathname);
                // lastModified = fileInfo.mtime.toUTCString();
    
            } catch(Err) {
                
                file = null;

            }
        }
    
    
        if(!file) {
        
            try {

                let routes = [];

                if(config?.router?.disabled !== true) {
                    
                    routes = createRouting(config?.router?.path);

                    config.controller = router({routes, routingDir: config?.router?.path});

                }else if(!config.controller) {

                    config.controller = () => ({html: "Error: no controller defined"});

                }

                const app = await render({
                    model: {...(config?.model ?? {}), request},
                    controller: config?.controller,
                    request: request,
                    apiURL: config?.apiURL ?? "",
                    renderCallback: config?.renderCallback ?? null,
                });

    
                delete(app?.state?.model?.request);

                if(app.state?.model?.redirect) {
                
                    return new Response("", {
                        status: 302,
                        headers: {"location": app.state.model.redirect}
                    });
    
                }

                // console.log(new Error().stack);               

                body = (app?.state?.html ?? "") + /*html*/`
                    <div id="scripts">
                        <style id="js-only-style">.js-only {visibility: hidden;} .nojs-only {visibility: visible !important;}</style>
                        <script src="${config?.clientScriptURL || "https://dev.atlas.ar/journey/client/index.js"}" type="module"></script>
                        <script>
                            window.journey = {
                                router: {
                                    disabled: ${config?.router?.disabled ?? false},
                                    routes: ${JSON.stringify(routes)},
                                    path: ${config?.router?.path ? `"${config?.router?.path}"` : "null"},
                                },
                                model: ${JSON.stringify(app.state.model)},
                                hotReload: ${hotReloadOn},
                                apiURL: "${config?.apiURL ?? ""}",
                                ${config?.router?.disabled===true && config?.controller ? `controller: ${config?.controller?.toString()},` : ""}
                                ${config?.renderCallback ? `renderCallback: ${config.renderCallback.toString()},` : ""}
                            };
                        </script>
                    </div>
                `;
                // .replace(/<!--[\s\S]*?-->/g, '')
                // .replace(/>\s+/g, '>')
                // .replace(/\s+</g, '<')
                // .replace(/\n/g, '')
                // + "</html>";

            } catch (error) {
                
                if(error.message != "Not found") console.log(error);
                return new Response("", {status: 404});
    
            }  
            
        }
    
    
        const response = new Response(
            body ?? "", 
            {
                status: 200,
                headers: {
                    "content-type": mime.getType(pathname.split(".")[1] ?? "html") + "; charset=utf-8",
                    // "Last-Modified": lastModified
                }
            }
        );

        if(file && config?.cacheControl?.(url)) {
            
            response.headers.set("Cache-Control", config.cacheControl?.(url));
        
        }
    
        return response;
    
    }

    return async clientRequest => {
        
        if(config?.HTTPHandler) {

            return config.HTTPHandler(clientRequest, defaultServer);
            
        }else{

            return defaultServer(clientRequest);

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


export default config => {
    
    return Deno.serve(config?.serverConfig ?? {}, createHTTPHandler(config));

}
