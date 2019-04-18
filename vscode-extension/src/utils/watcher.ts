import { writeFile } from 'fs-extra';
import * as path from 'path';
import * as watchr from 'watchr';

export default class Watcher {
    // Public members
    public static WatchedFiles: { [name: string]: any } = { };

    /**
     * Watches the given file
     * @param filename the filename to watch (path)
     * @param callback the callback called once the file changed
     */
    public static async WatchFile (filename: string, callback: () => void): Promise<void> {
        filename = path.normalize(filename);

        if (this.WatchedFiles[filename])
            this.WatchedFiles[filename].close();
        
        const watcher = this.WatchedFiles[filename] = watchr.create(filename);
        watcher.setConfig({ persistent: true });
        watcher.on('change', (path, stats) => callback());
        watcher.watch((err) => { err ? console.log('Error for ', filename, 'with error ', err) : void 0 });
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
