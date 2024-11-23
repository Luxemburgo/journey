import { urlToObj } from "../common/utils.js"
import createRouterController from "../common/createRouterController.js";
import { render } from "./render.js";

window.onpopstate = e => {

    render({
        model: window.journey.model,
        message: {name: "navigation", isPopState: true, data: urlToObj(new URL(location))},
        controller: window.journey.controller,
        context: window.journey.context ?? {}
    });

}


window.addEventListener("load", async () => {
    
    window.journey.controller = window.journey.controller ?? createRouterController({
        routingDir: window.journey.router?.path,
        routes: window.journey.router?.routes,
        controllers: window.journey.controllers
    });

    if(window.localStorage.getItem("model")) {

        window.journey.model = {
            ...window.journey.model,
            ...JSON.parse(window.localStorage.getItem("model"))
        }
    
    }

    var socket = null;

    function connect() {

        try {            
            if(socket) {
                socket.close(1000, 'Cerrando la conexión');
                socket.onopen = null;
                socket.onmessage = null;
                socket.onerror = null;
                socket.onclose = null;
            }
        } catch (error) {            
        }

        console.log("Connecting...");

        socket = new WebSocket(window.location.protocol+"//"+window.location.host);

        socket.onopen = e => {
            console.log("Connection open");
            
            socket.send("ping");

        };

        socket.onclose = e => {
            console.log("Connection closed");
            setTimeout(() => {
                
                connect();
                
            }, 5000);
        };

        socket.onerror = e => {
            console.log("Connection error");
            setTimeout(() => {
                
                connect();
                
            }, 5000);
        };

        socket.onmessage = e => {
            // console.log(e.data);
            if(e.data =="Update!") {
                window.updateHash(Math.round(Math.random()*100000000).toString(16));
            }
        };

        

    }

    if(window.journey.hotReload) {
        
        connect();

    }

    await render({
        model: window.journey.model,
        controller: window.journey.controller,
        context: window.journey.context ?? {}
    });

    document.querySelector("[autofocus]")?.focus();


});

window.updateHash = (hash) => {

    if(window.journey.router.disabled) {
        
        window.location = window.location;

    }else{

        window.journey.model.hash = hash;

        render({
            model: window.journey.model,
            controller: window.journey.controller,
            context: window.journey.context ?? {}
        });

    }

}

/*
window.record = () => {

    window.stateHistory = [{
        model: deepClone(window.journey.model),
        time: performance.now()
    }];

    // window.startRecording();

}

window.playbak = async () => {

    // window.stopRecording();
    // window.playRecording();

    if(!(window.stateHistory ?? []).length) return;

    // render({controller: () => ({html:" "})});

    // await (new Promise(resolve => setTimeout(resolve, 1000)));

    window.play = true;

    for (let index = 0; index < window.stateHistory.length; index++) {

        const element = window.stateHistory[index];

        await (new Promise(resolve => setTimeout(resolve, index > 0 ? element.time-window.stateHistory[index-1].time : 0)));

        await render({
            model: element.model,
            controller: router,
            routes: window.journey.routes
        });
        
        document.body.append(window.fakeCursor);

    }

    window.play = false;

}


let recording = [];
let recordingInterval;
let isRecording = false;


window.startRecording = function() {
    

    recording = [];
    isRecording = true;
    recordingInterval = setInterval(() => {
    document.onmousemove = (event) => {
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
}

window.stopRecording = function() {
    isRecording = false;
    clearInterval(recordingInterval);
    document.onmousemove = null;
}

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

    recording.forEach((point, index) => {
    if (index === 0) return;
    const delay = point.time - startTime;

    setTimeout(() => {
        window.fakeCursor.style.left = point.x + 'px';
        window.fakeCursor.style.top = point.y + 'px';
        window.scrollTo(point.scrollX, point.scrollY);
    }, delay);
    });

    setTimeout(() => {
    window.fakeCursor.style.display = 'none';
    }, recording[recording.length - 1].time - startTime);
}
*/