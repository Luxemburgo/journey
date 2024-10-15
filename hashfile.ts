async function fnv1aFromFile(file: Deno.FsFile): Promise<number> {
    const FNV_OFFSET_BASIS = 2166136261;
    const FNV_PRIME = 16777619;

    let hash = FNV_OFFSET_BASIS;

    try {
        const buffer = new Uint8Array(64 * 1024);
        let bytesRead: number | null;

        while ((bytesRead = await file.read(buffer)) !== null && bytesRead > 0) {
            for (let i = 0; i < bytesRead; i++) {
                hash ^= buffer[i];
                hash = (hash * FNV_PRIME) >>> 0;
            }
        }
    } catch (error) {
        throw error;
    }

    return hash;
}

const filePath = new URL("https://dev.app.bills.com.ar/css/output.css");
try {
    const file = await Deno.open(filePath, { read: true });
    const hashValue = await fnv1aFromFile(file);
    console.log(`Hash FNV-1a del archivo es: ${hashValue} ${hashValue.toString(16)}`);
    file.close();
} catch (error) {
    console.error("Error al abrir el archivo:", error);
}
