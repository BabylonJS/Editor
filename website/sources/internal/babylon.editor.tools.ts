module BABYLON.EDITOR {
    export class Tools {
        /**
        * Returns a vector3 string from a vector3
        */
        public static GetStringFromVector3(vector: Vector3): string {
            return "" + vector.x + ", " + vector.y + ", " + vector.z;
        }

        /**
        * Returns a vector3 from a vector3 string
        */
        public static GetVector3FromString(vector: string): Vector3 {
            var values = vector.split(",");
            return Vector3.FromArray([parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2])]);
        }

        /**
        * Opens a window popup
        */
        public static OpenWindowPopup(url: string, width: number, height: number): any {

            var features = [
                "width=" + width,
                "height=" + height,
                "top=" + window.screenY + Math.max(window.outerHeight - height, 0) / 2,
                "left=" + window.screenX + Math.max(window.outerWidth - width, 0) / 2,
                "status=no",
                "resizable=yes",
                "toolbar=no",
                "menubar=no",
                "scrollbars=yes"];

            var popup = window.open(url, "Dumped Frame Buffer", features.join(","));

            popup.focus();

            return popup;
        }

        /**
        * Opens a file browser. Checks if electron then open the dialog
        * else open the classic file browser of the browser
        */
        public static OpenFileBrowser(core: EditorCore, elementName: string, onChange: (data: any) => void, isOpenScene: boolean = false): void {
            if (this.CheckIfElectron()) {
                var dialog = require("electron").remote.dialog;

                dialog.showOpenDialog({ properties: ["openFile", "multiSelections"] }, (filenames: string[]) => {
                    ElectronHelper.CreateFilesFromFileNames(filenames, isOpenScene, (files: File[]) => {
                        onChange({ target: { files: files } });
                    });
                });
            }
            else {
                var inputFiles = $(elementName);

                inputFiles.change((data: any) => {
                    onChange(data);
                }).click();
            }
        }

        /**
        * Normlalized the given URI
        */
        public static NormalizeUri(uri: string): string {
            while (uri.indexOf("\\") !== -1)
                uri = uri.replace("\\", "/");

            return uri;
        }

        /**
        * Returns the file extension
        */
        public static GetFileExtension(filename: string): string {
            var index = filename.lastIndexOf(".");
            if (index < 0)
                return filename;
            return filename.substring(index + 1);
        }

        /**
        * Returns the filename without extension
        */
        public static GetFilenameWithoutExtension(filename: string, withPath?: boolean): string {
            var lastDot = filename.lastIndexOf(".");
            var lastSlash = filename.lastIndexOf("/");

            return filename.substring(withPath ? 0 : lastSlash + 1, lastDot);
        }

        /**
        * Returns the file type for the given extension
        */
        public static GetFileType(extension: string): string {
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
        * Returns the base URL of the window
        */
        public static GetBaseURL(): string {
            if (this.CheckIfElectron())
                return __dirname + "/";

            var url = window.location.href;
            url = url.replace(BABYLON.Tools.GetFilename(url), "");

            return url;
        }

        /**
        * Checks if the editor is running in an
        * Electron window
        */
        public static CheckIfElectron(): boolean {
            var process = (<any>window).process;
            return process !== undefined;
        }

        /**
        * Creates an input element
        */
        public static CreateFileInpuElement(id: string): JQuery {
            var input = $("#" + id);

            if (!input[0]) {
                $("#BABYLON-EDITOR-UTILS").append(GUI.GUIElement.CreateElement("input type=\"file\"", id, "display: none;"));
                input = $("#" + id);
            }

            return input;
        }

        /**
        * Beautify a variable name (escapeds + upper case)
        */
        public static BeautifyName(name: string): string {
            var result = name[0].toUpperCase();

            for (var i = 1; i < name.length; i++) {
                var char = name[i];

                if (char === char.toUpperCase())
                    result += " ";

                result += name[i];
            }

            return result;
        }

        /**
        * Cleans an editor project
        */
        public static CleanProject(project: INTERNAL.IProjectRoot): void {
            project.renderTargets = project.renderTargets || [];
            project.sounds = project.sounds || [];
        }

        /**
        * Returns the constructor name of an object
        */
        public static GetConstructorName(obj: any): string {
            var ctrName = (obj && obj.constructor) ? obj.constructor.name : "";
            
            if (ctrName === "") {
                ctrName = typeof obj;
            }
            
            return ctrName;
        }
        
        /**
        * Converts a boolean to integer
        */
        public static BooleanToInt(value: boolean): number {
            return (value === true) ? 1.0 : 0.0;
        }
        
        /**
        * Converts a number to boolean
        */
        public static IntToBoolean(value: number): boolean {
            return !(value === 0.0);
        }

        /**
        * Returns a particle system by its name
        */
        public static GetParticleSystemByName(scene: Scene, name: string): ParticleSystem {
            for (var i = 0; i < scene.particleSystems.length; i++) {
                if (scene.particleSystems[i].name === name)
                    return scene.particleSystems[i];
            }

            return null;
        }

        /**
        * Converts a string to an array buffer
        */
        public static ConvertStringToArray(str: string): Uint8Array {
            var len = str.length;
            var array = new Uint8Array(len);

            for (var i = 0; i < len; i++)
                array[i] = str.charCodeAt(i);

            return array;
        }

        /**
        * Converts a base64 string to array buffer
        * Largely used to convert images, converted into base64 string
        */
        public static ConvertBase64StringToArrayBuffer(base64String: string): Uint8Array {
            var binString = window.atob(base64String.split(",")[1]);

            return Tools.ConvertStringToArray(binString);
        }

        /**
        * Creates a new file object
        */
        public static CreateFile(array: Uint8Array, filename: string): File {
            if (array === null)
                return null;

            var file = new File([new Blob([array])], BABYLON.Tools.GetFilename(filename), {
                type: Tools.GetFileType(Tools.GetFileExtension(filename))
            });

            return file;
        }
    }
}