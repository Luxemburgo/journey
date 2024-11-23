import type { Controller } from "./Controller.ts";

export interface JourneyConfig {
    controller?: Controller;
    HTTPHandler?: (request: Request, defaultHandler: (request: Request) => Promise<Response>) => Promise<Response>;
    router?: {
        path?: string;
        disabled?: boolean;
    };
    clientScriptURL?: string;
    model?: {[key: string]: any};
    context?: Context;
    assetsDirs?: string[];
    cacheControl?: (url: URL) => string | string;
    serverConfig?: Deno.ListenOptions;
    production?: boolean;
}

export interface Context {
    hash?: never;
    url?: never;
    controller?: never;
    request?: never;
}

export interface Page {
    title: string;
    docTitle?: string;
}
