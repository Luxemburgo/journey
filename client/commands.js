import {request, responseToObj, urlToObj} from "../utils.js"

var commands = {};

commands.login = async (options, callback) => {

    const resp = await request({
        path: "/login",
        method: options?.data ? "POST" : "GET",
        body: options?.data
    });

    if(resp.ok && resp.jsonBody?.data?.Token) {
        localStorage.setItem("token", resp.jsonBody.data.Token);
    }

    callback({name: options.message, data: resp});
}

commands.fetch = async (options, callback) => {

    const resp = await request({...options.data, apiURL: document.documentElement.apiURL, token: localStorage.getItem("token")});

    if(resp.status == 401) {

        callback({name: "sessionFail", data: resp});

    }else{

        if(options.message) callback({name: options.message, data: resp});

    }
    
    //console.log("message", {command: "fetch", message: options.message, data: body});
}

commands.multiFetch = async (options, callback) => {

    const promises = Object.keys(options.data).map((key) => request({...options.data[key], apiURL: document.documentElement.apiURL, token: localStorage.getItem("token")}));

    const responses = await Promise.all(promises);

    const result = {};

    for (let i = 0; i < responses.length; i++) {

        if(responses[i].status == 401) callback({name: "sessionFail", data: responses[i]});

        result[Object.keys(options.data)[i]] = responses[i];
    }

    callback({name: options.message, data: result});

}

commands.navigate = async (options, callback) => {

    if(options?.data?.location) {
        window.location = options?.data?.url ?? window.location.href;
        return;
    }
    
    if(options?.data?.url)
        if(options.data?.stateAction == "replace") 
            window.history.replaceState({}, null, options.data.url);
        else {
            window.history.pushState({}, null, options.data.url);
            window.scrollTo({top: 0, left: 0, behavior: "smooth"});
        }


    await callback({name: options.message ?? "navigation", data: {...urlToObj(new URL(options?.data?.url ?? "", window.location)), stateAction: options.data?.stateAction ?? false}});

    // window.twind.install({hash: false});

}

commands.refresh = async (options, callback) => {

    window.history.replaceState({}, null, window.location.href)

    if(options?.data?.location) {
        window.location = window.location.href;
        return;
    }

    //console.log("message", {command: "navigate", message: options.message, data: options.url ?? window.location.href});
    callback({name: options.message, data: window.location.href});

}

commands.navigateBack = async (options, callback) => {

    window.history.back();

    // //console.log("message", {command: "navigate-back", message: options.message, data: window.location.href});
    // callback({name: options.message, data: window.location.href});
    // if(options.message)
    //     setTimeout(() => {
    //         callback({name: options.message, data: options?.data});
    //     }, 0); 
}

commands.showModal = (options, callback) => {
    
    document.querySelector("dialog").removeAttribute("open");
    document.querySelector("dialog").showModal();
    
    if(options.message)
        callback({name: options.message, data: options?.data});

}

export default commands;