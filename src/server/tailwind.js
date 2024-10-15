import postcss from "postcss";
import tailwindcss from "tailwindcss";

export async function buildTailwind(config, input) {

    const result = await postcss([tailwindcss(config)]).process(input, { from: undefined });
    
    return result.css;

}

export async function buildTailwindAndSave(config, input, output) {

    const result = await postcss([tailwindcss(config)]).process(input, { from: undefined });
    
    Deno.writeTextFileSync(output, result.css);

    return result.css;

}