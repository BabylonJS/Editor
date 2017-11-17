import { Scene } from 'babylonjs';

import { IStringDictionary } from '../editor/typings/typings';
import { IExtension, ExtensionConstructor } from '../editor/typings/extension';

export default class Extensions {
    // Public members
    public static Extensions: IStringDictionary<ExtensionConstructor<any>> = { };
    public static Instances: IStringDictionary<IExtension<any>> = { };

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
    public static ApplyExtensions (scene: Scene, metadatas: IStringDictionary<any>): void {
        for (const e in this.Extensions) {
            const extension = new this.Extensions[e](scene);
            this.Instances[e] = extension;

            if (extension.alwaysApply || metadatas[e])
                extension.onApply(metadatas[e]);
        }
    }
}