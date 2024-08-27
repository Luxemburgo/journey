import commands from "./commands.js";
import { deepClone } from "../utils.js";

export default async function render(config) {

    let state = config.controller ? 
        
        await config.controller(config.model, config.message)

    :
        ({model: config?.model})
    ;

    
    config.model = state.model;

    if(config.renderCallback) {
        
        state.html = config.renderCallback(state.model, state.html ?? "");

    }
   
    for(const command of (state.commands ?? []).filter(c => c.name || typeof c == "function")) {
        
        let commandResult;

        if(typeof command == "function") {
            
            commandResult = await command( message => render({...config, message}) );

        }else{

            if(command.name == "navigate" && command.data?.location) {
                return {config, state: {...state, redirect: command.data.url}};
            }

            commandResult = await commands[command.name](
                {...command, request: config.request, apiURL: config.apiURL},
                message => render({...config, message: message})
            );
            
        }

        config = commandResult.config;
        state = commandResult.state;

    };

    return {config, state};

}
