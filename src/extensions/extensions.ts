import { Scene } from 'babylonjs';

import { IStringDictionary } from './typings/typings';
import { IExtension, ExtensionConstructor } from './typings/extension';

import Tools from './tools/tools';
import Mobile from './tools/mobile';

export default class Extensions {
    // Public members
    public static Extensions: IStringDictionary<ExtensionConstructor<any>> = { };
    public static Instances: IStringDictionary<IExtension<any>> = { };

    public static Tools: Tools = new Tools();
    public static Mobile: Mobile = new Mobile();

    public static RoolUrl: string = null;

    /**
     * Registers an extension
     * @param extension the extension to register
     */
    public static Register<T> (name: string, extension: ExtensionConstructor<T>): boolean {
        if (this.Extensions[name])
            return false;

        this.Extensions[name] = extension;
        return true;
    }

    /**
     * Requests an extension: returns the already created
     * if already exists
     * @param name the name of the extension
     */
    public static RequestExtension<T> (scene: Scene, name: string): T & IExtension<T> {
        if (this.Instances[name])
            return <T & IExtension<T>> this.Instances[name];

        if (!this.Extensions[name])
            return null;

        const instance = <T & IExtension<T>> new this.Extensions[name](scene);
        this.Instances[name] = instance;

        return instance;
    }

    /**
     * Applies all extesions giving all the custom metadatas
     * @param metadatas the metadatas
     */
    public static ApplyExtensions (scene: Scene, metadatas: IStringDictionary<any>, rootUrl?: string): void {
        for (const e in this.Extensions) {
            const extension = new this.Extensions[e](scene);
            this.Instances[e] = extension;

            if (extension.alwaysApply || metadatas[e])
                extension.onApply(metadatas[e], rootUrl);
        }
    }

    /**
     * Clears all the extensions
     */
    public static ClearExtensions (): void {
        this.Instances = { };
    }
}
