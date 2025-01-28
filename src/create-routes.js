import { existsSync, walkSync } from "@std/fs";

export const createRoutes = (routingDir) => {

    routingDir = (routingDir ?? "./src/pages").replaceAll("%20", " "); //.replace(/^\//g, "");

    const routes = {};

    let baseDir = "";

    for (const dirEntry of walkSync(routingDir, {includeFiles: false})) {

        if(baseDir == "") baseDir = dirEntry.path.replaceAll("\\", "/");

        const path = dirEntry.path.replaceAll("\\", "/").replace(new RegExp(`^${baseDir}`, "gi"), "");

        const filename = path + "/" + path.split("/").pop();

        const route = filename + getFileExtension(baseDir + filename);

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

            if(existsSync(baseDir + "/index" + getFileExtension(baseDir + "/index"))) {

                routes["/"] = {path: "/", args: [], regexp: "^/$", route: "/index" + getFileExtension(baseDir + "/index") };

            }

            if(existsSync(baseDir + "/root" + getFileExtension(baseDir + "/root"))) {

                routes["root"] = {path: "", args: [], regexp: "^root$", route: "/root" + getFileExtension(baseDir + "/root") };

            }

        }
    }

    return routes;

}

const getFileExtension = (filename) =>
    (existsSync(filename + ".jsx") ? ".jsx" :
        (existsSync(filename + ".ts") ? ".ts" :
            (existsSync(filename + ".tsx") ? ".tsx" :
                ".js")));