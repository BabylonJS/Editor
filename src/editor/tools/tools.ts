import { Tools as BabylonTools, FilesInput } from 'babylonjs';
import { IStringDictionary } from '../typings/typings';

export default class Tools {
    /**
     * Creates a div element
     * @param style: the div's style
     */
    public static CreateElement (type: string, id: string, style?: IStringDictionary<string>): HTMLElement {
        const div = document.createElement(type);
        div.id = id;

        if (style) {
            for (const thing in style)
                div.style[thing] = style[thing];
        }

        return div;
    }

    /**
    * Returns the constructor name of the given object
    * @param obj the object
    */
    public static GetConstructorName (obj: any): string {
        let ctrName = (obj && obj.constructor) ? obj.constructor.name : '';

        if (ctrName === '')
            ctrName = typeof obj;

        return ctrName;
    }

    /**
    * Returns the file type for the given extension
    */
    public static GetFileType (extension: string): string {
        switch (extension) {
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "bmp": return "image/bmp";
            case "tga": return "image/targa";
            case "dds": return "image/vnd.ms-dds";
            case "wav": case "wave": return "audio/wav";
            //case "audio/x-wav";
            case "mp3": return "audio/mp3";
            case "mpg": case "mpeg": return "audio/mpeg";
            //case "audio/mpeg3";
            //case "audio/x-mpeg-3";
            case "ogg": return "audio/ogg";
            default: return "";
        }
    }

    /**
    * Returns the file extension
    * @param filename: the file's name
    */
    public static GetFileExtension (filename: string): string {
        var index = filename.lastIndexOf(".");
        if (index < 0)
            return filename;
        return filename.substring(index + 1);
    }

    /**
    * Returns the filename without extension
    */
    public static GetFilenameWithoutExtension (filename: string, withPath?: boolean): string {
        var lastDot = filename.lastIndexOf(".");
        var lastSlash = filename.lastIndexOf("/");

        return filename.substring(withPath ? 0 : lastSlash + 1, lastDot);
    }

    /**
     * Creates a new File (blob today to fix Edge compatibility)
     * @param buffer the file's buffer
     * @param filename the file's name
     */
    public static CreateFile (buffer: Uint8Array, filename: string): File {
        const blob = new Blob([buffer], { type: Tools.GetFileType(this.GetFileExtension(filename)) });
        blob['name'] = BabylonTools.GetFilename(filename);

        return <File> blob;
    }

    /**
     * Loads a file using HTTP request
     * @param url the url of the file
     * @param arrayBuffer if should load file as arraybuffer
     */
    public static async LoadFile<T> (url: string, arrayBuffer: boolean = false): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            BabylonTools.LoadFile(url, (data: T) => resolve(data), null, null, arrayBuffer, (r, e) => reject(e));
        });
    }

    /**
     * Loads a file and creates a new File added to the FilesToLoad
     * @param url: the URLof the file
     */
    public static async CreateFileFromURL (url: string): Promise<File> {
        const filename = BabylonTools.GetFilename(url).toLowerCase();

        if (FilesInput.FilesToLoad[filename])
            return FilesInput.FilesToLoad[filename];

        try {
            const data = await this.LoadFile<ArrayBuffer>(url, true);
            const file = this.CreateFile(new Uint8Array(data), filename);

            FilesInput.FilesToLoad[filename] = file;
            return file;
        }
        catch (e) {
            return Promise.reject(e);
        }
    }

    /**
     * Imports a new script returning its exported object
     * @param url the URL / NAME of the script
     */
    public static ImportScript<T> (url: string): Promise<T> {
        return System.import(url);
    }
}