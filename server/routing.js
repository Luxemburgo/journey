import { walkSync } from "https://deno.land/std/fs/mod.ts";
import { existsSync } from "https://deno.land/std@0.224.0/fs/exists.ts";

export function createRouting(directory) {

    directory = (directory ?? "./src/pages").replaceAll("%20", " "); //.replace(/^\//g, "");

    const routes = {};

    let baseDir = "";

    for (const dirEntry of walkSync(directory, {includeFiles: false})) {

        if(baseDir == "") baseDir = dirEntry.path.replaceAll("\\", "/");

        const path = dirEntry.path.replaceAll("\\", "/").replace(new RegExp(`^${baseDir}`, "gi"), "");

        const route = path + "/" + path.split("/").pop() + ".js";

        if(path != "") {
            
            const args = [...path.matchAll(/\[([^\]]+)\]/g)].map(r => r[1]);
            
            if(existsSync(baseDir + route)) {

                routes[path] = {
                    args,
                    regexp: "^" + path.replace(/(\[[^\]]+\])/g, "([^/]+)") + "$",
                    route: route
                };

            }

        }else{

            if(existsSync(baseDir + "/index.js")) {

                routes["/"] = {path: "/", args: [], regexp: "^/$", route: "/index.js"};

            }

            if(existsSync(baseDir + "/root.js")) {

                routes["root"] = {path: "", args: [], regexp: "^root$", route: "/root.js"};

            }

        }
    }

    return routes;

}
