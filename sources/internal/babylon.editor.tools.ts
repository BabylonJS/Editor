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
        }

        /**
        *
        */
        public static getBaseURL(): string {
            var url = window.location.href;
            url = url.replace(BABYLON.Tools.GetFilename(url), "");

            return url;
        }
    }
}