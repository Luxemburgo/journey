let controllers = {};

if(typeof document != "undefined" && document.documentElement.controllers) {
    
    controllers = document.documentElement.controllers;

}

export default async (model, message, routes, baseDir = "") => {

    if(!message && !model?.url) {

        return {
            model: {
                ...(model ?? {}),
                url: true
            },
            commands: [{ name: "navigate", message: "navigation" }]
        }

    }

    if(message?.name == "back") {
        
        return {
            // ...controller(model, message),
            model,
            commands: [{ name: "navigateBack" }]
        }

    }

    if(message?.name == "sessionFail") {

        return {
            model,
            commands: [{name: "navigate", data: {location: true, url: "/login"}}]
        }

    }

    if(message?.name == "navigation") {

        model.url = message.data;
        
        model.controller = null;

        if(model.url.hash) document.querySelector(model.url.hash)?.scrollIntoView();

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

        if(!model.controller) throw new Error("Not found");

    }

    if(model?.controller && !controllers[model.controller]) {

        if(typeof document != "undefined") {
            document.body.classList.add("animate-pulse");
            document.body.inert = true;
        }
        
        controllers[model.controller] = (await import(baseDir + model.controller)).default;

    }
  
    const controller = controllers[model?.controller ?? 0] ?? ((model, message)=>({model, html: ""}));

    if(!("/root.js" in controllers)) {
        try {
            
            const rootController = await import(baseDir + "/root.js");
            controllers["/root.js"] = rootController.default;
            
        } catch (error) {
            
            controllers["/root.js"] = null;

        }
    }

    if(controllers["/root.js"]) {

        return controllers["/root.js"](model, message, controller);
    
    }


    return controller(model, message);

}

