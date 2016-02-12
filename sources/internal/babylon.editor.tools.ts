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
        * Converts a base64 string to array buffer
        * Largely used to convert images, converted into base64 string
        */
        public static ConvertBase64StringToArrayBuffer(base64String: string): Uint8Array {
            var binString = window.atob(base64String.split(",")[1]);
            var len = binString.length;
            var array = new Uint8Array(len);

            for (var i = 0; i < len; i++)
                array[i] = binString.charCodeAt(i);

            return array;
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
        * Returns the base URL of the window
        */
        public static getBaseURL(): string {
            var url = window.location.href;
            url = url.replace(BABYLON.Tools.GetFilename(url), "");

            return url;
        }

        /**
        * Creates an input element
        */
        public static CreateFileInpuElement(id: string): JQuery {
            var input = $("#" + id);

            if (!input[0])
                $("#BABYLON-EDITOR-UTILS").append(GUI.GUIElement.CreateElement("input type=\"file\"", id, "display: none;"));

            return input;
        }
    }
}