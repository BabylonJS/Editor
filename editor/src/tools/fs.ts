import { glob } from "glob";
import { FSWatcher, mkdir, pathExists, watch } from "fs-extra";

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

/**
 * Creates a new FS watcher and returns its reference. Takes care of waiting enought time in order
 * to notify the "change" event only once.
 * @param absolutePath defines the absolute path to the file to watch.
 * @param onChange defines the callback called when the file changed.
 */
export function watchFile(absolutePath: string, onChange: () => void): FSWatcher {
    const watcher = watch(absolutePath, {
        persistent: true,
    });

    let timeoutId: number | null = null;

    watcher.on("change", () => {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(() => {
            timeoutId = null;
            onChange();
        }, 1000);
    });

    return watcher;
}
