import { bundle } from "@deno/emit";
import { join, dirname } from '@std/path';
import { ensureDir } from "@std/fs";
import createRoutes from "./createRoutes.js";
// import { parse } from "https://deno.land/std@0.110.0/flags/mod.ts";


export default async ({routingDir, imports, outputFile}) => {


    let fileContent = '';

    // const args = parse(Deno.args);

    // if (args.imports) {
    //     const imports = args.imports.split(" ");
    //     for (const imp of imports) {
    //         fileContent += `import '${imp}';\n`;
    //     }
    // }

    (imports ?? []).forEach(fileName => {

        fileContent += `import '${fileName}';\n`;
        
    });


    const routes = createRoutes(routingDir);

    for (const key in routes) {
        const routePath = routes[key].route;
        const importPath = `./lib/pages${routePath}`;
        const importName = routePath.replace(/[^a-zA-Z0-9]/g, '_');
        fileContent += `import ${importName} from '${importPath}';\n`;
    }

    fileContent += '\export const controllers = {\n';

    for (const key in routes) {
        const routePath = routes[key].route;
        const importName = routePath.replace(/[^a-zA-Z0-9]/g, '_');
        fileContent += `  '${routes[key].route}': ${importName},\n`;
    }

    fileContent += '};\n\nif(typeof window != "undefined") window.journey.controllers = controllers;\n';

    const routesFile = join(Deno.cwd(), 'generatedRoutes.js');
    const encoder = new TextEncoder();
    const data = encoder.encode(fileContent);
    Deno.writeFileSync(routesFile, data);


    const result = await bundle("./generatedRoutes.js");

    const { code } = result;

    const mainOutputFile = join(Deno.cwd(), outputFile);
    const mainData = encoder.encode(code);

    await ensureDir(dirname(mainOutputFile));

    Deno.writeFileSync(mainOutputFile, mainData);

    // console.log('Archivo main.js generado exitosamente.');

    Deno.removeSync("./generatedRoutes.js");

}