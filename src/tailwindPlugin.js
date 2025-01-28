import postcss from "postcss";
import tailwindcss from "tailwindcss";

export const tailwindPlugin = (tailwindConfig, inputCSS) => ({
    name: "tailwind-plugin",
    setup(build) {
        build.onResolve({ filter: /^tailwind-input$/ }, () => ({
            path: "virtual-tailwind-input",
            namespace: "tailwind",
        }));

        build.onLoad({ filter: /.*/, namespace: "tailwind" }, async () => {
            
            // const inputCSS = await Deno.readTextFile(inputCSSPath);

            const result = await postcss([tailwindcss(tailwindConfig)]).process(
                inputCSS,
                {
                    from: undefined,
                    to: undefined,
                },
            );

            return {
                contents: result.css,
                loader: "css",
            };
        });
    },
});