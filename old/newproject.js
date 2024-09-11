const baseDir = (Deno.args[0] ?? ".").replace(/\/$/g, "");

if(baseDir != ".") {
    Deno.mkdirSync(baseDir, { recursive: true });
}

Deno.mkdirSync(baseDir + "/public", { recursive: true });
Deno.mkdirSync(baseDir + "/src", { recursive: true });
Deno.mkdirSync(baseDir + "/src/pages", { recursive: true });

Deno.writeFileSync(baseDir + "/mod.js", new TextEncoder().encode(
`import { start } from "https://atlas.ar/journey/mod.js";

start({
    routingDir: "./src/pages",
    assetsDirs: [
        "./public"
    ],
    serverConfig: {
        port: 8080
    }
});`));

Deno.writeFileSync(baseDir + "/src/pages/index.js", new TextEncoder().encode(
`export default (model, message) => {

    model.title = "Hello functional world!";

    return { 
        model,
        html: view(model)
    };

}

const view = model => \`
<html>
    <head>
        <title>\${model.title}</title>
    </head>
    <body>
        <h1>\${model.title}</h1>
    </body>
</html>
\`;`));

console.log("✅ Example project created");