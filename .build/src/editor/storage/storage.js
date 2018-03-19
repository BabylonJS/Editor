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
var picker_1 = require("../gui/picker");
var tools_1 = require("../tools/tools");
var window_1 = require("../gui/window");
var Storage = /** @class */ (function () {
    /**
     * Constructor
     * @param editor: the editor reference
     */
    function Storage(editor) {
        this.picker = null;
        // Protected members
        this.filesCount = 0;
        this._uploadedCount = 0;
        this.editor = editor;
    }
    /**
     * Opens the folder picker
     * @param title the title of the picker
     */
    Storage.prototype.openPicker = function (title, filesToWrite, folder) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var files, current, previous;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!folder) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.uploadFiles(folder, filesToWrite)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [4 /*yield*/, this.getFiles(folder)];
                    case 3:
                        files = _a.sent();
                        current = { folder: 'root', name: 'root' };
                        previous = [];
                        this.picker = new picker_1.default('Export...');
                        this.picker.addItems(files);
                        this.picker.open(function (items) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, this.uploadFiles(current.folder, filesToWrite)];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        }); }); });
                        this.picker.grid.onClick = function (ids) { return __awaiter(_this, void 0, void 0, function () {
                            var id, file, _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        id = ids[0];
                                        file = (id === 0 && current) ? previous.pop() : files[id];
                                        if (file === current)
                                            file = previous.pop();
                                        if (!(!file || file.folder)) return [3 /*break*/, 2];
                                        if (file)
                                            previous.push(file);
                                        current = file;
                                        this.picker.window.lock('Loading ' + (file ? file.name : 'Root') + '...');
                                        _b = (_a = (!tools_1.default.IsElectron() ? [{ name: '..', folder: null }] : [])).concat;
                                        return [4 /*yield*/, this.getFiles(tools_1.default.IsElectron() ? files[id].folder : (file ? file.folder : null))];
                                    case 1:
                                        files = _b.apply(_a, [_c.sent()]);
                                        this.picker.window.unlock();
                                        this.picker.clear();
                                        this.picker.addItems(files);
                                        this.picker.refreshGrid();
                                        _c.label = 2;
                                    case 2: return [2 /*return*/];
                                }
                            });
                        }); };
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Uploads the files
     * @param folder the target folder
     * @param filesToWrite the files to upload
     */
    Storage.prototype.uploadFiles = function (folder, filesToWrite) {
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this._uploadedCount = 0;
                        this.filesCount = this.recursivelyGetFilesToUploadCount(filesToWrite);
                        this.editor.layout.element.sizeTo('bottom', 50);
                        this.editor.layout.lockPanel('bottom', "Uploading... (" + this._uploadedCount + " / " + this.filesCount + ")", true);
                        this.onCreateFiles && this.onCreateFiles(folder);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.recursivelyCreateFiles(folder, filesToWrite)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        window_1.default.CreateAlert('Cannot upload: ' + e_1, 'Uploading Error');
                        return [3 /*break*/, 4];
                    case 4:
                        // Unlock
                        this.editor.layout.unlockPanel('bottom');
                        this.editor.layout.element.sizeTo('bottom', 0);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Recursively creates the given files (uncluding folders)
     * @param folder: the parent folder of the files
     * @param files files to create
     */
    Storage.prototype.recursivelyCreateFiles = function (folder, files) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var folders, promises, _i, files_1, f, _a, folders_1, f, newFiles, _loop_1, this_1, _b, folders_2, f;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        folders = [];
                        promises = [];
                        // Create files
                        for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                            f = files_1[_i];
                            if (f.folder)
                                folders.push(f);
                            else {
                                promises.push(this.createFiles(folder, [f]).then(function () {
                                    _this.uploadedCount++;
                                }));
                            }
                        }
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        _c.sent();
                        // Create folders
                        promises.splice(0, promises.length);
                        for (_a = 0, folders_1 = folders; _a < folders_1.length; _a++) {
                            f = folders_1[_a];
                            promises.push(this.createFolders(folder, [f.name]).then(function () {
                                _this.uploadedCount++;
                            }));
                        }
                        return [4 /*yield*/, Promise.all(promises)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, this.getFiles(folder)];
                    case 3:
                        newFiles = _c.sent();
                        _loop_1 = function (f) {
                            var newFolders;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        newFolders = newFiles.filter(function (nf) { return nf.name === f.name; });
                                        return [4 /*yield*/, this_1.recursivelyCreateFiles(newFolders[0].folder, f.folder)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _b = 0, folders_2 = folders;
                        _c.label = 4;
                    case 4:
                        if (!(_b < folders_2.length)) return [3 /*break*/, 7];
                        f = folders_2[_b];
                        return [5 /*yield**/, _loop_1(f)];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6:
                        _b++;
                        return [3 /*break*/, 4];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Returns the number of files to upload
     * @param files the files to count
     */
    Storage.prototype.recursivelyGetFilesToUploadCount = function (files) {
        var _this = this;
        var count = 0;
        files.forEach(function (f) {
            if (f.folder)
                count += _this.recursivelyGetFilesToUploadCount(f.folder);
            else
                count++;
        });
        return count;
    };
    Object.defineProperty(Storage.prototype, "uploadedCount", {
        /**
         * Returns the number of uploaded files
         */
        get: function () {
            return this._uploadedCount;
        },
        /**
         * Sets the new uploaded count files
         * @param value: the number of uploaded files
         */
        set: function (value) {
            this._uploadedCount = value;
            this.editor.layout.lockPanel('bottom', "Uploading... (" + this._uploadedCount + " / " + this.filesCount + ")", true);
        },
        enumerable: true,
        configurable: true
    });
    return Storage;
}());
exports.default = Storage;
//# sourceMappingURL=storage.js.map