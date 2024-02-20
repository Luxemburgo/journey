import { walkSync } from "https://deno.land/std/fs/mod.ts";

export function createRouting(directory) {

    directory = directory.replaceAll("%20", " "); //.replace(/^\//g, "");

    const routes = {};

    let baseDir = "";

    for (const dirEntry of walkSync(directory, {includeFiles: false})) {

        if(baseDir == "") baseDir = dirEntry.path.replaceAll("\\", "/");

        const path = dirEntry.path.replaceAll("\\", "/")
        .replace(new RegExp(`^${baseDir}`, "gi"), "");

        if(path != "") {
            
            const args = [...path.matchAll(/\[([^\]]+)\]/g)].map(r => r[1]);
            
            routes[path] = {
                args,
                regexp: "^" + path.replace(/(\[[^\]]+\])/g, "([^/]+)") + "$",
                route: path + "/" + path.split("/").pop() + ".js"
            };

        }else{

            routes["/"] = {path: "/", args: [], regexp: "^/$", route: "/index.js"};

        }
    }

    return routes;

}
