import { transpile } from "@deno/emit";
import { ensureDir, walk } from "@std/fs";
import { dirname, extname, join, relative } from "@std/path";

export async function transpileFile(filePath: string, directory: string = ".", output: string = "lib") {

    const relativePath = relative(directory, filePath);

    const outputPath = join(output, relativePath).replace(/\.(ts|tsx|jsx)$/, ".js");

    if (await shouldSkipTranspilation(filePath, outputPath)) {
        // console.log(`Skipping: ${filePath} (up-to-date)`);
        return;
    }

    const url = new URL("file:///" + Deno.cwd() + "/" + relative(Deno.cwd(), filePath));
    const result = await transpile(url);

    let jsCode = result.get(url.href);

    if (jsCode) {
        jsCode = updateImports(jsCode);

        await ensureDir(dirname(outputPath));
        await Deno.writeTextFile(outputPath, jsCode);
        await copyModificationTime(filePath, outputPath);

        // console.log(`Transpiled: ${filePath} -> ${outputPath}`);
    }
}

function updateImports(code: string): string {
    const importExportRegex = /((import|export)\s.*?['"])(.*?)(\.(ts|tsx|jsx))(['"])/g;
    return code.replace(importExportRegex, `$1$3.js$6`);
}

async function shouldSkipTranspilation(sourcePath: string, outputPath: string): Promise<boolean> {
    try {
        const sourceStat = await Deno.stat(sourcePath);
        const outputStat = await Deno.stat(outputPath);

        return sourceStat.mtime!.getTime() == outputStat.mtime!.getTime();
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            return false;
        }
        throw err;
    }
}

async function copyModificationTime(sourcePath: string, outputPath: string) {
    const sourceStat = await Deno.stat(sourcePath);
    if (sourceStat.mtime) {
        await Deno.utime(outputPath, sourceStat.atime ?? 0, sourceStat.mtime);
    }
}

export async function transpileDirectory(directory: string, output: string = "lib") {


    for await (const entry of walk(directory, { includeFiles: true, includeDirs: false })) {
        const ext = extname(entry.path);

        if ([".ts", ".tsx", ".jsx", ".js"].includes(ext)) {
            await transpileFile(entry.path, directory, output);
        }
    }


}
