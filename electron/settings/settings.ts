import { app } from 'electron';
import { join } from 'path';

export default class Settings {
    /**
     * The opened file path using the OS file explorer
     */
    public static OpenedFile: string = null;
    /**
     * Defines the process directory.
     */
    public static readonly ProcessDirectory: string = (process.env.DEBUG ? app.getAppPath() : join(app.getAppPath(), '..', '..'));
}
