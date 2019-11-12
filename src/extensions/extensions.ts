import { Scene } from 'babylonjs';

import { IStringDictionary } from './typings/typings';
import { IExtension, ExtensionConstructor } from './typings/extension';

import Tools from './tools/tools';
import Mobile from './tools/mobile';

export default class Extensions {
    // Public members
    public static Extensions: IStringDictionary<ExtensionConstructor<any>> = { };
    public static Instances: IStringDictionary<IExtension<any>> = { };
    public static OrderedExtensions: string[] = [];

    /**
     * Reference to tools used by extensions.
     */
    public static Tools: Tools = new Tools();
    /**
     * Reference to all mobile tools (vibrate, etc.).
     */
    public static Mobile: Mobile = new Mobile();

    /**
     * Sets or gets the current Root Url used while loading assets and extensions.
     */
    public static RootUrl: string = null;

    /**
     * @deprecated please use RootUrl instead.
     */
    public static get RoolUrl(): string {
        return this.RootUrl;
    }
    /**
     * @deprecated please use RootUrl instead.
     */
    public static set RoolUrl (url: string) {
        this.RootUrl = url;
    }

    /**
     * Registers an extension
     * @param extension the extension to register
     */
    public static Register<T> (name: string, extension: ExtensionConstructor<T>): boolean {
        if (this.Extensions[name])
            return false;

        this.Extensions[name] = extension;
        this.OrderedExtensions.push(name);

        return true;
    }

    /**
     * Requests an extension: returns the already created
     * if already exists
     * @param name the name of the extension
     */
    public static RequestExtension<T extends IExtension<any>> (scene: Scene, name: string): T {
        if (this.Instances[name])
            return <T> this.Instances[name];

        if (!this.Extensions[name])
            return null;

        const instance = <T> new this.Extensions[name](scene);
        this.Instances[name] = instance;

        return instance;
    }

    /**
     * Applies all extesions giving all the custom metadatas
     * @param metadatas the metadatas for all extensions
     */
    public static ApplyExtensions (scene: Scene, metadatas: IStringDictionary<any>): void {
        for (const name of this.OrderedExtensions) {
            const extension = new this.Extensions[name](scene);
            this.Instances[name] = extension;

            if (extension.alwaysApply || metadatas[name])
                extension.onApply(metadatas[name], this.RoolUrl);
        }
    }

    /**
     * Clears all the extensions
     */
    public static ClearExtensions (): void {
        this.Instances = { };
    }
}
