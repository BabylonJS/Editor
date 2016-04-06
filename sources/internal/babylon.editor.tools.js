var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Tools = (function () {
            function Tools() {
            }
            /**
            * Returns a vector3 string from a vector3
            */
            Tools.GetStringFromVector3 = function (vector) {
                return "" + vector.x + ", " + vector.y + ", " + vector.z;
            };
            /**
            * Returns a vector3 from a vector3 string
            */
            Tools.GetVector3FromString = function (vector) {
                var values = vector.split(",");
                return BABYLON.Vector3.FromArray([parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2])]);
            };
            /**
            * Converts a base64 string to array buffer
            * Largely used to convert images, converted into base64 string
            */
            Tools.ConvertBase64StringToArrayBuffer = function (base64String) {
                var binString = window.atob(base64String.split(",")[1]);
                var len = binString.length;
                var array = new Uint8Array(len);
                for (var i = 0; i < len; i++)
                    array[i] = binString.charCodeAt(i);
                return array;
            };
            /**
            * Opens a window popup
            */
            Tools.OpenWindowPopup = function (url, width, height) {
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
            };
            /**
            * Returns the base URL of the window
            */
            Tools.getBaseURL = function () {
                var url = window.location.href;
                url = url.replace(BABYLON.Tools.GetFilename(url), "");
                return url;
            };
            /**
            * Creates an input element
            */
            Tools.CreateFileInpuElement = function (id) {
                var input = $("#" + id);
                if (!input[0])
                    $("#BABYLON-EDITOR-UTILS").append(EDITOR.GUI.GUIElement.CreateElement("input type=\"file\"", id, "display: none;"));
                return input;
            };
            /**
            * Beautify a variable name (escapeds + upper case)
            */
            Tools.BeautifyName = function (name) {
                var result = name[0].toUpperCase();
                for (var i = 1; i < name.length; i++) {
                    var char = name[i];
                    if (char === char.toUpperCase())
                        result += " ";
                    result += name[i];
                }
                return result;
            };
            /**
            * Cleans an editor project
            */
            Tools.CleanProject = function (project) {
                project.renderTargets = project.renderTargets || [];
            };
            /**
            * Returns the constructor name of an object
            */
            Tools.GetConstructorName = function (obj) {
                var ctrName = (obj && obj.constructor) ? obj.constructor.name : "";
                if (ctrName === "") {
                    ctrName = typeof obj;
                }
                return ctrName;
            };
            /**
            * Converts a boolean to integer
            */
            Tools.BooleanToInt = function (value) {
                return (value === true) ? 1.0 : 0.0;
            };
            /**
            * Converts a number to boolean
            */
            Tools.IntToBoolean = function (value) {
                return !(value === 0.0);
            };
            /**
            * Returns a particle system by its name
            */
            Tools.GetParticleSystemByName = function (scene, name) {
                for (var i = 0; i < scene.particleSystems.length; i++) {
                    if (scene.particleSystems[i].name === name)
                        return scene.particleSystems[i];
                }
                return null;
            };
            return Tools;
        })();
        EDITOR.Tools = Tools;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
