import { bundle } from "@deno/emit";
import { join, dirname } from '@std/path';
import { ensureDir } from "@std/fs";
import { createRoutes } from "./createRoutes.js";
// import { parse } from "https://deno.land/std@0.110.0/flags/mod.ts";


export const bundleControllers = async ({routingDir, imports, outputFile}) => {

    const routesFileName = createRoutesFile(routingDir, imports);

    const result = await bundle(routesFileName);

    const { code } = result;

    const mainOutputFile = join(Deno.cwd(), outputFile);
    const mainData = encoder.encode(code);

    await ensureDir(dirname(mainOutputFile));

    Deno.writeFileSync(mainOutputFile, mainData);

    // console.log('Archivo main.js generado exitosamente.');

    deleteRoutesFile();

}

export const deleteRoutesFile = () => {
    Deno.removeSync("./generatedRoutes.js");
}

export const createRoutesFile = (routingDir, imports) => {

    const fileName = "generatedRoutes.js";

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
        const importPath = `./src/pages${routePath}`;
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

    const routesFile = join(Deno.cwd(), fileName);
    const encoder = new TextEncoder();
    const data = encoder.encode(fileContent);
    Deno.writeFileSync(routesFile, data);

    return fileName;

}