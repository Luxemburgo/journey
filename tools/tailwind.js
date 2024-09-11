import postcss from "npm:postcss@8.4.45";
import tailwindcss from "npm:tailwindcss@3.4.10";

export async function buildTailwind(config, input) {

    const result = await postcss([tailwindcss(config)]).process(input, { from: undefined });
    
    return result.css;

}

export async function buildTailwindAndSave(config, input, output) {

    const result = await postcss([tailwindcss(config)]).process(input, { from: undefined });
    
    Deno.writeTextFileSync(output, result.css);

    return result.css;

}