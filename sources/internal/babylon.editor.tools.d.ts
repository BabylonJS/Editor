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
        *
        */
        static getBaseURL(): string;
    }
}
