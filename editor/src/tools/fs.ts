import { glob } from "glob";
import { join } from "path/posix";
import { watch, FSWatcher } from "chokidar";
import { mkdir, pathExists } from "fs-extra";

/**
 * Creates a directory if it doesn't exist.
 * @param absolutePath the absolute path of the directory to create.
 */
export async function createDirectoryIfNotExist(absolutePath: string) {
	if (!(await pathExists(absolutePath))) {
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
		persistent: false,
	});

	watcher.on("change", () => {
		onChange();
	});

	return watcher;
}

/**
 * Finds an available filename for the given filename and extension in the specified directory.
 * @param absoluteDirname defines the absolute path of the directory to search in
 * @param originalName defines the original name of the file
 * @param extension defines the file extension (without dot)
 */
export async function findAvailableFilename(absoluteDirname: string, originalName: string, extension: string): Promise<string> {
	let index: number | undefined = undefined;
	while (await pathExists(join(absoluteDirname, `${originalName}${index !== undefined ? ` ${index}` : ""}${extension}`))) {
		index ??= 0;
		++index;
	}

	return `${originalName}${index !== undefined ? ` ${index}` : ""}${extension}`;
}
