// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

function deepCopy(object) {
    var output = Array.isArray(object) ? [] : {};
    for(var data in object){
        var value = object[data];
        output[data] = typeof value === "object" && value !== null ? deepCopy(value) : value;
    }
    return output;
}
function deepMerge(obj1, obj2) {
    const merged = {
        ...obj1
    };
    for(let key in obj2){
        if (obj2.hasOwnProperty(key)) {
            if (typeof obj2[key] === "object" && obj1.hasOwnProperty(key) && typeof obj1[key] === "object") {
                merged[key] = mergeArrays(obj1[key], obj2[key]);
            } else {
                merged[key] = obj2[key];
            }
        }
    }
    return merged;
}
function mergeArrays(arr1, arr2) {
    const mergedArray = [
        ...arr1
    ];
    for(let i = 0; i < arr2.length; i++){
        if (typeof arr2[i] === "object") {
            mergedArray[i] = deepMerge(mergedArray[i], arr2[i]);
        } else {
            mergedArray[i] = arr2[i];
        }
    }
    return mergedArray;
}
function deepClone(object, merge = {}) {
    const copy = deepCopy(object);
    return deepMerge(copy, merge);
}
function urlToObj(url) {
    let obj = {
        searchParams: Object.fromEntries(url.searchParams)
    };
    [
        "hash",
        "host",
        "hostname",
        "href",
        "origin",
        "password",
        "pathname",
        "port",
        "protocol",
        "search",
        "username"
    ].forEach((i)=>obj[i] = url[i]);
    return obj;
}
const navigate = (options)=>{
    return async (callback)=>{
        const url = urlToObj(new URL(options?.data?.url ?? "", new URL(options?.model?.request?.url ?? window.location)));
        if (options?.data?.redirect) {
            if (options?.model?.request) {
                options.model.redirect = url.href;
            } else {
                window.location = url.href;
            }
            return {
                model: options.model
            };
        }
        if (options?.data?.url && typeof window != "undefined") {
            if (options.data?.stateAction == "replace") window.history.replaceState({}, null, options.data.url);
            else {
                window.history.pushState({}, null, options.data.url);
            }
        }
        return await callback({
            name: options.message ?? "navigation",
            data: {
                ...url,
                stateAction: options.data?.stateAction
            }
        });
    };
};
const navigateBack = ()=>{
    return async (callback)=>{
        window.history.back();
    };
};
const __default = (config)=>{
    const routes = config?.routes ?? {};
    const controllers = config?.controllers ?? {};
    const baseDir = typeof Deno != "undefined" ? "file:///" + Deno.cwd() + "/" + (config?.routingDir ?? "src/pages") : location.protocol + "//" + location.host + "/" + (config?.routingDir ?? "src/pages");
    var hash = null;
    return async (model, message)=>{
        if (hash != (model?.hash ?? null)) {
            hash = model.hash;
            Object.keys(controllers).forEach((key)=>{
                if (key != "/root.js" || controllers[key] !== null) delete controllers[key];
            });
        }
        if (!message && !model?.url) {
            return {
                model: model ?? {},
                commands: [
                    navigate({
                        model: model
                    })
                ]
            };
        }
        if (message?.name == "navigateBack") {
            return {
                model,
                commands: [
                    navigateBack()
                ]
            };
        }
        if (message?.name == "navigation") {
            model.url = message.data;
            model.controller = null;
            const routesKeys = Object.keys(routes).sort().reverse();
            for(const key in routesKeys){
                const route = routesKeys[key];
                const result = message.data.pathname.match(new RegExp(routes[route].regexp));
                if (result) {
                    result.shift();
                    message.data.args = Object.fromEntries(routes[route].args.map((i, idx)=>[
                            i,
                            result[idx]
                        ]));
                    model.controller = routes[route].route;
                    break;
                }
            }
            if (typeof window != "undefined" && "document" in window) {
                setTimeout(()=>{
                    document.querySelector("[autofocus]")?.focus();
                }, 0);
            }
            if (!model.controller) throw new Error("Not found");
        }
        if (model?.controller && !controllers[model.controller]) {
            if (typeof document != "undefined") {
                document.body.classList.add("animate-pulse");
                document.body.inert = true;
            }
            controllers[model.controller] = (await import(baseDir + model.controller + (hash ? "?hash=" + hash : ""))).default;
            if (typeof document != "undefined") document.body.inert = false;
        }
        const controller = controllers[model?.controller ?? 0] ?? ((model, message)=>({
                model,
                html: ""
            }));
        if ("root" in routes && !(routes.root.route in controllers)) {
            try {
                const rootController = await import(baseDir + routes.root.route + (hash ? "?hash=" + hash : ""));
                controllers[routes.root.route] = rootController.default;
            } catch (error) {
                controllers[routes.root.route] = null;
            }
        }
        if (controllers["/root.js"]) {
            return controllers["/root.js"](model, message, controller);
        }
        return controller(model, message);
    };
};
function DOMDiff(node1, node2, profiling) {
    const changes = {
        deletedAttributes: [],
        changedAttributes: [],
        deletedChildren: [],
        addedChildren: [],
        changedTexts: []
    };
    nodesWalk = 0;
    sortingTime = 0;
    calcs = [];
    if (!node1.isEqualNode(node2)) compareNodes(node1, node2, changes);
    profiling.push({
        duration: Math.round(performance.now() - profiling.slice(-1)[0].time),
        total: Math.round(performance.now() - profiling[0].time),
        calcs: calcs,
        nodesWalk,
        sort: Math.round(sortingTime),
        stage: "diffCalc",
        time: performance.now()
    });
    return changes;
}
let nodesWalk = 0;
let sortingTime = 0;
let calcs = [];
function compareNodes(node1, node2, changes) {
    let calcTime = performance.now();
    let childrenCalcTime = 0;
    if (node1.nodeType !== 1) {
        if (node1.textContent != node2.textContent) {
            changes.changedTexts.push({
                parentNode: node1.parentNode,
                node: node1,
                before: node1.textContent,
                after: node2.textContent
            });
            node1.textContent = node2.textContent;
        }
    } else {
        for (const attr of node1.attributes ?? []){
            if (node2.hasAttribute && !node2.hasAttribute(attr.name)) {
                changes.deletedAttributes.push({
                    node: node1,
                    name: attr.name,
                    value: attr.value
                });
                node1.removeAttribute(attr.name);
            }
        }
        for (const attr of node2.attributes ?? []){
            if (node1.getAttribute(attr.name) !== attr.value) {
                changes.changedAttributes.push({
                    node: node1,
                    name: attr.name,
                    value: attr.value,
                    oldValue: node1.getAttribute(attr.name)
                });
                node1.setAttribute(attr.name, attr.value);
            }
        }
        const node1Children = Array.from(node1.childNodes ?? []);
        const node2Children = Array.from(node2.childNodes ?? []);
        for (const child of node1Children){
            let match = false;
            for (const newChild of node2Children.filter((i)=>!i.matched)){
                nodesWalk++;
                if (child.isEqualNode(newChild)) {
                    newChild.matched = true;
                    match = true;
                    child.sortIndex = node2Children.indexOf(newChild);
                    break;
                }
            }
            if (!match) for (const newChild of node2Children.filter((i)=>!i.matched)){
                nodesWalk++;
                if (compareNodesByCriteria(child, newChild)) {
                    newChild.matched = true;
                    match = true;
                    child.sortIndex = node2Children.indexOf(newChild);
                    if (!child.hasAttribute?.("blackbox") || !newChild.hasAttribute?.("blackbox")) childrenCalcTime = compareNodes(child, newChild, changes);
                    break;
                }
            }
            if (!match) {
                changes.deletedChildren.push({
                    node: node1,
                    child
                });
                child.remove();
            }
        }
        const addedChildren = [];
        for (const newChild of node2Children.filter((i)=>!i.matched)){
            newChild.sortIndex = node2Children.indexOf(newChild);
            addedChildren.push(newChild);
        }
        if (addedChildren.length) {
            changes.addedChildren.push({
                node: node1,
                children: addedChildren
            });
            node1.append(...addedChildren);
        }
        const sortStart = performance.now();
        sortChilds(node1, changes);
        sortingTime += performance.now() - sortStart;
    }
    calcTime = Math.round(performance.now() - calcTime - childrenCalcTime);
    calcs.push({
        node: node1,
        time: calcTime
    });
    return calcTime;
}
function compareNodesByCriteria(node1, node2) {
    const criteria = [
        'tagName',
        'nodeName',
        'id'
    ];
    for (const criterion of criteria){
        if (node1[criterion] !== node2[criterion]) {
            return false;
        }
    }
    return true;
}
function sortChilds(element, changes) {
    let nodesArray = Array.from(element.childNodes).sort((a, b)=>a.sortIndex - b.sortIndex);
    for(let i = 0; i < nodesArray.length; i++){
        if (element.childNodes[i] !== nodesArray[i]) {
            element.insertBefore(nodesArray[i], element.childNodes[i]);
        }
    }
}
function diffEvents(changes, callback) {
    changes.addedChildren.forEach((change)=>change.children.filter((child)=>child.nodeType == 1).forEach((child)=>[
                child,
                ...child.querySelectorAll("a, [messages]")
            ].forEach((el)=>updateEvents(el, callback))));
    [
        ...changes.changedAttributes.filter((change)=>change.name == "messages"),
        ...changes.deletedAttributes.filter((change)=>change.name == "messages")
    ].forEach((change)=>updateEvents(change.node, callback));
}
function updateEvents(el, callback) {
    (el.listeners ?? []).forEach((listener)=>el.removeEventListener(listener.eventName, listener.handler));
    if (el.hasAttribute("messages")) {
        if (!el.listeners) el.listeners = [];
        const messages = el.getAttribute("messages");
        if (messages) {
            messages.split(";").map((messageString)=>({
                    eventName: messageString.split("=")[0].trim(),
                    name: messageString.split("=")[1].trim()
                })).forEach((message)=>{
                const preventDefault = message.eventName.includes("!");
                message.eventName = message.eventName.replace("!", "");
                const listener = {
                    eventName: message.eventName,
                    handler: (event)=>{
                        callback({
                            name: message.name,
                            data: event
                        });
                        if (preventDefault) {
                            event.preventDefault();
                            return false;
                        }
                    }
                };
                el.listeners.push(listener);
                el.addEventListener(listener.eventName, listener.handler);
            });
        }
    }
    if (el.tagName == "A") {
        if (!el.onclick) {
            el.onclick = async (e)=>{
                if (el.getAttribute("target") == "_blank" || el.href.match(/^mailto:|^tel:/g)) {
                    return;
                }
                e.preventDefault();
                if (el.href.includes("#")) {
                    document.getElementById(el.href.split("#")[1])?.scrollIntoView({
                        behavior: "smooth"
                    });
                    return;
                }
                if (!el.listeners?.filter((e)=>e.eventName == "click").length) {
                    await navigate({
                        data: {
                            url: e.currentTarget.href,
                            stateAction: e.currentTarget.getAttribute("data-state")
                        },
                        message: e.currentTarget.getAttribute("data-message") ?? "navigation"
                    })(callback);
                    window.scrollTo({
                        top: 0,
                        left: 0
                    });
                }
            };
        }
    }
}
function addEvents(callback) {
    document.querySelectorAll("a, [messages]").forEach((el)=>{
        updateEvents(el, callback);
    });
}
async function render(config) {
    const profiling = [
        {
            duration: 0,
            total: 0,
            stage: "start",
            time: performance.now()
        }
    ];
    if ((config?.message?.controller ?? config?.model?.controller ?? "") != (config?.model?.controller ?? "")) {
        return;
    }
    let state = config?.controller ? await config.controller(config.model, config.message) : {
        model: config?.model
    };
    if (typeof state == "string") state = {
        html: state
    };
    state.model = state.model ?? {};
    config.model = state?.model;
    window.journey = {
        ...window.journey ?? {},
        model: config.model
    };
    if (state.html) {
        if (window.renderCallback) {
            state.html = window.renderCallback(state.model, state.html ?? "");
        }
        const newDOM = new DOMParser().parseFromString(state.html, "text/html").documentElement;
        profiling.push({
            duration: Math.round(performance.now() - profiling.slice(-1)[0].time),
            total: Math.round(performance.now() - profiling[0].time),
            stage: "html",
            time: performance.now()
        });
        if (false && document.startViewTransition && config?.message?.name == "navigation" && config.message.data?.stateAction != "replace") {
            document.startViewTransition(()=>{
                const changes = DOMDiff(document.documentElement, newDOM, profiling);
                diffEvents(changes, (message)=>render({
                        ...config,
                        model: window.journey.model,
                        message
                    }));
            });
        } else {
            const changes = DOMDiff(document.documentElement, newDOM, profiling);
            diffEvents(changes, (message)=>render({
                    ...config,
                    model: window.journey.model,
                    message
                }));
        }
        if (!window.journey?.DOMUpdated) {
            addEvents((message)=>render({
                    ...config,
                    model: window.journey.model,
                    message
                }));
            window.journey.DOMUpdated = true;
        }
    }
    if ("stateHistory" in window && !window.play) {
        window.stateHistory.push({
            model: deepClone(state.model),
            time: performance.now()
        });
    }
    (state.commands ?? []).forEach((command)=>{
        command((message)=>render({
                ...config,
                message
            }));
    });
    return state;
}
window.render = render;
window.onpopstate = (e)=>{
    render({
        model: window.journey.model,
        message: {
            name: "navigation",
            isPopState: true,
            data: urlToObj(new URL(location))
        },
        controller: window.journey.controller
    });
};
window.addEventListener("load", async ()=>{
    window.journey.controller = window.journey.controller ?? __default({
        routingDir: window.journey.router?.path,
        routes: window.journey.router?.routes,
        controllers: window.journey.controllers
    });
    if (window.localStorage.getItem("model")) {
        window.journey.model = {
            ...window.journey.model,
            ...JSON.parse(window.localStorage.getItem("model"))
        };
    }
    var socket = null;
    function connect() {
        try {
            if (socket) {
                socket.close(1000, 'Cerrando la conexión');
                socket.onopen = null;
                socket.onmessage = null;
                socket.onerror = null;
                socket.onclose = null;
            }
        } catch (error) {}
        console.log("Connecting...");
        socket = new WebSocket(window.location.protocol + "//" + window.location.host);
        socket.onopen = (e)=>{
            console.log("Connection open");
            socket.send("ping");
        };
        socket.onclose = (e)=>{
            console.log("Connection closed");
            setTimeout(()=>{
                connect();
            }, 5000);
        };
        socket.onerror = (e)=>{
            console.log("Connection error");
            setTimeout(()=>{
                connect();
            }, 5000);
        };
        socket.onmessage = (e)=>{
            if (e.data == "Update!") {
                window.updateHash(Math.round(Math.random() * 10000));
            }
        };
    }
    if (window.journey.hotReload) {
        connect();
    }
    await render({
        model: window.journey.model,
        controller: window.journey.controller
    });
    document.querySelector("[autofocus]")?.focus();
});
window.updateHash = (hash)=>{
    if (window.journey.router.disabled) {
        window.location = window.location;
    } else {
        window.journey.model.hash = hash;
        render({
            model: window.journey.model,
            controller: window.journey.controller
        });
    }
};
window.record = ()=>{
    window.stateHistory = [
        {
            model: deepClone(window.journey.model),
            time: performance.now()
        }
    ];
};
window.playbak = async ()=>{
    if (!(window.stateHistory ?? []).length) return;
    window.play = true;
    for(let index = 0; index < window.stateHistory.length; index++){
        const element = window.stateHistory[index];
        await new Promise((resolve)=>setTimeout(resolve, index > 0 ? element.time - window.stateHistory[index - 1].time : 0));
        await render({
            model: element.model,
            controller: router,
            routes: window.journey.routes
        });
        document.body.append(window.fakeCursor);
    }
    window.play = false;
};
let recording = [];
let recordingInterval;
window.startRecording = function() {
    recording = [];
    true;
    recordingInterval = setInterval(()=>{
        document.onmousemove = (event)=>{
            const position = {
                x: event.clientX,
                y: event.clientY,
                time: Date.now(),
                scrollX: window.scrollX,
                scrollY: window.scrollY
            };
            recording.push(position);
        };
    }, 10);
};
window.stopRecording = function() {
    false;
    clearInterval(recordingInterval);
    document.onmousemove = null;
};
window.playRecording = function() {
    if (recording.length === 0) return;
    window.fakeCursor = document.createElement('DIV');
    document.body.append(window.fakeCursor);
    window.fakeCursor.style.position = "absolute";
    window.fakeCursor.style.width = "10px";
    window.fakeCursor.style.height = "10px";
    window.fakeCursor.style.backgroundColor = "red";
    window.fakeCursor.style.borderRadius = "50%";
    let startTime = recording[0].time;
    window.fakeCursor.style.display = 'block';
    window.fakeCursor.style.left = recording[0].x + 'px';
    window.fakeCursor.style.top = recording[0].y + 'px';
    window.scrollTo(recording[0].scrollX, recording[0].scrollY);
    recording.forEach((point, index)=>{
        if (index === 0) return;
        const delay = point.time - startTime;
        setTimeout(()=>{
            window.fakeCursor.style.left = point.x + 'px';
            window.fakeCursor.style.top = point.y + 'px';
            window.scrollTo(point.scrollX, point.scrollY);
        }, delay);
    });
    setTimeout(()=>{
        window.fakeCursor.style.display = 'none';
    }, recording[recording.length - 1].time - startTime);
};
