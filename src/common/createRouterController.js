import { navigate, navigateBack } from "./commands.js";

export default (config) => {
    
    const routes = config?.routes ?? {};
    const controllers = config?.controllers ?? {};
    const baseDir = typeof Deno != "undefined" ? 
        ("file:///" + Deno.cwd() + "/" + (config?.routingDir ?? "lib/pages")) 
    :
        (location.protocol + "//" + location.host + "/" + (config?.routingDir ?? "lib/pages"))
    ;

    var hash = null;

    return async (model, message, context) => {

        if(hash != (context?.hash ?? null)) {
            hash = context?.hash;
            Object.keys(controllers).forEach(key => {
                if(key!="/root.js" || controllers[key]!==null) delete controllers[key];
            });
        }


        if(!message && !context?.url) {

            return {
                model: model ?? {},
                commands: [navigate({context, model})]
            }

        }

        if(message?.name == "navigateBack") {
            
            return {
                model,
                commands: [navigateBack()]
            }

        }


        if(message?.name == "navigation") {

            context.url = message.data;
            
            context.controller = null;

            // if(model.url.hash) document.querySelector(model.url.hash)?.scrollIntoView();

            const routesKeys = Object.keys(routes).sort().reverse();

            for(const key in routesKeys) {

                const route = routesKeys[key];

                const result = message.data.pathname.match(new RegExp(routes[route].regexp));
            
                if(result) {
                    
                    result.shift();
                    
                    message.data.args = Object.fromEntries(routes[route].args.map((i, idx) => [i, result[idx]]));

                    context.controller = routes[route].route;
                    
                    break;

                }        
            }

            if(typeof window != "undefined" && "document" in window) {
                setTimeout(() => {document.querySelector("[autofocus]")?.focus();}, 0);
            }


            if(!context.controller) throw new Error("Not found");

        }

        if(context?.controller && !controllers[context.controller]) {

            if(typeof document != "undefined") {
                document.body.classList.add("animate-pulse");
                document.body.inert = true;
            }

            const module = (await import(baseDir + context.controller + (hash ? "?hash=" + hash : "")));

            // const capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1);

            // const messageControllerName = "on" + capitalizeFirstLetter(message?.name ?? "unknown");

            controllers[context.controller] = module; //module[messageControllerName] ?? module.default;

            if(typeof document != "undefined") document.body.inert = false;

        }


        const messageControllerName = "on" + capitalizeFirstLetter(message?.name ?? "unknown");

        try {

            // const controller = injector.inject(controllers[context.controller][messageControllerName] ?? controllers[context.controller].default);
            const controller = controllers[context.controller][messageControllerName] ?? controllers[context.controller].default;

            if("root" in routes && !(routes.root.route in controllers)) {
                try {
                    
                    controllers[routes.root.route] = await import(baseDir + routes.root.route + (hash ? "?hash=" + hash : ""));
                    
                } catch (error) {
                    
                    controllers[routes.root.route] = null;

                }
            }


            if(controllers[routes.root?.route ?? 0]) {

                try {
                    
                    // return injector.inject(controllers[routes.root.route].default)(model, message, context, controller);
                    return controllers[routes.root.route].default(model, message, context, controller);

                } catch (error) {
                    
                    console.error(`An error has occurred in root controller: ${error.message}`);
                    throw error;                    

                }
            
            }

            // return controller(model, message, context);

            return controller(model, message, context);

        } catch (error) {

            console.error(`An error has occurred in controller ${context.controller}: ${error.message}`);
            throw error;

        }

    };


}

const capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1);
