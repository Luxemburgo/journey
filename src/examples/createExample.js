import { dirname, join } from "https://deno.land/std@0.201.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.201.0/fs/mod.ts";

// URL base de los archivos del proyecto en el servidor
const BASE_URL = "https://dev.atlas.ar/journey/src/examples/";


export default async (files) => {

    // Descarga un archivo desde una URL y lo guarda en el destino especificado
    async function downloadFile(url, dest) {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to download file: ${res.statusText}`);
        }
        const content = await res.text();
        await Deno.writeTextFile(dest, content);
        console.log(`Downloaded: ${dest}`);
    }

    // Crea la estructura del proyecto descargando cada archivo
    async function createProject(targetDir) {

        for (const filePath of files) {
            const fileUrl = `${BASE_URL}${filePath}`; // URL completa del archivo
            const localPath = join(targetDir, filePath.split("/").slice(1).join("/")); // Ruta local donde se guardará
            await ensureDir(dirname(localPath)); // Crea el directorio contenedor si no existe
            await downloadFile(fileUrl, localPath); // Descarga el archivo
        }
    }

    // Punto de entrada del script
    // if (import.meta.main) {

        const targetDirName = Deno.args[0] || "joruney-example";

        const targetPath = join(Deno.cwd(), targetDirName);

        console.log(`Creating project in: ${targetPath}`);

        try {
            await createProject(targetPath);
            console.log(`Project successfully created at: ${targetPath}`);
        } catch (err) {
            console.error("Error creating project:", err);
        }

    // }


}