import * as fs from 'fs-extra';

export default class Watcher {
    // Public members
    public static WatchedFiles: { [name: string]: boolean } = { };

    /**
     * Watches the given file
     * @param filename the filename to watch (path)
     * @param callback the callback called once the file changed
     */
    public static async WatchFile (filename: string, callback: () => void): Promise<void> {
        if (this.WatchedFiles[filename])
            fs.unwatchFile(filename);
        
        const stats = await fs.stat(filename);
        this.WatchedFiles[filename] = true;

        fs.watchFile(filename, (curr, prev) => {
            if (curr.ctimeMs > stats.ctimeMs) {
                stats.ctimeMs = curr.ctimeMs;
                callback();
            }
        });
    }

    /**
     * Writes the given file and then wathes the content
     * @param filename the filename to watch (path)
     * @param data the data to write
     * @param callback the callback called once the file changed
     */
    public static async WriteAndWatchFile (filename: string, data: Buffer, callback: () => void): Promise<void> {
        await fs.writeFile(filename, data);
        this.WatchFile(filename, () => callback());
    }

    /**
     * Disposes the helper
     */
    public static Dispose (): void {
        for (const f in this.WatchFile)
            fs.unwatchFile(this.WatchFile[f]);

        this.WatchedFiles = { };
    }
}
