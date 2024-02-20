import {request, urlToObj} from "../utils.js";

var commands = {};


commands.navigate = async (options, callback) => {

    return (await callback({name: options.message, data: urlToObj(new URL(options?.data?.url ?? "", new URL(options.request.url)))}));

}

commands.fetch = async (options, callback) => {

    const resp = await request({...options.data, apiURL: options.apiURL, token: options.request?.cookies?.PHPSESSID});

    if(resp.status == 401) {

        return (await callback({name: "sessionFail", data: resp}));

    }else{

        if(options.message) return (await callback({name: options.message, data: resp}));

    }
    
}

commands.multiFetch = async (options, callback) => {


    const promises = Object.keys(options.data).map((key) => request({...options.data[key], apiURL: options.apiURL, token: options.request?.cookies?.PHPSESSID}));

    const responses = await Promise.all(promises);

    const result = {};

    for (let i = 0; i < responses.length; i++) {

        if(responses[i].status == 401) return (await callback({name: "sessionFail", data: responses[i]}));

        result[Object.keys(options.data)[i]] = responses[i];
    }

    return (await callback({name: options.message, data: result}));

}

export default commands;