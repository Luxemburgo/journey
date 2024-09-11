import { navigate, navigateBack } from "./commands.js";

export default (config) => {
    
    const routes = config?.routes ?? {};
    const controllers = config?.controllers ?? {};
    const baseDir = typeof Deno != "undefined" ? 
        ("file:///" + Deno.cwd() + "/" + (config?.routingDir ?? "src/pages")) 
    :
        (location.protocol + "//" + location.host + "/" + (config?.routingDir ?? "src/pages"))
    ;

    var hash = null;

    return async (model, message) => {

        if(hash != (model?.hash ?? null)) {
            hash = model.hash;
            Object.keys(controllers).forEach(key => {
                if(key!="/root.js" || controllers[key]!==null) delete controllers[key];
            });
        }


        if(!message && !model?.url) {

            return {
                model: model ?? {},
                commands: [navigate({model: model})]
            }

        }

        if(message?.name == "navigateBack") {
            
            return {
                model,
                commands: [navigateBack()]
            }

        }


        if(message?.name == "navigation") {

            model.url = message.data;
            
            model.controller = null;

            // if(model.url.hash) document.querySelector(model.url.hash)?.scrollIntoView();

            const routesKeys = Object.keys(routes).sort().reverse();

            for(const key in routesKeys) {

                const route = routesKeys[key];

                const result = message.data.pathname.match(new RegExp(routes[route].regexp));
            
                if(result) {
                    
                    result.shift();
                    
                    message.data.args = Object.fromEntries(routes[route].args.map((i, idx) => [i, result[idx]]));

                    model.controller = routes[route].route;
                    
                    break;

                }        
            }

            if(typeof window != "undefined" && "document" in window) {
                setTimeout(() => {document.querySelector("[autofocus]")?.focus();}, 0);
            }


            if(!model.controller) throw new Error("Not found");

        }

        if(model?.controller && !controllers[model.controller]) {

            if(typeof document != "undefined") {
                document.body.classList.add("animate-pulse");
                document.body.inert = true;
            }

            controllers[model.controller] = (await import(baseDir + model.controller + (hash ? "?hash=" + hash : ""))).default;

            if(typeof document != "undefined") document.body.inert = false;

        }
    
        const controller = controllers[model?.controller ?? 0] ?? ((model, message)=>({model, html: ""}));

        if("root" in routes && !(routes.root.route in controllers)) {
            try {
                
                const rootController = await import(baseDir + routes.root.route + (hash ? "?hash=" + hash : ""));
                controllers[routes.root.route] = rootController.default;
                
            } catch (error) {
                
                controllers[routes.root.route] = null;

            }
        }


        if(controllers["/root.js"]) {

            return controllers["/root.js"](model, message, controller);
        
        }

        return controller(model, message);

    };


}

