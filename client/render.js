import commands from "./commands.js?v=1";
import {compareNodes} from "./DOMDiff.js?v=1";
import { deepClone } from "../utils.js";


function diffEvents(el, updates, callback) {

    updates.filter(update =>
        update.type == "addedChildren" ||
        (update.type.includes("Attributes") && update.changes.filter(i => i.name == "messages").length)
    )
    .forEach(update => {
        
        if(update.type == "addedChildren") {
            update.changes.filter(i => i.nodeType === 1).forEach(i => {
                updateEvents(i, callback);
                i.querySelectorAll("a, [messages]").forEach(e => updateEvents(e, callback));
            });
        }else{
            updateEvents(el, callback);
        }

    });
}


function updateEvents(el, callback) {

    if(el.hasAttribute("messages")) {

        if(!el.listeners) el.listeners = [];

        el.listeners.forEach(listener => el.removeEventListener(listener.eventName, listener.handler));

        // console.log("events updated", el);

        const messages = el.getAttribute("messages");

        if(messages) {
            
            messages.split(";")
            .map(messageString => ({ eventName: messageString.split("=")[0].trim(), name: messageString.split("=")[1].trim() }))
            .forEach(message => {
                
                const preventDefault = message.eventName.includes("!");

                message.eventName = message.eventName.replace("!", "");
                
                const listener = {
                    eventName: message.eventName,
                    handler: event => {                    
                        
                        callback({ name: message.name, data: event });
                        
                        if(preventDefault) {
                            event.preventDefault();
                            return false;
                        }
                    }                        
                };

                el.listeners.push(listener);

                // if(a.event == "change") {
                //     el.addEventListener(a.event, e => e.target.setAttribute("value", e.target.value));
                // }

                el.addEventListener(listener.eventName, listener.handler);

            });

        }

    };

    if(el.tagName == "A" && !(el.getAttribute("target") == "_blank") && !el.href.match(/^mailto:|^tel:/g)) {

        if(!el.onclick) {

            ////console.log("link updated", el);

            el.onclick = e => {
                e.preventDefault();
                
                if(!el.listeners?.filter(e => e.eventName=="click").length) {

                    commands.navigate(
                        {
                            data: {url: e.currentTarget.href, stateAction: e.currentTarget.getAttribute("data-state")},
                            message: e.currentTarget.getAttribute("data-message") ?? "navigation"
                        },
                        callback
                    );
                    
                }

            }
        }
    }

}


function addEvents(callback) {

    document.querySelectorAll("a, [messages]").forEach(el => {

        updateEvents(el, callback);
    
    });


}

// const start = new Date();

// window.stateHistory = [];



export async function render(config) {

    const time = performance.now();

    if((config?.message?.controller ?? config?.model?.controller ?? "") != (config?.model?.controller ?? "") ) {
        return;
    }

    const state = config.controller ? 
        
        await config.controller(
            config.model, 
            config.message, 
            config.routes, 
            location.protocol + "//" + location.host
        )

    :
        ({model: config?.model})
    ;
    

    // state.time = parseInt((new Date() - start) / 100)

    
    if(state.html) {
        
        // console.log((config?.message?.name ?? "") + " => Render");

        if(window.renderCallback) {

            state.html = window.renderCallback(state.model, state.html ?? "");

        }

        state.html = state.html.replace(/<!--[\s\S]*?-->/g, ''); //.replace(/>\s+/g, '>').replace(/\s+</g, '<').replace(/\n/g, '');

        const newDOM = new DOMParser().parseFromString(state.html, "text/html").documentElement;
        
        // newDOM.ownerDocument.body.append(document.querySelector("#scripts").cloneNode(true));

        if(false && document.startViewTransition && config?.message?.name == "navigation" && config.message.data?.stateAction != "replace") {
            
            document.startViewTransition(() => compareNodes(
                document.documentElement,
                newDOM,
                (node, updates) => {
                    // console.log(updates);
                    diffEvents(node, updates, message => render({...config, model: window.journey.model, message}));
                }
            ));

        }else{

            // const time = performance.now();

            compareNodes(
                document.documentElement,
                newDOM,
                (node, updates) => {
                    // console.log(updates);
                    diffEvents(node, updates, message => render({...config, model: window.journey.model, message}));
                }
            );
            
            // console.log(`Total update time: ${Math.round(performance.now() - time)}`);

        }

        if(!window.journey.DOM) {
            addEvents(message => render({...config, model: window.journey.model, message}))
            window.journey.DOM = true;
        }
    
    }else{

        // console.log(config?.message?.name ?? "");

    }

    window.journey.model = config.model;

    // twind.install({hash: false});

    // window.journey.DOM = window.journey;

    // window.history.replaceState(state.model, null);
    
    // console.log({in: config, out: state});
    
    
    if("stateHistory" in window && !window.play) {
        window.stateHistory.push({model: deepClone(state.model), time: performance.now()});
    }

    // window.journey.model = state.model;
  
    (state.commands ?? []).filter(c => c.name).forEach(command => {
        
        command.controller = state.model.controller;

        commands[command.name](command, message => render({...config, message: {...message, command}}))
        
    });

    console.log(`Total update time: ${Math.round(performance.now() - time)}`);
 
    return {config, state};

}

window.render = render;