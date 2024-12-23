import type { Context } from "./context.ts";
import type { Message } from "./message.ts";
import type { State } from "./state.ts";

export interface Controller<ModelType, MessageDataType, ContextType extends Context> {
    (
        model: ModelType,
        message: Message<MessageDataType>,
        context: ContextType,
    ): Promise<State<ModelType>>;
}