import type { Context } from "./Context.ts";
import type { Message } from "./Message.ts";
import type { State } from "./State.ts";

export interface Controller<ModelType, MessageDataType, ContextType extends Context> {
    (
        model: ModelType,
        message: Message<MessageDataType>,
        context: ContextType,
    ): Promise<State<ModelType>>;
}