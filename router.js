const controllers = {};

export default async (model, message, routes, baseDir = "") => {

    if(!message && !model) {

        return {
            model: {},
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

        for(const route in routes) {

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

    if(!("root" in controllers)) {
        try {
            
            const rootController = await import(baseDir + "/root.js");
            controllers["root"] = rootController.default;
            
        } catch (error) {
            
            controllers["root"] = null;

        }
    }

    if(controllers["root"]) {

        return controllers["root"](model, message, controller);
    
    }


    return controller(model, message);

}

