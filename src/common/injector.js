
const injector = {
    services: {
    },
    inject: (controller) => (model, message, context, nextController) => {

        if(Array.isArray(controller.services) && !controller.injectedServices) {

            controller.injectedServices = 
                controller.services
                .reduce((acc, serviceName) => {
                    
                    if(!(serviceName in injector.services)) throw new Error(`Service ${serviceName} not found`);
                    
                    acc[serviceName] = injector.services[serviceName];
                    
                    return acc;

                }, {});

        }

        return controller(model, message, {context, ...(controller.injectedServices ?? {})}, nextController);

    }
}

export default injector;