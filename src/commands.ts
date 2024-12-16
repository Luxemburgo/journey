import type { Command } from "./types/Command.ts";
import type { Context } from "./types/Context.ts";

interface Navigate extends Command<{messageName?: string, url: string, redirect?: boolean, stateAction?: "replace" | "push"}, {url: URL, stateAction?: "replace" | "push"}> {
}

export const createNavigate = (context: Context): Navigate =>
    ({messageName, url, redirect, stateAction}) => 
        async (callback) => {

            const parsedUrl = new URL(
                url ?? "",
                new URL(context?.request?.url ?? window.location.href)
            );

            if(redirect) {
                
                if(context?.request) {
                    context.redirect = parsedUrl.href;
                }else{
                    window.location.assign(parsedUrl.href);
                }

                return Promise.resolve();
            }
            
            if(url && typeof window != "undefined") {
                
                if(stateAction == "replace") 
                    window.history.replaceState({}, null, parsedUrl.href);
                else {
                    window.history.pushState({}, null, parsedUrl.href);
                }

            }

            return callback({
                name: messageName ?? "Navigation",
                data: {
                    url: parsedUrl,
                    stateAction: stateAction
                }
            });

        }
