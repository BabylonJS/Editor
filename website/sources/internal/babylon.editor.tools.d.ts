declare module BABYLON.EDITOR {
    class Tools {
        /**
        * Returns a vector3 string from a vector3
        */
        static GetStringFromVector3(vector: Vector3): string;
        /**
        * Returns a vector3 from a vector3 string
        */
        static GetVector3FromString(vector: string): Vector3;
        /**
        * Opens a window popup
        */
        static OpenWindowPopup(url: string, width: number, height: number): any;
        /**
        * Opens a file browser. Checks if electron then open the dialog
        * else open the classic file browser of the browser
        */
        static OpenFileBrowser(core: EditorCore, elementName: string, onChange: (data: any) => void, isOpenScene?: boolean): void;
        /**
        * Normlalized the given URI
        */
        static NormalizeUri(uri: string): string;
        /**
        * Returns the file extension
        */
        static GetFileExtension(filename: string): string;
        /**
        * Returns the filename without extension
        */
        static GetFilenameWithoutExtension(filename: string, withPath?: boolean): string;
        /**
        * Returns the file type for the given extension
        */
        static GetFileType(extension: string): string;
        /**
        * Returns the base URL of the window
        */
        static GetBaseURL(): string;
        /**
        * Checks if the editor is running in an
        * Electron window
        */
        static CheckIfElectron(): boolean;
        /**
        * Creates an input element
        */
        static CreateFileInpuElement(id: string): JQuery;
        /**
        * Beautify a variable name (escapeds + upper case)
        */
        static BeautifyName(name: string): string;
        /**
        * Cleans an editor project
        */
        static CleanProject(project: INTERNAL.IProjectRoot): void;
        /**
        * Returns the constructor name of an object
        */
        static GetConstructorName(obj: any): string;
        /**
        * Converts a boolean to integer
        */
        static BooleanToInt(value: boolean): number;
        /**
        * Converts a number to boolean
        */
        static IntToBoolean(value: number): boolean;
        /**
        * Returns a particle system by its name
        */
        static GetParticleSystemByName(scene: Scene, name: string): ParticleSystem;
        /**
        * Converts a string to an array buffer
        */
        static ConvertStringToArray(str: string): Uint8Array;
        /**
        * Converts a base64 string to array buffer
        * Largely used to convert images, converted into base64 string
        */
        static ConvertBase64StringToArrayBuffer(base64String: string): Uint8Array;
        /**
        * Adds a new file into the FilesInput class
        */
        static CreateFileFromURL(url: string, callback: (file: File) => void, isTexture?: boolean): void;
        /**
        * Creates a new file object
        */
        static CreateFile(array: Uint8Array, filename: string): File;
    }
}
