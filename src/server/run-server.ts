import { join } from "@std/path";
import { existsSync } from "@std/fs";
import { contentType } from "@std/media-types";
import { createRoutesFile } from "./create-routes-file.js";

import * as esbuild from "npm:esbuild@0.20.2";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.10.3";

import type { JourneyConfig } from "../types/journey-config.ts";
import type { Controller } from "../types/controller.ts";

import { createRoutes } from "./create-routes.js";
import createRouterController from './create-router-controller.js';
import render from "./render.js";

export async function runServer(config: JourneyConfig = {}): Promise<void> {


    const hashes = {tailwind : "", bundle: ""};

    const sockets: WebSocket[] = [];

    const hotReload: boolean = !(config.production ?? false);

    const {routes, controller} = setupRouting();

    const buildTailwind = await buildTailwindFactory();

    await bundleControllers();

    async function bundleControllers() {

        const routesFileName = createRoutesFile("src/pages", []);

        const watchPlugin = {
            name: "watch-plugin",
            setup(build : object) {
                if("onEnd" in build && typeof build.onEnd == "function") build.onEnd(async (result : {errors: []}) => {
                    if (result.errors.length > 0) {
                        
                        console.error("❌ Rebuild failed:", result.errors);

                    } else {

                        console.log(`✅ Rebuild complete: ${new Date().toLocaleTimeString()}`);

                        hashes.bundle = await fnv1aFromFile("public/main.js");

                        buildTailwind();

                        if(hotReload) sockets.forEach(socket => socket.send(JSON.stringify({hashes})));

                    }
                });
            },
        };
        
        const ctx = await esbuild.context({
            plugins: [
                ...denoPlugins({ configPath: `${Deno.cwd()}/deno.json` }),
                watchPlugin, // Agregamos el plugin personalizado
            ],
            entryPoints: [routesFileName],
            outfile: "./public/main.js",
            bundle: true,
            format: "esm",
            logLevel: "error"
        });
        
        if(hotReload) {
            
            await ctx.watch();
        
            console.log("⚡ Initial build complete, watching for changes...");
        
        }else{

            await ctx.rebuild();
        
            console.log("⚡ Build complete");

        }


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


            if(tailwindConfig) {

                // const buildTailwindAndSave = tailwindConfig ? (await import(importPath)).buildTailwindAndSave : null;

                // return async () => {
                //     if(buildTailwindAndSave) 
                //         await showLoadingWhileTask(
                //             buildTailwindAndSave(tailwindConfig, inputCSS, "public/tailwind.css"),
                //             `Compiling tailwind...`
                //         );                    
                // }

                const importPath = "./tailwindPlugin.js";

                const tailwindPlugin = (await import(importPath)).tailwindPlugin;

                const ctx = await esbuild.context({
                    plugins: [
                        tailwindPlugin(tailwindConfig, inputCSS),
                    ],
                    entryPoints: ["tailwind-input"],
                    outfile: "./public/tailwind.css",
                    bundle: false,
                    format: "esm",
                });

                // await ctx.watch();
                
                // console.log("⚡ Tailwind compilado");

                return async () => {
                    // console.log("🔄 Recompilando tailwind...");
                    await ctx.rebuild();
                    hashes.tailwind = await fnv1aFromFile("public/tailwind.css");
                    console.log("✅ Tailwind compiled");
                }

            }

        }catch {}

        return async () => {};
    }

    function setupRouting(): {controller?: Controller<any, any, any>, routes?: object} {

        const result: {
            controller?: Controller<any, any, any>;
            routes?: object;
        } = {
            routes: config?.router?.disabled !== true ? createRoutes(config?.router?.path) : {}
        };

        if (config?.router?.disabled !== true) {
            
            result.controller = createRouterController({
                routes: result.routes,
                routingDir: config?.router?.path,
                // controllers
            }) as Controller<any, any, any>;

        } else if(!("controller" in config)) {
            
            result.controller = async () => ({model: {}, html: "Error: no controller defined" });

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

    async function getAppState (context: object): Promise<{model?: {[key: string]: any;}, html?: {[key: string]: any;} | string} | Response> {
    
        const state = await render({
            model: (config?.model ?? {}),
            controller: controller,
            context: context
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
        
        const content: {file: Deno.FsFile | null; body: string | ReadableStream<Uint8Array>} = {
            file: findFile(pathname),
            body: ""
        }
    
        if (content.file) {

            content.body = content.file.readable;

        } else {

            try {
                
                const hash: string | undefined = config.production ? undefined : Math.round(Math.random()*100000000).toString(16);

                const context = {
                    ...(config?.context ?? {}),
                    request: extendedRequest,
                    hash: hash
                };

                const state = await getAppState(context);

                if (state instanceof Response) return state;

                if ("redirect" in context) {
                    return new Response("", {
                        status: 302,
                        headers: { location: context.redirect as string }
                    });
                }
            
                content.body = 
                    `<link id="tailwind" rel="stylesheet" href="/tailwind.css?hash=${hashes.tailwind}">
                    ${((typeof state?.html == "object" ? state?.html?.outerHTML : null) ?? state?.html ?? "")}
                    <div id="scripts">
                        <style id="js-only-style">.js-only {visibility: hidden;} .nojs-only {visibility: visible !important;}</style>
                        <script src="${config?.clientScriptURL || "https://cdn.jsdelivr.net/gh/Luxemburgo/journey/src/client/index.js"}" type="module"></script>
                        <script>                            
                            window.journey = ${JSON.stringify({
                                router: {
                                    disabled: config?.router?.disabled ?? false,
                                    routes: routes,
                                    path: config?.router?.path ? config.router.path : null,
                                },
                                model: state.model,
                                context: context,
                                hashes: {
                                    tailwind: "${hashes.tailwind}",
                                    bundle: "${hashes.bundle}"
                                },
                                hotReload: hotReload
                            })};
                        </script>
                        <script src="/main.js?hash=${hashes.bundle}" type="module"></script>
                    </div>
                `;

            } catch (error) {
                
                if (error instanceof Error && error?.message !== "Not found") console.log(error);
                
                return new Response("", { status: 404 });

            }

        }


        const response = new Response(content.body, {
            status: 200,
            headers: {
                "Content-Type": `${contentType("." + (pathname?.split(".")?.[1] ?? "html"))}; charset=UTF-8`
            },
        });
    
        if (content.file) {

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


const parseCookies = (headers: Headers): Record<string, string> => {
    
    const cookies: {[key: string]: string} = {};

    const cookieHeader = headers.get("Cookie");

    if (cookieHeader) {
        const cookieList = cookieHeader.split(";");

        for (const cookie of cookieList) {
            const [name, value] = cookie.split("=");
            cookies[(name ?? 0).trim()] = (value ?? "").trim();
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

