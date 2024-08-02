import {urlToObj} from "../utils.js?v=3"
import router from "../router.js?v=3";
import {render} from "./render.js?v=3";
import { deepClone } from "../utils.js";

window.onpopstate = e => {
    // console.log(e);
    // if(location.href.includes("#")) return;
    render({
        model: window.journey.model,
        controller: router,
        message: {name: "navigation", data: urlToObj(new URL(location))},
        routes: window.journey.routes
    });
}

if(window.localStorage.getItem("model")) {

    window.journey.model = {
        ...window.journey.model,
        ...JSON.parse(window.localStorage.getItem("model"))
    }

}

window.addEventListener("load", async () => {
    
    await render({
        model: window.journey.model,
        controller: router,
        routes: window.journey.routes
    });

    document.querySelector("[autofocus]")?.focus();

});


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