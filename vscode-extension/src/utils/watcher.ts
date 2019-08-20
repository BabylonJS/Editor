import { writeFile, watch, FSWatcher } from 'fs-extra';
import * as path from 'path';

export default class Watcher {
    // Public members
    public static WatchedFiles: { [name: string]: FSWatcher } = { };

    /**
     * Watches the given file
     * @param filename the filename to watch (path)
     * @param callback the callback called once the file changed
     */
    public static async WatchFile (filename: string, callback: () => void): Promise<void> {
        filename = path.normalize(filename);

        if (this.WatchedFiles[filename])
            this.WatchedFiles[filename].close();
        
        const watcher = this.WatchedFiles[filename] = watch(filename, {
            persistent: true,
            encoding: 'utf8'
        });

        // Watch!
        let timeoutId = null;
        watcher.on('change', () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                callback();
            }, 500);
        });
    }

    /**
     * Writes the given file and then wathes the content
     * @param filename the filename to watch (path)
     * @param data the data to write
     * @param callback the callback called once the file changed
     */
    public static async WriteAndWatchFile (filename: string, data: Buffer, callback: () => void): Promise<void> {
        await writeFile(filename, data);
        this.WatchFile(filename, () => callback());
    }

    /**
     * Disposes the helper
     */
    public static Dispose (): void {
        for (const f in this.WatchedFiles)
            this.WatchedFiles[f].close();

        this.WatchedFiles = { };
    }
}
