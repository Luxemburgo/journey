import type { Controller } from "./Controller.ts";
import type { Context } from "./Context.ts";
import type { Model } from "./Model.ts";

export interface JourneyConfig<ModelType extends Model = Model, MessageDataType = any, ContextType extends Context = Context> {
    controller?: Controller<ModelType, MessageDataType, ContextType>;
    HTTPHandler?: (request: Request, defaultHandler: (request: Request) => Promise<Response>) => Promise<Response>;
    router?: {
        path?: string;
        disabled?: boolean;
    };
    clientScriptURL?: string;
    model?: ModelType;
    context?: ContextType;
    assetsDirs?: string[];
    cacheControl?: (url: URL) => string | string;
    serverConfig?: Deno.ListenOptions;
    production?: boolean;
}


