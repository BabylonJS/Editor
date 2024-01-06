import { glob } from "glob";
import { mkdir, pathExists } from "fs-extra";

/**
 * Creates a directory if it doesn't exist.
 * @param absolutePath the absolute path of the directory to create.
 */
export async function createDirectoryIfNotExist(absolutePath: string) {
    if (!await pathExists(absolutePath)) {
        await mkdir(absolutePath);
    }
}

/**
 * Normalizes the paths of the files returned by glob.
 */
export async function normalizedGlob(...args: Parameters<typeof glob>): ReturnType<typeof glob> {
    const result = await glob(...args);

    result.forEach((_: unknown, index: number) => {
        result[index] = result[index].toString().replace(/\\/g, "/");
    });

    return result;
}
