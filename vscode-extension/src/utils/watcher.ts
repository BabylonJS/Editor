import { writeFile } from 'fs-extra';
import { watch, FSWatcher } from 'chokidar';

export default class Watcher {
    // Public members
    public static WatchedFiles: { [name: string]: FSWatcher } = { };

    /**
     * Watches the given file
     * @param filename the filename to watch (path)
     * @param callback the callback called once the file changed
     */
    public static async WatchFile (filename: string, callback: () => void): Promise<void> {
        if (this.WatchedFiles[filename])
            this.WatchedFiles[filename].close();
        
        const watcher = this.WatchedFiles[filename] = watch(filename, {
            persistent: true,
            awaitWriteFinish: true
        });
        watcher.on('change', (path, stats) => {
            callback();
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
