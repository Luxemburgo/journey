import {urlToObj} from "../utils.js"

export const legacyNavigate = (options) => {

    return async callback => {

        const url = urlToObj(new URL(
            options?.data?.url ?? "",
            new URL(options?.context?.request?.url ?? window.location)
        ));


        if(options?.data?.redirect) {
            
            if(options?.context?.request) {
                options.context.redirect = url.href;
            }else{
                window.location = url.href;
            }

            return {model: options.model};
        }
        
        if(options?.data?.url && typeof window != "undefined") {
            
            if(options.data?.stateAction == "replace") 
                window.history.replaceState({}, null, options.data.url);
            else {
                window.history.pushState({}, null, options.data.url);
            }

        }

        return (await callback({
            name: options?.message ?? "navigation",
            data: {
                ...url,
                stateAction: options?.data?.stateAction
            }
        }));

    }

}

export const legacyNavigateBack = () => {

    return async callback => {

        window.history.back();

    }
    
}



