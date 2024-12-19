import { bundle } from "@deno/emit";

const result = await bundle("./example.ts", {importMap: "./deno.json"});

const encoder = new TextEncoder();

Deno.writeFileSync("./output.js", encoder.encode(result.code));
