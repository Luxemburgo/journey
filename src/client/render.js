// import { deepClone } from "../../tools/utils.js";
import { DOMDiff } from "./DOMDiff.js";
import { navigate } from "../common/commands.js";

function diffEvents(changes, callback) {

    changes.addedChildren.forEach(change => 
        change.children.filter(child => child.nodeType==1).forEach(child => 
            [child, ...child.querySelectorAll("a, [messages]")].forEach(el => updateEvents(el, callback))
        )
    );
    
    [
        ...changes.changedAttributes.filter(change => change.name=="messages"),
        ...changes.deletedAttributes.filter(change => change.name=="messages")
    ]
    .forEach(change => updateEvents(change.node, callback));

}


function updateEvents(el, callback) {

    (el.listeners ?? []).forEach(listener => el.removeEventListener(listener.eventName, listener.handler));

    if(el.hasAttribute("messages")) {

        if(!el.listeners) el.listeners = [];

        const messages = el.getAttribute("messages");

        if(messages) {
            
            messages.split(";")
            .map(messageString => ({ eventName: messageString.split("=")[0].trim(), name: messageString.split("=")[1].trim() }))
            .forEach(message => {
                
                // console.log("events updated", el, message.eventName, message.name);

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

    if(el.tagName == "A") {

        if(!el.onclick) {

            ////console.log("link updated", el);

            el.onclick = async e => {
                
                if((el.getAttribute("target") == "_blank") || el.href.match(/^mailto:|^tel:/g)) {
                    return;
                }

                e.preventDefault();

                if(el.href.includes("#")) {
                    document.getElementById(el.href.split("#")[1])?.scrollIntoView({behavior: "smooth"});
                    return;
                }
                
                if(!el.listeners?.filter(e => e.eventName=="click").length) {

                    await navigate(
                        {
                            data: {url: e.currentTarget.href, stateAction: e.currentTarget.getAttribute("data-state")},
                            message: e.currentTarget.getAttribute("data-message") ?? "navigation"
                        }
                    )(callback);
                    
                    window.scrollTo({top: 0, left: 0/*, behavior: "smooth"*/}); 

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


const domParser = new DOMParser();

export async function render(config) {

    const profiling = [{duration: 0, total: 0, stage: "start", time: performance.now()}];

    if((config?.message?.controller ?? config?.model?.controller ?? "") != (config?.model?.controller ?? "") ) {
        return;
    }

    let state = config?.controller ? 
        
        await config.controller(config.model, config.message)

    :
        ({model: config?.model})
    ;

    if(typeof state == "string") state = {html: state};

    state.model = state.model ?? {};

    config.model = state?.model;
    
    window.journey = {...(window.journey ?? {}), model: config.model};


    if(state.html) {
        

        // if(window.renderCallback) {

        //     state.html = window.renderCallback(state.model, state.html ?? "");

        // }

        // state.html = state.html.replace(/<!--[\s\S]*?-->/g, ''); //.replace(/>\s+/g, '>').replace(/\s+</g, '<').replace(/\n/g, '');

        let time = performance.now();

        if(state.html?.tagName) {

            state.html = state.html.outerHTML;

            // if(state.html.tagName.toLowerCase()=="body") {

            //     const htmlElement = document.createElement("HTML");
            //     htmlElement.append(document.createElement("HEAD"));
            //     htmlElement.append(state.html);
            //     state.html = htmlElement;
                
            // }else if(state.html.tagName.toLowerCase()=="head") {

            //     const htmlElement = document.createElement("HTML");
            //     htmlElement.append(state.html);
            //     htmlElement.append(document.createElement("BODY"));
            //     state.html = htmlElement;

            // }else{

            //     const htmlElement = document.createElement("HTML");
            //     htmlElement.append(document.createElement("HEAD"));
            //     htmlElement.append(document.createElement("BODY"));
            //     htmlElement.lastElementChild.append(state.html);
            //     state.html = htmlElement;

            // }

            // console.log(state.html);

        }

        state.html = /*html*/`<link id=tailwind" rel="stylesheet" href="/css/output.css?hash=${state?.model?.hash ?? ""}">` + state.html;

        const newDOM = domParser.parseFromString(state.html, "text/html").documentElement;

        console.log("Dom parser", Math.round(performance.now() - time));

        // const newDOM = state.html?.outerHTML ? state.html : new DOMParser().parseFromString(state.html, "text/html").documentElement;

        profiling.push({
            duration: Math.round(performance.now() - profiling.slice(-1)[0].time),
            total: Math.round(performance.now() - profiling[0].time),
            stage: "html",
            time: performance.now(),
        });


        if(false && document.startViewTransition && config?.message?.name == "navigation" && config.message.data?.stateAction != "replace") {
            
            document.startViewTransition(() => {
                const changes = DOMDiff(document.documentElement, newDOM, profiling)

                diffEvents(changes, message => render({...config, model: window.journey.model, message}));
            });

        }else{

            const changes = DOMDiff(document.documentElement, newDOM, profiling)

            diffEvents(changes, message => render({...config, model: window.journey.model, message}));

            // console.log(profiling.slice(-1)[0].total, profiling, changes);
            
        }

        if(!window.journey?.DOMUpdated) {
            addEvents(message => render({...config, model: window.journey.model, message}));
            window.journey.DOMUpdated = true;
        }
    

    }


    
    // if("stateHistory" in window && !window.play) {
    //     window.stateHistory.push({model: deepClone(state.model), time: performance.now()});
    // }

  
    (state.commands ?? []).forEach(command => {
            
        command( message => render({...config, message}) );

    });


 
    return state;

}

// window.stateHistory = [];
window.render = render;