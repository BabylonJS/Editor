"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var Tools = /** @class */ (function () {
    function Tools() {
    }
    /**
     * Creates a div element
     * @param style: the div's style
     */
    Tools.CreateElement = function (type, id, style) {
        var div = document.createElement(type);
        div.id = id;
        if (style) {
            for (var thing in style)
                div.style[thing] = style[thing];
        }
        return div;
    };
    /**
    * Returns the constructor name of the given object
    * @param obj the object
    */
    Tools.GetConstructorName = function (obj) {
        var ctrName = (obj && obj.constructor) ? obj.constructor.name : '';
        if (ctrName === '')
            ctrName = typeof obj;
        return ctrName;
    };
    /**
     * Returns if the browser is running in Electron
     */
    Tools.IsElectron = function () {
        return navigator.userAgent.indexOf('Electron') !== -1;
    };
    /**
    * Returns the file type for the given extension
    */
    Tools.GetFileType = function (extension) {
        switch (extension) {
            case "png": return "image/png";
            case "jpg":
            case "jpeg": return "image/jpeg";
            case "bmp": return "image/bmp";
            case "tga": return "image/targa";
            case "dds": return "image/vnd.ms-dds";
            case "wav":
            case "wave": return "audio/wav";
            //case "audio/x-wav";
            case "mp3": return "audio/mp3";
            case "mpg":
            case "mpeg": return "audio/mpeg";
            //case "audio/mpeg3";
            //case "audio/x-mpeg-3";
            case "ogg": return "audio/ogg";
            default: return "";
        }
    };
    /**
     * Creates a window popup
     * @param url the URL of the popup
     * @param name: the name of the popup
     * @param width the width of the popup
     * @param height the height of the popup
     */
    Tools.OpenPopup = function (url, name, width, height) {
        var features = [
            'width=' + width,
            'height=' + height,
            'top=' + window.screenY + Math.max(window.outerHeight - height, 0) / 2,
            'left=' + window.screenX + Math.max(window.outerWidth - width, 0) / 2,
            'status=no',
            'resizable=yes',
            'toolbar=no',
            'menubar=no',
            'scrollbars=yes',
            'nodeIntegration=no'
        ];
        var popup = window.open(url, name, features.join(','));
        popup.focus();
        return popup;
    };
    /**
    * Returns the file extension
    * @param filename: the file's name
    */
    Tools.GetFileExtension = function (filename) {
        var index = filename.lastIndexOf(".");
        if (index < 0)
            return filename;
        return filename.substring(index + 1);
    };
    /**
    * Returns the filename without extension
    * @param filename: the filename (path)
    * @param withPath: if the return value should contain all path
    */
    Tools.GetFilenameWithoutExtension = function (filename, withPath) {
        var lastDot = filename.lastIndexOf(".");
        var lastSlash = filename.lastIndexOf("/");
        return filename.substring(withPath ? 0 : lastSlash + 1, lastDot);
    };
    /**
     * Returns the filename
     * @param filename: the complete filename with path
     */
    Tools.GetFilename = function (filename) {
        return this.GetFilenameWithoutExtension(filename, false) + '.' + this.GetFileExtension(filename);
    };
    /**
     * Creates an open file dialog
     * @param callback called once the user selects files
     */
    Tools.OpenFileDialog = function (callback) {
        var _this = this;
        var input = Tools.CreateElement('input', 'TextureViewerInput');
        input.type = 'file';
        input.multiple = true;
        input.onchange = function (ev) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                callback(ev.target['files']);
                input.remove();
                return [2 /*return*/];
            });
        }); };
        input.click();
    };
    /**
     * Returns the base url of the window
     */
    Tools.GetBaseURL = function () {
        var url = window.location.href;
        url = url.replace(babylonjs_1.Tools.GetFilename(url), '');
        return url;
    };
    /**
     * Sorts the given string array alphabetically
     * @param arr: the array to sort
     * @param property: the property to take
     */
    Tools.SortAlphabetically = function (arr, property) {
        arr.sort(function (a, b) {
            a = property ? a[property] : a;
            b = property ? b[property] : b;
            a = a.toUpperCase();
            b = b.toUpperCase();
            return (a < b) ? -1 : (a > b) ? 1 : 0;
        });
    };
    /**
     * Creates a new File (blob today to fix Edge compatibility)
     * @param buffer the file's buffer
     * @param filename the file's name
     */
    Tools.CreateFile = function (buffer, filename) {
        var blob = new Blob([buffer], { type: Tools.GetFileType(this.GetFileExtension(filename)) });
        blob['name'] = babylonjs_1.Tools.GetFilename(filename);
        return blob;
    };
    /**
     * Loads a file using HTTP request
     * @param url the url of the file
     * @param arrayBuffer if should load file as arraybuffer
     */
    Tools.LoadFile = function (url, arrayBuffer) {
        if (arrayBuffer === void 0) { arrayBuffer = false; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        babylonjs_1.Tools.LoadFile(url, function (data) { return resolve(data); }, null, null, arrayBuffer, function (r, e) { return reject(e); });
                    })];
            });
        });
    };
    /**
     * Loads a file and creates a new File added to the FilesToLoad
     * @param url: the URLof the file
     */
    Tools.CreateFileFromURL = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var filename, data, file, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filename = babylonjs_1.Tools.GetFilename(url).toLowerCase();
                        if (babylonjs_1.FilesInput.FilesToLoad[filename])
                            return [2 /*return*/, babylonjs_1.FilesInput.FilesToLoad[filename]];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.LoadFile(url, true)];
                    case 2:
                        data = _a.sent();
                        file = this.CreateFile(new Uint8Array(data), filename);
                        babylonjs_1.FilesInput.FilesToLoad[filename] = file;
                        return [2 /*return*/, file];
                    case 3:
                        e_1 = _a.sent();
                        return [2 /*return*/, Promise.reject(e_1)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
    * Converts a string to an UInt8Array
    $ @param str: the string to convert
    */
    Tools.ConvertStringToUInt8Array = function (str) {
        var len = str.length;
        var array = new Uint8Array(len);
        for (var i = 0; i < len; i++)
            array[i] = str.charCodeAt(i);
        return array;
    };
    /**
     * Reads the given file
     * @param file the file to read
     * @param arrayBuffer if should read as array buffer
     */
    Tools.ReadFile = function (file, arrayBuffer) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        babylonjs_1.Tools.ReadFile(file, function (data) {
                            resolve(data);
                        }, null, arrayBuffer);
                    })];
            });
        });
    };
    /**
     * Reads a file as base 64
     * @param file the file to read
     */
    Tools.ReadFileAsBase64 = function (file) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        babylonjs_1.Tools.ReadFileAsDataURL(file, function (data) {
                            resolve(data);
                        }, null);
                    })];
            });
        });
    };
    /**
     * Reads a file as text
     * @param file the file to read
     */
    Tools.ReadFileAsText = function (file) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ReadFile(file, false)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Reads a file as array buffer
     * @param file the file to read
     */
    Tools.ReadFileAsArrayBuffer = function (file) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ReadFile(file, true)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Imports a new script returning its exported object
     * @param url the URL / NAME of the script
     */
    Tools.ImportScript = function (url) {
        return System.import(url);
    };
    return Tools;
}());
exports.default = Tools;
//# sourceMappingURL=tools.js.map