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
        * Converts a base64 string to array buffer
        * Largely used to convert images, converted into base64 string
        */
        static ConvertBase64StringToArrayBuffer(base64String: string): Uint8Array;
        /**
        * Opens a window popup
        */
        static OpenWindowPopup(url: string, width: number, height: number): any;
        /**
        * Returns the base URL of the window
        */
        static getBaseURL(): string;
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
    }
}
