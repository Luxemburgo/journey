import type { CommandHandler } from "./command.ts";

export interface State<ModelType> {
    model: ModelType,
    commands?: CommandHandler<any>[],
    html?: string | object
}
