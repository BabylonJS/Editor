import { platform } from "os";
import { extname, join, normalize } from "path";

import { Tools as BabylonTools, Engine, Scene, Node, Camera, Mesh, Material } from "babylonjs";

import { ICommonMetadata, IEditorPreferences, IMaterialMetadata, IMeshMetadata, ITransformNodeMetadata } from "./types";

export class Tools {
    /**
     * Normalizes the given path according to the current platform.
     * @param path defines the path to normalize according to the current platform.
     */
    public static NormalizePathForCurrentPlatform(path: string): string {
        switch (platform()) {
            case "win32": return path.replace(/\//g, "\\");
            default: return path;
        }
    }

    /**
     * Returns the name of the constructor of the given object.
     * @param object the object to return its constructor name.
     */
    public static GetConstructorName(object: any): string {
        let name = (object && object.constructor) ? object.constructor.name : "";

        if (name === "") {
            name = typeof(object);
        }

        return name;
    }

    /**
     * Returns the metadatas of the given node.
     * @param node defines the reference to the node to get its metadatas.
     */
    public static GetNodeMetadata(node: Node): ICommonMetadata {
        node.metadata = node.metadata ?? { };
        return node.metadata;
    }

    /**
     * Returns the metadatas of the given mesh.
     * @param mesh defines the reference to the mesh to get its metadatas.
     */
    public static GetMeshMetadata(mesh: Mesh): IMeshMetadata {
        return this.GetNodeMetadata(mesh) as IMeshMetadata;
    }

    /**
     * Returns the metadatas of the given transform node.
     * @param transformNode defines the reference to the transform node to get its metadatas.
     */
    public static GetTransformNodeMetadata(transformNode: Mesh): ITransformNodeMetadata {
        return this.GetNodeMetadata(transformNode) as ITransformNodeMetadata;
    }

    /**
     * Returns the metadatas of the given material.
     * @param material defines the reference to the material to get its metadatas.
     */
    public static GetMaterialMetadata(material: Material): IMaterialMetadata {
        material.metadata = material.metadata ?? { };
        return material.metadata;
    }

    /**
     * Returns the absolute path to the attached JS file or the given TS file.
     * @param workspaceDir defines the absolute path to the workspace.
     * @param relativePath defines the relative path of the TS file to get its JS source file path.
     * @returns the absolute path to the attached JS file.
     */
    public static GetSourcePath(workspaceDir: string, relativePath: string): string {
        const extension = extname(relativePath);
        const extensionIndex = relativePath.lastIndexOf(extension);

        if (extensionIndex === -1) { return ""; }

        const jsName = normalize(`${relativePath.substr(0, extensionIndex)}.js`);
        return join(workspaceDir, "build", jsName);
    }

    /**
     * Implementation from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#answer-2117523
     * Be aware Math.random() could cause collisions, but:
     * "All but 6 of the 128 bits of the ID are randomly generated, which means that for any two ids, there's a 1 in 2^^122 (or 5.3x10^^36) chance they'll collide"
     */
    public static RandomId(): string {
        return BabylonTools.RandomId();
    }

    /**
     * Returns all the scene nodes of the given scene.
     * @param scene the scene containing the nodes to get.
     */
    public static getAllSceneNodes(scene: Scene): Node[] {
        return (scene.meshes as Node[])
                    .concat(scene.lights as Node[])
                    .concat(scene.cameras as Node[])
                    .concat(scene.transformNodes as Node[]);
    }

    /**
     * Returns wether or not the given element is a child (recursively) of the given parent.
     * @param element the element being possibily a child of the given parent.
     * @param parent the parent to check.
     */
    public static IsElementChildOf(element: HTMLElement, parent: HTMLElement): boolean {
        while (element.parentElement) {
            if (element === parent) { return true; }
            element = element.parentElement;
        }

        return false;
    }

    /**
     * Waits until the given timeMs value is reached.
     * @param timeMs the time in milliseconds to wait.
     */
    public static Wait(timeMs: number): Promise<void> {
        return new Promise<void>((resolve) => setTimeout(() => resolve(), timeMs));
    }

    /**
     * Waits for the next animation frame.
     */
    public static WaitNextAnimationFrame(): Promise<void> {
        return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }

    /**
     * Returns the given array by keeping only distinct values.
     * @param array the array to filter.
     */
    public static Distinct<T>(array: T[]): T[] {
        const unique = (value: T, index: number, self: T[]) => self.indexOf(value) === index;
        return array.filter(unique);
    }

    /**
     * Sorts the given array alphabetically.
     * @param array defines the array containing the elements to sort alphabetically.
     * @param property in case of an array of objects, this property will be used to get the right value to sort.
     */
    public static SortAlphabetically(array: any[], property?: string): any[] {
        array.sort((a, b) => {
            a = property ? a[property] : a;
            b = property ? b[property] : b;

            a = a.toUpperCase();
            b = b.toUpperCase();

            return (a < b) ? -1 : (a > b) ? 1 : 0;
        });

        return array;
    }

    /**
     * Deeply clones the given object.
     * @param object the object reference to clone.
     * @warning take care of cycle dependencies!
     */
    public static CloneObject<T>(object: T): T {
        if (!object) { return object; }
        return JSON.parse(JSON.stringify(object));
    }

    /**
     * Returns the property of the given object at the given path..
     * @param object defines the object reference containing the property to get.
     * @param path defines the path of the property to get;
     */
    public static GetProperty<T>(object: any, path: string): T {
        const split = path.split(".");
        for (let i = 0; i < split.length; i++) {
            object = object[split[i]];
        }

        return object;
    }

    /**
     * Returns the effective property of the given object at the given path..
     * @param object defines the object reference containing the property to get.
     * @param path the path of the property to get.
     */
    public static GetEffectiveProperty<T> (object: any, path: string): T {
        const split = path.split(".");
        for (let i = 0; i < split.length - 1; i++) {
            object = object[split[i]];
        }

        return object;
    }

    /**
     * Returns the saved editor preferences (zoom, etc.).
     */
    public static GetEditorPreferences(): IEditorPreferences {
        const settings = JSON.parse(localStorage.getItem("babylonjs-editor-preferences") ?? "{ }") as IEditorPreferences;
        return settings;
    }

    /**
     * Creates a screenshot of the current scene.
     * @param engine the engine used to render the scene to take as screenshot.
     * @param camera the camera that should be used for the screenshot.
     */
    public static async CreateScreenshot(engine: Engine, camera: Camera): Promise<string> {
        return BabylonTools.CreateScreenshotAsync(engine, camera, {
            width: 3840,
            height: 2160,
        }, "image/png");
    }

    /**
     * Shows the open file dialog and returns the selected file.
     */
    public static async ShowNativeOpenFileDialog(): Promise<File> {
        const files = await this._ShowOpenFileDialog(false);
        return files[0];
    }

    /**
     * Shows the open multiple files dialog and returns the selected files.
     */
    public static async ShowNativeOpenMultipleFileDialog(): Promise<File[]> {
        return this._ShowOpenFileDialog(true);
    }

    /**
     * Shows the open file dialog.
     */
    private static async _ShowOpenFileDialog(multiple: boolean): Promise<File[]> {
        return new Promise<File[]>((resolve, reject) => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = multiple;
            input.addEventListener("change", () => {
                input.remove();

                if (input.files?.length) {
                    const files: File[] = [];
                    for (let i = 0; i < input.files.length; i++) {
                        files.push(input.files.item(i)!);
                    }
                    return resolve(files);
                }
                reject("User decided to not choose any files.");
            });
            input.click();
        });
    }

