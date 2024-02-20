import {urlToObj} from "../utils.js"
import router from "../router.js";
import {render} from "./render.js";


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

await render({
    model: document.documentElement.model,
    controller: router,
    routes: document.documentElement.routes
});
