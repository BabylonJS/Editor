import { Tools as BabylonTools, FilesInputStore, Scene, BaseTexture } from 'babylonjs';
import { IStringDictionary } from '../typings/typings';

export default class Tools {
    // Public members
    public static PendingFilesToLoad: number = 0;
    public static IsStandalone: boolean = true;
    public static Version: string = '';
    public static Epsilon: number = 2.220446049250313e-16;

    /**
     * Creates a div element
     * @param style: the div's style
     */
    public static CreateElement<T extends HTMLElement> (type: string, id: string, style?: IStringDictionary<string>): T {
        const div = document.createElement(type);
        div.id = id;

        if (style) {
            for (const thing in style)
                div.style[thing] = style[thing];
        }

        return <T> div;
    }

    /**
     * Returns if the given element is a child (recursively) of the given parent
     * @param element the element being possibily a child of the given parent
     * @param parent the parent to check
     */
    public static IsElementChildOf (element: HTMLElement, parent: HTMLElement): boolean {
        while (element.parentElement) {
            if (element === parent)
                return true;
            
            element = element.parentElement;
        }

        return false;
    }

    /**
     * Returns if the focused element in the DOM is an input
     */
    public static IsFocusingInputElement (): boolean {
        const e = document.activeElement;
        if (e) {
            return e.tagName === 'INPUT' || e.tagName === 'TEXTAREA';
        }

        return false;
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

    /**
     * Returns if the browser is running in Electron
     */
    public static IsElectron (): boolean {
        return navigator.userAgent.indexOf('Electron') !== -1;
    }

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
     * Creates a window popup
     * @param url the URL of the popup
     * @param name: the name of the popup
     * @param width the width of the popup
     * @param height the height of the popup
     */
    public static OpenPopup(url: string, name: string, width: number, height: number): Window {
        const features = [
            'width=' + width,
            'height=' + height,
            'top=' + window.screenY + Math.max(window.outerHeight - height, 0) / 2,
            'left=' + window.screenX + Math.max(window.outerWidth - width, 0) / 2,
            'status=no',
            'resizable=yes',
            'toolbar=no',
            'menubar=no',
            'menubar=no',
            'scrollbars=yes',
            'dependent=yes',
            'nodeIntegration=no'];

        const popup = window.open(url, name, features.join(','));
        popup.focus();

        return popup;
    }

    /**
     * Set window's title
     * @param title the title of the window
     */
    public static SetWindowTitle (title: string): void {
        document.title = `Babylon.js Editor ${this.Version} - (${title})`;
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
    * Returns the filename without extension
    * @param filename: the filename (path)
    * @param withPath: if the return value should contain all path
    */
    public static GetFilenameWithoutExtension (filename: string, withPath?: boolean): string {
        const lastDot = filename.lastIndexOf('.');
        
        let lastSlash = filename.lastIndexOf('/');
        if (lastSlash === -1)
            lastSlash = filename.lastIndexOf('\\'); // Windows

        return filename.substring(withPath ? 0 : lastSlash + 1, lastDot);
    }

    /**
     * Returns the filename
     * @param filename: the complete filename with path
     */
    public static GetFilename (filename: string): string {
        return this.GetFilenameWithoutExtension(filename, false) + '.' + this.GetFileExtension(filename);
    }

    /**
     * Returns the first texture found wich has the given name
     * @param scene the scene containing the textures
     * @param name the name of the texture to find
     */
    public static GetTextureByName (scene: Scene, name: string): BaseTexture {
        for (const t of scene.textures) {
            if (t.name === name)
                return t;
        }

        return null;
    }

    /**
     * Creates an open file dialog
     * @param callback called once the user selects files
     */
    public static async OpenFileDialog (callback?: (files: File[]) => void): Promise<File[]> {
        return new Promise<File[]>((resolve, reject) => {
            const input = Tools.CreateElement<HTMLInputElement>('input', 'TextureViewerInput');
            input.type = 'file';
            input.multiple = true;
            input.onchange = (ev: Event) => {
                callback && callback(<File[]> ev.target['files']);
                input.remove();

                resolve(ev.target['files']);
            };
            input.click();
        });
    }

    /**
     * Returns the base url of the window
     */
    public static GetBaseURL (): string {
        let url = window.location.href;
        url = url.replace(BabylonTools.GetFilename(url), '');

        return url;
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
     * Creates a new File (blob today to fix Edge compatibility)
     * @param buffer the file's buffer
     * @param filename the file's name
     */
    public static CreateFile (buffer: Uint8Array, filename: string): File {
        const options = { type: Tools.GetFileType(this.GetFileExtension(filename)), lastModified: new Date(Date.now()) };
        const blob = new Blob([buffer], options);
        blob['name'] = BabylonTools.GetFilename(filename);
        blob['lastModified'] = Date.now();
        blob['lastModifiedDate'] = new Date(Date.now());
        
        return <File> blob;
    }

    /**
     * Loads a file using HTTP request
     * @param url the url of the file
     * @param arrayBuffer if should load file as arraybuffer
     */
    public static async LoadFile<T extends string | ArrayBuffer> (url: string, arrayBuffer: boolean = false, onProgress?: (data?: any) => void): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.PendingFilesToLoad++;

            BabylonTools.LoadFile(url, (data: T) => {
                this.PendingFilesToLoad--;
                resolve(data);
            }, (data) => {
                if (onProgress)
                    onProgress(data);
            }, null, arrayBuffer, (r, e) => {
                this.PendingFilesToLoad--;
                reject(e);
            });
        });
    }