    /**
     * Returns the extension attached to the given mime type.
     * @param mimeType the mitype to check.
     */
    public static GetExtensionFromMimeType (mimeType: string): string {
        switch (mimeType.toLowerCase()) {
            case "image/png": return ".png";
            case "image/jpg": return ".jpg";
            case "image/jpeg": return ".jpeg";
            case "image/bmp": return ".bmp";
            default: return ".png";
        }
    }

    /**
     * Reads the given file as array buffer.
     * @param file the file to read and return its content as array buffer.
     */
    public static ReadFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
        return new Promise<ArrayBuffer>((resolve, reject) => {
            BabylonTools.ReadFile(file as File, (d) => resolve(d), undefined, true, (err) => reject(err));
        });
    }

    /**
     * Loads a file from a url.
     * @param url the file url to load.
     * @param useArrayBuffer defines a boolean indicating that date must be returned as ArrayBuffer.
     * @param onProgress callback called while file is loading (if the server supports this mode).
     */
    public static async LoadFile<T = string | ArrayBuffer>(url: string, useArrayBuffer: boolean, onProgress?: (data: any) => void): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            BabylonTools.LoadFile(url, (d) => resolve(d as unknown as T), onProgress, undefined, useArrayBuffer, (_, e) => reject(e));
        });
    }
}
