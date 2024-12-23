import type { Message } from "./message.ts";


export interface Command<OptionsType, MessageDataType> {
    (options: OptionsType): CommandHandler<MessageDataType>;
}

export interface CommandCallback<MessageDataType> {
    (message: Message<MessageDataType>): Promise<void>;
}

export interface CommandHandler<MessageDataType> {
    (callback: CommandCallback<MessageDataType>): Promise<void>;
}