    /**
     * Loads a file and creates a new File added to the FilesToLoad
     * @param url: the URLof the file
     */
    public static async CreateFileFromURL (url: string): Promise<File> {
        const filename = BabylonTools.GetFilename(url).toLowerCase();

        if (FilesInputStore.FilesToLoad[filename])
            return FilesInputStore.FilesToLoad[filename];

        try {
            const data = await this.LoadFile<ArrayBuffer>(url, true);
            const file = this.CreateFile(new Uint8Array(data), filename);

            FilesInputStore.FilesToLoad[filename] = file;
            return file;
        }
        catch (e) {
            return Promise.reject(e);
        }
    }

    /**
     * Loads a file and creates a new File
     * @param url the URLof the file
     */
    public static async GetFile (url: string): Promise<File> {
        const filename = BabylonTools.GetFilename(url).toLowerCase();

        try {
            const data = await this.LoadFile<ArrayBuffer>(url, true);
            const file = this.CreateFile(new Uint8Array(data), filename);

            FilesInputStore.FilesToLoad[filename] = file;
            return file;
        }
        catch (e) {
            return Promise.reject(e);
        }
    }

    /**
     * Returns the given file path (for electron)
     * @param file the file to get its path
     */
    public static GetFilePath (file: File): string {
        return file['path'] || '';
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
     * Copy the values of all of the enumerable own properties from one or more source objects to a
     * target object. Returns the target object.
     * @param target The target object to copy to.
     * @param sources One or more source objects from which to copy properties
     */
    public static Assign<T> (target: Object, ...sources: Object[]): T {
        sources.forEach(a => {
            for (const key in a)
                target[key] = a[key];
        });

        return <T> target;
    }

    /**
     * Deep clones the given object. Take care of cycling objects!
     * @param data the data of the object to clone
     */
    public static Clone<T> (data: T): T {
        return JSON.parse(JSON.stringify(data));
    }

    /**
     * Reads the given file
     * @param file the file to read
     * @param arrayBuffer if should read as array buffer
     */
    public static async ReadFile<T extends string | ArrayBuffer> (file: File, arrayBuffer: boolean): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            BabylonTools.ReadFile(file, (data: T) => {
                resolve(data);
            }, null, arrayBuffer);
        });
    }

    /**
     * Reads a file as base 64
     * @param file the file to read
     */
    public static async ReadFileAsBase64 (file: File): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            BabylonTools.ReadFileAsDataURL(file, (data: string) => {
                resolve(data);
            }, null);
        });
    }

    /**
     * Reads a file as text
     * @param file the file to read
     */
    public static async ReadFileAsText (file: File): Promise<string> {
        return await this.ReadFile<string>(file, false);
    }

    /**
     * Reads a file as array buffer
     * @param file the file to read
     */
    public static async ReadFileAsArrayBuffer (file: File): Promise<ArrayBuffer> {
        return await this.ReadFile<ArrayBuffer>(file, true);
    }

    /**
     * Imports a new script returning its exported object
     * @param url the URL / NAME of the script
     */
    public static ImportScript<T> (url: string): Promise<T> {
        return System.import(url);
    }

    /**
     * According to the navigator, returns if the file API
     * is supported
     */
    public static isFileApiSupported (showAlert?: boolean): boolean {
        try {
            const f = new File([''], 'test.txt', {
                type: this.GetFileExtension('test.txt')
            });

            return true;
        } catch (e) {
            if (showAlert)
                alert('Your navigator doesn\'t support full File API. Cannot load the scene. Please try with another navigator.');
            
            return false;
        }
    }
}