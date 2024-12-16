import type { CommandHandler } from "./Command.ts";

export interface State<ModelType> {
    model: ModelType,
    commands?: CommandHandler<any>[],
    html?: string | object
}
