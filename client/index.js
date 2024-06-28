import {urlToObj} from "../utils.js?v=3"
import router from "../router.js?v=3";
import {render} from "./render.js?v=3";

window.onpopstate = e => {
    // console.log(e);
    // if(location.href.includes("#")) return;
    render({
        model: document.documentElement.model,
        controller: router,
        message: {name: "navigation", data: urlToObj(new URL(location))},
        routes: document.documentElement.routes
    });
}

if(window.localStorage.getItem("model")) {

    document.documentElement.model = {
        ...document.documentElement.model,
        ...JSON.parse(window.localStorage.getItem("model"))
    }

}

window.addEventListener("load", () => {
    render({
        model: document.documentElement.model,
        controller: router,
        routes: document.documentElement.routes
    });
});