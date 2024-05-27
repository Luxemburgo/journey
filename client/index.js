import {urlToObj} from "../utils.js?v=1"
import router from "../router.js?v=2";
import {render} from "./render.js?v=2";

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
