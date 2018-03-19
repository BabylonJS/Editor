"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var tools_1 = require("../tools/tools");
var request_1 = require("../tools/request");
var storage_1 = require("./storage");
var OneDriveStorage = /** @class */ (function (_super) {
    __extends(OneDriveStorage, _super);
    /**
     * Constructor
     * @param editor: the editor reference
     */
    function OneDriveStorage(editor) {
        return _super.call(this, editor) || this;
    }
    /**
     * Creates the given folders
     * @param folder the parent folder
     * @param names the folders names
     */
    OneDriveStorage.prototype.createFolders = function (folder, names) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, names_1, n, content;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _i = 0, names_1 = names;
                        _a.label = 1;
                    case 1:
                        if (!(_i < names_1.length)) return [3 /*break*/, 4];
                        n = names_1[_i];
                        content = JSON.stringify({
                            "name": n,
                            "folder": {},
                            "@name.conflictBehavior": "rename"
                        });
                        return [4 /*yield*/, request_1.default.Post('https://Api.Onedrive.com/v1.0/drive/items/' + folder + '/children', content, {
                                'Authorization': 'Bearer ' + OneDriveStorage._TOKEN
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates the given files
     * @param folder the parent folder
     * @param files the files to write
     */
    OneDriveStorage.prototype.createFiles = function (folder, files) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, files_1, f;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.login()];
                    case 1:
                        _a.sent();
                        _i = 0, files_1 = files;
                        _a.label = 2;
                    case 2:
                        if (!(_i < files_1.length)) return [3 /*break*/, 5];
                        f = files_1[_i];
                        return [4 /*yield*/, request_1.default.Put('https://Api.Onedrive.com/v1.0/drive/items/' + folder + ':/' + f.name + ':/content', f.data, {
                                'Authorization': 'Bearer ' + OneDriveStorage._TOKEN
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Returns the files available in the given folder
     * @param folder the parent folder
     */
    OneDriveStorage.prototype.getFiles = function (folder) {
        return __awaiter(this, void 0, void 0, function () {
            var files, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.login()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, request_1.default.Get('https://Api.Onedrive.com/v1.0/drive/' + (folder ? 'items/' + folder : 'root') + '/children', {
                                'Authorization': 'Bearer ' + OneDriveStorage._TOKEN
                            })];
                    case 2:
                        files = _a.sent();
                        result = [];
                        files.value.forEach(function (v) {
                            result.push({ name: v.name, folder: v.folder ? v.id : null });
                        });
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Checks the token and expiration
     */
    OneDriveStorage.prototype.login = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, tools_1.default.ImportScript('.build/src/editor/storage/oauth.js')];
                    case 1:
                        _a.sent();
                        now = (Date.now() - OneDriveStorage._TOKEN_EXPIRES_NOW) / 1000;
                        return [2 /*return*/, new Promise(function (resolve) {
                                if (OneDriveStorage._TOKEN === '' || now >= OneDriveStorage._TOKEN_EXPIRES_IN) {
                                    //const clientID = '000000004C18353E'; // editor.babylonjs.com
                                    var clientID = '0000000048182B1B';
                                    var uri = 'https://login.live.com/oauth20_authorize.srf'
                                        + '?client_id=' + clientID
                                        + '&redirect_uri=' + tools_1.default.GetBaseURL() + 'redirect.html'
                                        + '&response_type=token&nonce=7a16fa03-c29d-4e6a-aff7-c021b06a9b27&scope=wl.basic onedrive.readwrite wl.offline_access';
                                    var popup = tools_1.default.OpenPopup(uri, 'OneDrive Auth', 512, 512);
                                    popup['StorageCallback'] = function (token, expiresIn, expiresNow) {
                                        OneDriveStorage._TOKEN = token;
                                        OneDriveStorage._TOKEN_EXPIRES_IN = expiresIn;
                                        OneDriveStorage._TOKEN_EXPIRES_NOW = expiresNow;
                                        resolve();
                                    };
                                }
                                else
                                    resolve();
                            })];
                }
            });
        });
    };
    // Static members
    OneDriveStorage._TOKEN = '';
    OneDriveStorage._TOKEN_EXPIRES_IN = 0;
    OneDriveStorage._TOKEN_EXPIRES_NOW = 0;
    return OneDriveStorage;
}(storage_1.default));
exports.default = OneDriveStorage;
//# sourceMappingURL=one-drive-storage.js.map