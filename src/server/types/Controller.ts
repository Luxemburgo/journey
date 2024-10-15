export interface Controller {
    (params: {model?: {[key: string]: any;}; message?: {[key: string]: any;};}): Promise<{model?: {[key: string]: any;}; html?: {[key: string]: any;} | string;}>
}