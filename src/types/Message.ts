export interface Message<T> {
    name: string;
    data: T;
    command?: any;
}