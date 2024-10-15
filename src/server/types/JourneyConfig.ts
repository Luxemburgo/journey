import type { Controller } from "./Controller.ts";

export interface JourneyConfig {
    controller?: Controller;
    HTTPHandler?: (request: Request, defaultHandler: (request: Request) => Promise<Response>) => Promise<Response>;
    router?: {
        path?: string;
        disabled?: boolean;
    };
    clientScriptURL?: string;
    model?: {[key: string]: any;};
    assetsDirs?: string[];
    cacheControl?: (url: URL) => string | string;
    serverConfig?: Deno.ListenOptions;
}