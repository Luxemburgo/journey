import { join, relative } from "@std/path";
import { readAllSync } from "@std/io";
import { existsSync } from "@std/fs";
import { contentType } from "@std/media-types";
import { transpileDirectory, transpileFile } from "./transpile.ts";
import bundleControlles from "./bundleControllers.js";
import type { JourneyConfig } from "./types/JourneyConfig.ts";
import type { Controller } from "./types/Controller.ts";
import createRoutes from "./createRoutes.js";
import createRouterController from '../common/createRouterController.js';
import render from "./render.js";

export async function runServer(config: JourneyConfig = {}): Promise<void> {

    await showLoadingWhileTask(transpileDirectory("src"), "Building...");

    if(config.production === true) {
        
        await showLoadingWhileTask(
            bundleControlles({routingDir: "lib/pages", imports: [], outputFile: "public/main.js"}), 
            "Bundling..."
        );

    }else{
        
        setupFsWatch();

    }

    const buildTailwind = await buildTailwindFactory();

    const tailwindHash = await fnv1aFromFile("public/tailwind.css");

    const bundleHash = await fnv1aFromFile("public/main.js");
    
    // const controllers = (await import("file:///" + Deno.cwd() + "/public/main.js")).controllers;
    

    const sockets: WebSocket[] = [];

    const hotReload: boolean = !(config.production ?? false);

    const {routes, controller} = setupRouting();


    function setupFsWatch(): void {
        
        (async () => {

            let timeOut = null;
    
            const watcher = Deno.watchFs("./src");
        
            for await (const event of watcher) {
        
                if(timeOut) clearTimeout(timeOut);
    
                timeOut = setTimeout(async () => {
                    
                    // console.log(event);
    
                    if (event.kind === "modify" || event.kind === "access") {
    
                        const path = relative(Deno.cwd(), event.paths[0]);

                        if( path.match(/^src\/.*(\.js|\.ts|\.tsx|\.jsx)$/)) {
    
                            await showLoadingWhileTask(
                                transpileFile(event.paths[0], "src", "lib"),
                                `Transpiling ${path}...`
                            );

    
                        };
    
                        await buildTailwind();
    
   
                        if(hotReload) {
                            sockets.forEach(socket => socket.send("Update!"));
                        }
                    
                    // } else if (event.kind === "create") {                   
                    // } else if (event.kind === "remove") {
                    }
            
                }, 200);
    
            }
    
        })()

    }

    async function buildTailwindFactory(): Promise<() => Promise<void>> {

        try {

            const configImportPath = "file:///" + Deno.cwd() + "/tailwind.config.js";
        
            const tailwindConfig = (await import(configImportPath)).default;
    
            let inputCSS = `
            @tailwind base;
            @tailwind components;
            @tailwind utilities;
            `;
    
            try {
                
                inputCSS = Deno.readTextFileSync("src/input.css");
    
            }catch {}

            const importPath = "./tailwind.js";

            const buildTailwindAndSave = tailwindConfig ? (await import(importPath)).buildTailwindAndSave : null;

            const buildFn = async () => {
                if(buildTailwindAndSave) 
                    await showLoadingWhileTask(
                        buildTailwindAndSave(tailwindConfig, inputCSS, "public/tailwind.css"),
                        `Compiling tailwind...`
                    );                    
            }

            buildFn();

            return buildFn;

        }catch {}

        return async () => {};
    }

    function setupRouting(): {controller?: Controller, routes?: object} {

     const result: {
            controller?: Controller;
            routes?: object;
        } = {
            routes: config?.router?.disabled !== true ? createRoutes(config?.router?.path) : {}
        };

        if (config?.router?.disabled !== true) {
            
            result.controller = createRouterController({
                routes: result.routes,
                routingDir: config?.router?.path,
                // controllers
            });

        } else if(!("controller" in config)) {
            
            result.controller = async () => ({ html: "Error: no controller defined" });

        }

        return result;
    }

    function handleWebSocket (request: Request): Response {
        
        const { socket, response } = Deno.upgradeWebSocket(request);
    
        socket.addEventListener("open", (event) => {
            // console.log("a client connected!");
            sockets.push(event.target as WebSocket);
        });
    
        socket.addEventListener("close", (event) => {
            // console.log("client disconnected!");
            sockets.splice(sockets.indexOf(event.target as WebSocket), 1);
        });
    
        socket.addEventListener("message", (event) => {
            // console.log(event.data);
            if (event.data === "ping") {
                socket.send("pong");
            }
        });
    
        return response;
    };
    
    function findFile (pathname: string): Deno.FsFile | null {
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

    async function getAppState (model: object): Promise<{model?: {[key: string]: any;}, html?: {[key: string]: any;} | string} | Response> {
    
        const state = await render({
            model: model,
            controller: controller
        });

        delete state?.model?.request;
    
        return state;

    };


    

    async function defaultHandler (request: Request): Promise<Response> {
        
        if (hotReload && request.headers.get("upgrade") === "websocket") {
            return handleWebSocket(request);
        }
    
        
        const extendedRequest = {
            method: request.method,
            url: new URL(request.url),
            headers: request.headers,
            cookies: parseCookies(request.headers)
        };

        const pathname = decodeURIComponent(extendedRequest.url.pathname);
        
        const file: Deno.FsFile | null = findFile(pathname);

        let body: ReadableStream | string = "";
    
        if (file) {

            if (pathname.endsWith(".js") && extendedRequest.url.searchParams.get('hash')) {
                body = addHashToImports(file, extendedRequest.url.searchParams.get('hash') || '');
            } else {
                body = file.readable;
            }

        } else {

            try {
                
                const hash: string | undefined = config.production ? undefined : Math.round(Math.random()*100000000).toString(16);

                const state = await getAppState({
                    ...(config?.model ?? {}),
                    request: extendedRequest,
                    hash: hash
                });

                if (state instanceof Response) return state;

                if ("redirect" in (state.model ?? {})) {
                    return new Response("", {
                        status: 302,
                        headers: { location: state.model?.redirect as string }
                    });
                }
            
                body = 
                    /*html*/`<link id="tailwind" rel="stylesheet" href="/tailwind.css?hash=${hash || tailwindHash}">` +
                    ((typeof state?.html == "object" ? state?.html?.outerHTML : null) ?? state?.html ?? "") + /*html*/`                    
                    <div id="scripts">
                        <style id="js-only-style">.js-only {visibility: hidden;} .nojs-only {visibility: visible !important;}</style>
                        <script src="${config?.clientScriptURL || "https://cdn.jsdelivr.net/gh/Luxemburgo/journey@main/src/client/index.js"}" type="module"></script>
                        <script>
                            window.journey = {
                                router: {
                                    disabled: ${config?.router?.disabled ?? false},
                                    routes: ${JSON.stringify(routes)},
                                    path: ${config?.router?.path ? `"${config?.router?.path}"` : "null"},
                                },
                                model: ${JSON.stringify(state.model)},
                                tailwindHash: "${tailwindHash}",
                                hotReload: ${hotReload},
                                ${config?.router?.disabled === true && controller ? `controller: ${controller.toString()},` : ""}
                            };
                        </script>
                        ${config?.production === true ? `<script src="/main.js?h=${bundleHash}" type="module"></script>` : ""}
                    </div>
                `;
                //${config?.renderCallback ? `renderCallback: ${config.renderCallback.toString()},` : ""}

            } catch (error) {
                
                if (error instanceof Error && error?.message !== "Not found") console.log(error);
                
                return new Response("", { status: 404 });

            }

        }


        const response = new Response(body, {
            status: 200,
            headers: {
                "Content-Type": `${contentType("." + (pathname?.split(".")?.[1] ?? "html"))}; charset=UTF-8`
            },
        });
    
        if (file) {

            response.headers.set("Cache-Control",
                (typeof config?.cacheControl == "function" ? 
                    config.cacheControl(extendedRequest.url) 
                :
                    config?.cacheControl
                )
                || 
                (false && extendedRequest.url.href.match(/\.js$|\?$/g) && config.production !== true ? 
                    "must-revalidate, no-store, no-cache, private" 
                :
                    "public, max-age=360000"
                )
            );

        }
    
        return response;

    };

    Deno.serve(
        config?.serverConfig ?? {},
        (request: Request) => config?.HTTPHandler?.(request, defaultHandler) ?? defaultHandler(request)
    );


}



function addHashToImports (file: Deno.FsFile, hash: string): string {
    
    const content = readAllSync(file);

    const textContent = new TextDecoder().decode(content);

    // return new TextEncoder().encode(
        return textContent.replace(/import\s+[^;]+;\s*/g, (match) => {
            const importPath = match.match(/from\s+['"](.*?)['"]/);
            if (importPath) {
                return match.replace(importPath[1], `${importPath[1]}?hash=${hash}`);
            }
            return match;
        })
    // );
};

const parseCookies = (headers: Headers): {[key: string]: string} => {
    
    const cookies: {[key: string]: string} = {};

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

async function fnv1aFromFile(filePath: string): Promise<string> {

    const FNV_OFFSET_BASIS = 2166136261;
    const FNV_PRIME = 16777619;

    try {
        
        const file = await Deno.open(filePath, { read: true });

        let hash = FNV_OFFSET_BASIS;

        try {
            const buffer = new Uint8Array(64 * 1024);
            let bytesRead: number | null;

            while ((bytesRead = await file.read(buffer)) !== null && bytesRead > 0) {
                for (let i = 0; i < bytesRead; i++) {
                    hash ^= buffer[i];
                    hash = (hash * FNV_PRIME) >>> 0;
                }
            }
        } catch (error) {
            throw error;
        }

        return hash.toString(16);

    } catch {}

    return "";

}


async function showLoadingWhileTask(task: Promise<any>, message: string = "",interval: number = 100) {
    
    const chars = ["⠙", "⠘", "⠰", "⠴", "⠤", "⠦", "⠆", "⠃", "⠋", "⠉"];
    
    let loading = true;

    // Función de animación de carga
    const loadingAnimation = async () => {
        while (loading) {
            for (const char of chars) {
                if (!loading) break;
                await new Promise((resolve) => setTimeout(resolve, interval)); // Espera el intervalo
                Deno.stdout.write(new TextEncoder().encode("\r\x1b[K"));
                Deno.stdout.write(new TextEncoder().encode(`\r   ${char} ${message}\r`)); // Muestra el carácter
            }
        }
        Deno.stdout.write(new TextEncoder().encode("\r\x1b[K")); // Limpia la línea al finalizar
    };

    // Inicia la animación en paralelo
    const animationPromise = loadingAnimation();

    // Ejecuta la tarea principal
    await task;

    // Detiene la animación
    loading = false;

    // Espera a que la animación finalice
    await animationPromise;
}




    // (config?.fsWatchers ?? []).forEach(fsWatcher => {

        //     if(fsWatcher.hotReload) hotReload = true;

        //     // console.log("Watching " + (fsWatcher.path || "./") + "...");

        //     (async () => {
        
        //         let timeOut = null;

        //         const watcher = Deno.watchFs(fsWatcher.path || "./");
            
        //         for await (const event of watcher) {
            
        //             if(timeOut) clearTimeout(timeOut);

        //             timeOut = setTimeout(() => {
                        
        //                 // console.log(event);

        //                 if (event.kind === "modify" || event.kind === "access") {

        //                     if(fsWatcher.hotReload) {
        //                         sockets.forEach(socket => {
        //                             socket.send("Update!");
        //                         });
        //                     }
        
        //                     if(typeof fsWatcher.onModify == "function") fsWatcher.onModify(event);
                        
        //                 } else if (event.kind === "create") {

        //                     if(typeof fsWatcher.onCreate == "function") fsWatcher.onCreate(event);

        //                 } else if (event.kind === "remove") {

        //                     if(typeof fsWatcher.onRemove == "function") fsWatcher.onRemove(event);

        //                 }
                
        //             }, 200);

        //         }

        //     })()

    // });