import { exists } from "https://deno.land/std/fs/mod.ts";
import { mime } from "https://deno.land/x/mimetypes/mod.ts";
import { createRouting } from "./routing.js";
import render from "./render.js";
import router from "../router.js";


export function createHTTPHandler(config) {
    
    const routes = createRouting(config?.routingDir ?? "");

    const defaultServer = async (request) => {

        const url = new URL(request.url);
        
        const pathname = decodeURIComponent(url.pathname);
    
        let file = null;
        let body = null;
    
        // let lastModified = new Date().toUTCString();
    
    
        request.cookies = parseCookies(request.headers);
    
        for(const dir of [...(config?.assetsDirs ?? []), config?.routingDir ?? ""]) {
            try {
                
                const fileName = dir.replaceAll("%20", " ")/*.replace(/^\//g, "")*/ + pathname;
                
                if(await exists(fileName, {isReadable: true, isFile: true})) {

                    file = await Deno.open(fileName, { read: true });

                    body = file?.readable;

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

                const app = await render({
                    model: config?.model ?? {},
                    controller: router,
                    request: request,
                    apiURL: config?.apiURL ?? "",
                    renderCallback: config?.renderCallback ?? null,
                    routes: routes,
                    baseDir: "file:///" + Deno.cwd() + "/" + (config?.routingDir ?? "")
                });
    

                if(app.state?.redirect) {
                
                    return new Response("", {
                        status: 302,
                        headers: {"location": app.state.redirect}
                    });
    
                }


                body = `<!DOCTYPE html>` +
                    (app?.state?.html ?? "").replace(/<\/html>/, "") + /*html*/`
                    <div id="scripts">
                        <style id="js-only-style">#loading {display: none} .js-only {visibility: hidden}</style>
                        <script>
                            window.journey = {
                                routes: ${JSON.stringify(routes)},
                                model: ${JSON.stringify(app.state.model)},
                                apiURL: "${config?.apiURL ?? ""}"
                            };
                            ${config?.renderCallback ? `window.journey.renderCallback = ${config.renderCallback.toString()};` : ""}
                        </script>
                    </div>
                `
                .replace(/<!--[\s\S]*?-->/g, '')
                // .replace(/>\s+/g, '>')
                // .replace(/\s+</g, '<')
                // .replace(/\n/g, '')
                + "</html>";

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



function parseCookies(headers) {
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