import { createHTTPHandler } from "./server/server.js";

export const start = config => {
    
    return Deno.serve(config.serverConfig, createHTTPHandler(config));

}

