import { bundle } from "https://deno.land/x/emit/mod.ts";
import * as path from 'https://deno.land/std/path/mod.ts';
import { createRouting } from "./routing.js";

// Ruta del archivo que contiene el objeto routes
const routesFilePath = './routes.json';

// Leer el objeto routes desde el archivo externo
const routes = createRouting("./src/pages");

// Crear el contenido del archivo
let fileContent = '';

// Agregar las importaciones al principio del archivo
for (const key in routes) {
  if (routes.hasOwnProperty(key)) {
    const routePath = routes[key].route;
    const importPath = `./src/pages${routePath}`;
    const importName = routePath.replace(/[^a-zA-Z0-9]/g, '_');
    fileContent += `import ${importName} from '${importPath}';\n`;
  }
}

// Crear el nuevo objeto con las funciones importadas
fileContent += '\nconst routes = {\n';

for (const key in routes) {
  if (routes.hasOwnProperty(key)) {
    const routePath = routes[key].route;
    const importName = routePath.replace(/[^a-zA-Z0-9]/g, '_');
    fileContent += `  '${routes[key].route}': ${importName},\n`;
  }
}

fileContent += '};\n\ndocument.documentElement.controllers = routes;\n';

// Escribir el contenido en un archivo nuevo
const outputFile = path.join(Deno.cwd(), 'generatedRoutes.js');
const encoder = new TextEncoder();
const data = encoder.encode(fileContent);
Deno.writeFileSync(outputFile, data);


const result = await bundle("./generatedRoutes.js");

const { code } = result;

const mainOutputFile = path.join(Deno.cwd(), './public/js/main.js');
const mainData = encoder.encode(code);
Deno.writeFileSync(mainOutputFile, mainData);

console.log('Archivo main.js generado exitosamente.');

Deno.unlinkSync("./generatedRoutes.js");
