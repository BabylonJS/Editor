export default class Settings {
    /**
     * The opened file path using the OS file explorer
     */
    public static OpenedFile: string = null;
    /**
     * Defines the process directory.
     */
    public static readonly ProcessDirectory: string = process.cwd();
}
