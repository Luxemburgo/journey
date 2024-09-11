import {urlToObj} from "../tools/utils.js"

export const navigate = (options) => {

    return async callback => {

        const url = urlToObj(new URL(
            options?.data?.url ?? "",
            new URL(options?.model?.request?.url ?? window.location)
        ));

        // console.log(url);

        if(options?.data?.redirect) {
            
            if(options?.model?.request) {
                options.model.redirect = url.href;
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
            name: options.message ?? "navigation",
            data: {
                ...url,
                stateAction: options.data?.stateAction
            }
        }));

    }

}

export const navigateBack = () => {

    return async callback => {

        window.history.back();

    }
    
}



