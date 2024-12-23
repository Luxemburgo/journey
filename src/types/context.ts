export interface Context {
    hash?: string;
    url?: URL;
    controller?: string;
    request?: {
        method: string;
        url: URL;
        headers: Headers;
        cookies: Record<string, string>;
    };
    redirect?: string;
}
