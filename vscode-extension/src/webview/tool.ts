import { FilesInputStore, Tools as BabylonTools } from 'babylonjs';

export default class Tools {
    /**
    * Returns the file type for the given extension
    */
   public static GetFileType (extension: string): string {
        switch (extension) {
            case 'png': return 'image/png';
            case 'jpg': case 'jpeg': return 'image/jpeg';
            case 'bmp': return 'image/bmp';
            case 'tga': return 'image/targa';
            case 'dds': return 'image/vnd.ms-dds';
            case 'wav': case 'wave': return 'audio/wav';
            //case 'audio/x-wav';
            case 'mp3': return 'audio/mpeg';
            case 'mpg': case 'mpeg': return 'audio/mpeg';
            //case 'audio/mpeg3';
            //case 'audio/x-mpeg-3';
            case 'ogg': return 'audio/ogg';
            default: return '';
        }
    }

    /**
    * Returns the file extension
    * @param filename: the file's name
    */
    public static GetFileExtension (filename: string): string {
        var index = filename.lastIndexOf('.');
        if (index < 0)
            return filename;
        return filename.substring(index + 1);
    }

    /**
     * Converts a string to an UInt8Array
     * @param str: the string to convert
     */
    public static ConvertStringToUInt8Array (str: string): Uint8Array {
        const len = str.length;
        const array = new Uint8Array(len);

        for (let i = 0; i < len; i++)
            array[i] = str.charCodeAt(i);

        return array;
    }

    /**
     * Creates a new File (blob today to fix Edge compatibility)
     * @param buffer the file's buffer
     * @param filename the file's name
     */
    public static CreateFile (buffer: Uint8Array, filename: string): File {
        const options = { type: Tools.GetFileType(this.GetFileExtension(filename)), lastModified: new Date(Date.now()) };
        const blob = new Blob([buffer], options);
        blob['name'] = BabylonTools.GetFilename(filename);
        
        return <File> blob;
    }

    /**
     * Reads the given file
     * @param file the file to read
     * @param asArrayBuffer if the file should be read as array buffer
     */
    public static async ReadFile<T> (file: File, asArrayBuffer?: boolean): Promise<T> {
        return new Promise<T>((resolve) => {
            BabylonTools.ReadFile(file, (data) => resolve(data), null, asArrayBuffer);
        });
    }

    /**
     * Returns the first fil which has the given extension
     * @param extension the extension to check
     */
    public static GetFileByExtension (extension: string): File {
        for (const thing in FilesInputStore.FilesToLoad) {
            var file = BABYLON.FilesInputStore.FilesToLoad[thing];
            if (this.GetFileExtension(file.name) === extension)
                return file;
        }

        return null;
    }

    /**
     * Sorts the given string array alphabetically
     * @param arr: the array to sort
     * @param property: the property to take
     */
    public static SortAlphabetically (arr: any[], property?: string): void {
        arr.sort((a, b) => {
            a = property ? a[property] : a;
            b = property ? b[property] : b;

            a = a.toUpperCase();
            b = b.toUpperCase();

            return (a < b) ? -1 : (a > b) ? 1 : 0;
        });
    }

    /**
     * Returns the constructor name of the given object
     * @param obj the object
     */
    public static GetConstructorName (obj: any): string {
        let ctrName = (obj !== undefined && obj !== null && obj.constructor) ? obj.constructor.name : '';

        if (ctrName === '')
            ctrName = typeof obj;

        return ctrName;
    }
}
