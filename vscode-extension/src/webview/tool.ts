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
}
