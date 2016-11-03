var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        /**
        * Event Type
        */
        (function (EventType) {
            EventType[EventType["SCENE_EVENT"] = 0] = "SCENE_EVENT";
            EventType[EventType["GUI_EVENT"] = 1] = "GUI_EVENT";
            EventType[EventType["KEY_EVENT"] = 2] = "KEY_EVENT";
            EventType[EventType["UNKNOWN"] = 3] = "UNKNOWN";
        })(EDITOR.EventType || (EDITOR.EventType = {}));
        var EventType = EDITOR.EventType;
        (function (GUIEventType) {
            GUIEventType[GUIEventType["FORM_CHANGED"] = 0] = "FORM_CHANGED";
            GUIEventType[GUIEventType["FORM_TOOLBAR_CLICKED"] = 1] = "FORM_TOOLBAR_CLICKED";
            GUIEventType[GUIEventType["LAYOUT_CHANGED"] = 2] = "LAYOUT_CHANGED";
            GUIEventType[GUIEventType["PANEL_CHANGED"] = 3] = "PANEL_CHANGED";
            GUIEventType[GUIEventType["GRAPH_SELECTED"] = 4] = "GRAPH_SELECTED";
            GUIEventType[GUIEventType["GRAPH_DOUBLE_SELECTED"] = 5] = "GRAPH_DOUBLE_SELECTED";
            GUIEventType[GUIEventType["TAB_CHANGED"] = 6] = "TAB_CHANGED";
            GUIEventType[GUIEventType["TAB_CLOSED"] = 7] = "TAB_CLOSED";
            GUIEventType[GUIEventType["TOOLBAR_MENU_SELECTED"] = 8] = "TOOLBAR_MENU_SELECTED";
            GUIEventType[GUIEventType["GRAPH_MENU_SELECTED"] = 9] = "GRAPH_MENU_SELECTED";
            GUIEventType[GUIEventType["GRID_SELECTED"] = 10] = "GRID_SELECTED";
            GUIEventType[GUIEventType["GRID_ROW_REMOVED"] = 11] = "GRID_ROW_REMOVED";
            GUIEventType[GUIEventType["GRID_ROW_ADDED"] = 12] = "GRID_ROW_ADDED";
            GUIEventType[GUIEventType["GRID_ROW_EDITED"] = 13] = "GRID_ROW_EDITED";
            GUIEventType[GUIEventType["GRID_ROW_CHANGED"] = 14] = "GRID_ROW_CHANGED";
            GUIEventType[GUIEventType["GRID_MENU_SELECTED"] = 15] = "GRID_MENU_SELECTED";
            GUIEventType[GUIEventType["GRID_RELOADED"] = 16] = "GRID_RELOADED";
            GUIEventType[GUIEventType["WINDOW_BUTTON_CLICKED"] = 17] = "WINDOW_BUTTON_CLICKED";
            GUIEventType[GUIEventType["OBJECT_PICKED"] = 18] = "OBJECT_PICKED";
            GUIEventType[GUIEventType["DOCUMENT_CLICK"] = 19] = "DOCUMENT_CLICK";
            GUIEventType[GUIEventType["DOCUMENT_UNCLICK"] = 20] = "DOCUMENT_UNCLICK";
            GUIEventType[GUIEventType["DOCUMENT_KEY_DOWN"] = 21] = "DOCUMENT_KEY_DOWN";
            GUIEventType[GUIEventType["DOCUMENT_KEY_UP"] = 22] = "DOCUMENT_KEY_UP";
            GUIEventType[GUIEventType["UNKNOWN"] = 23] = "UNKNOWN";
        })(EDITOR.GUIEventType || (EDITOR.GUIEventType = {}));
        var GUIEventType = EDITOR.GUIEventType;
        (function (SceneEventType) {
            SceneEventType[SceneEventType["OBJECT_PICKED"] = 0] = "OBJECT_PICKED";
            SceneEventType[SceneEventType["OBJECT_ADDED"] = 1] = "OBJECT_ADDED";
            SceneEventType[SceneEventType["OBJECT_REMOVED"] = 2] = "OBJECT_REMOVED";
            SceneEventType[SceneEventType["OBJECT_CHANGED"] = 3] = "OBJECT_CHANGED";
            SceneEventType[SceneEventType["NEW_SCENE_CREATED"] = 4] = "NEW_SCENE_CREATED";
            SceneEventType[SceneEventType["UNKNOWN"] = 4] = "UNKNOWN";
        })(EDITOR.SceneEventType || (EDITOR.SceneEventType = {}));
        var SceneEventType = EDITOR.SceneEventType;
        /**
        * Base Event
        */
        var BaseEvent = (function () {
            function BaseEvent(data) {
                this.data = data;
            }
            return BaseEvent;
        }());
        EDITOR.BaseEvent = BaseEvent;
        /**
        * Scene Event
        */
        var SceneEvent = (function (_super) {
            __extends(SceneEvent, _super);
            /**
            * Constructor
            * @param object: the object generating the event
            */
            function SceneEvent(object, eventType, data) {
                _super.call(this, data);
                this.object = object;
                this.eventType = eventType;
            }
            return SceneEvent;
        }(BaseEvent));
        EDITOR.SceneEvent = SceneEvent;
        /**
        * GUI Event
        */
        var GUIEvent = (function (_super) {
            __extends(GUIEvent, _super);
            /**
            * Constructor
            * @param caller: gui element calling the event
            * @param eventType: the gui event type
            */
            function GUIEvent(caller, eventType, data) {
                _super.call(this, data);
                this.caller = caller;
                this.eventType = eventType;
            }
            return GUIEvent;
        }(BaseEvent));
        EDITOR.GUIEvent = GUIEvent;
        /**
        * Key Event
        */
        var KeyEvent = (function (_super) {
            __extends(KeyEvent, _super);
            function KeyEvent(key, control, isDown, data) {
                _super.call(this, data);
                this.key = key;
                this.control = control;
                this.isDown = isDown;
            }
            return KeyEvent;
        }(BaseEvent));
        EDITOR.KeyEvent = KeyEvent;
        /**
        * IEvent implementation
        */
        var Event = (function () {
            function Event() {
                this.eventType = EventType.UNKNOWN;
                this.sceneEvent = null;
                this.guiEvent = null;
                this.keyEvent = null;
            }
            Event.sendSceneEvent = function (object, type, core) {
                var ev = new Event();
                ev.eventType = EventType.SCENE_EVENT;
                ev.sceneEvent = new SceneEvent(object, type);
                core.sendEvent(ev);
            };
            Event.sendGUIEvent = function (object, type, core, data) {
                var ev = new Event();
                ev.eventType = EventType.GUI_EVENT;
                ev.guiEvent = new GUIEvent(object, type, data);
                core.sendEvent(ev);
            };
            Event.sendKeyEvent = function (key, control, isDown, core, data) {
                var ev = new Event();
                ev.eventType = EventType.KEY_EVENT;
                ev.keyEvent = new KeyEvent(key, control, isDown, data);
                core.sendEvent(ev);
            };
            return Event;
        }());
        EDITOR.Event = Event;
        /**
        * Statics
        */
        /**
        * Sends a scene event
        */
        var sendSceneEvent = function (object, type, core) {
            var ev = new Event();
            ev.eventType = EventType.SCENE_EVENT;
            ev.sceneEvent = new SceneEvent(object, type);
            core.sendEvent(ev);
        };
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
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
            * Opens a file browser. Checks if electron then open the dialog
            * else open the classic file browser of the browser
            */
            Tools.OpenFileBrowser = function (core, elementName, onChange, isOpenScene) {
                if (isOpenScene === void 0) { isOpenScene = false; }
                if (this.CheckIfElectron()) {
                    var dialog = require("electron").remote.dialog;
                    dialog.showOpenDialog({ properties: ["openFile", "multiSelections"] }, function (filenames) {
                        EDITOR.ElectronHelper.CreateFilesFromFileNames(filenames, isOpenScene, function (files) {
                            onChange({ target: { files: files } });
                        });
                    });
                }
                else {
                    var inputFiles = $(elementName);
                    inputFiles.change(function (data) {
                        onChange(data);
                    }).click();
                }
            };
            /**
            * Normlalized the given URI
            */
            Tools.NormalizeUri = function (uri) {
                while (uri.indexOf("\\") !== -1)
                    uri = uri.replace("\\", "/");
                return uri;
            };
            /**
            * Returns the file extension
            */
            Tools.GetFileExtension = function (filename) {
                var index = filename.lastIndexOf(".");
                if (index < 0)
                    return filename;
                return filename.substring(index + 1);
            };
            /**
            * Returns the filename without extension
            */
            Tools.GetFilenameWithoutExtension = function (filename, withPath) {
                var lastDot = filename.lastIndexOf(".");
                var lastSlash = filename.lastIndexOf("/");
                return filename.substring(withPath ? 0 : lastSlash + 1, lastDot);
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
            * Returns the base URL of the window
            */
            Tools.GetBaseURL = function () {
                if (this.CheckIfElectron())
                    return __dirname + "/";
                var url = window.location.href;
                url = url.replace(BABYLON.Tools.GetFilename(url), "");
                return url;
            };
            /**
            * Checks if the editor is running in an
            * Electron window
            */
            Tools.CheckIfElectron = function () {
                var process = window.process;
                return process !== undefined;
            };
            /**
            * Creates an input element
            */
            Tools.CreateFileInpuElement = function (id) {
                var input = $("#" + id);
                if (!input[0]) {
                    $("#BABYLON-EDITOR-UTILS").append(EDITOR.GUI.GUIElement.CreateElement("input type=\"file\"", id, "display: none;"));
                    input = $("#" + id);
                }
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
                project.sounds = project.sounds || [];
                project.customMetadatas = project.customMetadatas || {};
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
            /**
            * Converts a string to an array buffer
            */
            Tools.ConvertStringToArray = function (str) {
                var len = str.length;
                var array = new Uint8Array(len);
                for (var i = 0; i < len; i++)
                    array[i] = str.charCodeAt(i);
                return array;
            };
            /**
            * Converts a base64 string to array buffer
            * Largely used to convert images, converted into base64 string
            */
            Tools.ConvertBase64StringToArrayBuffer = function (base64String) {
                var binString = window.atob(base64String.split(",")[1]);
                return Tools.ConvertStringToArray(binString);
            };
            /**
            * Adds a new file into the FilesInput class
            */
            Tools.CreateFileFromURL = function (url, callback, isTexture) {
                if (isTexture === void 0) { isTexture = false; }
                var filename = BABYLON.Tools.GetFilename(url);
                var filenameLower = filename.toLowerCase();
                if (isTexture && EDITOR.FilesInput.FilesTextures[filenameLower]) {
                    callback(EDITOR.FilesInput.FilesTextures[filenameLower]);
                    return;
                }
                else if (!isTexture && EDITOR.FilesInput.FilesToLoad[filenameLower]) {
                    callback(EDITOR.FilesInput.FilesToLoad[filenameLower]);
                    return;
                }
                BABYLON.Tools.LoadFile(url, function (data) {
                    var file = Tools.CreateFile(new Uint8Array(data), filename);
                    if (isTexture)
                        BABYLON.FilesInput.FilesTextures[filename.toLowerCase()] = file;
                    else
                        BABYLON.FilesInput.FilesToLoad[filename.toLowerCase()] = file;
                    if (callback)
                        callback(file);
                }, null, null, true, function () {
                    BABYLON.Tools.Error("Cannot create file from file url : " + url);
                });
            };
            /**
            * Creates a new file object
            */
            Tools.CreateFile = function (array, filename) {
                if (array === null)
                    return null;
                var file = new File([new Blob([array])], BABYLON.Tools.GetFilename(filename), {
                    type: Tools.GetFileType(Tools.GetFileExtension(filename))
                });
                return file;
            };
            return Tools;
        }());
        EDITOR.Tools = Tools;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ManipulationHelper = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function ManipulationHelper(core) {
                var _this = this;
                this._currentNode = null;
                this._cameraAttached = true;
                this._actionStack = [];
                this._enabled = false;
                // Initialize
                this._core = core;
                core.eventReceivers.push(this);
                core.updates.push(this);
                // Create scene
                this._scene = new BABYLON.Scene(core.engine);
                this._scene.autoClear = false;
                this._scene.postProcessesEnabled = false;
                // Events
                this._pointerObserver = this._scene.onPointerObservable.add(function (p, s) { return _this._pointerCallback(p, s); }, -1, true);
                // Manipulator
                this._manipulator = new ManipulationHelpers.ManipulatorInteractionHelper(this._scene);
                this._manipulator.detachManipulatedNode(null);
                this.enabled = this._enabled;
            }
            // On event
            ManipulationHelper.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.SCENE_EVENT && event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                    var object = event.sceneEvent.object;
                    if (!(object instanceof BABYLON.Node))
                        object = null;
                    this.setNode(object);
                }
                return false;
            };
            // On pre update
            ManipulationHelper.prototype.onPreUpdate = function () {
                // Update camera
                this._scene.activeCamera = this._core.currentScene.activeCamera;
            };
            // On post update
            ManipulationHelper.prototype.onPostUpdate = function () { };
            // Get internal scene
            ManipulationHelper.prototype.getScene = function () {
                return this._scene;
            };
            Object.defineProperty(ManipulationHelper.prototype, "enabled", {
                // Returns if the manipulators are enabled
                get: function () {
                    return this._enabled;
                },
                // Sets if the manipulators are enabled
                set: function (enabled) {
                    this._enabled = enabled;
                    if (!enabled) {
                        this.setNode(null);
                    }
                    else if (this._currentNode) {
                        this._manipulator.attachManipulatedNode(this._currentNode);
                    }
                },
                enumerable: true,
                configurable: true
            });
            // Sets the node to manupulate
            ManipulationHelper.prototype.setNode = function (node) {
                if (this._currentNode)
                    this._manipulator.detachManipulatedNode(this._currentNode);
                if (node && this._enabled)
                    this._manipulator.attachManipulatedNode(node);
                this._currentNode = node;
            };
            // Pointer event callback
            ManipulationHelper.prototype._pointerCallback = function (pointer, event) {
                this._detectActionChanged(pointer, event);
                switch (this._getCurrentAction()) {
                    case 1 /* Selector */:
                        //event.skipNextObservers = true;
                        break;
                    case 2 /* Camerator */:
                        if (pointer.type & (BABYLON.PointerEventTypes.POINTERUP | BABYLON.PointerEventTypes.POINTERWHEEL)) {
                            this._actionStack.pop();
                        }
                        break;
                }
            };
            // Detect action changed
            ManipulationHelper.prototype._detectActionChanged = function (p, s) {
                // Detect switch from selection to camerator
                if (this._getCurrentAction() === 1 /* Selector */) {
                    if (p.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                        if (!p.pickInfo.hit)
                            this._actionStack.push(2 /* Camerator */);
                    }
                    else if (p.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
                        this._actionStack.push(2 /* Camerator */);
                    }
                }
            };
            // Returns the current action
            ManipulationHelper.prototype._getCurrentAction = function () {
                if (this._actionStack.length === 0) {
                    return 1 /* Selector */;
                }
                return this._actionStack[this._actionStack.length - 1];
            };
            return ManipulationHelper;
        }());
        EDITOR.ManipulationHelper = ManipulationHelper;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIElement = (function () {
                // Private members
                /**
                * Constructor
                * @param name: the gui element name
                * @param core: the editor core
                */
                function GUIElement(name, core) {
                    // Public members
                    this.element = null;
                    this.name = "";
                    this.core = null;
                    // Members
                    this.name = name;
                    this.core = core;
                }
                // Destroy the element (W2UI)
                GUIElement.prototype.destroy = function () {
                    this.element.destroy();
                };
                // Refresh the element (W2UI)
                GUIElement.prototype.refresh = function () {
                    this.element.refresh();
                };
                // Resize the element (W2UI)
                GUIElement.prototype.resize = function () {
                    this.element.resize();
                };
                // Add callback on an event
                GUIElement.prototype.on = function (event, callback) {
                    this.element.on(event, callback);
                };
                // Build the element
                GUIElement.prototype.buildElement = function (parent) { };
                /**
                * Static methods
                */
                // Creates a div element (string)
                GUIElement.CreateDivElement = function (id, style) {
                    return "<div id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + "></div>";
                };
                // Creates a custom element (string)
                GUIElement.CreateElement = function (type, id, style, innerText, br) {
                    if (style === void 0) { style = "width: 100%; height: 100%;"; }
                    if (innerText === void 0) { innerText = ""; }
                    if (br === void 0) { br = false; }
                    return "<" + (type instanceof Array ? type.join(" ") : type) + " id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + ">" + innerText + "</" + (type instanceof Array ? type[0] : type) + ">" +
                        (br ? "<br />" : "");
                };
                // Creates a new button
                GUIElement.CreateButton = function (parent, id, caption) {
                    var effectiveParent = (typeof parent === "string") ? $("#" + parent) : parent;
                    effectiveParent.append("<button value=\"Red\" id=\"" + id + "\">" + caption + "</button>");
                    return $("#" + id);
                };
                // Creates a transition
                // Available types are:
                // - slide-left
                // - slide-right
                // - slide-top
                // - slide-bottom
                // - flip-left
                // - flip-right
                // - flip-top
                // - flip-bottom
                // - pop-in
                // - pop-out
                GUIElement.CreateTransition = function (div1, div2, type, callback) {
                    w2utils.transition($("#" + div1)[0], $("#" + div2)[0], type, function () {
                        if (callback)
                            callback();
                    });
                };
                return GUIElement;
            }());
            GUI.GUIElement = GUIElement;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIDialog = (function (_super) {
                __extends(GUIDialog, _super);
                // Private members
                /**
                * Constructor
                * @param name: the form name
                */
                function GUIDialog(name, core, title, body) {
                    _super.call(this, name, core);
                    this.callback = null;
                    // Initialize
                    this.title = title;
                    this.body = body;
                }
                // Build element
                GUIDialog.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = w2confirm(this.body, this.title, function (result) {
                        if (_this.callback)
                            _this.callback(result);
                        var ev = new EDITOR.Event();
                        ev.eventType = EDITOR.EventType.GUI_EVENT;
                        ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED, result);
                        _this.core.sendEvent(ev);
                    });
                };
                // Create a dialog on the fly
                GUIDialog.CreateDialog = function (body, title, yesCallback, noCallback) {
                    w2confirm(body, title, null)
                        .yes(function () {
                        if (yesCallback)
                            yesCallback();
                    })
                        .no(function () {
                        if (noCallback)
                            noCallback();
                    });
                };
                return GUIDialog;
            }(GUI.GUIElement));
            GUI.GUIDialog = GUIDialog;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIEditForm = (function (_super) {
                __extends(GUIEditForm, _super);
                /**
                * Constructor
                * @param name: the form name
                */
                function GUIEditForm(name, core) {
                    _super.call(this, name, core);
                }
                // Removes the element
                GUIEditForm.prototype.remove = function () {
                    this._datElement.domElement.parentNode.removeChild(this._datElement.domElement);
                };
                // Add a folder
                GUIEditForm.prototype.addFolder = function (name, parent) {
                    var parentFolder = parent ? parent : this._datElement;
                    var folder = parentFolder.addFolder(name);
                    folder.open();
                    return folder;
                };
                // Add a field
                GUIEditForm.prototype.add = function (object, propertyPath, items, name) {
                    if (!object || object[propertyPath] === undefined || object[propertyPath] === null)
                        return this._datElement.add(null, "");
                    return this._datElement.add(object, propertyPath, items).name(name);
                };
                // Adds tags to object if property changed
                GUIEditForm.prototype.tagObjectIfChanged = function (element, object, property) {
                    element.onFinishChange(function (result) {
                        if (!BABYLON.Tags.HasTags(object)) {
                            BABYLON.Tags.EnableFor(object);
                        }
                        if (!BABYLON.Tags.MatchesQuery(object, property)) {
                            BABYLON.Tags.AddTagsTo(object, property);
                        }
                    });
                };
                Object.defineProperty(GUIEditForm.prototype, "width", {
                    get: function () {
                        return this._datElement.width;
                    },
                    // Get / Set width
                    set: function (width) {
                        this._datElement.width = width;
                    },
                    enumerable: true,
                    configurable: true
                });
                Object.defineProperty(GUIEditForm.prototype, "height", {
                    get: function () {
                        return this._datElement.height;
                    },
                    // Get / Set height
                    set: function (height) {
                        this._datElement.height = height;
                    },
                    enumerable: true,
                    configurable: true
                });
                // Remember initial
                GUIEditForm.prototype.remember = function (object) {
                    this._datElement.remember(object);
                };
                // Build element
                GUIEditForm.prototype.buildElement = function (parent) {
                    var parentElement = $("#" + parent);
                    this._datElement = new dat.GUI({
                        autoPlace: false
                    });
                    this._datElement.width = parentElement.width();
                    this.element = parentElement[0].appendChild(this._datElement.domElement);
                };
                return GUIEditForm;
            }(GUI.GUIElement));
            GUI.GUIEditForm = GUIEditForm;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIForm = (function (_super) {
                __extends(GUIForm, _super);
                /**
                * Constructor
                * @param name: the form name
                * @param header: form's header text
                */
                function GUIForm(name, header, core) {
                    if (header === void 0) { header = ""; }
                    _super.call(this, name, core);
                    this.fields = [];
                    this.toolbarFields = [];
                    // Initialize
                    this.header = header;
                }
                // Create a field
                GUIForm.prototype.createField = function (name, type, caption, span, text, options) {
                    if (span === void 0) { span = undefined; }
                    if (text === void 0) { text = ""; }
                    if (options === void 0) { options = {}; }
                    span = (span === null) ? 6 : span;
                    var field = { name: name, type: type, html: { caption: caption, span: span, text: text }, options: options };
                    this.fields.push(field);
                    return this;
                };
                // Create a toolbar field
                GUIForm.prototype.createToolbarField = function (id, type, caption, img) {
                    var field = { id: name, text: caption, type: type, checked: false, img: img };
                    this.toolbarFields.push(field);
                    return field;
                };
                // Set record
                GUIForm.prototype.setRecord = function (name, value) {
                    this.element.record[name] = value;
                };
                // Get record
                GUIForm.prototype.getRecord = function (name) {
                    return this.element.record[name];
                };
                // Build element
                GUIForm.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = $("#" + parent).w2form({
                        name: this.name,
                        focus: -1,
                        header: this.header,
                        formHTML: "",
                        fields: this.fields,
                        toolbar: {
                            items: this.toolbarFields,
                            onClick: function (event) {
                                if (_this.onToolbarClicked)
                                    _this.onToolbarClicked(event.target);
                                var ev = new EDITOR.Event();
                                ev.eventType = EDITOR.EventType.GUI_EVENT;
                                ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.FORM_CHANGED);
                                ev.guiEvent.data = event.target;
                                _this.core.sendEvent(ev);
                            }
                        }
                    });
                    this.element.on({ type: "change", execute: "after" }, function () {
                        if (_this.onFormChanged)
                            _this.onFormChanged();
                        var ev = new EDITOR.Event();
                        ev.eventType = EDITOR.EventType.GUI_EVENT;
                        ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.FORM_CHANGED);
                        _this.core.sendEvent(ev);
                    });
                };
                return GUIForm;
            }(GUI.GUIElement));
            GUI.GUIForm = GUIForm;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIGraph = (function (_super) {
                __extends(GUIGraph, _super);
                /**
                * Constructor
                * @param name: the form name
                * @param header: form's header text
                */
                function GUIGraph(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.menus = [];
                }
                GUIGraph.prototype.addMenu = function (id, text, img) {
                    if (img === void 0) { img = ""; }
                    this.menus.push({
                        id: id,
                        text: text,
                        img: img
                    });
                };
                // Creates a new node and returns its reference
                GUIGraph.prototype.createNode = function (id, text, img, data) {
                    if (img === void 0) { img = ""; }
                    return {
                        id: id,
                        text: text,
                        img: img,
                        data: data
                    };
                };
                // Adds new nodes to the graph
                GUIGraph.prototype.addNodes = function (nodes, parent) {
                    if (!parent)
                        this.element.add(Array.isArray(nodes) ? nodes : [nodes]);
                    else
                        this.element.add(parent, Array.isArray(nodes) ? nodes : [nodes]);
                };
                // Removes the provided node
                GUIGraph.prototype.removeNode = function (node) {
                    this.element.remove(node);
                };
                // Sets if the provided node is expanded or not
                GUIGraph.prototype.setNodeExpanded = function (node, expanded) {
                    expanded ? this.element.expand(node) : this.element.collapse(node);
                };
                // Sets the selected node
                GUIGraph.prototype.setSelected = function (node) {
                    var element = this.element.get(node);
                    if (!element)
                        return;
                    while (element.parent !== null) {
                        element = element.parent;
                        if (element && element.id)
                            this.element.expand(element.id);
                    }
                    this.element.select(node);
                    this.element.scrollIntoView(node);
                };
                // Returns the selected node
                GUIGraph.prototype.getSelected = function () {
                    return this.element.selected;
                };
                // Returns the selected node
                GUIGraph.prototype.getSelectedNode = function () {
                    var element = this.element.get(this.getSelected());
                    if (element)
                        return element;
                    return null;
                };
                // Returns the node by id
                GUIGraph.prototype.getNode = function (id) {
                    var element = this.element.get(id);
                    return element;
                };
                // Returns the selected data
                GUIGraph.prototype.getSelectedData = function () {
                    var selected = this.getSelected();
                    return this.element.get(selected).data;
                };
                // Clears the graph
                GUIGraph.prototype.clear = function () {
                    var toRemove = [];
                    for (var i = 0; i < this.element.nodes.length; i++)
                        toRemove.push(this.element.nodes[i].id);
                    this.element.remove.apply(this.element, toRemove);
                };
                // Build element
                GUIGraph.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = $("#" + parent).w2sidebar({
                        name: this.name,
                        img: null,
                        keyboard: false,
                        nodes: [],
                        menu: this.menus,
                        onClick: function (event) {
                            if (_this.onGraphClick)
                                _this.onGraphClick(event.object.data);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRAPH_SELECTED);
                            ev.guiEvent.data = event.object.data;
                            _this.core.sendEvent(ev);
                        },
                        onDblClick: function (event) {
                            if (_this.onGraphDblClick)
                                _this.onGraphDblClick(event.object.data);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRAPH_DOUBLE_SELECTED);
                            ev.guiEvent.data = event.object.data;
                            _this.core.sendEvent(ev);
                        },
                        onMenuClick: function (event) {
                            if (_this.onMenuClick)
                                _this.onMenuClick(event.menuItem.id);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRAPH_MENU_SELECTED);
                            ev.guiEvent.data = event.menuItem.id;
                            _this.core.sendEvent(ev);
                        }
                    });
                };
                return GUIGraph;
            }(GUI.GUIElement));
            GUI.GUIGraph = GUIGraph;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var gridButtons = w2obj.grid.prototype.buttons;
            gridButtons["add"].caption = w2utils.lang("");
            gridButtons["delete"].caption = w2utils.lang("");
            var GUIGrid = (function (_super) {
                __extends(GUIGrid, _super);
                // Private members
                /**
                * Constructor
                * @param name: the form name
                * @param core: the editor core
                */
                function GUIGrid(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.columns = [];
                    this.records = [];
                    this.header = "";
                    this.fixedBody = true;
                    this.showToolbar = true;
                    this.showFooter = false;
                    this.showDelete = false;
                    this.showAdd = false;
                    this.showEdit = false;
                    this.showOptions = true;
                    this.showRefresh = true;
                    this.showSearch = true;
                    this.showColumnHeaders = true;
                    this.menus = [];
                    this.autoMergeChanges = true;
                    this.multiSelect = true;
                    this.hasSubGrid = false;
                }
                // Adds a menu
                GUIGrid.prototype.addMenu = function (id, text, icon) {
                    this.menus.push({
                        id: id,
                        text: text,
                        icon: icon
                    });
                };
                // Creates a column
                GUIGrid.prototype.createColumn = function (id, text, size, style) {
                    if (!size)
                        size = "50%";
                    this.columns.push({ field: id, caption: text, size: size, style: style });
                };
                // Creates and editable column
                GUIGrid.prototype.createEditableColumn = function (id, text, editable, size, style) {
                    if (!size)
                        size = "50%";
                    this.columns.push({ field: id, caption: text, size: size, style: style, editable: editable });
                };
                // Adds a row and refreshes the grid
                GUIGrid.prototype.addRow = function (data) {
                    data.recid = this.getRowCount();
                    this.element.add(data);
                };
                // Adds a record without refreshing the grid
                GUIGrid.prototype.addRecord = function (data) {
                    if (!this.element) {
                        data.recid = this.records.length;
                        this.records.push(data);
                    }
                    else {
                        data.recid = this.element.records.length;
                        this.element.records.push(data);
                    }
                };
                // Removes a row and refreshes the list
                GUIGrid.prototype.removeRow = function (recid) {
                    this.element.remove(recid);
                };
                // Removes a record, need to refresh the list after
                GUIGrid.prototype.removeRecord = function (recid) {
                    this.element.records.splice(recid, 1);
                };
                // Refresh the element (W2UI)
                GUIGrid.prototype.refresh = function () {
                    for (var i = 0; i < this.element.records.length; i++) {
                        this.element.records[i].recid = i;
                    }
                    _super.prototype.refresh.call(this);
                };
                // Returns the number of rows
                GUIGrid.prototype.getRowCount = function () {
                    return this.element.total;
                };
                // Clear
                GUIGrid.prototype.clear = function () {
                    this.element.clear();
                    this.element.total = 0;
                };
                // Locks the grid
                GUIGrid.prototype.lock = function (message, spinner) {
                    this.element.lock(message, spinner);
                };
                // Unlock the grid
                GUIGrid.prototype.unlock = function () {
                    this.element.unlock();
                };
                // Returns the selected rows
                GUIGrid.prototype.getSelectedRows = function () {
                    return this.element.getSelection();
                };
                // sets the selected rows
                GUIGrid.prototype.setSelected = function (selected) {
                    for (var i = 0; i < selected.length; i++) {
                        this.element.select(selected[i]);
                    }
                };
                // Returns the row at indice
                GUIGrid.prototype.getRow = function (indice) {
                    if (indice >= 0) {
                        return this.element.get(indice);
                    }
                    return null;
                };
                // Modifies the row at indice
                GUIGrid.prototype.modifyRow = function (indice, data) {
                    this.element.set(indice, data);
                };
                // Returns the changed rows
                GUIGrid.prototype.getChanges = function (recid) {
                    var changes = this.element.getChanges();
                    if (recid) {
                        for (var i = 0; i < changes.length; i++) {
                            if (changes[i].recid === recid)
                                return [changes[i]];
                        }
                        return [];
                    }
                    return changes;
                };
                // Scroll into view, giving the indice of the row
                GUIGrid.prototype.scrollIntoView = function (indice) {
                    if (indice >= 0 && indice < this.element.records.length)
                        this.element.scrollIntoView(indice);
                };
                // Merges user changes into the records array
                GUIGrid.prototype.mergeChanges = function () {
                    this.element.mergeChanges();
                };
                // Build element
                GUIGrid.prototype.buildElement = function (parent) {
                    var _this = this;
                    var parentElement = $("#" + parent);
                    parentElement.on("mousedown", function (event) {
                        if (_this.onMouseDown)
                            _this.onMouseDown();
                    });
                    parentElement.on("mouseup", function (event) {
                        if (_this.onMouseUp)
                            _this.onMouseUp();
                    });
                    this.element = parentElement.w2grid({
                        name: this.name,
                        show: {
                            toolbar: this.showToolbar,
                            footer: this.showFooter,
                            toolbarDelete: this.showDelete,
                            toolbarAdd: this.showAdd,
                            toolbarEdit: this.showEdit,
                            toolbarSearch: this.showSearch,
                            toolbarColumns: this.showOptions,
                            toolbarReload: this.showRefresh,
                            header: !(this.header === ""),
                            columnHeaders: this.showColumnHeaders
                        },
                        menu: this.menus,
                        header: this.header,
                        fixedBody: this.fixedBody,
                        columns: this.columns,
                        records: this.records,
                        multiSelect: this.multiSelect,
                        onClick: function (event) {
                            event.onComplete = function () {
                                var selected = _this.getSelectedRows();
                                if (selected.length === 1) {
                                    if (_this.onClick)
                                        _this.onClick(selected);
                                    var ev = new EDITOR.Event();
                                    ev.eventType = EDITOR.EventType.GUI_EVENT;
                                    ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_SELECTED, selected);
                                    _this.core.sendEvent(ev);
                                }
                            };
                        },
                        keyboard: false,
                        onMenuClick: function (event) {
                            if (_this.onMenuClick)
                                _this.onMenuClick(event.menuItem.id);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_MENU_SELECTED, event.menuItem.id);
                            _this.core.sendEvent(ev);
                        },
                        onDelete: function (event) {
                            if (event.force) {
                                var data = _this.getSelectedRows();
                                if (_this.onDelete)
                                    _this.onDelete(data);
                                var ev = new EDITOR.Event();
                                ev.eventType = EDITOR.EventType.GUI_EVENT;
                                ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_REMOVED, data);
                                _this.core.sendEvent(ev);
                            }
                        },
                        onAdd: function (event) {
                            if (_this.onAdd)
                                _this.onAdd();
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_ADDED);
                            _this.core.sendEvent(ev);
                        },
                        onEdit: function (event) {
                            var data = _this.getSelectedRows();
                            if (_this.onEdit)
                                _this.onEdit(data);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_EDITED, data);
                            _this.core.sendEvent(ev);
                        },
                        onReload: function (event) {
                            if (_this.onReload)
                                _this.onReload();
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_RELOADED);
                            _this.core.sendEvent(ev);
                        },
                        onExpand: !this.hasSubGrid ? undefined : function (event) {
                            if (!_this.onExpand)
                                return;
                            var id = "subgrid-" + event.recid + event.target;
                            if (w2ui.hasOwnProperty(id))
                                w2ui[id].destroy();
                            var subGrid = _this.onExpand(id, parseInt(event.recid));
                            if (!subGrid)
                                return;
                            subGrid.fixedBody = true;
                            subGrid.showToolbar = false;
                            subGrid.buildElement(event.box_id);
                            $('#' + event.box_id).css({ margin: "0px", padding: "0px", width: "100%" }).animate({ height: (_this.subGridHeight || 105) + "px" }, 100);
                            setTimeout(function () {
                                w2ui[id].resize();
                            }, 300);
                        },
                        onChange: function (event) {
                            if (!event.recid)
                                return;
                            if (_this.onEditField)
                                event.onComplete = function () { return _this.onEditField(event.recid, event.value_new); };
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_CHANGED, { recid: event.recid, value: event.value_new });
                            _this.core.sendEvent(ev);
                            if (_this.autoMergeChanges)
                                _this.element.mergeChanges();
                        },
                        onEditField: function (event) {
                            if (!event.recid)
                                return;
                            if (_this.onEditField)
                                event.onComplete = function () { return _this.onEditField(parseInt(event.recid), event.value); };
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_CHANGED, { recid: parseInt(event.recid), value: event.value });
                            _this.core.sendEvent(ev);
                            if (_this.autoMergeChanges)
                                _this.element.mergeChanges();
                        }
                    });
                };
                return GUIGrid;
            }(GUI.GUIElement));
            GUI.GUIGrid = GUIGrid;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUILayout = (function (_super) {
                __extends(GUILayout, _super);
                /**
                * Constructor
                * @param name: layouts name
                */
                function GUILayout(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.panels = [];
                }
                GUILayout.prototype.createPanel = function (name, type, size, resizable) {
                    if (resizable === void 0) { resizable = true; }
                    var panel = new GUI.GUIPanel(name, type, size, resizable, this.core);
                    this.panels.push(panel);
                    return panel;
                };
                GUILayout.prototype.lockPanel = function (type, message, spinner) {
                    this.element.lock(type, message, spinner);
                };
                GUILayout.prototype.unlockPanel = function (type) {
                    this.element.unlock(type);
                };
                GUILayout.prototype.getPanelFromType = function (type) {
                    for (var i = 0; i < this.panels.length; i++) {
                        if (this.panels[i].type === type) {
                            return this.panels[i];
                        }
                    }
                    return null;
                };
                GUILayout.prototype.getPanelFromName = function (name) {
                    for (var i = 0; i < this.panels.length; i++) {
                        if (this.panels[i].name === name) {
                            return this.panels[i];
                        }
                    }
                    return null;
                };
                GUILayout.prototype.setPanelSize = function (panelType, size) {
                    this.element.sizeTo(panelType, size);
                };
                GUILayout.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = $("#" + parent).w2layout({
                        name: this.name,
                        panels: this.panels
                    });
                    this.element.on({ type: "resize", execute: "after" }, function () {
                        var ev = new EDITOR.Event();
                        ev.eventType = EDITOR.EventType.GUI_EVENT;
                        ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.LAYOUT_CHANGED);
                        _this.core.sendEvent(ev);
                    });
                    // Set panels
                    for (var i = 0; i < this.panels.length; i++) {
                        this.panels[i]._panelElement = this.element.get(this.panels[i].type);
                    }
                };
                return GUILayout;
            }(GUI.GUIElement));
            GUI.GUILayout = GUILayout;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIList = (function (_super) {
                __extends(GUIList, _super);
                // Private members
                /**
                * Constructor
                * @param name: the form name
                * @param core: the editor core
                */
                function GUIList(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.items = [];
                    this.renderDrop = false;
                    this.selected = "";
                }
                // Creates a new item
                GUIList.prototype.addItem = function (name) {
                    this.items.push(name);
                    return this;
                };
                // Returns the selected item
                GUIList.prototype.getSelected = function () {
                    var value = this.element.val();
                    return this.element.items.indexOf(value);
                };
                // Returns the value of the element
                GUIList.prototype.getValue = function () {
                    return this.element.val();
                };
                // Build element
                GUIList.prototype.buildElement = function (parent) {
                    var _this = this;
                    var parentElement = $("#" + parent);
                    var items = [];
                    for (var i = 0; i < this.items.length; i++)
                        items.push({ id: this.items[i], text: this.items[i] });
                    this.element = parentElement.w2field("list", {
                        items: items,
                        selected: { id: this.selected, text: this.selected },
                        renderItem: function (item) {
                            return item.text;
                        },
                        renderDrop: !this.renderDrop ? undefined : function (item) {
                            return item.text;
                        },
                        compare: function (item, search) {
                            debugger;
                            return item.text.indexOf(search) !== -1;
                        }
                    });
                    this.element.change(function (event) {
                        if (_this.onChange)
                            _this.onChange(_this.element.val());
                    });
                };
                return GUIList;
            }(GUI.GUIElement));
            GUI.GUIList = GUIList;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIPanel = (function (_super) {
                __extends(GUIPanel, _super);
                /**
                * Constructor
                * @param name: panel name
                * @param type: panel type (left, right, etc.)
                * @param size: panel size
                * @param resizable: if the panel is resizable
                * @param core: the editor core
                */
                function GUIPanel(name, type, size, resizable, core) {
                    _super.call(this, name, core);
                    // Public memebers
                    this.tabs = new Array();
                    this.size = 70;
                    this.minSize = 10;
                    this.maxSize = undefined;
                    this.style = "background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;";
                    this.toolbar = null;
                    this.type = type;
                    this.size = size;
                    this.resizable = resizable;
                }
                // Create tab
                GUIPanel.prototype.createTab = function (tab) {
                    var _this = this;
                    // Configure event
                    tab.onClick = function (event) {
                        if (_this.onTabChanged)
                            _this.onTabChanged(event.target);
                        var ev = new EDITOR.Event();
                        ev.eventType = EDITOR.EventType.GUI_EVENT;
                        ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.TAB_CHANGED, event.target);
                        _this.core.sendEvent(ev);
                    };
                    tab.onClose = function (event) {
                        if (_this.onTabClosed)
                            _this.onTabClosed(event.target);
                        var ev = new EDITOR.Event();
                        ev.eventType = EDITOR.EventType.GUI_EVENT;
                        ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.TAB_CLOSED, event.target);
                        _this.core.sendEvent(ev);
                    };
                    // Add tab
                    this.tabs.push(tab);
                    if (this._panelElement !== null) {
                        this._panelElement.tabs.add(tab);
                    }
                    return this;
                };
                // Remove tab from id
                GUIPanel.prototype.removeTab = function (id) {
                    if (this._panelElement !== null) {
                        this._panelElement.tabs.remove(id);
                    }
                    for (var i = 0; i < this.tabs.length; i++) {
                        if (this.tabs[i].id === id) {
                            this.tabs.splice(i, 1);
                            return true;
                        }
                    }
                    return false;
                };
                Object.defineProperty(GUIPanel.prototype, "width", {
                    // Get width
                    get: function () {
                        if (this._panelElement)
                            return this._panelElement.width;
                        return 0;
                    },
                    enumerable: true,
                    configurable: true
                });
                Object.defineProperty(GUIPanel.prototype, "height", {
                    // Get height
                    get: function () {
                        if (this._panelElement)
                            return this._panelElement.height;
                        return 0;
                    },
                    enumerable: true,
                    configurable: true
                });
                // Return tab count
                GUIPanel.prototype.getTabCount = function () {
                    return this.tabs.length;
                };
                // Set tab enabled
                GUIPanel.prototype.setTabEnabled = function (id, enable) {
                    if (this._panelElement === null) {
                        return this;
                    }
                    enable ? this._panelElement.tabs.enable(id) : this._panelElement.tabs.disable(id);
                    return this;
                };
                // Sets the active tab
                GUIPanel.prototype.setActiveTab = function (id) {
                    this._panelElement.tabs.select(id);
                    var ev = new EDITOR.Event();
                    ev.eventType = EDITOR.EventType.GUI_EVENT;
                    ev.guiEvent = new EDITOR.GUIEvent(this, EDITOR.GUIEventType.TAB_CHANGED, id);
                    this.core.sendEvent(ev);
                };
                // Return tab id from index
                GUIPanel.prototype.getTabIDFromIndex = function (index) {
                    if (index >= 0 && index < this.tabs.length) {
                        return this.tabs[index].id;
                    }
                    return "";
                };
                // Returns the wanted tab
                GUIPanel.prototype.getTab = function (id) {
                    var tab = this._panelElement.tabs.get(id);
                    return tab;
                };
                // Sets panel content (HTML)
                GUIPanel.prototype.setContent = function (content) {
                    this.content = content;
                    return this;
                };
                // Hides a tab
                GUIPanel.prototype.hideTab = function (id) {
                    return this._panelElement.tabs.hide(id) === 1;
                };
                // Show tab
                GUIPanel.prototype.showTab = function (id) {
                    return this._panelElement.tabs.show(id) === 1;
                };
                return GUIPanel;
            }(GUI.GUIElement));
            GUI.GUIPanel = GUIPanel;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIToolbar = (function (_super) {
                __extends(GUIToolbar, _super);
                // Private members
                /**
                * Constructor
                * @param name: the form name
                */
                function GUIToolbar(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.menus = [];
                }
                // Creates a new menu
                GUIToolbar.prototype.createMenu = function (type, id, text, icon, checked, tooltip) {
                    var menu = {
                        type: type,
                        id: id,
                        text: text,
                        img: icon,
                        checked: checked || false,
                        hint: tooltip,
                        items: []
                    };
                    this.menus.push(menu);
                    return menu;
                };
                // Creates a new menu item
                GUIToolbar.prototype.createMenuItem = function (menu, type, id, text, icon, checked, disabled) {
                    var item = {
                        type: type,
                        id: id,
                        text: text,
                        icon: icon,
                        checked: checked || false,
                        disabled: disabled || false
                    };
                    menu.items.push(item);
                    return item;
                };
                // Creates a new input element
                GUIToolbar.prototype.createInput = function (id, inputId, text, size) {
                    if (size === void 0) { size = 10; }
                    var item = {
                        type: "html",
                        id: id,
                        html: "<div style=\"padding: 3px 10px;\">" +
                            text +
                            "    <input size=\"" + size + "\" id=\"" + inputId + "\" style=\"padding: 3px; border-radius: 2px; border: 1px solid silver\"/>" +
                            "</div>",
                        text: text,
                    };
                    this.menus.push(item);
                    return item;
                };
                // Adds a break
                GUIToolbar.prototype.addBreak = function (menu) {
                    var item = {
                        type: "break",
                        id: undefined,
                        text: undefined,
                        img: undefined,
                        icon: undefined,
                        checked: undefined,
                        items: undefined
                    };
                    if (menu)
                        menu.items.push(item);
                    else
                        this.menus.push(item);
                    return item;
                };
                // Adds a spacer
                GUIToolbar.prototype.addSpacer = function () {
                    var item = {
                        type: "spacer",
                        id: undefined,
                        text: undefined,
                        img: undefined,
                        icon: undefined,
                        checked: undefined,
                        items: undefined
                    };
                    this.menus.push(item);
                    return item;
                };
                // Sets the item's text
                GUIToolbar.prototype.setItemText = function (item, text, menu) {
                    var result = this.element.get(menu ? menu : item);
                    if (result && !menu)
                        result.text = text;
                    if (result && menu && result.items) {
                        for (var i = 0; i < result.items.length; i++) {
                            if (result.items[i].id === item)
                                result.items[i].text = text;
                        }
                    }
                };
                // Sets the item checked
                GUIToolbar.prototype.setItemChecked = function (item, checked, menu) {
                    //var id = menu ? menu + ":" + item : item;
                    //checked ? this.element.check(id) : this.element.uncheck(id);
                    if (!menu)
                        checked ? this.element.check(item) : this.element.uncheck(item);
                    else {
                        var result = this.element.get(menu);
                        if (result && result.items) {
                            for (var i = 0; i < result.items.length; i++) {
                                if (result.items[i].id === item)
                                    result.items[i].checked = checked;
                            }
                        }
                    }
                };
                // Sets the item auto checked (true to false, false to true)
                GUIToolbar.prototype.setItemAutoChecked = function (item, menu) {
                    var result = this.element.get(menu ? menu + ":" + item : item);
                    var checked = result ? result.checked : false;
                    if (!checked)
                        this.element.check(item);
                    else
                        this.element.uncheck(item);
                };
                // Returns if the item is checked
                GUIToolbar.prototype.isItemChecked = function (item, menu) {
                    //var result = this.element.get(menu ? menu + ":" + item : item);
                    var result = this.element.get(menu ? menu : item);
                    if (result && !menu)
                        return result.checked;
                    if (result && menu && result.items) {
                        for (var i = 0; i < result.items.length; i++) {
                            if (result.items[i].id === item)
                                return result.items[i].checked;
                        }
                    }
                    return false;
                };
                // Sets an item enabled or not
                GUIToolbar.prototype.setItemEnabled = function (item, enabled, menu) {
                    var finalID = menu ? menu + ":" + item : item;
                    var result = null;
                    if (menu)
                        result = this.element.get(menu);
                    if (result) {
                        for (var i = 0; i < result.items.length; i++) {
                            if (result.items[i].id === item) {
                                result.items[i].disabled = !enabled;
                                this.refresh();
                                break;
                            }
                        }
                    }
                    else {
                        if (enabled)
                            this.element.enable(finalID);
                        else
                            this.element.disable(finalID);
                    }
                    if (result)
                        return true;
                    return false;
                };
                // Returns an item by its ID
                GUIToolbar.prototype.getItemByID = function (id) {
                    for (var i = 0; i < this.menus.length; i++) {
                        var menu = this.menus[i];
                        if (menu.type === "break")
                            continue;
                        if (menu.id === id)
                            return menu;
                        for (var j = 0; j < menu.items.length; j++) {
                            var item = menu.items[j];
                            if (item.id === id)
                                return item;
                        }
                    }
                    return null;
                };
                // Returns the decomposed selected menu IDs
                GUIToolbar.prototype.decomposeSelectedMenu = function (id) {
                    var finalIDs = id.split(":");
                    var item = this.getItemByID(finalIDs[finalIDs.length - 1]);
                    if (!item)
                        return null;
                    return {
                        hasParent: finalIDs.length > 1,
                        parent: finalIDs[0],
                        selected: finalIDs.length > 1 ? finalIDs[finalIDs.length - 1] : ""
                    };
                };
                // Build element
                GUIToolbar.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = $("#" + parent).w2toolbar({
                        name: this.name,
                        items: this.menus,
                        onClick: function (event) {
                            if (_this.onClick)
                                _this.onClick(_this.decomposeSelectedMenu(event.target));
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED);
                            ev.guiEvent.data = event.target;
                            _this.core.sendEvent(ev);
                        }
                    });
                };
                return GUIToolbar;
            }(GUI.GUIElement));
            GUI.GUIToolbar = GUIToolbar;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIWindow = (function (_super) {
                __extends(GUIWindow, _super);
                /**
                * Constructor
                * @param name: the form name
                */
                function GUIWindow(name, core, title, body, size, buttons) {
                    var _this = this;
                    _super.call(this, name, core);
                    // Public members
                    this.title = "";
                    this.body = "";
                    this.size = new BABYLON.Vector2(800, 600);
                    this.buttons = [];
                    this.modal = true;
                    this.showClose = true;
                    this.showMax = true;
                    // Private members
                    this._onCloseCallbacks = [];
                    // Initialize
                    this.title = title;
                    this.body = body;
                    if (size)
                        this.size = size;
                    if (buttons)
                        this.buttons = buttons;
                    this._onCloseCallback = function () {
                        _this.core.editor.renderMainScene = true;
                        for (var i = 0; i < _this._onCloseCallbacks.length; i++) {
                            _this._onCloseCallbacks[i]();
                        }
                    };
                }
                // Destroy the element (W2UI)
                GUIWindow.prototype.destroy = function () {
                    this.element.clear();
                };
                // Sets the on close callback
                GUIWindow.prototype.setOnCloseCallback = function (callback) {
                    this._onCloseCallbacks.push(callback);
                };
                // Closes the window
                GUIWindow.prototype.close = function () {
                    this.element.close();
                };
                // Maximizes the window
                GUIWindow.prototype.maximize = function () {
                    this.element.max();
                };
                // Locks the window
                GUIWindow.prototype.lock = function (message) {
                    w2popup.lock(message);
                };
                // Unlocks the window
                GUIWindow.prototype.unlock = function () {
                    w2popup.unlock();
                };
                Object.defineProperty(GUIWindow.prototype, "onToggle", {
                    // Toggle callback
                    get: function () {
                        return this._onToggle;
                    },
                    // Toggle callback
                    set: function (callback) {
                        var windowEvent = function (event) {
                            event.onComplete = function (eventData) {
                                callback(eventData.options.maximized, eventData.options.width, eventData.options.height);
                            };
                        };
                        this.element.onMax = windowEvent;
                        this.element.onMin = windowEvent;
                        this._onToggle = callback;
                    },
                    enumerable: true,
                    configurable: true
                });
                // Notify a message
                GUIWindow.prototype.notify = function (message) {
                    w2popup.message({
                        width: 400,
                        height: 180,
                        html: "<div style=\"padding: 60px; text-align: center\">" + message + "</div>" +
                            "<div style=\"text- align: center\"><button class=\"btn\" onclick=\"w2popup.message()\">Close</button>"
                    });
                };
                // Build element
                GUIWindow.prototype.buildElement = function (parent) {
                    var _this = this;
                    // Create buttons
                    var buttonID = "WindowButton";
                    var buttons = "";
                    for (var i = 0; i < this.buttons.length; i++) {
                        buttons += "<button class=\"btn\" id=\"" + buttonID + this.buttons[i] + "\">" + this.buttons[i] + "</button>\n";
                    }
                    // Create window
                    this.element = w2popup.open({
                        title: this.title,
                        body: this.body,
                        buttons: buttons,
                        width: this.size.x,
                        height: this.size.y,
                        showClose: this.showClose,
                        showMax: this.showMax == null ? false : this.showMax,
                        modal: this.modal
                    });
                    // Create events for buttons
                    for (var i = 0; i < this.buttons.length; i++) {
                        var element = $("#" + buttonID + this.buttons[i]);
                        element.click(function (result) {
                            var button = result.target.id.replace(buttonID, "");
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED, button);
                            _this.core.sendEvent(ev);
                            if (_this.onButtonClicked)
                                _this.onButtonClicked(button);
                        });
                    }
                    // Configure window
                    var window = this.element;
                    window.onClose = this._onCloseCallback;
                    // Configure editor
                    this.core.editor.renderMainScene = false;
                };
                // Creates an alert
                GUIWindow.CreateAlert = function (message, title, callback) {
                    w2alert(message, title, callback);
                };
                return GUIWindow;
            }(GUI.GUIElement));
            GUI.GUIWindow = GUIWindow;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AbstractTool = (function () {
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AbstractTool(editionTool) {
                // Public members
                this.object = null;
                this.tab = "";
                // Initialize
                this._editionTool = editionTool;
            }
            // Object supported
            AbstractTool.prototype.isObjectSupported = function (object) {
                return false;
            };
            // Creates the UI
            AbstractTool.prototype.createUI = function () { };
            // Update
            AbstractTool.prototype.update = function () {
                return true;
            };
            // Apply
            AbstractTool.prototype.apply = function () { };
            // Resize
            AbstractTool.prototype.resize = function () { };
            return AbstractTool;
        }());
        EDITOR.AbstractTool = AbstractTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AbstractDatTool = (function (_super) {
            __extends(AbstractDatTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AbstractDatTool(editionTool) {
                // Initialize
                _super.call(this, editionTool);
            }
            // Update
            AbstractDatTool.prototype.update = function () {
                if (this._element) {
                    this._element.remove();
                    this._element = null;
                }
                return true;
            };
            // Resize
            AbstractDatTool.prototype.resize = function () {
                if (this._element)
                    this._element.width = this._editionTool.panel.width - 15;
            };
            /**
            * Static methods
            */
            // Add a color element
            AbstractDatTool.prototype.addColorFolder = function (color, propertyName, open, parent, callback) {
                if (open === void 0) { open = false; }
                var properties = ["r", "g", "b"];
                if (color instanceof BABYLON.Color4)
                    properties.push("a");
                var folder = this._element.addFolder(propertyName, parent);
                for (var i = 0; i < properties.length; i++) {
                    folder.add(color, properties[i]).min(0).max(1).name(properties[i]).onChange(function (result) {
                        if (callback)
                            callback();
                    });
                }
                if (!open)
                    folder.close();
                return folder;
            };
            // Add a vector element
            AbstractDatTool.prototype.addVectorFolder = function (vector, propertyName, open, parent, callback) {
                if (open === void 0) { open = false; }
                var properties = ["x", "y"];
                if (vector instanceof BABYLON.Vector3)
                    properties.push("z");
                var folder = this._element.addFolder(propertyName, parent);
                for (var i = 0; i < properties.length; i++) {
                    folder.add(vector, properties[i]).step(0.01).name(properties[i]).onChange(function (result) {
                        if (callback)
                            callback();
                    });
                }
                if (!open)
                    folder.close();
                return folder;
            };
            // Adds a texture element
            AbstractDatTool.prototype.addTextureFolder = function (object, name, property, parentFolder, callback) {
                var _this = this;
                var stringName = name.replace(" ", "");
                var functionName = "_set" + stringName;
                var textures = ["None"];
                var scene = this._editionTool.core.currentScene;
                for (var i = 0; i < scene.textures.length; i++) {
                    textures.push(scene.textures[i].name);
                }
                this[functionName] = function () {
                    var textureEditor = new EDITOR.GUITextureEditor(_this._editionTool.core, name, object, property);
                };
                this[stringName] = (object[property] && object[property] instanceof BABYLON.BaseTexture) ? object[property].name : textures[0];
                var folder = this._element.addFolder(name, parentFolder);
                folder.close();
                folder.add(this, functionName).name("Browse...");
                folder.add(this, stringName, textures).name("Choose").onChange(function (result) {
                    if (result === "None") {
                        object[property] = undefined;
                    }
                    else {
                        for (var i = 0; i < scene.textures.length; i++) {
                            if (scene.textures[i].name === result) {
                                object[property] = scene.textures[i];
                                break;
                            }
                        }
                    }
                    if (callback)
                        callback();
                });
                return folder;
            };
            return AbstractDatTool;
        }(EDITOR.AbstractTool));
        EDITOR.AbstractDatTool = AbstractDatTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GeneralTool = (function (_super) {
            __extends(GeneralTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function GeneralTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.object = null;
                this.tab = "GENERAL.TAB";
                // Private members
                this._isActiveCamera = false;
                this._isActivePlayCamera = false;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-GENERAL"
                ];
            }
            // Object supported
            GeneralTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.AbstractMesh
                    || object instanceof BABYLON.Light
                    || object instanceof BABYLON.Camera
                    || object instanceof BABYLON.LensFlareSystem) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            GeneralTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "General" });
            };
            // Update
            GeneralTool.prototype.update = function () {
                var _this = this;
                var object = this.object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                var core = this._editionTool.core;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // General
                var generalFolder = this._element.addFolder("Common");
                generalFolder.add(object, "name").name("Name").onChange(function (result) {
                    var sidebar = _this._editionTool.core.editor.sceneGraphTool.sidebar;
                    var element = sidebar.getSelectedNode();
                    if (element) {
                        element.text = result;
                        sidebar.refresh();
                    }
                });
                // Camera
                if (object instanceof BABYLON.Camera) {
                    var cameraFolder = this._element.addFolder("Camera");
                    if (object !== core.camera) {
                        this._isActivePlayCamera = object === core.playCamera;
                        cameraFolder.add(this, "_isActivePlayCamera").name("Set Play Camera").listen().onFinishChange(function (result) {
                            if (result === true) {
                                core.playCamera = object;
                                if (core.isPlaying)
                                    core.currentScene.activeCamera = object;
                            }
                            else {
                                result = true;
                            }
                        });
                    }
                    this._isActiveCamera = object === core.currentScene.activeCamera;
                    cameraFolder.add(this, "_isActiveCamera").name("Active Camera").listen().onFinishChange(function (result) {
                        if (result === true) {
                            core.currentScene.activeCamera = object;
                        }
                        else {
                            result = true;
                        }
                    });
                    cameraFolder.add(this.object, "maxZ").min(0).step(0.1).name("Far Value");
                    cameraFolder.add(this.object, "minZ").min(0).step(0.1).name("Near Value");
                    if (object.speed)
                        cameraFolder.add(this.object, "speed").min(0).step(0.001).name("Speed");
                }
                // Transforms
                var transformFolder = this._element.addFolder("Transforms");
                if (object.position) {
                    var positionFolder = this._element.addFolder("Position", transformFolder);
                    positionFolder.add(object.position, "x").step(0.1).name("x");
                    positionFolder.add(object.position, "y").step(0.1).name("y");
                    positionFolder.add(object.position, "z").step(0.1).name("z");
                }
                if (object.rotation) {
                    var rotationFolder = this._element.addFolder("Rotation", transformFolder);
                    rotationFolder.add(object.rotation, "x").name("x").step(0.1);
                    rotationFolder.add(object.rotation, "y").name("y").step(0.1);
                    rotationFolder.add(object.rotation, "z").name("z").step(0.1);
                }
                if (object.scaling) {
                    var scalingFolder = this._element.addFolder("Scaling", transformFolder);
                    scalingFolder.add(object.scaling, "x").name("x").step(0.1);
                    scalingFolder.add(object.scaling, "y").name("y").step(0.1);
                    scalingFolder.add(object.scaling, "z").name("z").step(0.1);
                }
                // Rendering
                if (object instanceof BABYLON.AbstractMesh) {
                    var renderingFolder = this._element.addFolder("Rendering");
                    renderingFolder.add(object, "receiveShadows").name("Receive Shadows");
                    renderingFolder.add(object, "applyFog").name("Apply Fog");
                    renderingFolder.add(object, "isVisible").name("Is Visible");
                    renderingFolder.add(this, "_castShadows").name("Cast Shadows").onChange(function (result) {
                        if (result === true) {
                            var dialog = new EDITOR.GUI.GUIDialog("CastShadowsDialog", _this._editionTool.core, "Shadows Generator", "Make children to cast shadows");
                            dialog.callback = function (data) {
                                if (data === "Yes") {
                                    _this._setChildrenCastingShadows(object);
                                }
                            };
                            dialog.buildElement(null);
                        }
                    });
                }
                return true;
            };
            Object.defineProperty(GeneralTool.prototype, "_castShadows", {
                // If object casts shadows or not
                get: function () {
                    var scene = this.object.getScene();
                    for (var i = 0; i < scene.lights.length; i++) {
                        var light = scene.lights[i];
                        var shadows = light.getShadowGenerator();
                        if (!shadows)
                            continue;
                        var shadowMap = shadows.getShadowMap();
                        for (var j = 0; j < shadowMap.renderList.length; j++) {
                            var mesh = shadowMap.renderList[j];
                            if (mesh === this.object)
                                return true;
                        }
                    }
                    return false;
                },
                // Sets if object casts shadows or not
                set: function (cast) {
                    var scene = this.object.getScene();
                    var object = this.object;
                    for (var i = 0; i < scene.lights.length; i++) {
                        var light = scene.lights[i];
                        var shadows = light.getShadowGenerator();
                        if (!shadows)
                            continue;
                        var shadowMap = shadows.getShadowMap();
                        if (cast)
                            shadowMap.renderList.push(object);
                        else {
                            var index = shadowMap.renderList.indexOf(object);
                            if (index !== -1)
                                shadowMap.renderList.splice(index, 1);
                        }
                    }
                },
                enumerable: true,
                configurable: true
            });
            // Sets children casting shadows
            GeneralTool.prototype._setChildrenCastingShadows = function (node) {
                var scene = node.getScene();
                for (var i = 0; i < node.getDescendants().length; i++) {
                    var object = node.getDescendants()[i];
                    if (!(object instanceof BABYLON.AbstractMesh))
                        continue;
                    for (var j = 0; j < scene.lights.length; j++) {
                        var light = scene.lights[j];
                        var shadows = light.getShadowGenerator();
                        if (!shadows)
                            continue;
                        var shadowMap = shadows.getShadowMap();
                        var index = shadowMap.renderList.indexOf(object);
                        if (index === -1)
                            shadowMap.renderList.push(object);
                    }
                    this._setChildrenCastingShadows(object);
                }
            };
            return GeneralTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.GeneralTool = GeneralTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AnimationTool = (function (_super) {
            __extends(AnimationTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AnimationTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "ANIMATION.TAB";
                // Private members
                this._animationSpeed = 1.0;
                this._loopAnimation = false;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-ANIMATION"
                ];
            }
            // Object supported
            AnimationTool.prototype.isObjectSupported = function (object) {
                if (object.animations && Array.isArray(object.animations))
                    return true;
                return false;
            };
            // Creates the UI
            AnimationTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Animations" });
            };
            // Update
            AnimationTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Edit animations
                this._element.add(this, "_editAnimations").name("Edit Animations");
                // Animations
                var animationsFolder = this._element.addFolder("Play Animations");
                animationsFolder.add(this, "_playAnimations").name("Play Animations");
                animationsFolder.add(this, "_animationSpeed").min(0).name("Speed");
                animationsFolder.add(this, "_loopAnimation").name("Loop");
                if (object instanceof BABYLON.AbstractMesh && object.skeleton) {
                    var skeletonFolder = this._element.addFolder("Skeleton");
                    skeletonFolder.add(this, "_playSkeletonAnimations").name("Play Animations");
                    object.skeleton.needInitialSkinMatrix = object.skeleton.needInitialSkinMatrix || false;
                    skeletonFolder.add(object.skeleton, "needInitialSkinMatrix").name("Need Initial Skin Matrix");
                }
                // Actions Builder
                if (object instanceof BABYLON.Scene || object instanceof BABYLON.AbstractMesh) {
                    var actionsBuilderFolder = this._element.addFolder("Actions Builder");
                    actionsBuilderFolder.add(this, "_openActionsBuilder").name("Open Actions Builder");
                }
                return true;
            };
            // Loads the animations tool
            AnimationTool.prototype._editAnimations = function () {
                var animCreator = new EDITOR.GUIAnimationEditor(this._editionTool.core, this.object);
            };
            // Plays animations
            AnimationTool.prototype._playAnimations = function () {
                this._editionTool.core.currentScene.beginAnimation(this.object, 0, Number.MAX_VALUE, this._loopAnimation, this._animationSpeed);
            };
            // Plays animations of skeleton
            AnimationTool.prototype._playSkeletonAnimations = function () {
                var object = this.object = this._editionTool.object;
                var scene = object.getScene();
                scene.beginAnimation(object.skeleton, 0, Number.MAX_VALUE, this._loopAnimation, this._animationSpeed);
            };
            // Opens the actions builder. Creates the action manager if does not exist
            AnimationTool.prototype._openActionsBuilder = function () {
                var actionManager = null;
                var object = this.object;
                if (this.object instanceof BABYLON.Scene)
                    actionManager = this._editionTool.core.isPlaying ? this.object.actionManager : EDITOR.SceneManager._SceneConfiguration.actionManager;
                else
                    actionManager = this._editionTool.core.isPlaying ? this.object.actionManager : EDITOR.SceneManager._ConfiguredObjectsIDs[this.object.id].actionManager;
                if (!actionManager) {
                    actionManager = new BABYLON.ActionManager(this._editionTool.core.currentScene);
                    if (this.object instanceof BABYLON.Scene)
                        EDITOR.SceneManager._SceneConfiguration.actionManager = actionManager;
                    else
                        EDITOR.SceneManager._ConfiguredObjectsIDs[object.id].actionManager = actionManager;
                }
                var actionsBuilder = new EDITOR.GUIActionsBuilder(this._editionTool.core, this.object, actionManager);
            };
            return AnimationTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.AnimationTool = AnimationTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AudioTool = (function (_super) {
            __extends(AudioTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AudioTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "SOUND.TAB";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-SOUND"
                ];
            }
            // Object supported
            AudioTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Sound)
                    return true;
                return false;
            };
            // Creates the UI
            AudioTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Sound" });
            };
            // Update
            AudioTool.prototype.update = function () {
                var sound = this.object = this._editionTool.object;
                var soundTrack = this._editionTool.core.currentScene.soundTracks[sound.soundTrackId];
                _super.prototype.update.call(this);
                if (!sound)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(sound);
                // Sound
                var soundFolder = this._element.addFolder("Sound");
                soundFolder.add(this, "_playSound").name("Play Sound");
                soundFolder.add(this, "_pauseSound").name("Pause Sound");
                soundFolder.add(this, "_stopSound").name("Stop Sound");
                this._volume = sound.getVolume();
                this._playbackRate = sound._playbackRate;
                soundFolder.add(this, "_volume").min(0.0).max(1.0).step(0.01).name("Volume").onChange(function (result) {
                    sound.setVolume(result);
                });
                soundFolder.add(this, "_playbackRate").min(0.0).max(1.0).step(0.01).name("Playback Rate").onChange(function (result) {
                    sound.setPlaybackRate(result);
                });
                soundFolder.add(sound, "rolloffFactor").min(0.0).max(1.0).step(0.01).name("Rolloff Factor").onChange(function (result) {
                    sound.updateOptions({
                        rolloffFactor: result
                    });
                });
                soundFolder.add(sound, "loop").name("Loop").onChange(function (result) {
                    sound.updateOptions({
                        loop: result
                    });
                });
                if (sound.spatialSound) {
                    soundFolder.add(sound, "distanceModel", ["linear", "exponential", "inverse"]).name("Distance Model").onFinishChange(function (result) {
                        sound.updateOptions({
                            distanceModel: result
                        });
                    });
                    soundFolder.add(sound, "maxDistance").min(0.0).name("Max Distance").onChange(function (result) {
                        sound.updateOptions({
                            maxDistance: result
                        });
                    });
                    this._position = sound._position;
                    var positionFolder = soundFolder.addFolder("Position");
                    positionFolder.open();
                    positionFolder.add(this._position, "x").step(0.1).onChange(this._positionCallback(sound)).listen();
                    positionFolder.add(this._position, "y").step(0.1).onChange(this._positionCallback(sound)).listen();
                    positionFolder.add(this._position, "z").step(0.1).onChange(this._positionCallback(sound)).listen();
                    soundFolder.add(this, "_attachSoundToMesh").name("Attach to mesh...");
                }
                // Soundtrack
                var soundTrackFolder = this._element.addFolder("Sound Track");
                return true;
            };
            // Position callback
            AudioTool.prototype._positionCallback = function (sound) {
                var _this = this;
                return function (result) {
                    sound.setPosition(_this._position);
                };
            };
            // Attach sound to mesh...
            AudioTool.prototype._attachSoundToMesh = function () {
                var _this = this;
                var picker = new EDITOR.ObjectPicker(this._editionTool.core);
                picker.objectLists.push(this._editionTool.core.currentScene.meshes);
                picker.minSelectCount = 0;
                picker.onObjectPicked = function (names) {
                    var node = null;
                    if (names.length > 0) {
                        node = _this._editionTool.core.currentScene.getNodeByName(names[0]);
                        if (node) {
                            _this.object.attachToMesh(node);
                        }
                    }
                };
                picker.open();
            };
            // Pause sound
            AudioTool.prototype._pauseSound = function () {
                var sound = this.object;
                sound.pause();
            };
            // Play sound
            AudioTool.prototype._playSound = function () {
                var sound = this.object;
                sound.play();
            };
            // Stop sound
            AudioTool.prototype._stopSound = function () {
                var sound = this.object;
                sound.stop();
            };
            return AudioTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.AudioTool = AudioTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LensFlareTool = (function (_super) {
            __extends(LensFlareTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function LensFlareTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "LENSFLARE.TAB";
                // Private members
                this._dummyProperty = "Lens Flare 1";
                this._currentLensFlareId = 0;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-LENS-FLARE"
                ];
            }
            // Object supported
            LensFlareTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.LensFlareSystem) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            LensFlareTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Lens Flare" });
            };
            // Update
            LensFlareTool.prototype.update = function () {
                var _this = this;
                var object = this.object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                var core = this._editionTool.core;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // General
                var commonFolder = this._element.addFolder("Common");
                commonFolder.add(object, "borderLimit").min(0).step(1).name("Border Limit");
                commonFolder.add(this, "_addLensFlare").name("Add Lens Flare...");
                // Select lens flare
                var lensFlares = [];
                for (var i = 0; i < object.lensFlares.length; i++)
                    lensFlares.push("Lens Flare " + (i + 1));
                commonFolder.add(this, "_dummyProperty", lensFlares).name("Lens Flare :").onFinishChange(function (result) {
                    var indice = parseFloat(result.split("Lens Flare ")[1]);
                    if (typeof indice === "number") {
                        indice--;
                        _this._currentLensFlareId = indice;
                    }
                    _this.update();
                });
                // Lens Flare
                var lensFlare = object.lensFlares[this._currentLensFlareId];
                if (!lensFlare)
                    return false;
                var lfFolder = this._element.addFolder("Lens Flare");
                var colorFolder = this._element.addFolder("Color", lfFolder);
                colorFolder.add(lensFlare.color, "r").min(0).max(1).name("R");
                colorFolder.add(lensFlare.color, "g").min(0).max(1).name("G");
                colorFolder.add(lensFlare.color, "b").min(0).max(1).name("B");
                lfFolder.add(lensFlare, "position").step(0.1).name("Position");
                lfFolder.add(lensFlare, "size").step(0.1).name("Size");
                this.addTextureFolder(lensFlare, "Texture", "texture", lfFolder).open();
                this._setupRemove(this._currentLensFlareId);
                lfFolder.add(this, "_removeLensFlare" + this._currentLensFlareId).name("Remove...");
                // Finish
                this._currentLensFlareId = 0;
                this._dummyProperty = "Lens Flare 1";
                return true;
            };
            // Add a lens flare
            LensFlareTool.prototype._addLensFlare = function () {
                var lf = EDITOR.SceneFactory.AddLensFlare(this._editionTool.core, this.object, 0.5, 0, new BABYLON.Color3(1, 0, 0));
                this.update();
            };
            // Resets "this"
            LensFlareTool.prototype._reset = function () {
                for (var thing in this) {
                    if (thing.indexOf("_removeLensFlare") !== -1) {
                        delete this[thing];
                    }
                    else if (thing.indexOf("_changeTexture") !== -1) {
                        delete this[thing];
                    }
                }
                this.update();
            };
            // Removes a lens flare
            LensFlareTool.prototype._setupRemove = function (indice) {
                var _this = this;
                this["_removeLensFlare" + indice] = function () {
                    _this.object.lensFlares[indice].dispose();
                    _this._reset();
                };
            };
            return LensFlareTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.LensFlareTool = LensFlareTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LightTool = (function (_super) {
            __extends(LightTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function LightTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "LIGHT.TAB";
                // Private members
                this._customShadowsGeneratorSize = 512;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-LIGHT"
                ];
            }
            // Object supported
            LightTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Light)
                    return true;
                return false;
            };
            // Creates the UI
            LightTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Light" });
            };
            // Update
            LightTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Common
                var commonFolder = this._element.addFolder("Common");
                commonFolder.add(object, "intensity").min(0.0).name("Intensity");
                commonFolder.add(object, "range").name("Range").min(0.0);
                commonFolder.add(object, "radius").min(0.0).step(0.001).name("Radius");
                // Vectors
                if (object instanceof BABYLON.DirectionalLight) {
                    var directionFolder = this._element.addFolder("Direction");
                    directionFolder.add(object.direction, "x").step(0.1);
                    directionFolder.add(object.direction, "y").step(0.1);
                    directionFolder.add(object.direction, "z").step(0.1);
                }
                // Spot light
                if (object instanceof BABYLON.SpotLight) {
                    var spotFolder = this._element.addFolder("Spot Light");
                    spotFolder.add(object, "exponent").min(0.0).name("Exponent");
                    spotFolder.add(object, "angle").min(0.0).name("Angle");
                }
                // Hemispheric light
                if (object instanceof BABYLON.HemisphericLight) {
                    var hemiFolder = this._element.addFolder("Hemispheric Light");
                    this.addVectorFolder(object.direction, "Direction", true, hemiFolder);
                    this.addColorFolder(object.groundColor, "Ground Color", true, hemiFolder);
                }
                // Colors
                var colorsFolder = this._element.addFolder("Colors");
                if (object.diffuse) {
                    var diffuseFolder = colorsFolder.addFolder("Diffuse Color");
                    diffuseFolder.open();
                    diffuseFolder.add(object.diffuse, "r").min(0.0).max(1.0).step(0.01);
                    diffuseFolder.add(object.diffuse, "g").min(0.0).max(1.0).step(0.01);
                    diffuseFolder.add(object.diffuse, "b").min(0.0).max(1.0).step(0.01);
                }
                if (object.specular) {
                    var specularFolder = colorsFolder.addFolder("Specular Color");
                    specularFolder.open();
                    specularFolder.add(object.specular, "r").min(0.0).max(1.0).step(0.01);
                    specularFolder.add(object.specular, "g").min(0.0).max(1.0).step(0.01);
                    specularFolder.add(object.specular, "b").min(0.0).max(1.0).step(0.01);
                }
                // Shadows
                var shadowsFolder = this._element.addFolder("Shadows");
                var shadows = object.getShadowGenerator();
                if (shadows) {
                    shadowsFolder.add(shadows, "useBlurVarianceShadowMap").name("Use Blur Variance Shadows Map").listen();
                    shadowsFolder.add(shadows, "useVarianceShadowMap").name("Use Variance Shadow Map").listen();
                    shadowsFolder.add(shadows, "usePoissonSampling").name("Use Poisson Sampling").listen();
                    if (shadows.forceBackFacesOnly !== undefined)
                        shadowsFolder.add(shadows, "forceBackFacesOnly").name("Force back faces only");
                    shadowsFolder.add(shadows, "_darkness").min(0.0).max(1.0).step(0.01).name("Darkness");
                    shadowsFolder.add(shadows, "bias").name("Bias");
                    shadowsFolder.add(shadows, "blurBoxOffset").min(0.0).max(10.0).step(1.0).name("Blur Box Offset");
                    shadowsFolder.add(shadows, "blurScale").min(0.0).max(10.0).name("Blur Scale");
                    shadowsFolder.add(this, "_removeShadowGenerator").name("Remove Shadows Generator");
                }
                else {
                    if (!(object instanceof BABYLON.HemisphericLight)) {
                        shadowsFolder.add(this, "_createShadowsGenerator").name("Create Shadows Generator");
                        shadowsFolder.add(this, "_customShadowsGeneratorSize").min(0).name("Shadow Map Size");
                    }
                }
                return true;
            };
            // Creates a new shadows generator
            LightTool.prototype._createShadowsGenerator = function () {
                // Assume that object exists
                var object = this.object = this._editionTool.object;
                // Shadows Generator
                var shadows = new BABYLON.ShadowGenerator(this._customShadowsGeneratorSize, object);
                BABYLON.Tags.EnableFor(shadows);
                BABYLON.Tags.AddTagsTo(shadows, "added");
                // Refresh UI
                this._editionTool.updateEditionTool();
            };
            // Removes a shadows generator
            LightTool.prototype._removeShadowGenerator = function () {
                var object = this.object = this._editionTool.object;
                // Shadows Generator
                var shadows = object.getShadowGenerator();
                if (shadows)
                    shadows.dispose();
                object._shadowGenerator = null;
                this.update();
            };
            return LightTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.LightTool = LightTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var MaterialTool = (function (_super) {
            __extends(MaterialTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function MaterialTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "MATERIAL.TAB";
                // Private members
                this._dummyProperty = "";
                this._libraryDummyProperty = "";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-MATERIAL"
                ];
            }
            // Object supported
            MaterialTool.prototype.isObjectSupported = function (object) {
                /*
                if (object instanceof Mesh) {
                    if (object.material && !(object.material instanceof MultiMaterial))
                        return true;
                }
                else if (object instanceof SubMesh) {
                    var subMesh = <SubMesh>object;
                    var multiMaterial = <MultiMaterial>subMesh.getMesh().material;
                    if (multiMaterial instanceof MultiMaterial && multiMaterial.subMaterials[subMesh.materialIndex])
                        return true;
                }
                */
                if (object instanceof BABYLON.AbstractMesh) {
                    if (object.material && (object.material instanceof BABYLON.MultiMaterial))
                        return false;
                    return true;
                }
                else if (object instanceof BABYLON.SubMesh)
                    return true;
                return false;
            };
            // Creates the UI
            MaterialTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Material" });
            };
            // Update
            MaterialTool.prototype.update = function () {
                var _this = this;
                var object = this._editionTool.object;
                var material = null;
                var scene = this._editionTool.core.currentScene;
                _super.prototype.update.call(this);
                if (object instanceof BABYLON.AbstractMesh) {
                    material = object.material;
                }
                else if (object instanceof BABYLON.SubMesh) {
                    material = object.getMaterial();
                }
                this.object = object;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Material
                var materialFolder = this._element.addFolder("Material");
                var materials = ["None"];
                for (var i = 0; i < scene.materials.length; i++)
                    materials.push(scene.materials[i].name);
                this._dummyProperty = material && material.name ? material.name : materials[0];
                materialFolder.add(this, "_dummyProperty", materials).name("Material :").onFinishChange(function (result) {
                    if (result === "None") {
                        _this._removeMaterial();
                    }
                    else {
                        var newmaterial = scene.getMaterialByName(result);
                        if (_this._editionTool.object instanceof BABYLON.SubMesh) {
                            var index = _this._editionTool.object.materialIndex;
                            var multiMaterial = _this._editionTool.object.getMesh().material;
                            if (multiMaterial instanceof BABYLON.MultiMaterial)
                                _this._editionTool.object.getMesh().material.subMaterials[index] = newmaterial;
                        }
                        else
                            _this._editionTool.object.material = newmaterial;
                    }
                    _this._editionTool.updateEditionTool();
                });
                materialFolder.add(this, "_removeMaterial").name("Remove Material");
                // Common
                if (material) {
                    var generalFolder = this._element.addFolder("Common");
                    generalFolder.add(material, "id").name("Id");
                    generalFolder.add(material, "alpha").min(0).max(1).name("Alpha");
                    // Options
                    var optionsFolder = this._element.addFolder("Options");
                    optionsFolder.add(material, "wireframe").name("Wire frame");
                    optionsFolder.add(material, "fogEnabled").name("Fog Enabled");
                    optionsFolder.add(material, "backFaceCulling").name("Back Face Culling");
                    optionsFolder.add(material, "checkReadyOnEveryCall").name("Check Ready On every Call");
                    optionsFolder.add(material, "checkReadyOnlyOnce").name("Check Ready Only Once");
                    optionsFolder.add(material, "disableDepthWrite").name("Disable Depth Write");
                    if (material.disableLighting !== undefined)
                        optionsFolder.add(material, "disableLighting").name("Disable Lighting");
                }
                // Materials Library
                var materialsLibraryFolder = this._element.addFolder("Materials Library");
                this._configureMaterialsLibrary(materialsLibraryFolder);
                return true;
            };
            // Configure materials library
            MaterialTool.prototype._configureMaterialsLibrary = function (folder) {
                var items = [
                    "None",
                    "StandardMaterial",
                    "PBRMaterial",
                    "FireMaterial",
                    "GradientMaterial",
                    "FurMaterial",
                    "GridMaterial",
                    "LavaMaterial",
                    "NormalMaterial",
                    "SkyMaterial",
                    "TerrainMaterial",
                    "TriPlanarMaterial",
                    "WaterMaterial",
                    "SimpleMaterial"
                ];
                var ctr = EDITOR.Tools.GetConstructorName(this.object.material);
                this._libraryDummyProperty = ctr === "undefined" ? items[0] : ctr;
                folder.add(this, "_libraryDummyProperty", items).name("Material");
                folder.add(this, "_applyMaterial").name("Apply Material");
            };
            // Apply the selected material
            MaterialTool.prototype._applyMaterial = function () {
                var material = new BABYLON[this._libraryDummyProperty]("New Material " + EDITOR.SceneFactory.GenerateUUID(), this._editionTool.core.currentScene);
                if (this.object instanceof BABYLON.AbstractMesh)
                    this.object.material = material;
                else if (this.object instanceof BABYLON.SubMesh) {
                    var subMesh = this.object;
                    var subMeshMaterial = subMesh.getMesh().material;
                    if (!(subMeshMaterial instanceof BABYLON.MultiMaterial))
                        return;
                    subMeshMaterial.subMaterials[subMesh.materialIndex] = material;
                }
                if (material instanceof BABYLON.FurMaterial && this.object instanceof BABYLON.AbstractMesh) {
                    var furTexture = BABYLON.FurMaterial.GenerateTexture("furTexture", this._editionTool.core.currentScene);
                    material.furTexture = furTexture;
                    var meshes = BABYLON.FurMaterial.FurifyMesh(this.object, 30);
                    for (var i = 0; i < meshes.length; i++) {
                        BABYLON.Tags.EnableFor(meshes[i]);
                        BABYLON.Tags.AddTagsTo(meshes[i], "FurAdded");
                    }
                }
                this._editionTool.updateEditionTool();
            };
            // Removes the current material
            MaterialTool.prototype._removeMaterial = function () {
                if (this.object instanceof BABYLON.AbstractMesh) {
                    this.object.material = undefined;
                }
                else if (this.object instanceof BABYLON.SubMesh) {
                    var subMesh = this.object;
                    var material = subMesh.getMesh().material;
                    if (!(material instanceof BABYLON.MultiMaterial))
                        return;
                    material.subMaterials[subMesh.materialIndex] = undefined;
                }
                this._editionTool.updateEditionTool();
            };
            // Set material from materials library
            MaterialTool.prototype._setMaterialsLibrary = function () {
                // Body
                var windowBody = EDITOR.GUI.GUIElement.CreateElement("div", "BABYLON-EDITOR-MATERIALS-LIBRARY");
                var window = new EDITOR.GUI.GUIWindow("MaterialsLibraryWindow", this._editionTool.core, "Materials Library", windowBody, new BABYLON.Vector2(800, 600), ["Select", "Cancel"]);
                window.modal = true;
                window.buildElement(null);
                // Layout
            };
            return MaterialTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.MaterialTool = MaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ParticleSystemTool = (function (_super) {
            __extends(ParticleSystemTool, _super);
            // Private members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function ParticleSystemTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "PARTICLE.SYSTEM.TAB";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-PARTICLE-SYSTEM"
                ];
            }
            // Object supported
            ParticleSystemTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.ParticleSystem)
                    return true;
                return false;
            };
            // Creates the UI
            ParticleSystemTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Particles" });
            };
            // Update
            ParticleSystemTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                _super.prototype.update.call(this);
                // Configure main toolbar
                var toolbar = this._editionTool.core.editor.mainToolbar;
                toolbar.toolbar.setItemEnabled(toolbar.particleSystemCopyItem.id, object !== null, toolbar.particleSystemMenu.id);
                toolbar.toolbar.setItemEnabled(toolbar.particleSystemPasteItem.id, object instanceof BABYLON.ParticleSystem, toolbar.particleSystemMenu.id);
                EDITOR.GUIParticleSystemEditor._CurrentParticleSystem = object;
                if (!object)
                    return false;
                var psEditor = new EDITOR.GUIParticleSystemEditor(this._editionTool.core, object, false);
                this._element = psEditor._createEditor(this.containers[0]);
                return true;
            };
            return ParticleSystemTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.ParticleSystemTool = ParticleSystemTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var PostProcessesTool = (function (_super) {
            __extends(PostProcessesTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function PostProcessesTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "POSTPROCESSES.TAB";
                // Private members
                this._renderEffects = {};
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-POSTPROCESSES"
                ];
            }
            // Object supported
            PostProcessesTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Scene)
                    return true;
                return false;
            };
            // Creates the UI
            PostProcessesTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Post-Processes" });
            };
            // Update
            PostProcessesTool.prototype.update = function () {
                var _this = this;
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Ckeck checkboxes
                EDITOR.SceneFactory.EnabledPostProcesses.standard = EDITOR.SceneFactory.StandardPipeline !== null;
                EDITOR.SceneFactory.EnabledPostProcesses.ssao = EDITOR.SceneFactory.SSAOPipeline !== null;
                // Standard
                var standardFolder = this._element.addFolder("HDR2");
                standardFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "standard").name("Enabled Standard").onChange(function (result) {
                    if (result === true)
                        EDITOR.SceneFactory.CreateStandardRenderingPipeline(_this._editionTool.core);
                    else {
                        EDITOR.SceneFactory.StandardPipeline.dispose();
                        EDITOR.SceneFactory.StandardPipeline = null;
                    }
                    _this.update();
                });
                if (EDITOR.SceneFactory.StandardPipeline) {
                    var animationsFolder = standardFolder.addFolder("Animations");
                    animationsFolder.add(this, "_editAnimations").name("Edit Animations");
                    var highLightFolder = standardFolder.addFolder("Highlighting");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "exposure").min(0).max(10).step(0.01).name("Exposure");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "brightThreshold").min(0).max(10).step(0.01).name("Bright Threshold");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "gaussianCoefficient").min(0).max(10).step(0.01).name("Gaussian Coefficient");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "gaussianMean").min(0).max(30).step(0.01).name("Gaussian Mean");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "gaussianStandardDeviation").min(0).max(30).step(0.01).name("Gaussian Standard Deviation");
                    //highLightFolder.add(SceneFactory.StandardPipeline, "blurWidth").min(0).max(5).step(0.01).name("Blur Width");
                    this.addTextureFolder(EDITOR.SceneFactory.StandardPipeline, "Lens Dirt Texture", "lensTexture", highLightFolder).open();
                    highLightFolder.open();
                    var lensFolder = standardFolder.addFolder("Lens Flare");
                    lensFolder.add(EDITOR.SceneFactory.StandardPipeline, "LensFlareEnabled").name("Lens Flare Enabled");
                    lensFolder.add(EDITOR.SceneFactory.StandardPipeline, "lensFlareStrength").min(0).max(50).step(0.01).name("Strength");
                    lensFolder.add(EDITOR.SceneFactory.StandardPipeline, "lensFlareHaloWidth").min(0).max(2).step(0.01).name("Halo Width");
                    lensFolder.add(EDITOR.SceneFactory.StandardPipeline, "lensFlareGhostDispersal").min(0).max(10).step(0.1).name("Ghost Dispersal");
                    lensFolder.add(EDITOR.SceneFactory.StandardPipeline, "lensFlareDistortionStrength").min(0).max(500).step(0.1).name("Distortion Strength");
                    this.addTextureFolder(EDITOR.SceneFactory.StandardPipeline, "Lens Flare Dirt Texture", "lensFlareDirtTexture", lensFolder).open();
                    lensFolder.open();
                    var dofFolder = standardFolder.addFolder("Depth Of Field");
                    dofFolder.add(EDITOR.SceneFactory.StandardPipeline, "DepthOfFieldEnabled").name("Enable Depth-Of-Field");
                    dofFolder.add(EDITOR.SceneFactory.StandardPipeline, "depthOfFieldDistance").min(0).max(this._editionTool.core.currentScene.activeCamera.maxZ).name("DOF Distance");
                    dofFolder.open();
                    var debugFolder = standardFolder.addFolder("Debug");
                    this._setupDebugPipeline(debugFolder, EDITOR.SceneFactory.StandardPipeline);
                }
                // SSAO
                var ssaoFolder = this._element.addFolder("SSAO");
                ssaoFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "ssao").name("Enable SSAO").onChange(function (result) {
                    if (result === true)
                        EDITOR.SceneFactory.SSAOPipeline = EDITOR.SceneFactory.CreateSSAOPipeline(_this._editionTool.core);
                    else {
                        EDITOR.SceneFactory.SSAOPipeline.dispose();
                        EDITOR.SceneFactory.SSAOPipeline = null;
                    }
                    _this.update();
                });
                if (EDITOR.SceneFactory.SSAOPipeline) {
                    ssaoFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "attachSSAO").name("Attach SSAO").onChange(function (result) {
                        _this._attachDetachPipeline(result, "ssao");
                    });
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "totalStrength").min(0).max(10).step(0.001).name("Strength");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "area").min(0).max(1).step(0.0001).name("Area");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "radius").min(0).max(1).step(0.00001).name("Radius");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "fallOff").min(0).step(0.000001).name("Fall Off");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "base").min(0).max(10).step(0.001).name("Base");
                    var debugFolder = ssaoFolder.addFolder("Debug");
                    this._setupDebugPipeline(debugFolder, EDITOR.SceneFactory.SSAOPipeline);
                }
                // VLS
                var vlsFolder = this._element.addFolder("Volumetric Light Scattering");
                vlsFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "vls").name("Enable VLS").onChange(function (result) {
                    if (result === true) {
                        var picker = new EDITOR.ObjectPicker(_this._editionTool.core);
                        picker.objectLists.push(_this._editionTool.core.currentScene.meshes);
                        picker.minSelectCount = 0;
                        picker.closeButtonName = "Cancel";
                        picker.selectButtonName = "Add";
                        picker.windowName = "Select an emitter?";
                        picker.onObjectPicked = function (names) {
                            var mesh = _this._editionTool.core.currentScene.getMeshByName(names[0]);
                            EDITOR.SceneFactory.VLSPostProcess = EDITOR.SceneFactory.CreateVLSPostProcess(_this._editionTool.core, mesh);
                            _this.update();
                        };
                        picker.open();
                    }
                    else {
                        EDITOR.SceneFactory.VLSPostProcess.dispose(_this._editionTool.core.camera);
                        EDITOR.SceneFactory.VLSPostProcess = null;
                        _this.update();
                    }
                });
                if (EDITOR.SceneFactory.VLSPostProcess) {
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "exposure").min(0).max(1).name("Exposure");
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "decay").min(0).max(1).name("Decay");
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "weight").min(0).max(1).name("Weight");
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "density").min(0).max(1).name("Density");
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "invert").name("Invert");
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "useDiffuseColor").name("use Diffuse Color");
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "useCustomMeshPosition").name("Use Custom Position");
                    this.addVectorFolder(EDITOR.SceneFactory.VLSPostProcess.customMeshPosition, "Position", true, vlsFolder);
                    vlsFolder.add(this, "_setVLSAttachedNode").name("Attach Node...");
                }
                return true;
            };
            // Set up attached node of VLS
            PostProcessesTool.prototype._setVLSAttachedNode = function () {
                var _this = this;
                var picker = new EDITOR.ObjectPicker(this._editionTool.core);
                picker.objectLists.push(this._editionTool.core.currentScene.meshes);
                picker.objectLists.push(this._editionTool.core.currentScene.lights);
                picker.objectLists.push(this._editionTool.core.currentScene.cameras);
                picker.minSelectCount = 0;
                picker.onObjectPicked = function (names) {
                    var node = null;
                    if (names.length > 0)
                        node = _this._editionTool.core.currentScene.getNodeByName(names[0]);
                    EDITOR.SceneFactory.VLSPostProcess.attachedNode = node;
                };
                picker.open();
            };
            // Set up debug mode
            PostProcessesTool.prototype._setupDebugPipeline = function (folder, pipeline) {
                var _this = this;
                var renderEffects = pipeline._renderEffects;
                var configure = function () {
                    for (var effectName in renderEffects) {
                        if (_this._renderEffects[effectName] === true)
                            pipeline._enableEffect(effectName, _this._getPipelineCameras());
                        else
                            pipeline._disableEffect(effectName, _this._getPipelineCameras());
                    }
                };
                for (var effectName in renderEffects) {
                    var effect = renderEffects[effectName];
                    if (!this._renderEffects[effectName])
                        this._renderEffects[effectName] = true;
                    folder.add(this._renderEffects, effectName).onChange(function (result) {
                        configure();
                    });
                }
            };
            // Attach/detach pipeline
            PostProcessesTool.prototype._attachDetachPipeline = function (attach, pipeline) {
                if (attach)
                    this._editionTool.core.currentScene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(pipeline, this._getPipelineCameras());
                else
                    this._editionTool.core.currentScene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(pipeline, this._getPipelineCameras());
            };
            PostProcessesTool.prototype._getPipelineCameras = function () {
                var cameras = [this._editionTool.core.camera];
                if (this._editionTool.core.playCamera)
                    cameras.push(this._editionTool.core.playCamera);
                return cameras;
            };
            // Creates a function to change texture of a flare
            PostProcessesTool.prototype._loadHDRLensDirtTexture = function () {
                var _this = this;
                var input = EDITOR.Tools.CreateFileInpuElement("HDR-LENS-DIRT-LOAD-TEXTURE");
                input.change(function (data) {
                    var files = data.target.files || data.currentTarget.files;
                    if (files.length < 1)
                        return;
                    var file = files[0];
                    BABYLON.Tools.ReadFileAsDataURL(file, function (result) {
                        var texture = BABYLON.Texture.CreateFromBase64String(result, file.name, _this._editionTool.core.currentScene);
                        texture.name = texture.name.replace("data:", "");
                        EDITOR.SceneFactory.HDRPipeline.lensTexture = texture;
                        input.remove();
                    }, null);
                });
                input.click();
            };
            // Loads the animations tool
            PostProcessesTool.prototype._editAnimations = function () {
                var animCreator = new EDITOR.GUIAnimationEditor(this._editionTool.core, EDITOR.SceneFactory.StandardPipeline);
            };
            return PostProcessesTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.PostProcessesTool = PostProcessesTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ReflectionProbeTool = (function (_super) {
            __extends(ReflectionProbeTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function ReflectionProbeTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "REFLECTION.PROBE.TAB";
                // Private members
                this._window = null;
                this._excludedMeshesList = null;
                this._includedMeshesList = null;
                this._layouts = null;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-RENDER-TARGET"
                ];
                this._editionTool.core.eventReceivers.push(this);
            }
            // On event
            ReflectionProbeTool.prototype.onEvent = function (event) {
                // Manage event
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType !== EDITOR.GUIEventType.GRID_ROW_ADDED && event.guiEvent.eventType !== EDITOR.GUIEventType.GRID_ROW_REMOVED)
                    return false;
                var object = this.object;
                // Manage lists
                if (event.guiEvent.caller === this._includedMeshesList) {
                    var selected = this._includedMeshesList.getSelectedRows();
                    for (var i = 0; i < selected.length; i++) {
                        var mesh = object.renderList[selected[i] - i];
                        var index = object.renderList.indexOf(mesh);
                        if (index !== -1)
                            object.renderList.splice(index, 1);
                        //this._excludedMeshesList.addRow({ name: mesh.name });
                        this._excludedMeshesList.addRecord({ name: mesh.name });
                    }
                    this._excludedMeshesList.refresh();
                    return true;
                }
                else if (event.guiEvent.caller === this._excludedMeshesList) {
                    var selected = this._excludedMeshesList.getSelectedRows();
                    var offset = 0;
                    for (var i = 0; i < selected.length; i++) {
                        var mesh = this._editionTool.core.currentScene.getMeshByName(this._excludedMeshesList.getRow(selected[i]).name);
                        object.renderList.push(mesh);
                        //this._includedMeshesList.addRow({ name: mesh.name });
                        this._includedMeshesList.addRecord({ name: mesh.name });
                        //this._excludedMeshesList.removeRow(selected[i]);
                        this._excludedMeshesList.removeRecord(selected[i] - offset);
                        offset++;
                    }
                    this._includedMeshesList.refresh();
                    this._excludedMeshesList.refresh();
                    return true;
                }
                return false;
            };
            // Object supported
            ReflectionProbeTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.ReflectionProbe || object instanceof BABYLON.RenderTargetTexture
                    || (object instanceof BABYLON.Light && object.getShadowGenerator())) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            ReflectionProbeTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Render" });
            };
            // Update
            ReflectionProbeTool.prototype.update = function () {
                var _this = this;
                _super.prototype.update.call(this);
                var object = this.object = this._editionTool.object;
                if (object instanceof BABYLON.Light && object.getShadowGenerator()) {
                    object = this.object = object.getShadowGenerator().getShadowMap();
                }
                var scene = this._editionTool.core.currentScene;
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // General
                var generalFolder = this._element.addFolder("Common");
                generalFolder.add(object, "name").name("Name").onChange(function (result) {
                    var sidebar = _this._editionTool.core.editor.sceneGraphTool.sidebar;
                    var element = sidebar.getSelectedNode();
                    if (element) {
                        element.text = result;
                        sidebar.refresh();
                    }
                });
                generalFolder.add(object, "refreshRate").name("Refresh Rate").min(0.0).step(1);
                generalFolder.add(this, "_setIncludedMeshes").name("Configure Render List...");
                if (object instanceof BABYLON.ReflectionProbe)
                    generalFolder.add(this, "_attachToMesh").name("Attach To Mesh...");
                if (object instanceof BABYLON.RenderTargetTexture)
                    generalFolder.add(this, "_exportRenderTarget").name("Dump Render Target");
                // Position
                if (object instanceof BABYLON.ReflectionProbe) {
                    var positionFolder = this._element.addFolder("Position");
                    positionFolder.add(object.position, "x").step(0.01);
                    positionFolder.add(object.position, "y").step(0.01);
                    positionFolder.add(object.position, "z").step(0.01);
                }
                return true;
            };
            // Dumps the render target and opens a window
            ReflectionProbeTool.prototype._exportRenderTarget = function () {
                var _this = this;
                var rt = this.object;
                var tempCallback = rt.onAfterRender;
                var width = rt.getSize().width;
                var height = rt.getSize().height;
                rt.onAfterRender = function () {
                    BABYLON.Tools.DumpFramebuffer(width, height, _this._editionTool.core.engine, function (data) {
                        EDITOR.Tools.OpenWindowPopup(data, width, height);
                    });
                };
                rt.render(false);
                this._editionTool.core.currentScene.incrementRenderId();
                if (tempCallback)
                    tempCallback(0);
                rt.onAfterRender = tempCallback;
            };
            // Attaches to a mesh
            ReflectionProbeTool.prototype._attachToMesh = function () {
                var _this = this;
                var picker = new EDITOR.ObjectPicker(this._editionTool.core);
                picker.objectLists.push(picker.core.currentScene.meshes);
                picker.onObjectPicked = function (names) {
                    if (names.length > 1) {
                        var dialog = new EDITOR.GUI.GUIDialog("ReflectionProbeDialog", picker.core, "Warning", "A Reflection Probe can be attached to only one mesh.\n" +
                            "The first was considered as the mesh.");
                        dialog.buildElement(null);
                    }
                    _this.object.attachToMesh(picker.core.currentScene.getMeshByName(names[0]));
                };
                picker.open();
            };
            // Sets the included/excluded meshes
            ReflectionProbeTool.prototype._setIncludedMeshes = function () {
                var _this = this;
                // IDs
                var bodyID = "REFLECTION-PROBES-RENDER-LIST-LAYOUT";
                var leftPanelID = "REFLECTION-PROBES-RENDER-LIST-LAYOUT-LEFT";
                var rightPanelID = "REFLECTION-PROBES-RENDER-LIST-LAYOUT-RIGHT";
                var excludedListID = "REFLECTION-PROBES-RENDER-LIST-LIST-EXCLUDED";
                var includedListID = "REFLECTION-PROBES-RENDER-LIST-LIST-INCLUDED";
                // Window
                var body = EDITOR.GUI.GUIElement.CreateElement("div", bodyID);
                this._window = new EDITOR.GUI.GUIWindow("REFLECTION-PROBES-RENDER-LIST-WINDOW", this._editionTool.core, "Configure Render List", body);
                this._window.modal = true;
                this._window.size.x = 800;
                this._window.buildElement(null);
                this._window.setOnCloseCallback(function () {
                    _this._includedMeshesList.destroy();
                    _this._excludedMeshesList.destroy();
                    _this._layouts.destroy();
                    _this._includedMeshesList = null;
                    _this._excludedMeshesList = null;
                });
                this._window.onToggle = function (maximized, width, height) {
                    _this._layouts.getPanelFromType("left").width = width / 2;
                    _this._layouts.getPanelFromType("main").width = height / 2;
                    _this._layouts.resize();
                };
                // Layout
                var leftDiv = EDITOR.GUI.GUIElement.CreateElement("div", leftPanelID);
                var rightDiv = EDITOR.GUI.GUIElement.CreateElement("div", rightPanelID);
                this._layouts = new EDITOR.GUI.GUILayout(bodyID, this._editionTool.core);
                this._layouts.createPanel(leftDiv, "left", 400, true).setContent(leftDiv);
                this._layouts.createPanel(rightDiv, "main", 400, true).setContent(rightDiv);
                this._layouts.buildElement(bodyID);
                // Lists
                var scene = this._editionTool.core.currentScene;
                var object = this.object;
                this._excludedMeshesList = new EDITOR.GUI.GUIGrid(excludedListID, this._editionTool.core);
                this._excludedMeshesList.header = "Excluded Meshes";
                this._excludedMeshesList.showAdd = true;
                this._excludedMeshesList.createColumn("name", "name", "100%");
                this._excludedMeshesList.buildElement(leftPanelID);
                for (var i = 0; i < scene.meshes.length; i++) {
                    if (object.renderList.indexOf(scene.meshes[i]) === -1)
                        this._excludedMeshesList.addRecord({
                            name: scene.meshes[i].name
                        });
                }
                this._excludedMeshesList.refresh();
                this._includedMeshesList = new EDITOR.GUI.GUIGrid(includedListID, this._editionTool.core);
                this._includedMeshesList.header = "Included Meshes";
                this._includedMeshesList.showDelete = true;
                this._includedMeshesList.createColumn("name", "name", "100%");
                this._includedMeshesList.buildElement(rightPanelID);
                for (var i = 0; i < object.renderList.length; i++) {
                    this._includedMeshesList.addRecord({
                        name: object.renderList[i].name
                    });
                }
                this._includedMeshesList.refresh();
            };
            return ReflectionProbeTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.ReflectionProbeTool = ReflectionProbeTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneTool = (function (_super) {
            __extends(SceneTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function SceneTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "SCENE.TAB";
                // Private members
                this._fogType = "";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-SCENE"
                ];
            }
            // Object supported
            SceneTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Scene)
                    return true;
                return false;
            };
            // Creates the UI
            SceneTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Scene" });
            };
            // Update
            SceneTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Common
                this._element.add(EDITOR.SceneFactory, "AnimationSpeed").min(0.0).name("Animation Speed");
                // Colors
                var colorsFolder = this._element.addFolder("Colors");
                var ambientColorFolder = colorsFolder.addFolder("Ambient Color");
                ambientColorFolder.open();
                ambientColorFolder.add(object.ambientColor, "r").min(0.0).max(1.0).step(0.01);
                ambientColorFolder.add(object.ambientColor, "g").min(0.0).max(1.0).step(0.01);
                ambientColorFolder.add(object.ambientColor, "b").min(0.0).max(1.0).step(0.01);
                var clearColorFolder = colorsFolder.addFolder("Clear Color");
                clearColorFolder.open();
                clearColorFolder.add(object.clearColor, "r").min(0.0).max(1.0).step(0.01);
                clearColorFolder.add(object.clearColor, "g").min(0.0).max(1.0).step(0.01);
                clearColorFolder.add(object.clearColor, "b").min(0.0).max(1.0).step(0.01);
                // Collisions
                var collisionsFolder = this._element.addFolder("Collisions");
                collisionsFolder.add(object, "collisionsEnabled").name("Collisions Enabled");
                var gravityFolder = collisionsFolder.addFolder("Gravity");
                gravityFolder.add(object.gravity, "x");
                gravityFolder.add(object.gravity, "y");
                gravityFolder.add(object.gravity, "z");
                // Audio
                var audioFolder = this._element.addFolder("Audio");
                audioFolder.add(object, "audioEnabled").name("Audio Enabled");
                // Fog
                var fogFolder = this._element.addFolder("Fog");
                var fogTypes = [
                    "None",
                    "Exp", "Exp2",
                    "Linear"
                ];
                switch (object.fogMode) {
                    case BABYLON.Scene.FOGMODE_EXP:
                        this._fogType = "Exp";
                        break;
                    case BABYLON.Scene.FOGMODE_EXP2:
                        this._fogType = "Exp2";
                        break;
                    case BABYLON.Scene.FOGMODE_LINEAR:
                        this._fogType = "Linear";
                        break;
                    default:
                        this._fogType = "None";
                        break;
                }
                fogFolder.add(this, "_fogType", fogTypes).name("Fog Mode").onFinishChange(function (result) {
                    switch (result) {
                        case "Exp":
                            object.fogMode = BABYLON.Scene.FOGMODE_EXP;
                            break;
                        case "Exp2":
                            object.fogMode = BABYLON.Scene.FOGMODE_EXP2;
                            break;
                        case "Linear":
                            object.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
                            break;
                        default:
                            object.fogMode = BABYLON.Scene.FOGMODE_NONE;
                            break;
                    }
                });
                fogFolder.add(object, "fogEnabled").name("Enable Fog");
                fogFolder.add(object, "fogStart").name("Fog Start").min(0.0);
                fogFolder.add(object, "fogEnd").name("Fog End").min(0.0);
                fogFolder.add(object, "fogDensity").name("Fog Density").min(0.0);
                var fogColorFolder = fogFolder.addFolder("Fog Color");
                fogColorFolder.add(object.fogColor, "r").min(0.0).max(1.0).step(0.001);
                fogColorFolder.add(object.fogColor, "g").min(0.0).max(1.0).step(0.001);
                fogColorFolder.add(object.fogColor, "b").min(0.0).max(1.0).step(0.001);
                // Capacities
                var capacitiesFolder = this._element.addFolder("Capacities");
                capacitiesFolder.close();
                capacitiesFolder.add(object, "postProcessesEnabled").name("Post-Processes Enabled");
                capacitiesFolder.add(object, "shadowsEnabled").name("Shadows Enabled");
                capacitiesFolder.add(object, "fogEnabled").name("Fog Enabled");
                capacitiesFolder.add(object, "lensFlaresEnabled").name("Lens Flares Enabled");
                capacitiesFolder.add(object, "lightsEnabled").name("Lights Enabled");
                capacitiesFolder.add(object, "particlesEnabled").name("Particles Enabled");
                capacitiesFolder.add(object, "probesEnabled").name("Reflection Probes Enabled");
                capacitiesFolder.add(object, "proceduralTexturesEnabled").name("Procedural Textures Enabled");
                capacitiesFolder.add(object, "renderTargetsEnabled").name("Render Targets Enabled");
                capacitiesFolder.add(object, "texturesEnabled").name("Textures Enabled");
                capacitiesFolder.add(object, "skeletonsEnabled").name("Skeletons Enabled");
                return true;
            };
            return SceneTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.SceneTool = SceneTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AbstractMaterialTool = (function (_super) {
            __extends(AbstractMaterialTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AbstractMaterialTool(editionTool, containerID, tabID, tabName) {
                _super.call(this, editionTool);
                // Public members
                // Private members
                this._tabName = "New Tab";
                this.material = null;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-" + containerID
                ];
                this.tab = "MATERIAL." + tabID;
                this._tabName = tabName;
            }
            // Object supported
            AbstractMaterialTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.AbstractMesh) {
                    if (object.material && !(object.material instanceof BABYLON.MultiMaterial) && this.onObjectSupported(object.material))
                        return true;
                }
                else if (object instanceof BABYLON.SubMesh) {
                    var subMesh = object;
                    var multiMaterial = subMesh.getMesh().material;
                    if (multiMaterial instanceof BABYLON.MultiMaterial && multiMaterial.subMaterials[subMesh.materialIndex] && this.onObjectSupported(multiMaterial.subMaterials[subMesh.materialIndex]))
                        return true;
                }
                return false;
            };
            // Creates the UI
            AbstractMaterialTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: this._tabName });
            };
            // Update
            AbstractMaterialTool.prototype.update = function () {
                var object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                _super.prototype.update.call(this);
                if (object instanceof BABYLON.AbstractMesh) {
                    this.material = object.material;
                }
                else if (object instanceof BABYLON.SubMesh) {
                    this.material = object.getMaterial();
                }
                if (!this.material)
                    return false;
                this.object = object;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                return true;
            };
            // Adds a texture element
            AbstractMaterialTool.prototype.addTextureButton = function (name, property, parentFolder, callback) {
                return _super.prototype.addTextureFolder.call(this, this.material, name, property, parentFolder, callback);
            };
            return AbstractMaterialTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.AbstractMaterialTool = AbstractMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var PBRMaterialTool = (function (_super) {
            __extends(PBRMaterialTool, _super);
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function PBRMaterialTool(editionTool) {
                _super.call(this, editionTool, "PBR-MATERIAL", "PBR", "PBR");
                // Public members
                // Private members
                this._dummyPreset = "";
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.PBRMaterial; };
            }
            // Update
            PBRMaterialTool.prototype.update = function () {
                var _this = this;
                if (!_super.prototype.update.call(this))
                    return false;
                this.material.useLogarithmicDepth = this.material.useLogarithmicDepth || false;
                // Presets
                this._dummyPreset = "None";
                var presets = [
                    this._dummyPreset,
                    "Glass",
                    "Metal",
                    "Plastic",
                    "Wood"
                ];
                this._element.add(this, "_dummyPreset", presets, "Preset :").onChange(function (result) {
                    if (_this["_createPreset" + result]) {
                        _this["_createPreset" + result]();
                        _this.update();
                    }
                });
                // PBR
                var pbrFolder = this._element.addFolder("PBR");
                pbrFolder.add(this.material, "cameraContrast").step(0.01).name("Camera Contrast");
                pbrFolder.add(this.material, "cameraExposure").step(0.01).name("Camera Exposure");
                pbrFolder.add(this.material, "microSurface").min(0).step(0.01).name("Micro Surface");
                // Albedo
                var albedoFolder = this._element.addFolder("Albedo");
                this.addColorFolder(this.material.albedoColor, "Albedo Color", true, albedoFolder);
                albedoFolder.add(this.material, "directIntensity").step(0.01).name("Direct Intensity");
                albedoFolder.add(this.material, "useAlphaFromAlbedoTexture").name("Use Alpha From Albedo Texture");
                this.addTextureButton("Albedo Texture", "albedoTexture", albedoFolder);
                // Bump
                var bumpFolder = this._element.addFolder("Bump & Parallax");
                bumpFolder.open();
                bumpFolder.add(this.material, "useParallax").name("Use Parallax");
                bumpFolder.add(this.material, "useParallaxOcclusion").name("Use Parallax Occlusion");
                bumpFolder.add(this.material, "parallaxScaleBias").step(0.001).name("Bias");
                this.addTextureButton("Bump Texture", "bumpTexture", bumpFolder);
                // Reflectivity
                var reflectivityFolder = this._element.addFolder("Reflectivity");
                this.addColorFolder(this.material.reflectivityColor, "Reflectivity Color", true, reflectivityFolder);
                reflectivityFolder.add(this.material, "specularIntensity").min(0).step(0.01).name("Specular Intensity");
                reflectivityFolder.add(this.material, "useSpecularOverAlpha").name("Use Specular Over Alpha");
                reflectivityFolder.add(this.material, "useMicroSurfaceFromReflectivityMapAlpha").name("Use Micro Surface From Reflectivity Map Alpha");
                this.addTextureButton("Reflectivity Texture", "reflectivityTexture", reflectivityFolder);
                // Reflection
                var reflectionFolder = this._element.addFolder("Reflection");
                this.addColorFolder(this.material.reflectionColor, "Reflection Color", true, reflectionFolder);
                reflectionFolder.add(this.material, "environmentIntensity").step(0.01).name("Environment Intensity");
                this.addTextureButton("Reflection Texture", "reflectionTexture", reflectionFolder);
                // Emissive
                var emissiveFolder = this._element.addFolder("Emissive");
                this.addColorFolder(this.material.emissiveColor, "Emissive Color", true, emissiveFolder);
                emissiveFolder.add(this.material, "emissiveIntensity").step(0.01).name("Emissive Intensity");
                emissiveFolder.add(this.material, "linkEmissiveWithAlbedo").name("Link Emissive With Albedo");
                emissiveFolder.add(this.material, "useEmissiveAsIllumination").name("Use Emissive As Illumination");
                this.addTextureButton("Emissive Texture", "emissiveTexture", emissiveFolder);
                // Ambient
                var ambientFolder = this._element.addFolder("Ambient");
                this.addColorFolder(this.material.ambientColor, "Ambient Color", true, ambientFolder);
                this.addTextureButton("Ambient Texture", "ambientTexture", ambientFolder);
                // Options
                var optionsFolder = this._element.addFolder("Options");
                optionsFolder.add(this.material, "useLightmapAsShadowmap").name("Use Lightmap As Shadowmap");
                optionsFolder.add(this.material, "useLogarithmicDepth").name("Use Logarithmic Depth");
                // Debug
                var debugFolder = this._element.addFolder("Debug");
                debugFolder.add(this.material, "overloadedShadowIntensity").min(0).step(0.01).name("Shadow Intensity");
                debugFolder.add(this.material, "overloadedShadeIntensity").min(0).step(0.01).name("Shade Intensity");
                // Debug albedo
                albedoFolder = debugFolder.addFolder("Albedo Debug");
                this.addColorFolder(this.material.overloadedAlbedo, "Albedo Color", true, albedoFolder);
                albedoFolder.add(this.material, "overloadedAlbedoIntensity").min(0).step(0.01).name("Albedo Intensity");
                // Debug reflectivity
                reflectivityFolder = debugFolder.addFolder("Reflectivity Debug");
                this.addColorFolder(this.material.overloadedReflectivity, "Reflectivity Color", true, reflectivityFolder);
                reflectivityFolder.add(this.material, "overloadedReflectivityIntensity").min(0).step(0.01).name("Reflectivity Intensity");
                // Debug reflection
                reflectionFolder = debugFolder.addFolder("Reflection Debug");
                this.addColorFolder(this.material.overloadedReflection, "Reflection Color", true, reflectionFolder);
                reflectionFolder.add(this.material, "overloadedReflectionIntensity").min(0).step(0.01).name("Reflection Intensity");
                // Debug ambient
                ambientFolder = debugFolder.addFolder("Ambient Debug");
                this.addColorFolder(this.material.overloadedAmbient, "Reflection Color", true, ambientFolder);
                ambientFolder.add(this.material, "overloadedAmbientIntensity").min(0).step(0.01).name("Ambient Intensity");
                // Debug emissive
                emissiveFolder = debugFolder.addFolder("Emissive Debug");
                this.addColorFolder(this.material.overloadedEmissive, "Emissive Color", true, emissiveFolder);
                emissiveFolder.add(this.material, "overloadedEmissiveIntensity").min(0).step(0.01).name("Emissive Intensity");
                // Finish
                return true;
            };
            // Preset for glass
            PBRMaterialTool.prototype._createPresetGlass = function () {
                this.material.linkRefractionWithTransparency = true;
                this.material.useMicroSurfaceFromReflectivityMapAlpha = false;
                this.material.indexOfRefraction = 0.52;
                this.material.alpha = 0;
                this.material.directIntensity = 0.0;
                this.material.environmentIntensity = 0.5;
                this.material.cameraExposure = 0.5;
                this.material.cameraContrast = 1.7;
                this.material.microSurface = 1;
            };
            // Preset for metal
            PBRMaterialTool.prototype._createPresetMetal = function () {
                this.material.linkRefractionWithTransparency = false;
                this.material.useMicroSurfaceFromReflectivityMapAlpha = false;
                this.material.directIntensity = 0.3;
                this.material.environmentIntensity = 0.7;
                this.material.cameraExposure = 0.55;
                this.material.cameraContrast = 1.6;
                this.material.microSurface = 0.96;
            };
            // Preset for Plastic
            PBRMaterialTool.prototype._createPresetPlastic = function () {
                this.material.linkRefractionWithTransparency = false;
                this.material.useMicroSurfaceFromReflectivityMapAlpha = false;
                this.material.directIntensity = 0.6;
                this.material.environmentIntensity = 0.7;
                this.material.cameraExposure = 0.6;
                this.material.cameraContrast = 1.6;
                this.material.microSurface = 0.96;
            };
            // Preset for Wood
            PBRMaterialTool.prototype._createPresetWood = function () {
                this.material.linkRefractionWithTransparency = false;
                this.material.directIntensity = 1.5;
                this.material.environmentIntensity = 0.5;
                this.material.specularIntensity = 0.3;
                this.material.cameraExposure = 0.9;
                this.material.cameraContrast = 1.6;
                this.material.useMicroSurfaceFromReflectivityMapAlpha = true;
            };
            return PBRMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.PBRMaterialTool = PBRMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SkyMaterialTool = (function (_super) {
            __extends(SkyMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function SkyMaterialTool(editionTool) {
                _super.call(this, editionTool, "SKY-MATERIAL", "SKY", "Sky");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.SkyMaterial; };
            }
            // Update
            SkyMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Begin here
                this._element.add(this.material, "inclination").step(0.01).name("Inclination");
                this._element.add(this.material, "azimuth").step(0.01).name("Azimuth");
                this._element.add(this.material, "luminance").step(0.01).name("Luminance");
                this._element.add(this.material, "turbidity").step(0.01).name("Turbidity");
                this._element.add(this.material, "mieCoefficient").step(0.0001).name("Mie Coefficient");
                this._element.add(this.material, "mieDirectionalG").step(0.01).name("Mie Coefficient G");
                this._element.add(this.material, "rayleigh").step(0.01).name("Reileigh Coefficient");
                // Finish
                return true;
            };
            return SkyMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.SkyMaterialTool = SkyMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var StandardMaterialTool = (function (_super) {
            __extends(StandardMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function StandardMaterialTool(editionTool) {
                _super.call(this, editionTool, "STANDARD-MATERIAL", "STANDARD", "Std Material");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.StandardMaterial; };
            }
            // Update
            StandardMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                this.material.useLogarithmicDepth = this.material.useLogarithmicDepth || false;
                this.material.useEmissiveAsIllumination = this.material.useEmissiveAsIllumination || false;
                this.material.useReflectionFresnelFromSpecular = this.material.useReflectionFresnelFromSpecular || false;
                // Values
                var valuesFolder = this._element.addFolder("Values");
                valuesFolder.add(this.material, "roughness").min(0).step(0.01).name("Roughness");
                // Options
                var optionsFolder = this._element.addFolder("Options");
                optionsFolder.add(this.material, "useLightmapAsShadowmap").name("Use Lightmap As Shadowmap");
                optionsFolder.add(this.material, "useLogarithmicDepth").name("Use Logarithmic Depth");
                optionsFolder.add(this.material, "useReflectionFresnelFromSpecular").name("Use Reflection Fresnel From Specular");
                // Diffuse
                var diffuseFolder = this._element.addFolder("Diffuse");
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
                diffuseFolder.add(this.material, "useAlphaFromDiffuseTexture").name("Use Alpha From Diffuse Texture");
                this.addTextureButton("Diffuse Texture", "diffuseTexture", diffuseFolder);
                // Bump
                var bumpFolder = this._element.addFolder("Bump & Parallax");
                bumpFolder.add(this.material, "useParallax").name("Use Parallax");
                bumpFolder.add(this.material, "useParallaxOcclusion").name("Use Parallax Occlusion");
                bumpFolder.add(this.material, "parallaxScaleBias").step(0.001).name("Bias");
                this.addTextureButton("Bump Texture", "bumpTexture", bumpFolder);
                // Specular
                var specularFolder = this._element.addFolder("Specular");
                this.addColorFolder(this.material.specularColor, "Specular Color", true, specularFolder);
                specularFolder.add(this.material, "specularPower").min(0).step(0.01).name("Specular Power");
                specularFolder.add(this.material, "useSpecularOverAlpha").name("Use Specular Over Alpha");
                specularFolder.add(this.material, "useGlossinessFromSpecularMapAlpha").name("Use Glossiness From Specular Map Alpha");
                this.addTextureButton("Specular Texture", "specularTexture", specularFolder);
                // Emissive
                var emissiveFolder = this._element.addFolder("Emissive");
                this.addColorFolder(this.material.emissiveColor, "Emissive Color", true, emissiveFolder);
                emissiveFolder.add(this.material, "useEmissiveAsIllumination").name("Use Emissive As Illumination");
                this.addTextureButton("Emissive Texture", "emissiveTexture", emissiveFolder);
                // Ambient
                var ambientFolder = this._element.addFolder("Ambient");
                this.addColorFolder(this.material.ambientColor, "Ambient Color", true, ambientFolder);
                this.addTextureButton("Ambient Texture", "ambientTexture", ambientFolder);
                // Reflection
                var reflectionFolder = this._element.addFolder("Reflection");
                this.addTextureButton("Reflection Texture", "reflectionTexture", reflectionFolder);
                // Refraction
                var refractionFolder = this._element.addFolder("Refraction");
                refractionFolder.add(this.material, "indexOfRefraction").name("Index of Refraction");
                refractionFolder.add(this.material, "invertRefractionY").name("Invert Y");
                this.addTextureButton("Refraction Texture", "refractionTexture", refractionFolder);
                // Functions
                var functionsFolder = this._element.addFolder("Functions");
                functionsFolder.add(this, "_convertToPBR").name("Convert to PBR Material");
                // Finish
                return true;
            };
            StandardMaterialTool.prototype._convertToPBR = function () {
                var pbr = new BABYLON.PBRMaterial(this.material.name + "_PBR", this._editionTool.core.currentScene);
                pbr.albedoColor = this.material.diffuseColor;
                pbr.albedoTexture = this.material.diffuseTexture;
                pbr.useAlphaFromAlbedoTexture = this.material.useAlphaFromDiffuseTexture;
                pbr.linkEmissiveWithAlbedo = this.material.linkEmissiveWithDiffuse;
                pbr.bumpTexture = this.material.bumpTexture;
                pbr.parallaxScaleBias = this.material.parallaxScaleBias;
                pbr.useParallax = this.material.useParallax;
                pbr.useParallaxOcclusion = this.material.useParallaxOcclusion;
                pbr.specularIntensity = this.material.specularPower;
                pbr.reflectivityColor = this.material.specularColor;
                pbr.reflectivityTexture = this.material.specularTexture;
                pbr.useSpecularOverAlpha = this.material.useSpecularOverAlpha;
                pbr.emissiveColor = this.material.emissiveColor;
                pbr.emissiveTexture = this.material.emissiveTexture;
                pbr.useEmissiveAsIllumination = this.material.useEmissiveAsIllumination;
                pbr.emissiveFresnelParameters = this.material.emissiveFresnelParameters;
                pbr.indexOfRefraction = this.material.indexOfRefraction;
                pbr.invertRefractionY = this.material.invertRefractionY;
                pbr.refractionTexture = this.material.refractionTexture;
                pbr.reflectionTexture = this.material.reflectionTexture;
                pbr.opacityFresnelParameters = this.material.opacityFresnelParameters;
                pbr.opacityTexture = this.material.opacityTexture;
                pbr.ambientColor = this.material.ambientColor;
                pbr.ambientTexture = this.material.ambientTexture;
                if (this.object instanceof BABYLON.SubMesh) {
                    var index = this.object.materialIndex;
                    var multiMaterial = this.object.getMesh().material;
                    if (multiMaterial instanceof BABYLON.MultiMaterial)
                        this.object.getMesh().material.subMaterials[index] = pbr;
                }
                else
                    this.object.material = pbr;
                this._editionTool.updateEditionTool();
            };
            return StandardMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.StandardMaterialTool = StandardMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var WaterMaterialTool = (function (_super) {
            __extends(WaterMaterialTool, _super);
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function WaterMaterialTool(editionTool) {
                _super.call(this, editionTool, "WATER-MATERIAL", "WATER", "Water");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.WaterMaterial; };
            }
            // Update
            WaterMaterialTool.prototype.update = function () {
                var _this = this;
                if (!_super.prototype.update.call(this))
                    return false;
                // Colors
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true);
                this.addColorFolder(this.material.specularColor, "Specular Color", true);
                this._element.add(this.material, "specularPower").min(0).step(0.1).name("Specular Power");
                // Bump
                var bumpFolder = this._element.addFolder("Bump");
                bumpFolder.add(this.material, "bumpHeight").min(0.0).step(0.01).name("Bump Height");
                this.addTextureButton("Texture", "bumpTexture", bumpFolder);
                // Wind
                var windFolder = this._element.addFolder("Wind");
                windFolder.add(this.material, "windForce").min(0.0).step(0.01).name("Wind Force");
                this.addVectorFolder(this.material.windDirection, "Wind Direction", true, windFolder);
                // Waves
                var waveFolder = this._element.addFolder("Waves");
                waveFolder.add(this.material, "waveHeight").min(0.0).step(0.01).name("Wave Height");
                waveFolder.add(this.material, "waveLength").min(0.0).step(0.01).name("Wave Length");
                waveFolder.add(this.material, "waveSpeed").min(0.0).step(0.01).name("Wave Speed");
                // Color
                var colorFolder = this._element.addFolder("Color");
                colorFolder.add(this.material, "colorBlendFactor").min(0.0).max(1.0).step(0.01).name("Blend Factor");
                this.addColorFolder(this.material.waterColor, "Water Color", true, colorFolder);
                // Advances
                var advancedFolder = this._element.addFolder("Advanced");
                advancedFolder.add(this.material, "bumpSuperimpose").name("Bump Super Impose");
                advancedFolder.add(this.material, "bumpAffectsReflection").name("Bump Affects Reflection");
                advancedFolder.add(this.material, "fresnelSeparate").name("Fresnel Separate");
                advancedFolder.add(this.material, "colorBlendFactor2").min(0.0).max(1.0).step(0.01).name("Blend Factor 2");
                this.addColorFolder(this.material.waterColor2, "Water Color 2", true, advancedFolder);
                // Render
                this._rtsEnabled = this.material.renderTargetsEnabled;
                var renderFolder = this._element.addFolder("Reflection & Refraction");
                renderFolder.add(this, "_rtsEnabled").name("Enable Reflection & Refraction").onChange(function (result) {
                    _this.material.enableRenderTargets(result);
                });
                renderFolder.add(this, "_configureReflection").name("Render...");
                // Finish
                return true;
            };
            // Configure rendering
            WaterMaterialTool.prototype._configureReflection = function () {
                var _this = this;
                var scene = this.material.getScene();
                var renderList = this.material.getRenderList();
                var picker = new EDITOR.ObjectPicker(this._editionTool.core);
                picker.objectLists.push(scene.meshes);
                picker.selectedObjects = this.material.getRenderList();
                picker.minSelectCount = 0;
                picker.open();
                picker.onObjectPicked = function (names) {
                    _this.material.reflectionTexture.renderList = [];
                    _this.material.refractionTexture.renderList = [];
                    for (var i = 0; i < names.length; i++) {
                        var mesh = scene.getMeshByName(names[i]);
                        if (!mesh)
                            continue;
                        _this.material.addToRenderList(mesh);
                    }
                };
            };
            return WaterMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.WaterMaterialTool = WaterMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LavaMaterialTool = (function (_super) {
            __extends(LavaMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function LavaMaterialTool(editionTool) {
                _super.call(this, editionTool, "LAVA-MATERIAL", "LAVA", "Lava");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.LavaMaterial; };
            }
            // Update
            LavaMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Diffuse
                var diffuseFolder = this._element.addFolder("Diffuse");
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
                this.addTextureButton("Texture", "diffuseTexture", diffuseFolder);
                // Lava
                var lavaFolder = this._element.addFolder("Lava");
                this.addTextureButton("Noise Texture", "noiseTexture", lavaFolder);
                lavaFolder.add(this.material, "movingSpeed").min(0).name("Moving Speed");
                lavaFolder.add(this.material, "lowFrequencySpeed").min(0).name("Low Frequency Speed");
                // Fog
                var fogFolder = this._element.addFolder("Fog");
                this.addColorFolder(this.material.fogColor, "Fog Color", true, fogFolder);
                fogFolder.add(this.material, "fogDensity").min(0).name("Fog Density");
                // Finish
                return true;
            };
            return LavaMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.LavaMaterialTool = LavaMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var FurMaterialTool = (function (_super) {
            __extends(FurMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function FurMaterialTool(editionTool) {
                _super.call(this, editionTool, "FUR-MATERIAL", "FUR", "Fur");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.FurMaterial; };
            }
            // Update
            FurMaterialTool.prototype.update = function () {
                var _this = this;
                if (!_super.prototype.update.call(this))
                    return false;
                var callback = function () {
                    _this.material.updateFur();
                };
                // Diffuse
                var diffuseFolder = this._element.addFolder("Diffuse");
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder, callback);
                this.addTextureButton("Texture", "diffuseTexture", diffuseFolder, callback);
                // Fur
                var furFolder = this._element.addFolder("Fur");
                this.addColorFolder(this.material.furColor, "Fur Color", true, furFolder, callback);
                furFolder.add(this.material, "furLength").min(0).step(0.01).name("Fur Length").onChange(function (result) { callback(); });
                furFolder.add(this.material, "furAngle").min(0).step(0.1).name("Fur Angle").onChange(function (result) { callback(); });
                furFolder.add(this.material, "furSpacing").min(0).step(0.01).name("Fur Spacing").onChange(function (result) { callback(); });
                furFolder.add(this.material, "furSpeed").min(1).max(1000).step(0.01).name("Fur Speed").onChange(function (result) { callback(); });
                furFolder.add(this.material, "furDensity").min(0).step(0.1).name("Fur Density").onChange(function (result) { callback(); });
                furFolder.add(this.material, "highLevelFur").name("High Level Fur").onChange(function (result) { callback(); });
                this.addVectorFolder(this.material.furGravity, "Gravity", true, furFolder, callback);
                // Finish
                return true;
            };
            return FurMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.FurMaterialTool = FurMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GradientMaterialTool = (function (_super) {
            __extends(GradientMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function GradientMaterialTool(editionTool) {
                _super.call(this, editionTool, "GRADIENT-MATERIAL", "GRADIENT", "Gradient");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.GradientMaterial; };
            }
            // Update
            GradientMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Top
                var topFolder = this._element.addFolder("Top");
                this.addColorFolder(this.material.topColor, "Top Color", true, topFolder);
                topFolder.add(this.material, "topColorAlpha").min(0).max(1).step(0.01).name("Top Color Alpha");
                // Bottom
                var bottomFolder = this._element.addFolder("Bottom");
                this.addColorFolder(this.material.bottomColor, "Bottom Color", true, topFolder);
                topFolder.add(this.material, "bottomColorAlpha").min(0).max(1).step(0.01).name("Bottom Color Alpha");
                // Gradient
                var gradientFolder = this._element.addFolder("Gradient");
                gradientFolder.add(this.material, "offset").step(0.01).name("Offset");
                gradientFolder.add(this.material, "smoothness").step(0.01).name("Smoothness");
                // Finish
                return true;
            };
            return GradientMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.GradientMaterialTool = GradientMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var TerrainMaterialTool = (function (_super) {
            __extends(TerrainMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function TerrainMaterialTool(editionTool) {
                _super.call(this, editionTool, "TERRAIN-MATERIAL", "TERRAIN", "Terrain");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.TerrainMaterial; };
            }
            // Update
            TerrainMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Mix Texture
                this.addTextureButton("Mix Texture", "mixTexture", null).open();
                // Diffuse
                var diffuseFolder = this._element.addFolder("Diffuse");
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
                this.addTextureButton("Diffuse Texture R", "diffuseTexture1", diffuseFolder).open();
                this.addTextureButton("Diffuse Texture G", "diffuseTexture2", diffuseFolder).open();
                this.addTextureButton("Diffuse Texture B", "diffuseTexture3", diffuseFolder).open();
                // Bump
                var bumpFolder = this._element.addFolder("Bump");
                this.addTextureButton("Bump Texture R", "bumpTexture1", bumpFolder).open();
                this.addTextureButton("Bump Texture G", "bumpTexture2", bumpFolder).open();
                this.addTextureButton("Bump Texture B", "bumpTexture3", bumpFolder).open();
                // Specular
                var specularFolder = this._element.addFolder("Specular");
                this.addColorFolder(this.material.specularColor, "Specular Color", true, specularFolder);
                specularFolder.add(this.material, "specularPower").min(0).step(0.5).name("Specular Power");
                // Finish
                return true;
            };
            return TerrainMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.TerrainMaterialTool = TerrainMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var TriPlanarMaterialTool = (function (_super) {
            __extends(TriPlanarMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function TriPlanarMaterialTool(editionTool) {
                _super.call(this, editionTool, "TRI-PLANAR-MATERIAL", "TRI-PLANAR", "Tri Planar");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.TriPlanarMaterial; };
            }
            // Update
            TriPlanarMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Tri Planar
                this._element.add(this.material, "tileSize").min(0).step(0.01).name("Tile Size");
                // Diffuse
                var diffuseFolder = this._element.addFolder("Diffuse");
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
                this.addTextureButton("Diffuse Texture X", "diffuseTextureX", diffuseFolder).open();
                this.addTextureButton("Diffuse Texture Y", "diffuseTextureY", diffuseFolder).open();
                this.addTextureButton("Diffuse Texture Z", "diffuseTextureZ", diffuseFolder).open();
                // Bump
                var bumpFolder = this._element.addFolder("Bump");
                this.addTextureButton("Bump Texture X", "normalTextureX", bumpFolder).open();
                this.addTextureButton("Bump Texture Y", "normalTextureY", bumpFolder).open();
                this.addTextureButton("Bump Texture Z", "normalTextureZ", bumpFolder).open();
                // Specular
                var specularFolder = this._element.addFolder("Specular");
                this.addColorFolder(this.material.specularColor, "Specular Color", true, specularFolder);
                specularFolder.add(this.material, "specularPower").min(0).step(0.5).name("Specular Power");
                // Finish
                return true;
            };
            return TriPlanarMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.TriPlanarMaterialTool = TriPlanarMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GridMaterialTool = (function (_super) {
            __extends(GridMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function GridMaterialTool(editionTool) {
                _super.call(this, editionTool, "GRID-MATERIAL", "GRID", "Grid");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.GridMaterial; };
            }
            // Update
            GridMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Colors
                this.addColorFolder(this.material.mainColor, "Main Color", true);
                this.addColorFolder(this.material.lineColor, "Line Color", true);
                this._element.add(this.material, "opacity").min(0).name("Opacity");
                this._element.add(this.material, "gridRatio").step(0.1).name("Grid Ratio");
                this._element.add(this.material, "majorUnitFrequency").name("Major Unit Frequency");
                this._element.add(this.material, "minorUnitVisibility").name("Minor Unit Frequency");
                // Finish
                return true;
            };
            return GridMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.GridMaterialTool = GridMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var FireMaterialTool = (function (_super) {
            __extends(FireMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function FireMaterialTool(editionTool) {
                _super.call(this, editionTool, "FIRE-MATERIAL", "FIRE", "Fire");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.FireMaterial; };
            }
            // Update
            FireMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Diffuse
                var diffuseFolder = this._element.addFolder("Diffuse");
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
                this.addTextureButton("Diffuse Texture", "diffuseTexture", diffuseFolder).open();
                // Fire
                var fireFolder = this._element.addFolder("Fire");
                fireFolder.add(this.material, "speed").min(0).step(0.01).name("Speed");
                this.addTextureButton("Distortion Texture", "distortionTexture", fireFolder).open();
                this.addTextureButton("Opacity Texture", "opacityTexture", fireFolder).open();
                // Finish
                return true;
            };
            return FireMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.FireMaterialTool = FireMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditorCore = (function () {
            /**
            * Constructor
            */
            function EditorCore() {
                // Public members
                this.engine = null;
                this.canvas = null;
                this.camera = null;
                this.playCamera = null;
                this.isPlaying = false;
                this.scenes = new Array();
                this.updates = new Array();
                this.eventReceivers = new Array();
                this.editor = null;
            }
            /**
            * Removes a scene
            */
            EditorCore.prototype.removeScene = function (scene) {
                for (var i = 0; i < this.scenes.length; i++) {
                    if (this.scenes[i].scene === scene) {
                        this.scenes.splice(i, 1);
                        return true;
                    }
                }
                return false;
            };
            /**
            * Removes an event receiver
            */
            EditorCore.prototype.removeEventReceiver = function (receiver) {
                for (var i = 0; i < this.eventReceivers.length; i++) {
                    if (this.eventReceivers[i] === receiver) {
                        this.eventReceivers.splice(i, 1);
                        return true;
                    }
                }
                return false;
            };
            /**
            * On pre update
            */
            EditorCore.prototype.onPreUpdate = function () {
                for (var i = 0; i < this.updates.length; i++) {
                    this.updates[i].onPreUpdate();
                }
            };
            /**
            * On post update
            */
            EditorCore.prototype.onPostUpdate = function () {
                for (var i = 0; i < this.updates.length; i++) {
                    this.updates[i].onPostUpdate();
                }
            };
            /**
            * Send an event to the event receivers
            */
            EditorCore.prototype.sendEvent = function (event) {
                for (var i = 0; i < this.eventReceivers.length; i++)
                    this.eventReceivers[i].onEvent(event);
            };
            /**
            * IDisposable
            */
            EditorCore.prototype.dispose = function () {
            };
            return EditorCore;
        }());
        EDITOR.EditorCore = EditorCore;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditionTool = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function EditionTool(core) {
                // Public members
                this.object = null;
                this.container = "BABYLON-EDITOR-EDITION-TOOL";
                this.editionTools = new Array();
                this.panel = null;
                // Initialize
                this._editor = core.editor;
                this.core = core;
                this.panel = this._editor.layouts.getPanelFromType("left");
                // Register this
                this.core.updates.push(this);
                this.core.eventReceivers.push(this);
            }
            // Pre update
            EditionTool.prototype.onPreUpdate = function () {
            };
            // Post update
            EditionTool.prototype.onPostUpdate = function () {
            };
            // Event
            EditionTool.prototype.onEvent = function (event) {
                // GUI Event
                if (event.eventType === EDITOR.EventType.GUI_EVENT) {
                    if (event.guiEvent.eventType === EDITOR.GUIEventType.TAB_CHANGED && event.guiEvent.caller === this.panel) {
                        var tabID = event.guiEvent.data;
                        if (this._currentTab !== tabID) {
                            this._currentTab = tabID;
                            for (var i = 0; i < this.editionTools.length; i++) {
                                var tool = this.editionTools[i];
                                for (var j = 0; j < tool.containers.length; j++) {
                                    var element = $("#" + tool.containers[j]);
                                    if (tool.tab === this._currentTab) {
                                        element.show();
                                        tool.resize();
                                    }
                                    else {
                                        element.hide();
                                    }
                                }
                            }
                        }
                    }
                    else if (event.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED) {
                        if (event.guiEvent.caller === this._editor.layouts) {
                            for (var i = 0; i < this.editionTools.length; i++) {
                                this.editionTools[i].resize();
                            }
                        }
                    }
                }
                // Scene Event
                if (event.eventType === EDITOR.EventType.SCENE_EVENT) {
                    if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                        this.object = event.sceneEvent.object;
                        if (this.object)
                            this.isObjectSupported(this.object);
                        return false;
                    }
                }
                return false;
            };
            EditionTool.prototype.updateEditionTool = function () {
                this.isObjectSupported(this.object);
            };
            // Object supported
            EditionTool.prototype.isObjectSupported = function (object) {
                var tabAlreadyShown = false;
                var supportedTools = [];
                for (var i = 0; i < this.editionTools.length; i++) {
                    var tool = this.editionTools[i];
                    var supported = tool.isObjectSupported(this.object);
                    if (supported) {
                        supportedTools.push(tool);
                        this.panel.showTab(tool.tab);
                        if (!tabAlreadyShown)
                            tabAlreadyShown = tool.tab === this._currentTab;
                    }
                    else {
                        for (var j = 0; j < tool.containers.length; j++) {
                            $("#" + tool.containers[j]).hide();
                            this.panel.hideTab(tool.tab);
                        }
                    }
                }
                // Activate tools
                for (var i = 0; i < supportedTools.length; i++) {
                    var tool = supportedTools[i];
                    if (!tabAlreadyShown) {
                        for (var j = 0; j < tool.containers.length; j++) {
                            $("#" + tool.containers[j]).show();
                        }
                        tabAlreadyShown = true;
                        this._currentTab = tool.tab;
                    }
                    else {
                    }
                    tool.update();
                }
                return false;
            };
            // Creates the UI
            EditionTool.prototype.createUI = function () {
                // Add default tools
                this.addTool(new EDITOR.GeneralTool(this));
                this.addTool(new EDITOR.SceneTool(this));
                this.addTool(new EDITOR.LightTool(this));
                this.addTool(new EDITOR.AnimationTool(this));
                this.addTool(new EDITOR.PostProcessesTool(this));
                this.addTool(new EDITOR.ReflectionProbeTool(this));
                this.addTool(new EDITOR.AudioTool(this));
                this.addTool(new EDITOR.ParticleSystemTool(this));
                this.addTool(new EDITOR.LensFlareTool(this));
                this.addTool(new EDITOR.MaterialTool(this));
                this.addTool(new EDITOR.StandardMaterialTool(this));
                this.addTool(new EDITOR.SkyMaterialTool(this));
                this.addTool(new EDITOR.PBRMaterialTool(this));
                this.addTool(new EDITOR.WaterMaterialTool(this));
                this.addTool(new EDITOR.LavaMaterialTool(this));
                this.addTool(new EDITOR.FurMaterialTool(this));
                this.addTool(new EDITOR.GradientMaterialTool(this));
                this.addTool(new EDITOR.TerrainMaterialTool(this));
                this.addTool(new EDITOR.TriPlanarMaterialTool(this));
                this.addTool(new EDITOR.GridMaterialTool(this));
                this.addTool(new EDITOR.FireMaterialTool(this));
                for (var i = 0; i < EDITOR.PluginManager.EditionToolPlugins.length; i++)
                    this.addTool(new EDITOR.PluginManager.EditionToolPlugins[i](this));
            };
            // Adds a tool
            EditionTool.prototype.addTool = function (tool) {
                var currentForm = this.container;
                $("#" + currentForm).append("<div id=\"" + tool.containers[0] + "\"></div>");
                $("#" + tool.containers[0]).hide();
                for (var i = 1; i < tool.containers.length; i++) {
                    $("#" + currentForm).after("<div id=\"" + tool.containers[i] + "\"></div>");
                    $("#" + tool.containers[i]).hide();
                    currentForm = tool.containers[i];
                }
                tool.createUI();
                this.editionTools.push(tool);
            };
            return EditionTool;
        }());
        EDITOR.EditionTool = EditionTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditPanel = (function () {
            /**
            * Constructor
            */
            function EditPanel(core) {
                this.onClose = null;
                // Private members
                this._containers = [];
                this._panelID = "BABYLON-EDITOR-PREVIEW-PANEL";
                this._closeButtonID = "BABYLON-EDITOR-PREVIEW-PANEL-CLOSE";
                // Initialize
                this.core = core;
                this.editor = core.editor;
                this.core.eventReceivers.push(this);
                this.panel = this.editor.layouts.getPanelFromType("preview");
                this._mainPanel = this.editor.layouts.getPanelFromType("main");
                this._addCloseButton();
            }
            // On event
            EditPanel.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED) {
                    this._configureCloseButton();
                }
                return false;
            };
            // Adds a new element to the panel
            // Returns true if added, false if already exists by providing the ID
            EditPanel.prototype.addContainer = function (container, id) {
                if (id) {
                    var exists = $("#" + id)[0];
                    if (exists)
                        return false;
                }
                $("#" + this._panelID).append(container);
                return true;
            };
            // Closes the panel
            EditPanel.prototype.close = function () {
                if (this.onClose)
                    this.onClose();
                // Empty div
                $("#" + this._panelID).empty();
                // Free
                this.onClose = null;
                // Create close button
                this._addCloseButton();
            };
            // Sets the panel size
            EditPanel.prototype.setPanelSize = function (percents) {
                var height = this.panel._panelElement.height;
                height += this._mainPanel._panelElement.height;
                this.editor.layouts.setPanelSize("preview", height * percents / 100);
            };
            // Creates close button
            EditPanel.prototype._addCloseButton = function () {
                var _this = this;
                $("#" + this._panelID).append(EDITOR.GUI.GUIElement.CreateElement("button class=\"btn w2ui-msg-title w2ui-msg-button\"", this._closeButtonID, ""));
                this._closeButton = $("#" + this._closeButtonID);
                this._closeButton.text("x");
                this._configureCloseButton();
                this._closeButton.click(function (event) {
                    _this.close();
                    _this.setPanelSize(0);
                });
            };
            // Configures close button
            EditPanel.prototype._configureCloseButton = function () {
                this._closeButton.css("position", "absolute");
                this._closeButton.css("right", "0%");
                this._closeButton.css("z-index", 1000); // Should be enough
                this._closeButton.css("min-width", "0px");
                this._closeButton.css("min-height", "0px");
                //this._closeButton.css("width", "25px");
                //this._closeButton.css("height", "25px");
            };
            return EditPanel;
        }());
        EDITOR.EditPanel = EditPanel;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditorMain = (function () {
            /**
            * Constructor
            */
            function EditorMain(containerID, antialias, options) {
                if (antialias === void 0) { antialias = false; }
                if (options === void 0) { options = null; }
                this.layouts = null;
                this.playLayouts = null;
                this.filesInput = null;
                this.renderMainScene = true;
                this.renderHelpers = true;
                // Private members
                this._saveCameraState = false;
                this._mainPanelSceneTab = null;
                this._mainPanelTabs = {};
                this._currentTab = null;
                this._lastTabUsed = null;
                // Initialize
                this.core = new EDITOR.EditorCore();
                this.core.editor = this;
                this.container = containerID;
                this.mainContainer = containerID + "MAIN";
                this.antialias = antialias;
                this.options = options;
                // Create Main UI
                this._createUI();
                this._createBabylonEngine();
                // Register this
                this.core.eventReceivers.push(this);
                // Edition tool
                this.editionTool = new EDITOR.EditionTool(this.core);
                this.editionTool.createUI();
                // Scene graph tool
                this.sceneGraphTool = new EDITOR.SceneGraphTool(this.core);
                this.sceneGraphTool.createUI();
                // Toolbars
                this.mainToolbar = new EDITOR.MainToolbar(this.core);
                this.mainToolbar.createUI();
                this.toolsToolbar = new EDITOR.ToolsToolbar(this.core);
                this.toolsToolbar.createUI();
                this.sceneToolbar = new EDITOR.SceneToolbar(this.core);
                this.sceneToolbar.createUI();
                // Transformer
                this.transformer = new EDITOR.ManipulationHelper(this.core);
                // Scene helpers
                this.SceneHelpers = new EDITOR.SceneHelpers(this.core);
                // Edit panel
                this.editPanel = new EDITOR.EditPanel(this.core);
                // Timeline
                this.timeline = new EDITOR.Timeline(this.core);
                this.timeline.createUI();
                // Status bar
                this.statusBar = new EDITOR.StatusBar(this.core);
                // Files input
                this.filesInput = new EDITOR.FilesInput(this.core, this._handleSceneLoaded(), null, null, null, null);
                this.filesInput.monitorElementForDragNDrop(this.core.canvas);
                // Override renderFunction to get full control on the render function
                this.filesInput.renderFunction = function () { };
                // Events
                this._createMainEvents();
            }
            Object.defineProperty(EditorMain, "PlayLayoutContainerID", {
                get: function () {
                    return this._PlayLayoutContainerID;
                },
                enumerable: true,
                configurable: true
            });
            /**
            * Event receiver
            */
            EditorMain.prototype.onEvent = function (event) {
                var _this = this;
                if (event.eventType === EDITOR.EventType.GUI_EVENT) {
                    if (event.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED && event.guiEvent.caller === this.layouts) {
                        this.playLayouts.resize();
                        this.core.engine.resize();
                        return true;
                    }
                    else if (event.guiEvent.eventType === EDITOR.GUIEventType.TAB_CHANGED && event.guiEvent.caller === this._mainPanel) {
                        var tabID = event.guiEvent.data;
                        var newMainPanelTab = this._mainPanelTabs[tabID];
                        EDITOR.GUI.GUIElement.CreateTransition(this._currentTab.container, newMainPanelTab.container, "flit-right", function () {
                            _this.layouts.resize();
                            _this.playLayouts.resize();
                        });
                        this._lastTabUsed = this._currentTab;
                        this._currentTab = newMainPanelTab;
                        this.renderMainScene = this._currentTab.tab === this._mainPanelSceneTab.tab;
                        return false;
                    }
                    else if (event.guiEvent.eventType === EDITOR.GUIEventType.TAB_CLOSED && event.guiEvent.caller === this._mainPanel) {
                        var tabID = event.guiEvent.data;
                        var mainPanelTab = this._mainPanelTabs[tabID];
                        this._currentTab = this._lastTabUsed === mainPanelTab ? this._mainPanelSceneTab : this._lastTabUsed;
                        EDITOR.GUI.GUIElement.CreateTransition(mainPanelTab.container, this._currentTab.container, "pop-in", function () {
                            if (mainPanelTab.application) {
                                mainPanelTab.application.dispose();
                            }
                            $("#" + mainPanelTab.container).remove();
                            _this._mainPanel.removeTab(mainPanelTab.tab.id);
                            _this.layouts.resize();
                            _this.playLayouts.resize();
                        });
                        delete this._mainPanelTabs[tabID];
                        this.renderMainScene = this._currentTab.tab === this._mainPanelSceneTab.tab;
                        return false;
                    }
                }
                return false;
            };
            /**
            * Creates a new project
            */
            EditorMain.prototype.createNewProject = function () {
                BABYLON.FilesInput.FilesToLoad = [];
                BABYLON.FilesInput.FilesTextures = [];
                this.core.currentScene.dispose();
                this._handleSceneLoaded()(null, new BABYLON.Scene(this.core.engine));
            };
            /**
            * Creates the render loop
            */
            EditorMain.prototype.createRenderLoop = function () {
                var _this = this;
                this.core.engine.runRenderLoop(function () {
                    _this.update();
                });
            };
            /**
            * Simply update the scenes and updates
            */
            EditorMain.prototype.update = function () {
                // Pre update
                this.core.onPreUpdate();
                // Scenes
                if (this.renderMainScene) {
                    for (var i = 0; i < this.core.scenes.length; i++) {
                        if (this.core.scenes[i].render) {
                            this.core.scenes[i].scene.render();
                        }
                    }
                }
                // Render transformer
                this.transformer.getScene().render();
                this.SceneHelpers.getScene().render();
                // Post update
                this.core.onPostUpdate();
            };
            /**
            * Disposes the editor
            */
            EditorMain.prototype.dispose = function () {
            };
            /**
            * Reloads the scene
            */
            EditorMain.prototype.reloadScene = function (saveCameraState, data) {
                this._saveCameraState = saveCameraState;
                if (data)
                    this.filesInput.loadFiles(data);
                else
                    this.filesInput.reload();
            };
            /**
            * Creates a new tab
            */
            EditorMain.prototype.createTab = function (caption, container, application, closable) {
                if (closable === void 0) { closable = true; }
                var tab = {
                    caption: caption,
                    id: EDITOR.SceneFactory.GenerateUUID(),
                    closable: closable
                };
                this._mainPanel.createTab(tab);
                this._mainPanelTabs[tab.id] = {
                    tab: tab,
                    container: container,
                    application: application
                };
                if (!this._currentTab)
                    this._currentTab = this._mainPanelTabs[tab.id];
                this._mainPanel.setActiveTab(tab.id);
                return tab;
            };
            /**
            * Removes the given tab
            */
            EditorMain.prototype.removeTab = function (tab) {
                return this._mainPanel.removeTab(tab.id);
            };
            /**
            * Adds a new container and returns its id
            */
            EditorMain.prototype.createContainer = function () {
                var id = EDITOR.SceneFactory.GenerateUUID();
                $("#" + EditorMain._PlayLayoutContainerID).append(EDITOR.GUI.GUIElement.CreateDivElement(id, "width: 100%; height: 100%;"));
                return id;
            };
            /**
            * Removes the given continer
            */
            EditorMain.prototype.removeContainer = function (id) {
                var container = $("#" + id);
                container.remove();
            };
            /**
            * Creates the UI
            */
            EditorMain.prototype._createUI = function () {
                var _this = this;
                // Layouts
                this.layouts = new EDITOR.GUI.GUILayout(this.container, this.core);
                this.layouts.createPanel("BABYLON-EDITOR-EDITION-TOOL-PANEL", "left", 380, true).setContent("<div id=\"BABYLON-EDITOR-EDITION-TOOL\"></div>");
                this.layouts.createPanel("BABYLON-EDITOR-TOP-TOOLBAR-PANEL", "top", 70, false).setContent("<div id=\"BABYLON-EDITOR-MAIN-TOOLBAR\" style=\"height: 50%\"></div>" +
                    "<div id=\"BABYLON-EDITOR-TOOLS-TOOLBAR\" style=\"height: 50%\"></div>");
                this.layouts.createPanel("BABYLON-EDITOR-GRAPH-PANEL", "right", 350, true).setContent("<div id=\"BABYLON-EDITOR-SCENE-GRAPH-TOOL\" style=\"height: 100%;\"></div>");
                var mainPanel = this.layouts.createPanel("BABYLON-EDITOR-MAIN-PANEL", "main", undefined, undefined).setContent("<div id=\"" + this.mainContainer + "\" style=\"height: 100%; width: 100%;\"></div>");
                mainPanel.style = "overflow: hidden;";
                this.layouts.createPanel("BABYLON-EDITOR-PREVIEW-PANEL", "preview", 70, true).setContent("<div style=\"width: 100%; height: 100%; overflow: hidden;\">" +
                    "<div id=\"BABYLON-EDITOR-PREVIEW-PANEL\" style=\"height: 100%;\"></div>" +
                    "</div>");
                this.layouts.createPanel("BABYLON-EDITOR-BOTTOM-PANEL", "bottom", 0, false).setContent("<div id=\"BABYLON-EDITOR-BOTTOM-PANEL\" style=\"height: 100%; width: 100%\"></div>");
                this.layouts.buildElement(this.container);
                // Play Layouts
                this.playLayouts = new EDITOR.GUI.GUILayout(this.mainContainer, this.core);
                var mainPanel = this.playLayouts.createPanel("BABYLON-EDITOR-MAIN-MAIN-PANEL", "main", undefined, undefined).setContent("<div id=\"" + EditorMain._PlayLayoutContainerID + "\" style=\"width: 100%; height: 100%;\">" +
                    "<div id=\"BABYLON-EDITOR-BOTTOM-PANEL-PREVIEW\">" +
                    "<div id=\"BABYLON-EDITOR-MAIN-DEBUG-LAYER\"></div>" +
                    "<canvas id=\"BABYLON-EDITOR-MAIN-CANVAS\"></canvas>" +
                    "<div id=\"BABYLON-EDITOR-SCENE-TOOLBAR\"></div>" +
                    "</div>" +
                    "</div>");
                mainPanel.style = "overflow: hidden;";
                this.playLayouts.createPanel("BABYLON-EDITOR-MAIN-PREVIEW-PANEL", "preview", 0, false).setContent("<div id=\"BABYLON-EDITOR-PREVIEW-TIMELINE\" style=\"height: 100%; width: 100%; overflow: hidden;\"></div>");
                this.playLayouts.buildElement(this.mainContainer);
                this.playLayouts.on({ execute: "after", type: "resize" }, function () {
                    if (!_this.sceneToolbar)
                        return;
                    var panelHeight = _this.layouts.getPanelFromType("main").height;
                    var toolbarHeight = _this.sceneToolbar.toolbar.element.box.clientHeight;
                    _this.core.canvas.height = (panelHeight - toolbarHeight * 2.0 - 10 - _this.playLayouts.getPanelFromType("preview").height) * devicePixelRatio;
                });
                this._mainPanel = this.playLayouts.getPanelFromType("main");
                this._mainPanelSceneTab = this._mainPanelTabs[this.createTab("Preview", "BABYLON-EDITOR-BOTTOM-PANEL-PREVIEW", null, false).id];
            };
            /**
            * Handles just opened scenes
            */
            EditorMain.prototype._handleSceneLoaded = function () {
                var _this = this;
                return function (file, scene) {
                    // Close already opened tabs
                    for (var thing in _this._mainPanelTabs) {
                        if (_this._mainPanelTabs[thing].tab.id !== _this._mainPanelSceneTab.tab.id)
                            EDITOR.Event.sendGUIEvent(_this._mainPanel, EDITOR.GUIEventType.TAB_CLOSED, _this.core, _this._mainPanelTabs[thing].tab.id);
                    }
                    // Set active scene
                    _this.core.removeScene(_this.core.currentScene);
                    _this.core.scenes.push({ scene: scene, render: true });
                    _this.core.currentScene = scene;
                    // Set active camera
                    var camera = scene.activeCamera;
                    _this._createBabylonCamera();
                    if (camera) {
                        if (camera.speed) {
                            _this.core.camera.speed = camera.speed;
                        }
                    }
                    _this.core.currentScene.activeCamera = _this.core.camera;
                    _this.core.playCamera = camera;
                    // Create render loop
                    _this.core.engine.stopRenderLoop();
                    _this.createRenderLoop();
                    // Create parent node
                    var parent = null;
                    // Configure meshes
                    for (var i = 0; i < scene.meshes.length; i++) {
                        EDITOR.SceneManager.ConfigureObject(scene.meshes[i], _this.core, parent);
                    }
                    // Configure scene
                    EDITOR.SceneManager._SceneConfiguration = {
                        scene: scene,
                        actionManager: scene.actionManager
                    };
                    scene.actionManager = null;
                    // Reset UI
                    _this.sceneGraphTool.createUI();
                    _this.sceneGraphTool.fillGraph();
                    EDITOR.SceneFactory.NodesToStart = [];
                    _this.timeline.reset();
                    EDITOR.Event.sendSceneEvent(_this.core.currentScene, EDITOR.SceneEventType.NEW_SCENE_CREATED, _this.core);
                };
            };
            /**
            * Creates the babylon engine
            */
            EditorMain.prototype._createBabylonEngine = function () {
                var _this = this;
                this.core.canvas = document.getElementById("BABYLON-EDITOR-MAIN-CANVAS");
                this.core.engine = new BABYLON.Engine(this.core.canvas, this.antialias, this.options);
                this.core.engine.setHardwareScalingLevel(1.0 / devicePixelRatio);
                this.core.currentScene = new BABYLON.Scene(this.core.engine);
                this.core.currentScene.animations = [];
                this.core.scenes.push({ render: true, scene: this.core.currentScene });
                this._createBabylonCamera();
                window.addEventListener("resize", function (ev) {
                    if (_this.core.isPlaying) {
                        _this.core.isPlaying = false;
                    }
                    _this.core.engine.resize();
                });
            };
            /**
            * Creates the editor camera
            */
            EditorMain.prototype._createBabylonCamera = function () {
                var cameraPosition = new BABYLON.Vector3(0, 0, 10);
                var cameraTarget = BABYLON.Vector3.Zero();
                var cameraRadius = 10;
                if (this.core.camera) {
                    cameraPosition = this.core.camera.position;
                    cameraTarget = this.core.camera.target;
                    cameraRadius = this.core.camera.radius;
                }
                var camera = new BABYLON.ArcRotateCamera("EditorCamera", 0, 0, 10, BABYLON.Vector3.Zero(), this.core.currentScene);
                camera.panningSensibility = 50;
                camera.attachControl(this.core.canvas, false, false);
                this.core.camera = camera;
                if (this._saveCameraState) {
                    camera.setPosition(cameraPosition);
                    camera.setTarget(cameraTarget);
                    camera.radius = cameraRadius;
                }
            };
            /**
            * Creates the main events (on "document")
            */
            EditorMain.prototype._createMainEvents = function () {
                var _this = this;
                document.addEventListener("mousedown", function (event) {
                    EDITOR.Event.sendGUIEvent(null, EDITOR.GUIEventType.DOCUMENT_CLICK, _this.core, event);
                });
                document.addEventListener("mouseup", function (event) {
                    EDITOR.Event.sendGUIEvent(null, EDITOR.GUIEventType.DOCUMENT_UNCLICK, _this.core, event);
                });
                document.addEventListener("keydown", function (event) {
                    EDITOR.Event.sendKeyEvent(event.key, event.ctrlKey, true, _this.core, event);
                });
                document.addEventListener("keyup", function (event) {
                    EDITOR.Event.sendKeyEvent(event.key, event.ctrlKey, false, _this.core, event);
                });
            };
            // Statics
            EditorMain._PlayLayoutContainerID = "BABYLON-EDITOR-MAIN-MAIN-PANEL-CONTAINER";
            return EditorMain;
        }());
        EDITOR.EditorMain = EditorMain;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var MainToolbar = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function MainToolbar(core) {
                // Public members
                this.container = "BABYLON-EDITOR-MAIN-TOOLBAR";
                this.toolbar = null;
                this.panel = null;
                this.particleSystemMenu = null;
                this.particleSystemCopyItem = null;
                this.particleSystemPasteItem = null;
                this._plugins = [];
                this._mainProject = "MAIN-PROJECT";
                this._mainProjectOpenFiles = "MAIN-PROJECT-OPEN-FILES";
                this._mainProjectReload = "MAIN-PROJECT-RELOAD";
                this._mainProjectNew = "MAIN-PROJECT-NEW";
                this._projectExportCode = "PROJECT-EXPORT-CODE";
                this._projectExportBabylonScene = "PROJECT-EXPORT-BABYLON-SCENE";
                this._projectSaveLocal = "PROJECT-SAVE-LOCAL";
                this._projectTemplateLocal = "PROJECT-TEMPLATE-LOCAL";
                this._projectConnectStorage = "PROJECT-CONNECT-STORAGE";
                this._projectTemplateStorage = "PROJECT-TEMPLATE-STORAGE";
                this._mainEdit = "MAIN-EDIT";
                this._mainEditLaunch = "EDIT-LAUNCH";
                this._mainEditTextures = "EDIT-TEXTURES";
                this._mainAdd = "MAIN-ADD";
                this._addSkyMesh = "ADD-SKY-MESH";
                this._addWaterMesh = "ADD-WATER-MESH";
                this._addLensFlare = "ADD-LENS-FLARE";
                this._addReflectionProbe = "ADD-REFLECTION-PROBE";
                this._addRenderTarget = "ADD-RENDER-TARGET";
                this._addParticleSystem = "ADD-PARTICLE-SYSTEM";
                this._particlesMain = "PARTICLES-MAIN";
                this._particlesCopy = "PARTICLES-COPY";
                this._particlesPaste = "PARTICLES-PASTE";
                this._particlesPlay = "PARTICLES-PLAY";
                this._particlesStop = "PARTICLES-STOP";
                // Initialize
                this._editor = core.editor;
                this.core = core;
                this.panel = this._editor.layouts.getPanelFromType("top");
                // Register this
                this.core.updates.push(this);
                this.core.eventReceivers.push(this);
            }
            // Pre update
            MainToolbar.prototype.onPreUpdate = function () {
            };
            // Post update
            MainToolbar.prototype.onPostUpdate = function () {
            };
            // Event
            MainToolbar.prototype.onEvent = function (event) {
                var _this = this;
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED) {
                    if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                        return false;
                    }
                    var id = event.guiEvent.data;
                    var selected = this.toolbar.decomposeSelectedMenu(id);
                    if (!selected || !selected.hasParent)
                        return false;
                    // Project
                    if (selected.parent === this._mainProject) {
                        if (selected.selected === this._mainProjectOpenFiles) {
                            EDITOR.Tools.OpenFileBrowser(this.core, "#BABYLON-EDITOR-LOAD-SCENE-FILE", function (data) {
                                //this._editor.filesInput.loadFiles(data);
                                if (data.target.files.length === 0)
                                    return;
                                _this.core.editor.reloadScene(true, data);
                            }, true);
                        }
                        else if (selected.selected === this._mainProjectReload) {
                            EDITOR.GUI.GUIDialog.CreateDialog("Are you sure to reload the project ?", "Reload the project", function () {
                                _this.core.editor.reloadScene(true);
                            });
                        }
                        else if (selected.selected === this._mainProjectNew) {
                            EDITOR.GUI.GUIDialog.CreateDialog("Are you sure to create a new project ?", "Create a new project", function () {
                                _this._editor.createNewProject();
                            });
                        }
                        else if (selected.selected === this._projectExportCode) {
                            var exporter = new EDITOR.Exporter(this.core);
                            exporter.openSceneExporter();
                        }
                        else if (selected.selected === this._projectExportBabylonScene) {
                            var babylonExporter = new EDITOR.BabylonExporter(this.core);
                            babylonExporter.createUI();
                        }
                        else if (selected.selected === this._projectSaveLocal) {
                            var storageExporter = new EDITOR.StorageExporter(this.core, "ElectronLocalStorage");
                            storageExporter.export();
                            EDITOR.FilesInput.FilesToLoad["scene.editorproject"] = EDITOR.Tools.CreateFile(EDITOR.Tools.ConvertStringToArray(EDITOR.ProjectExporter.ExportProject(this.core)), "scene.editorproject");
                        }
                        else if (selected.selected === this._projectTemplateLocal) {
                            var storageExporter = new EDITOR.StorageExporter(this.core, "ElectronLocalStorage");
                            storageExporter.createTemplate();
                        }
                        else if (selected.selected === this._projectConnectStorage) {
                            var storageExporter = new EDITOR.StorageExporter(this.core);
                            storageExporter.export();
                            EDITOR.FilesInput.FilesToLoad["scene.editorproject"] = EDITOR.Tools.CreateFile(EDITOR.Tools.ConvertStringToArray(EDITOR.ProjectExporter.ExportProject(this.core)), "scene.editorproject");
                        }
                        else if (selected.selected === this._projectTemplateStorage) {
                            var storageExporter = new EDITOR.StorageExporter(this.core);
                            storageExporter.createTemplate();
                        }
                        return true;
                    }
                    // Edit
                    if (selected.parent === this._mainEdit) {
                        if (selected.selected === this._mainEditLaunch) {
                            var launchEditor = new EDITOR.LaunchEditor(this.core);
                        }
                        else if (selected.selected === this._mainEditTextures) {
                            var textureEditor = new EDITOR.GUITextureEditor(this.core, "");
                        }
                        return true;
                    }
                    // Add
                    if (selected.parent === this._mainAdd) {
                        if (selected.selected === this._addLensFlare) {
                            EDITOR.SceneFactory.AddLensFlareSystem(this.core);
                        }
                        else if (selected.selected === this._addSkyMesh) {
                            EDITOR.SceneFactory.AddSkyMesh(this.core);
                        }
                        else if (selected.selected === this._addWaterMesh) {
                            EDITOR.SceneFactory.AddWaterMesh(this.core);
                        }
                        else if (selected.selected === this._addReflectionProbe) {
                            EDITOR.SceneFactory.AddReflectionProbe(this.core);
                        }
                        else if (selected.selected === this._addRenderTarget) {
                            EDITOR.SceneFactory.AddRenderTargetTexture(this.core);
                        }
                        return true;
                    }
                    // Particles
                    if (selected.parent === this._particlesMain) {
                        if (selected.selected === this._addParticleSystem) {
                            EDITOR.SceneFactory.AddParticleSystem(this.core);
                        }
                        else if (selected.selected === this._particlesCopy) {
                            EDITOR.GUIParticleSystemEditor._CopiedParticleSystem = EDITOR.GUIParticleSystemEditor._CurrentParticleSystem;
                        }
                        else if (selected.selected === this._particlesPaste) {
                            if (!EDITOR.GUIParticleSystemEditor._CopiedParticleSystem)
                                return true;
                            //var emitter = GUIParticleSystemEditor._CopiedParticleSystem.emitter;
                            var selectedEmitter = this.core.editor.sceneGraphTool.sidebar.getSelectedNode();
                            if (!selectedEmitter || !selectedEmitter.data || !selectedEmitter.data.position)
                                return true;
                            var newParticleSystem = EDITOR.GUIParticleSystemEditor.CreateParticleSystem(this.core.currentScene, EDITOR.GUIParticleSystemEditor._CopiedParticleSystem.getCapacity(), EDITOR.GUIParticleSystemEditor._CopiedParticleSystem, selectedEmitter.data);
                            EDITOR.Event.sendSceneEvent(newParticleSystem, EDITOR.SceneEventType.OBJECT_ADDED, this.core);
                            this._editor.editionTool.updateEditionTool();
                        }
                        else if (selected.selected === this._particlesPlay) {
                            EDITOR.GUIParticleSystemEditor.PlayStopAllParticleSystems(this.core.currentScene, true);
                        }
                        else if (selected.selected === this._particlesStop) {
                            EDITOR.GUIParticleSystemEditor.PlayStopAllParticleSystems(this.core.currentScene, false);
                        }
                        return true;
                    }
                    for (var i = 0; i < this._plugins.length; i++) {
                        if (selected.parent === this._plugins[i].menuID) {
                            this._plugins[i].onMenuItemSelected(selected.selected);
                            return true;
                        }
                    }
                }
                return false;
            };
            // Creates the UI
            MainToolbar.prototype.createUI = function () {
                if (this.toolbar != null)
                    this.toolbar.destroy();
                this.toolbar = new EDITOR.GUI.GUIToolbar(this.container, this.core);
                var menu = this.toolbar.createMenu("menu", this._mainProject, "Project", "icon-folder");
                this.toolbar.createMenuItem(menu, "button", this._mainProjectOpenFiles, "Open Files", "icon-copy");
                this.toolbar.createMenuItem(menu, "button", this._mainProjectReload, "Reload...", "icon-copy");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._mainProjectNew, "New...", "icon-copy");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._projectExportCode, "Export...", "icon-export");
                this.toolbar.createMenuItem(menu, "button", this._projectExportBabylonScene, "Export .babylon Scene...", "icon-export");
                this.toolbar.addBreak(menu);
                if (!EDITOR.Tools.CheckIfElectron()) {
                    this.toolbar.createMenuItem(menu, "button", this._projectConnectStorage, "Save on OneDrive", "icon-one-drive");
                    this.toolbar.createMenuItem(menu, "button", this._projectTemplateStorage, "Template on OneDrive", "icon-one-drive");
                }
                else {
                    this.toolbar.createMenuItem(menu, "button", this._projectSaveLocal, "Save...", "icon-save");
                    this.toolbar.createMenuItem(menu, "button", this._projectTemplateLocal, "Create template...", "icon-save");
                }
                //...
                menu = this.toolbar.createMenu("menu", "MAIN-EDIT", "Edit", "icon-edit");
                this.toolbar.createMenuItem(menu, "button", this._mainEditLaunch, "Animate at Launch...", "icon-play-game");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._mainEditTextures, "Edit Textures...", "icon-copy");
                //...
                menu = this.toolbar.createMenu("menu", this._mainAdd, "Add", "icon-add");
                this.toolbar.createMenuItem(menu, "button", this._addLensFlare, "Add Lens Flare", "icon-lens-flare");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._addSkyMesh, "Add Sky", "icon-shaders");
                this.toolbar.createMenuItem(menu, "button", this._addWaterMesh, "Add Water", "icon-water");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._addReflectionProbe, "Add Reflection Probe", "icon-effects");
                this.toolbar.createMenuItem(menu, "button", this._addRenderTarget, "Add Render Target Texture", "icon-camera");
                //...
                this.particleSystemMenu = menu = this.toolbar.createMenu("menu", this._particlesMain, "Particles", "icon-particles");
                this.toolbar.createMenuItem(menu, "button", this._addParticleSystem, "Add Particle System", "icon-particles");
                this.toolbar.addBreak(menu);
                this.particleSystemCopyItem = this.toolbar.createMenuItem(menu, "button", this._particlesCopy, "Copy Selected Particle System", "icon-copy", false, true);
                this.particleSystemPasteItem = this.toolbar.createMenuItem(menu, "button", this._particlesPaste, "Paste Particle System", "icon-copy", false, true);
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._particlesPlay, "Start All Particles", "icon-play-game");
                this.toolbar.createMenuItem(menu, "button", this._particlesStop, "Stop All Particles", "icon-error");
                //...
                for (var i = 0; i < EDITOR.PluginManager.MainToolbarPlugins.length; i++)
                    this._plugins.push(new EDITOR.PluginManager.MainToolbarPlugins[i](this));
                // Build element
                this.toolbar.buildElement(this.container);
            };
            return MainToolbar;
        }());
        EDITOR.MainToolbar = MainToolbar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneGraphTool = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function SceneGraphTool(core) {
                // Public members
                this.container = "BABYLON-EDITOR-SCENE-GRAPH-TOOL";
                this.sidebar = null;
                this.panel = null;
                this._graphRootName = "RootScene";
                this._mainSoundTrackName = "";
                this._menuDeleteId = "BABYLON-EDITOR-SCENE-GRAPH-TOOL-REMOVE";
                this._menuCloneId = "BABYLON-EDITOR-SCENE-GRAPH-TOOL-CLONE";
                // Initialize
                this._editor = core.editor;
                this._core = core;
                this.panel = this._editor.layouts.getPanelFromType("right");
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // Pre update
            SceneGraphTool.prototype.onPreUpdate = function () {
            };
            // Post update
            SceneGraphTool.prototype.onPostUpdate = function () {
            };
            // Event
            SceneGraphTool.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT) {
                    if (event.guiEvent.caller === this.sidebar) {
                        if (event.guiEvent.eventType === EDITOR.GUIEventType.GRAPH_SELECTED || event.guiEvent.eventType === EDITOR.GUIEventType.GRAPH_DOUBLE_SELECTED) {
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.SCENE_EVENT;
                            ev.sceneEvent = new EDITOR.SceneEvent(event.guiEvent.data, EDITOR.SceneEventType.OBJECT_PICKED);
                            this._core.sendEvent(ev);
                            if (event.guiEvent.eventType === EDITOR.GUIEventType.GRAPH_DOUBLE_SELECTED) {
                                this._core.editor.sceneToolbar.setFocusOnObject(event.guiEvent.data);
                            }
                            return true;
                        }
                        else if (event.guiEvent.eventType === EDITOR.GUIEventType.GRAPH_MENU_SELECTED) {
                            var id = event.guiEvent.data;
                            var object = this.sidebar.getSelectedData();
                            var scene = this._core.currentScene;
                            if (!object)
                                return false;
                            if (id === this._menuDeleteId) {
                                if (object && object.dispose && object !== this._core.camera) {
                                    object.dispose();
                                    this._ensureObjectDispose(object);
                                    var node = this.sidebar.getNode(this.sidebar.getSelected());
                                    if (node && node.parent) {
                                        node.parent.count = node.parent.count || 0;
                                        node.parent.count--;
                                        if (node.parent.count <= 0)
                                            node.parent.count = undefined;
                                    }
                                    this.sidebar.removeNode(this.sidebar.getSelected());
                                    this.sidebar.refresh();
                                    EDITOR.Event.sendSceneEvent(object, EDITOR.SceneEventType.OBJECT_REMOVED, this._core);
                                }
                                return true;
                            }
                            else if (id === this._menuCloneId) {
                                if (!(object instanceof BABYLON.Mesh))
                                    return true;
                                if (!object.geometry) {
                                    var emitter = object.clone(object.name + "Cloned", object.parent);
                                    EDITOR.Event.sendSceneEvent(emitter, EDITOR.SceneEventType.OBJECT_ADDED, this._core);
                                    EDITOR.Event.sendSceneEvent(emitter, EDITOR.SceneEventType.OBJECT_PICKED, this._core);
                                    this.sidebar.setSelected(emitter.id);
                                    var buffer = null;
                                    for (var i = 0; i < scene.particleSystems.length; i++) {
                                        if (scene.particleSystems[i].emitter === object) {
                                            buffer = scene.particleSystems[i].particleTexture._buffer;
                                        }
                                        else if (scene.particleSystems[i].emitter === emitter) {
                                            scene.particleSystems[i].particleTexture = BABYLON.Texture.CreateFromBase64String(buffer, scene.particleSystems[i].particleTexture.name + "Cloned", scene);
                                            break;
                                        }
                                    }
                                }
                                return true;
                            }
                        }
                    }
                }
                else if (event.eventType === EDITOR.EventType.SCENE_EVENT) {
                    if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_ADDED) {
                        var object = event.sceneEvent.object;
                        if (object instanceof BABYLON.BaseTexture)
                            return false;
                        if (object instanceof BABYLON.ReflectionProbe) {
                            var rpNode = this.sidebar.createNode(object.name + this._core.currentScene.reflectionProbes.length, object.name, "icon-effects", object);
                            this.sidebar.addNodes(rpNode, this._graphRootName + "TARGETS");
                        }
                        else if (object instanceof BABYLON.RenderTargetTexture) {
                            var rpNode = this.sidebar.createNode(object.name + this._core.currentScene.customRenderTargets.length, object.name, "icon-camera", object);
                            this.sidebar.addNodes(rpNode, this._graphRootName + "TARGETS");
                        }
                        else {
                            var parentNode = null;
                            if (event.sceneEvent.object instanceof BABYLON.ParticleSystem) {
                                parentNode = event.sceneEvent.object.emitter;
                            }
                            else if (event.sceneEvent.object instanceof BABYLON.LensFlareSystem) {
                                parentNode = event.sceneEvent.object.getEmitter();
                            }
                            else if (event.sceneEvent.object instanceof BABYLON.Sound) {
                                parentNode = this._mainSoundTrackName;
                            }
                            this._modifyElement(event.sceneEvent.object, parentNode, object.id ? object.id : EDITOR.SceneFactory.GenerateUUID());
                        }
                        return false;
                    }
                    else if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_REMOVED) {
                        this.sidebar.removeNode(event.sceneEvent.object.id);
                        this.sidebar.refresh();
                        return false;
                    }
                }
                return false;
            };
            // Fills the graph of nodes (meshes, lights, cameras, etc.)
            SceneGraphTool.prototype.fillGraph = function (node, graphNodeID) {
                var children = null;
                var root = null;
                var scene = this._core.currentScene;
                if (!graphNodeID) {
                    this.sidebar.clear();
                    // Add root
                    var rootNode = this.sidebar.createNode(this._graphRootName, "Scene", "icon-scene", this._core.currentScene);
                    this.sidebar.addNodes(rootNode);
                    root = this._graphRootName;
                    // Reflection probes
                    var rpNode = this.sidebar.createNode(this._graphRootName + "TARGETS", "Render Targets", "icon-folder");
                    this.sidebar.addNodes(rpNode, this._graphRootName);
                    for (var i = 0; i < scene.reflectionProbes.length; i++) {
                        var rp = scene.reflectionProbes[i];
                        this.sidebar.addNodes(this.sidebar.createNode(rp.name + i, rp.name, "icon-effects", rp), rpNode.id);
                    }
                    for (var i = 0; i < scene.customRenderTargets.length; i++) {
                        var rt = scene.customRenderTargets[i];
                        if (BABYLON.Tags.HasTags(rt) && BABYLON.Tags.MatchesQuery(rt, "added"))
                            this.sidebar.addNodes(this.sidebar.createNode(rt.name + i, rp.name, "icon-camera", rp), rpNode.id);
                    }
                    // Audio
                    var audioNode = this.sidebar.createNode(this._graphRootName + "AUDIO", "Audio", "icon-folder");
                    this.sidebar.addNodes(audioNode, this._graphRootName);
                    for (var i = 0; i < scene.soundTracks.length; i++) {
                        var soundTrack = scene.soundTracks[i];
                        if (i === 0)
                            this._mainSoundTrackName = "Soundtrack " + soundTrack.id;
                        var soundTrackNode = this.sidebar.createNode(this._mainSoundTrackName, "Soundtrack " + soundTrack.id, "icon-sound", soundTrack);
                        if (scene.soundTracks.length === 1)
                            soundTrackNode.expanded = true;
                        soundTrackNode.count = soundTrack.soundCollection.length;
                        this.sidebar.addNodes(soundTrackNode, audioNode.id);
                        for (var j = 0; j < soundTrack.soundCollection.length; j++) {
                            var sound = soundTrack.soundCollection[j];
                            this.sidebar.addNodes(this.sidebar.createNode("Sound" + j, sound.name, "icon-sound", sound), soundTrackNode.id);
                        }
                    }
                }
                if (!node) {
                    children = [];
                    this._getRootNodes(children, "cameras");
                    this._getRootNodes(children, "lights");
                    this._getRootNodes(children, "meshes");
                }
                else
                    children = node.getDescendants ? node.getDescendants() : [];
                if (root === this._graphRootName)
                    this.sidebar.setNodeExpanded(root, true);
                // Check particles
                if (node && scene.particleSystems.length > 0) {
                    for (var i = 0; i < scene.particleSystems.length; i++) {
                        var ps = scene.particleSystems[i];
                        if (ps.emitter && ps.emitter === node) {
                            var psNode = this.sidebar.createNode(ps.id, ps.name, "icon-particles", ps);
                            this.sidebar.addNodes(psNode, node.id);
                        }
                    }
                }
                // Check lens flares
                if (node && scene.lensFlareSystems.length > 0) {
                    for (var i = 0; i < scene.lensFlareSystems.length; i++) {
                        var system = scene.lensFlareSystems[i];
                        if (system.getEmitter() === node) {
                            var lfNode = this.sidebar.createNode(EDITOR.SceneFactory.GenerateUUID(), system.name, "icon-lens-flare", system);
                            this.sidebar.addNodes(lfNode, node.id);
                        }
                    }
                }
                // If submeshes
                if (node instanceof BABYLON.AbstractMesh && node.subMeshes && node.subMeshes.length > 1) {
                    var subMeshesNode = this.sidebar.createNode(node.id + "SubMeshes", "Sub-Meshes", "icon-mesh", node);
                    subMeshesNode.count = node.subMeshes.length;
                    this.sidebar.addNodes(subMeshesNode, node.id);
                    for (var i = 0; i < node.subMeshes.length; i++) {
                        var subMesh = node.subMeshes[i];
                        var subMeshNode = this.sidebar.createNode(node.id + "SubMesh" + i, subMesh.getMaterial().name, "icon-mesh", subMesh);
                        this.sidebar.addNodes(subMeshNode, subMeshesNode.id);
                    }
                }
                // If children, then fill the graph recursively
                if (children !== null) {
                    // Set elements before
                    for (var i = 0; i < children.length; i++) {
                        var object = children[i];
                        var childrenLength = object.getDescendants().length;
                        var icon = this._getObjectIcon(object);
                        var childNode = this.sidebar.createNode(object.id, object.name, icon, object);
                        if (childrenLength > 0)
                            childNode.count = childrenLength;
                        this.sidebar.addNodes(childNode, root ? root : node.id);
                        this.fillGraph(object, object.id);
                    }
                }
            };
            // Creates the UI
            SceneGraphTool.prototype.createUI = function () {
                if (this.sidebar != null)
                    this.sidebar.destroy();
                this.sidebar = new EDITOR.GUI.GUIGraph(this.container, this._core);
                // Set menus
                this.sidebar.addMenu(this._menuDeleteId, "Remove", "icon-error");
                this.sidebar.addMenu(this._menuCloneId, "Clone", "icon-clone");
                // Build element
                this.sidebar.buildElement(this.container);
                /// Default node
                var node = this.sidebar.createNode(this._graphRootName, "Scene", "icon-scene", this._core.currentScene);
                this.sidebar.addNodes(node);
            };
            // Fills the result array of nodes when the node hasn't any parent
            SceneGraphTool.prototype._getRootNodes = function (result, entities) {
                var elements = this._core.currentScene[entities];
                for (var i = 0; i < elements.length; i++) {
                    if (!elements[i].parent) {
                        result.push(elements[i]);
                    }
                }
            };
            // Returns the appropriate icon of the node (mesh, animated mesh, light, camera, etc.)
            SceneGraphTool.prototype._getObjectIcon = function (node) {
                if (node instanceof BABYLON.AbstractMesh) {
                    if (node.skeleton)
                        return "icon-animated-mesh";
                    return "icon-mesh";
                }
                else if (node instanceof BABYLON.SubMesh) {
                    return "icon-mesh";
                }
                else if (node instanceof BABYLON.Light) {
                    if (node instanceof BABYLON.DirectionalLight)
                        return "icon-directional-light";
                    else
                        return "icon-light";
                }
                else if (node instanceof BABYLON.Camera) {
                    return "icon-camera";
                }
                else if (node instanceof BABYLON.ParticleSystem) {
                    return "icon-particles";
                }
                else if (node instanceof BABYLON.LensFlareSystem) {
                    return "icon-lens-flare";
                }
                else if (node instanceof BABYLON.Sound) {
                    return "icon-sound";
                }
                return "";
            };
            // Removes or adds a node from/to the graph
            SceneGraphTool.prototype._modifyElement = function (node, parentNode, id) {
                if (!node)
                    return;
                // Add node
                var icon = this._getObjectIcon(node);
                if (parentNode) {
                    var parent = this.sidebar.getNode(parentNode instanceof BABYLON.Node ? parentNode.id : parentNode);
                    if (parent) {
                        parent.count = parent.count || 0;
                        parent.count++;
                    }
                }
                this.sidebar.addNodes(this.sidebar.createNode(id ? id : node.id, node.name, icon, node), parentNode ? (parentNode instanceof BABYLON.Node ? parentNode.id : parentNode) : this._graphRootName);
                this.sidebar.refresh();
            };
            // Ensures that the object will delete all his dependencies
            SceneGraphTool.prototype._ensureObjectDispose = function (object) {
                var index;
                var scene = this._core.currentScene;
                // Lens flares
                for (index = 0; index < scene.lensFlareSystems.length; index++) {
                    var lf = scene.lensFlareSystems[index];
                    if (lf.getEmitter() === object)
                        lf.dispose();
                }
                // Particle systems
                for (index = 0; index < scene.particleSystems.length; index++) {
                    var ps = scene.particleSystems[index];
                    if (ps.emitter === object)
                        ps.dispose();
                }
                // Shadow generators
                for (index = 0; index < scene.lights.length; index++) {
                    var sg = scene.lights[index].getShadowGenerator();
                    if (!sg)
                        continue;
                    var renderList = sg.getShadowMap().renderList;
                    for (var meshIndex = 0; meshIndex < renderList.length; meshIndex++) {
                        if (renderList[meshIndex] === object)
                            renderList.splice(meshIndex, 1);
                    }
                }
                // Render targets
                for (index = 0; index < scene.customRenderTargets.length; index++) {
                    var rt = scene.customRenderTargets[index];
                    if (!rt.renderList)
                        continue;
                    for (var meshIndex = 0; meshIndex < rt.renderList.length; meshIndex++) {
                        if (rt.renderList[meshIndex] === object)
                            rt.renderList.splice(meshIndex, 1);
                    }
                }
                if (object instanceof BABYLON.AbstractMesh) {
                    var mesh = object;
                    var childMeshes = mesh.getChildMeshes(true);
                    // Fur material
                    for (index = 0; index < childMeshes.length; index++) {
                        if (BABYLON.Tags.MatchesQuery(childMeshes[index], "FurAdded")) {
                            childMeshes[index].dispose(true);
                            this._ensureObjectDispose(childMeshes[index]);
                        }
                    }
                }
            };
            return SceneGraphTool;
        }());
        EDITOR.SceneGraphTool = SceneGraphTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneToolbar = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function SceneToolbar(core) {
                // Public members
                this.container = "BABYLON-EDITOR-SCENE-TOOLBAR";
                this.toolbar = null;
                this.panel = null;
                this._fpsInput = null;
                this._wireframeID = "WIREFRAME";
                this._boundingBoxID = "BOUNDINGBOX";
                this._centerOnObjectID = "CENTER-ON-OBJECT";
                this._renderHelpersID = "RENDER-HELPERS";
                this._renderDebugLayerID = "RENDER-DEBUG-LAYER";
                this._drawingDebugLayer = false;
                // Initialize
                this._editor = core.editor;
                this._core = core;
                this.panel = this._editor.layouts.getPanelFromType("main");
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // Pre update
            SceneToolbar.prototype.onPreUpdate = function () {
            };
            // Post update
            SceneToolbar.prototype.onPostUpdate = function () {
            };
            // Event
            SceneToolbar.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED && this._drawingDebugLayer) {
                    this._configureDebugLayer();
                    return false;
                }
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED) {
                    if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                        return false;
                    }
                    var id = event.guiEvent.data;
                    var selected = this.toolbar.decomposeSelectedMenu(id);
                    var scene = this._core.currentScene;
                    if (!selected || !selected.parent)
                        return false;
                    id = selected.parent;
                    if (id === this._wireframeID) {
                        var checked = !this.toolbar.isItemChecked(id);
                        scene.forceWireframe = checked;
                        this.toolbar.setItemChecked(id, checked);
                        return true;
                    }
                    else if (id === this._boundingBoxID) {
                        var checked = !this.toolbar.isItemChecked(id);
                        scene.forceShowBoundingBoxes = checked;
                        this.toolbar.setItemChecked(id, checked);
                        return true;
                    }
                    else if (id === this._renderHelpersID) {
                        var checked = !this.toolbar.isItemChecked(id);
                        this._core.editor.renderHelpers = checked;
                        this.toolbar.setItemChecked(id, checked);
                        return true;
                    }
                    else if (id === this._centerOnObjectID) {
                        var object = this._core.editor.sceneGraphTool.sidebar.getSelectedData();
                        this.setFocusOnObject(object);
                        return true;
                    }
                    else if (id === this._renderDebugLayerID) {
                        var checked = !this.toolbar.isItemChecked(id);
                        this._drawingDebugLayer = checked;
                        if (checked) {
                            scene.debugLayer.show(true, scene.activeCamera, $("#BABYLON-EDITOR-MAIN-DEBUG-LAYER")[0]);
                            this._configureDebugLayer();
                        }
                        else
                            scene.debugLayer.hide();
                        this.toolbar.setItemChecked(id, checked);
                        return true;
                    }
                }
                return false;
            };
            // Creates the UI
            SceneToolbar.prototype.createUI = function () {
                var _this = this;
                if (this.toolbar != null)
                    this.toolbar.destroy();
                this.toolbar = new EDITOR.GUI.GUIToolbar(this.container, this._core);
                // Play game
                this.toolbar.createMenu("button", this._wireframeID, "Wireframe", "icon-wireframe");
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._boundingBoxID, "Bounding Box", "icon-bounding-box");
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._renderHelpersID, "Helpers", "icon-helpers", true);
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._centerOnObjectID, "Focus object", "icon-focus");
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._renderDebugLayerID, "Debug Layer", "icon-wireframe");
                this.toolbar.addSpacer();
                this.toolbar.createInput("SCENE-TOOLBAR-FPS", "SCENE-TOOLBAR-FPS-INPUT", "FPS :", 5);
                // Build element
                this.toolbar.buildElement(this.container);
                // Set events
                this._fpsInput = $("#SCENE-TOOLBAR-FPS-INPUT").w2field("int", { autoFormat: true });
                this._fpsInput.change(function (event) {
                    EDITOR.GUIAnimationEditor.FramesPerSecond = parseFloat(_this._fpsInput.val());
                    _this._configureFramesPerSecond();
                });
                this._fpsInput.val(String(EDITOR.GUIAnimationEditor.FramesPerSecond));
            };
            // Sets the focus of the camera
            SceneToolbar.prototype.setFocusOnObject = function (object) {
                if (!object || !object.position)
                    return;
                var scene = this._core.currentScene;
                var camera = this._core.camera;
                var position = object.position;
                if (object.getAbsolutePosition)
                    position = object.getAbsolutePosition();
                if (object.getBoundingInfo)
                    position = object.getBoundingInfo().boundingSphere.centerWorld;
                var keys = [
                    {
                        frame: 0,
                        value: camera.target
                    }, {
                        frame: 1,
                        value: position
                    }
                ];
                var animation = new BABYLON.Animation("FocusOnObjectAnimation", "target", 10, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                animation.setKeys(keys);
                scene.stopAnimation(camera);
                scene.beginDirectAnimation(camera, [animation], 0, 1, false, 1);
            };
            // Sets frames per second in FPS input
            SceneToolbar.prototype.setFramesPerSecond = function (fps) {
                this._fpsInput.val(String(fps));
                this._configureFramesPerSecond();
            };
            // Configure debug layer
            SceneToolbar.prototype._configureDebugLayer = function () {
                var layer = $("#DebugLayer");
                layer.css("left", "10px");
                layer.css("top", "10px");
            };
            // Set new frames per second
            SceneToolbar.prototype._configureFramesPerSecond = function () {
                var setFPS = function (objs) {
                    for (var objIndex = 0; objIndex < objs.length; objIndex++) {
                        for (var animIndex = 0; animIndex < objs[objIndex].animations.length; animIndex++) {
                            objs[objIndex].animations[animIndex].framePerSecond = EDITOR.GUIAnimationEditor.FramesPerSecond;
                        }
                    }
                };
                setFPS([this._core.currentScene]);
                setFPS(this._core.currentScene.meshes);
                setFPS(this._core.currentScene.lights);
                setFPS(this._core.currentScene.cameras);
                setFPS(this._core.currentScene.particleSystems);
                for (var sIndex = 0; sIndex < this._core.currentScene.skeletons.length; sIndex++)
                    setFPS(this._core.currentScene.skeletons[sIndex].bones);
            };
            return SceneToolbar;
        }());
        EDITOR.SceneToolbar = SceneToolbar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Timeline = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function Timeline(core) {
                var _this = this;
                // Public members
                this.container = "BABYLON-EDITOR-PREVIEW-TIMELINE";
                this.animations = [];
                this._overlay = null;
                this._overlayText = null;
                this._overlayObj = null;
                this._mousex = 0;
                this._mousey = 0;
                this._isOver = false;
                this._maxFrame = 1000;
                this._currentTime = 0;
                this._frameRects = [];
                this._frameTexts = [];
                this._currentAnimationFrame = 0;
                // Initialize
                this._core = core;
                this._panel = core.editor.playLayouts.getPanelFromType("preview");
                core.editor.playLayouts.on({ type: "resize", execute: "before" }, function () {
                    _this._updateTimeline();
                });
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // On event
            Timeline.prototype.onEvent = function (event) {
                return false;
            };
            // Called before rendering the scene(s)
            Timeline.prototype.onPreUpdate = function () {
                this._paper.setSize(this._panel.width - 17, 20);
                this._rect.attr("width", this._panel.width - 17);
                this._animatedRect.attr("x", this._currentAnimationFrame);
            };
            // Called after the scene(s) was rendered
            Timeline.prototype.onPostUpdate = function () {
            };
            // Starts the play mode of the timeline
            Timeline.prototype.play = function () {
                var keys = this._frameAnimation.getKeys();
                this._frameAnimation.framePerSecond = EDITOR.GUIAnimationEditor.FramesPerSecond;
                keys[0].frame = this._getFrame();
                keys[0].value = this._getPosition(this._currentTime);
                keys[1].frame = this._maxFrame;
                keys[1].value = this._getPosition(this._maxFrame);
                this._core.currentScene.beginAnimation(this, keys[0].frame, this._maxFrame, false, EDITOR.SceneFactory.AnimationSpeed);
            };
            // Stops the play mode of the timeline
            Timeline.prototype.stop = function () {
                this._core.currentScene.stopAnimation(this);
            };
            Object.defineProperty(Timeline.prototype, "currentTime", {
                // Get current time
                get: function () {
                    return this._currentTime;
                },
                enumerable: true,
                configurable: true
            });
            // Reset the timeline
            Timeline.prototype.reset = function () {
                this._maxFrame = EDITOR.GUIAnimationEditor.GetSceneFrameCount(this._core.currentScene);
                this._currentTime = 0;
                this._selectorRect.attr("x", 0);
                this.setFramesOfAnimation(null);
                this._core.editor.playLayouts.setPanelSize("preview", EDITOR.SceneFactory.NodesToStart.length > 0 ? 40 : 0);
            };
            // Adds a frames
            Timeline.prototype.setFramesOfAnimation = function (animation) {
                for (var i = 0; i < this._frameRects.length; i++)
                    this._frameRects[i].remove();
                if (!animation)
                    return;
                var keys = animation.getKeys();
                for (var i = 0; i < keys.length; i++) {
                    var pos = this._getPosition(keys[i].frame);
                    var rect = this._paper.rect(pos - 1.5, this._panel.height - 30, 3, 10);
                    rect.attr("fill", "red");
                    rect.attr("stroke", "black");
                    this._frameRects.push(rect);
                }
            };
            // Creates the UI
            Timeline.prototype.createUI = function () {
                var _this = this;
                // Paper
                this._paper = Raphael(this.container, 0, 25);
                // Timeline
                this._rect = this._paper.rect(0, 0, 0, 20);
                this._rect.attr("fill", Raphael.rgb(237, 241, 246));
                this._selectorRect = this._paper.rect(0, 0, 10, 20);
                this._selectorRect.attr("fill", Raphael.rgb(200, 191, 231));
                this._animatedRect = this._paper.rect(0, 0, 4, 20);
                //this._animatedRect.attr("fill", Raphael.rgb(0, 0, 0));
                // Animations
                this._frameAnimation = new BABYLON.Animation("anim", "_currentAnimationFrame", 12, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
                this._frameAnimation.setKeys([
                    { frame: 0, value: 0 },
                    { frame: 1, value: 1 }
                ]);
                this.animations.push(this._frameAnimation);
                // Events
                var click = function (event) {
                    _this._mousex = BABYLON.MathTools.Clamp(event.pageX - _this._paper.canvas.getBoundingClientRect().left, 0, _this._paper.width);
                    _this._mousey = BABYLON.MathTools.Clamp(event.pageY - _this._paper.canvas.getBoundingClientRect().top, 0, _this._paper.height);
                    _this._currentTime = _this._getFrame();
                    _this._selectorRect.attr("x", _this._mousex);
                    if (_this._currentTime >= 0 && _this._currentTime < _this._maxFrame - 1)
                        EDITOR.GUIAnimationEditor.SetCurrentFrame(_this._core, EDITOR.SceneFactory.NodesToStart, _this._currentTime);
                    _this._overlayText.text("Frame: " + BABYLON.Tools.Format(_this._currentTime, 0));
                    _this._overlayObj.css({ left: event.pageX });
                };
                window.addEventListener("mousemove", function (event) {
                    if (_this._isOver) {
                        click(event);
                    }
                });
                window.addEventListener("mouseup", function (event) {
                    if (_this._isOver) {
                        _this._overlayText.remove();
                    }
                    _this._isOver = false;
                });
                this._paper.canvas.addEventListener("mousedown", function (event) {
                    _this._isOver = true;
                    _this._overlay = $(_this._paper.canvas).w2overlay({ html: "<div id=\"BABYLON-EDITOR-TIMELINE-TEXT\" style=\"padding: 10px; line-height: 150%\"></div>" });
                    _this._overlayText = $("#BABYLON-EDITOR-TIMELINE-TEXT");
                    _this._overlayObj = $("#w2ui-overlay");
                    click(event);
                });
                // Finish
                this._updateTimeline();
            };
            // Applies a tag on the 
            Timeline.prototype._updateTimeline = function () {
                var count = 10;
                // Set frame texts
                for (var i = 0; i < this._frameTexts.length; i++) {
                    this._frameTexts[i].text.remove();
                    for (var j = 0; j < this._frameTexts[i].bars.length; j++) {
                        this._frameTexts[i].bars[j].remove();
                    }
                }
                this._frameTexts = [];
                for (var i = 0; i < count; i++) {
                    // Set text
                    var decal = ((this._maxFrame / count) * this._panel.width) / this._maxFrame * (i + 1);
                    var txt = this._paper.text(decal, this._panel.height - 35, BABYLON.Tools.Format(this._getFrame(decal), 0));
                    txt.node.setAttribute("pointer-events", "none");
                    txt.node.style.msUserSelect = "none";
                    txt.node.style.webkitUserSelect = "none";
                    txt.attr("font-family", "MS Reference Sans Serif");
                    txt.attr("fill", "#555");
                    // Set frame bars
                    var bars = [];
                    for (var j = 0; j < count; j++) {
                        decal = ((this._maxFrame / count) * this._panel.width) / this._maxFrame * (i + j / count);
                        var bar = this._paper.rect(decal, this._panel.height - (j === 0 ? 30 : 25), 0.25, j === 0 ? 10 : 5);
                        bar.attr("fill", Raphael.rgb(32, 32, 32));
                        bars.push(bar);
                    }
                    this._frameTexts.push({ text: txt, bars: bars });
                }
            };
            // Get frame from position
            Timeline.prototype._getFrame = function (pos) {
                var width = this._rect.attr("width");
                if (pos)
                    return (pos * this._maxFrame) / width;
                return BABYLON.MathTools.Clamp((this._mousex * this._maxFrame) / width, 0, this._maxFrame - 1);
            };
            // Get a position from a frame
            Timeline.prototype._getPosition = function (frame) {
                var width = this._rect.attr("width");
                return (frame * width) / this._maxFrame;
            };
            return Timeline;
        }());
        EDITOR.Timeline = Timeline;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ToolsToolbar = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function ToolsToolbar(core) {
                // Public members
                this.container = "BABYLON-EDITOR-TOOLS-TOOLBAR";
                this.toolbar = null;
                this.panel = null;
                this._playGameID = "PLAY-GAME";
                this._transformerPositionID = "TRANSFORMER-POSITION";
                // Initialize
                this._editor = core.editor;
                this._core = core;
                this.panel = this._editor.layouts.getPanelFromType("top");
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // Pre update
            ToolsToolbar.prototype.onPreUpdate = function () {
            };
            // Post update
            ToolsToolbar.prototype.onPostUpdate = function () {
            };
            // Event
            ToolsToolbar.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED) {
                    if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                        return false;
                    }
                    var id = event.guiEvent.data;
                    var selected = this.toolbar.decomposeSelectedMenu(id);
                    if (!selected || !selected.parent)
                        return false;
                    id = selected.parent;
                    if (id === this._transformerPositionID) {
                        var checked = this.toolbar.isItemChecked(id);
                        this.toolbar.setItemChecked(id, !checked);
                        this._editor.transformer.enabled = !checked;
                        return true;
                    }
                    else if (id === this._playGameID) {
                        var checked = !this.toolbar.isItemChecked(id);
                        this._core.isPlaying = checked;
                        //if (this._core.playCamera) {
                        //this._core.currentScene.activeCamera = checked ? this._core.playCamera : this._core.camera;
                        if (checked) {
                            // Save states
                            //SceneManager.SaveObjectStates(this._core.currentScene);
                            // Transformers
                            this._editor.transformer.setNode(null);
                            this._editor.transformer.enabled = false;
                            this.toolbar.setItemChecked(this._transformerPositionID, false);
                            this._core.engine.resize();
                            var time = (this._editor.timeline.currentTime * 1) / EDITOR.GUIAnimationEditor.FramesPerSecond / EDITOR.SceneFactory.AnimationSpeed;
                            // Animate at launch
                            for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                                var node = EDITOR.SceneFactory.NodesToStart[i];
                                if (node instanceof BABYLON.Sound) {
                                    node.stop();
                                    node.play(0, time);
                                    continue;
                                }
                                this._core.currentScene.stopAnimation(node);
                                this._core.currentScene.beginAnimation(node, this._editor.timeline.currentTime, Number.MAX_VALUE, false, EDITOR.SceneFactory.AnimationSpeed);
                            }
                            if (EDITOR.SceneFactory.NodesToStart.length > 0)
                                this._editor.timeline.play();
                        }
                        else {
                            // Restore states
                            //SceneManager.RestoreObjectsStates(this._core.currentScene);
                            this._core.engine.resize();
                            // Animate at launch
                            for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                                var node = EDITOR.SceneFactory.NodesToStart[i];
                                this._core.currentScene.stopAnimation(node);
                                if (node instanceof BABYLON.Sound) {
                                    node.stop();
                                }
                            }
                            this._core.editor.timeline.stop();
                        }
                        this.toolbar.setItemChecked(id, checked);
                        EDITOR.SceneManager.SwitchActionManager();
                        for (var i = 0; i < this._core.currentScene.meshes.length; i++)
                            this._core.currentScene.meshes[i].showBoundingBox = false;
                        return true;
                    }
                }
                return false;
            };
            // Creates the UI
            ToolsToolbar.prototype.createUI = function () {
                if (this.toolbar != null)
                    this.toolbar.destroy();
                this.toolbar = new EDITOR.GUI.GUIToolbar(this.container, this._core);
                // Play game
                this.toolbar.createMenu("button", this._playGameID, "Play...", "icon-play-game", undefined, "Play Game...");
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._transformerPositionID, "", "icon-position", undefined, "Draw / Hide Manipulators");
                // Build element
                this.toolbar.buildElement(this.container);
            };
            return ToolsToolbar;
        }());
        EDITOR.ToolsToolbar = ToolsToolbar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneHelpers = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function SceneHelpers(core) {
                // Public members
                this.core = null;
                // Private members
                this._scene = null;
                this._helperPlane = null;
                this._planeMaterial = null;
                this._subMesh = null;
                this._batch = null;
                this._cameraTexture = null;
                this._soundTexture = null;
                this._lightTexture = null;
                //Initialize
                this.core = core;
                core.updates.push(this);
                // Create scene
                this._scene = new BABYLON.Scene(core.engine);
                this._scene.autoClear = false;
                this._scene.postProcessesEnabled = false;
                // Helper
                this.createHelpers(core);
            }
            // Create helpers
            SceneHelpers.prototype.createHelpers = function (core) {
                this._planeMaterial = new BABYLON.StandardMaterial("HelperPlaneMaterial", this._scene);
                this._planeMaterial.emissiveColor = BABYLON.Color3.White();
                this._planeMaterial.useAlphaFromDiffuseTexture = true;
                this._planeMaterial.disableDepthWrite = false;
                this._scene.materials.pop();
                this._cameraTexture = new BABYLON.Texture("css/images/camera.png", this._scene);
                this._cameraTexture.hasAlpha = true;
                this._scene.textures.pop();
                this._soundTexture = new BABYLON.Texture("css/images/sound.png", this._scene);
                this._soundTexture.hasAlpha = true;
                this._scene.textures.pop();
                this._lightTexture = new BABYLON.Texture("css/images/light.png", this._scene);
                this._lightTexture.hasAlpha = true;
                this._scene.textures.pop();
                this._helperPlane = BABYLON.Mesh.CreatePlane("HelperPlane", 1, this._scene, false);
                this._helperPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
                this._scene.meshes.pop();
                this._helperPlane.material = this._planeMaterial;
            };
            // On pre update
            SceneHelpers.prototype.onPreUpdate = function () {
                // Update camera
                this._scene.activeCamera = this.core.currentScene.activeCamera;
            };
            // On post update
            SceneHelpers.prototype.onPostUpdate = function () {
                //this._helperPlane.setEnabled(!this.core.isPlaying && this.core.editor.renderHelpers);
                var _this = this;
                if ((this.core.isPlaying && this.core.currentScene.activeCamera !== this.core.camera) || !this.core.editor.renderHelpers)
                    return;
                var engine = this._scene.getEngine();
                engine.setAlphaTesting(true);
                if (this._planeMaterial.isReady(this._helperPlane)) {
                    this._subMesh = this._helperPlane.subMeshes[0];
                    var effect = this._planeMaterial.getEffect();
                    this._batch = this._helperPlane._getInstancesRenderList(this._subMesh._id);
                    engine.enableEffect(effect);
                    this._helperPlane._bind(this._subMesh, effect, BABYLON.Material.TriangleFillMode);
                    // Cameras
                    this._planeMaterial.diffuseTexture = this._cameraTexture;
                    this._renderHelperPlane(this.core.currentScene.cameras, function (obj) {
                        if (obj === _this.core.currentScene.activeCamera)
                            return false;
                        _this._helperPlane.position.copyFrom(obj.position);
                        return true;
                    });
                    // Sounds
                    this._planeMaterial.diffuseTexture = this._soundTexture;
                    for (var i = 0; i < this.core.currentScene.soundTracks.length; i++) {
                        var soundTrack = this.core.currentScene.soundTracks[i];
                        this._renderHelperPlane(soundTrack.soundCollection, function (obj) {
                            if (!obj.spatialSound)
                                return false;
                            _this._helperPlane.position.copyFrom(obj._position);
                            return true;
                        });
                    }
                    // Lights
                    this._planeMaterial.diffuseTexture = this._lightTexture;
                    this._renderHelperPlane(this.core.currentScene.lights, function (obj) {
                        if (!obj.getAbsolutePosition)
                            return false;
                        _this._helperPlane.position.copyFrom(obj.getAbsolutePosition());
                        return true;
                    });
                }
            };
            // Returns the scene
            SceneHelpers.prototype.getScene = function () {
                return this._scene;
            };
            // Render planes
            SceneHelpers.prototype._renderHelperPlane = function (array, onConfigure) {
                var effect = this._planeMaterial.getEffect();
                for (var i = 0; i < array.length; i++) {
                    var obj = array[i];
                    if (!onConfigure(obj))
                        continue;
                    var distance = BABYLON.Vector3.Distance(this.core.currentScene.activeCamera.position, this._helperPlane.position) * 0.03;
                    this._helperPlane.scaling = new BABYLON.Vector3(distance, distance, distance),
                        this._helperPlane.computeWorldMatrix(true);
                    this._scene._cachedMaterial = null;
                    this._planeMaterial.bind(this._helperPlane.getWorldMatrix(), this._helperPlane);
                    this._helperPlane._processRendering(this._subMesh, effect, BABYLON.Material.TriangleFillMode, this._batch, false, function (isInstance, world) {
                        effect.setMatrix("world", world);
                    });
                }
            };
            return SceneHelpers;
        }());
        EDITOR.SceneHelpers = SceneHelpers;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var StatusBar = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function StatusBar(core) {
                this._elements = [];
                // Initialize
                this._core = core;
                this._element = $("#BABYLON-EDITOR-BOTTOM-PANEL");
                this.panel = core.editor.layouts.getPanelFromType("bottom");
                core.editor.layouts.setPanelSize("bottom", 0);
            }
            // Add a new element in the status bar
            StatusBar.prototype.addElement = function (id, text, img, right) {
                right = right || false;
                this._core.editor.layouts.setPanelSize("bottom", 35);
                this._element.append("<div id=\"" + id + "\" style=\"float: " + (right ? "right" : "left") + "; height: 100%;\">" +
                    (img ? "<img id=\"" + id + "_img\" class=\"w2ui-icon " + img + "\ style=\"display: inline;\"></img>" : "") +
                    "<div id=\"" + id + "_spinner\" class=\"w2ui-spinner\" style=\"width: 20px; height: 20px; display: none;\"></div>" +
                    "<p id=\"" + id + "_text\" style=\"height: 100%; display: inline; vertical-align: super;\">\t" + text + "\t</p>" +
                    "<div id=\"" + id + "_separator\" style=\"border-left:1px solid grey; height: 100%; display: inline-block;\"></div>" +
                    "</div>");
                this._elements.push({
                    id: id,
                    class: img
                });
            };
            // Remove an existing element from the status bar
            StatusBar.prototype.removeElement = function (id) {
                for (var i = 0; i < this._elements.length; i++) {
                    var element = this._elements[i];
                    if (element.id === id) {
                        var htmlElement = $("#" + id, this._element);
                        htmlElement.empty();
                        htmlElement.remove();
                        this._elements.splice(i, 1);
                        if (this._elements.length === 0)
                            this._core.editor.layouts.setPanelSize("bottom", 0);
                        return true;
                    }
                }
                return false;
            };
            // Shows the spinner of an element
            StatusBar.prototype.showSpinner = function (id) {
                var spinner = $("#" + id + "_spinner", this._element);
                spinner.css("display", "inline-block");
            };
            // Hides the spinner of an element
            StatusBar.prototype.hideSpinner = function (id) {
                var spinner = $("#" + id + "_spinner", this._element);
                spinner.css("display", "none");
            };
            // Sets the new text
            StatusBar.prototype.setText = function (id, text) {
                $("#" + id + "_text").html("\t" + text + "\t");
            };
            // Sets the new icon
            StatusBar.prototype.setImage = function (id, image) {
                var item = this._getItem(id);
                var element = $("#" + id + "_img");
                element.removeClass(item.class);
                element.addClass(image);
            };
            // Returns the element from its id
            StatusBar.prototype._getItem = function (id) {
                for (var i = 0; i < this._elements.length; i++) {
                    if (this._elements[i].id === id)
                        return this._elements[i];
                }
                return null;
            };
            return StatusBar;
        }());
        EDITOR.StatusBar = StatusBar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var FilesInput = (function (_super) {
            __extends(FilesInput, _super);
            function FilesInput(core, sceneLoadedCallback, progressCallback, additionnalRenderLoopLogicCallback, textureLoadingCallback, startingProcessingFilesCallback) {
                _super.call(this, core.engine, core.currentScene, core.canvas, null, progressCallback, additionnalRenderLoopLogicCallback, textureLoadingCallback, FilesInput._callbackStart(core));
                this._sceneLoadedCallback = FilesInput._callback(sceneLoadedCallback, core, this);
            }
            FilesInput._callbackStart = function (core) {
                return function () {
                    core.editor.layouts.lockPanel("main", "Loading...", true);
                };
            };
            FilesInput._callback = function (callback, core, filesInput) {
                var readFileCallback = function (scene, jsFile) {
                    return function (result) {
                        /*
                        var evalResult = eval.call(window, result + "CreateBabylonScene");
    
                        if (evalResult !== undefined && evalResult !== null) {
                            try {
                                evalResult(scene);
                            }
                            catch (e) {
                                BABYLON.Tools.Error("An error occured in the script " + jsFile.name);
                            }
    
                            (<any>window).CreateBabylonScene = undefined;
    
                            core.editor.sceneGraphTool.createUI();
                            core.editor.sceneGraphTool.fillGraph();
                        }
                        */
                        //try {
                        EDITOR.ProjectImporter.ImportProject(core, result);
                        core.editor.sceneGraphTool.createUI();
                        core.editor.sceneGraphTool.fillGraph();
                        core.editor.timeline.reset();
                        //}
                        /*catch (e) {
                            BABYLON.Tools.Error("An error occured when loading the project file " + jsFile.name + ". The result:");
                            BABYLON.Tools.Warn(result);
                        }*/
                        if (jsFile.msClose)
                            jsFile.msClose();
                    };
                };
                return function (file, scene) {
                    var files = filesInput._filesToLoad;
                    var calledCallback = false;
                    for (var i = 0; i < files.length; i++) {
                        //if (files[i].type !== "application/javascript")
                        //    continue;
                        if (files[i].name.indexOf(".editorproject") === -1 && files[i].name.indexOf(".js") === -1)
                            continue;
                        BABYLON.Tools.ReadFile(files[i], readFileCallback(scene, files[i]), null);
                    }
                    scene.getEngine().hideLoadingUI();
                    if (callback)
                        callback(file, scene);
                    core.editor.layouts.unlockPanel("main");
                };
            };
            return FilesInput;
        }(BABYLON.FilesInput));
        EDITOR.FilesInput = FilesInput;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneFactory = (function () {
            function SceneFactory() {
            }
            // Public members
            SceneFactory.GenerateUUID = function () {
                var s4 = function () {
                    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
                };
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
            };
            Object.defineProperty(SceneFactory, "DummyNodeID", {
                get: function () {
                    return "BABYLON-EDITOR-DUMMY-NODE";
                },
                enumerable: true,
                configurable: true
            });
            // Private members
            SceneFactory.ConfigureObject = function (object, core) {
                if (object instanceof BABYLON.AbstractMesh || object instanceof BABYLON.Scene)
                    EDITOR.SceneManager.ConfigureObject(object, core);
                BABYLON.Tags.EnableFor(object);
                BABYLON.Tags.AddTagsTo(object, "added");
                EDITOR.Event.sendSceneEvent(object, EDITOR.SceneEventType.OBJECT_ADDED, core);
            };
            /**
            * Post-Processes
            */
            // Creates HDR pipeline 2
            SceneFactory.CreateStandardRenderingPipeline = function (core) {
                if (this.StandardPipeline) {
                    this.StandardPipeline.dispose();
                    this.StandardPipeline = null;
                }
                var cameras = core.currentScene.cameras;
                var standard = new BABYLON.StandardRenderingPipeline("StandardRenderingPipeline", core.currentScene, 1.0 / devicePixelRatio, null, cameras);
                standard.lensTexture = standard.lensFlareDirtTexture = new BABYLON.Texture("website/textures/lensdirt.jpg", core.currentScene);
                standard.lensStarTexture = new BABYLON.Texture("website/textures/lensstar.png", core.currentScene);
                standard.lensColorTexture = new BABYLON.Texture("website/textures/lenscolor.png", core.currentScene);
                this.StandardPipeline = standard;
                return standard;
            };
            // Creates HDR pipeline
            SceneFactory.CreateHDRPipeline = function (core, serializationObject) {
                if (serializationObject === void 0) { serializationObject = {}; }
                if (this.HDRPipeline) {
                    this.HDRPipeline.dispose();
                    this.HDRPipeline = null;
                }
                var cameras = core.currentScene.cameras;
                var ratio = {
                    finalRatio: 1.0,
                    blurRatio: 0.25 / devicePixelRatio
                };
                var lensTexture;
                if (serializationObject.lensTexture && serializationObject.lensTexture.name) {
                    lensTexture = BABYLON.Texture.Parse(serializationObject.lensTexture, core.currentScene, "./");
                }
                else {
                    if (serializationObject.lensTexture && serializationObject.lensTexture.base64Name) {
                        var b64LensTexutre = serializationObject.lensTexture.base64Buffer;
                        lensTexture = BABYLON.Texture.CreateFromBase64String(b64LensTexutre, "lensdirt.jpg", core.currentScene);
                    }
                    else {
                        lensTexture = new BABYLON.Texture("website/textures/lensdirt.jpg", core.currentScene);
                    }
                }
                lensTexture.name = lensTexture.name.replace("data:", "");
                var hdr = new BABYLON.HDRRenderingPipeline("hdr", core.currentScene, ratio, null, cameras, lensTexture);
                hdr.brightThreshold = serializationObject.brightThreshold || 1.0;
                hdr.gaussCoeff = serializationObject.gaussCoeff || 0.4;
                hdr.gaussMean = serializationObject.gaussMean || 0.0;
                hdr.gaussStandDev = serializationObject.gaussStandDev || 9.0;
                hdr.minimumLuminance = serializationObject.minimumLuminance || 0.5;
                hdr.luminanceDecreaseRate = serializationObject.luminanceDecreaseRate || 0.5;
                hdr.luminanceIncreaserate = serializationObject.luminanceIncreaserate || 0.5;
                hdr.exposure = serializationObject.exposure || 1;
                hdr.gaussMultiplier = serializationObject.gaussMultiplier || 4;
                hdr.exposureAdjustment = serializationObject.exposureAdjustment || hdr.exposureAdjustment;
                this.HDRPipeline = hdr;
                return hdr;
            };
            // Creates SSAO pipeline
            SceneFactory.CreateSSAOPipeline = function (core, serializationObject) {
                if (serializationObject === void 0) { serializationObject = {}; }
                if (this.SSAOPipeline) {
                    this.SSAOPipeline.dispose();
                    this.SSAOPipeline = null;
                }
                var cameras = core.currentScene.cameras;
                var ssao = new BABYLON.SSAORenderingPipeline("ssao", core.currentScene, { ssaoRatio: 0.5 / devicePixelRatio, combineRatio: 1.0 }, cameras);
                ssao.fallOff = serializationObject.fallOff || ssao.fallOff;
                ssao.area = serializationObject.area || ssao.area;
                ssao.radius = serializationObject.radius || ssao.radius;
                ssao.totalStrength = serializationObject.totalStrength || ssao.totalStrength;
                ssao.base = serializationObject.base || ssao.base;
                this.SSAOPipeline = ssao;
                return ssao;
            };
            // Creates a Volumetric Light Scattering post-process
            SceneFactory.CreateVLSPostProcess = function (core, mesh, serializationObject) {
                if (mesh === void 0) { mesh = null; }
                if (serializationObject === void 0) { serializationObject = {}; }
                var vls = new BABYLON.VolumetricLightScatteringPostProcess("vls", { passRatio: 0.5 / devicePixelRatio, postProcessRatio: 1.0 / devicePixelRatio }, core.camera, mesh, 100);
                if (mesh === null)
                    this.ConfigureObject(vls.mesh, core);
                for (var i = 0; i < core.currentScene.cameras.length; i++) {
                    if (core.currentScene.cameras[i] !== core.camera)
                        core.currentScene.cameras[i].attachPostProcess(vls);
                }
                return vls;
            };
            /**
            * Nodes
            */
            // Adds a point light
            SceneFactory.AddPointLight = function (core) {
                var light = new BABYLON.PointLight("New PointLight", new BABYLON.Vector3(10, 10, 10), core.currentScene);
                light.id = this.GenerateUUID();
                this.ConfigureObject(light, core);
                return light;
            };
            // Adds a directional light
            SceneFactory.AddDirectionalLight = function (core) {
                var light = new BABYLON.DirectionalLight("New DirectionalLight", new BABYLON.Vector3(-1, -2, -1), core.currentScene);
                light.position = new BABYLON.Vector3(10, 10, 10);
                light.id = this.GenerateUUID();
                this.ConfigureObject(light, core);
                return light;
            };
            // Adds a spot light
            SceneFactory.AddSpotLight = function (core) {
                var light = new BABYLON.SpotLight("New SpotLight", new BABYLON.Vector3(10, 10, 10), new BABYLON.Vector3(-1, -2, -1), 0.8, 2, core.currentScene);
                light.id = this.GenerateUUID();
                this.ConfigureObject(light, core);
                return light;
            };
            // Adds a hemispheric light
            SceneFactory.AddHemisphericLight = function (core) {
                var light = new BABYLON.HemisphericLight("New HemisphericLight", new BABYLON.Vector3(-1, -2, -1), core.currentScene);
                light.id = this.GenerateUUID();
                this.ConfigureObject(light, core);
                return light;
            };
            // Adds a box
            SceneFactory.AddBoxMesh = function (core) {
                var box = BABYLON.Mesh.CreateBox("New Box", 1.0, core.currentScene, false);
                box.id = this.GenerateUUID();
                this.ConfigureObject(box, core);
                return box;
            };
            // Adds a sphere
            SceneFactory.AddSphereMesh = function (core) {
                var sphere = BABYLON.Mesh.CreateSphere("New Sphere", 32, 1, core.currentScene, false);
                sphere.id = this.GenerateUUID();
                this.ConfigureObject(sphere, core);
                return sphere;
            };
            // Adds a plane
            SceneFactory.AddPlaneMesh = function (core) {
                var plane = BABYLON.Mesh.CreatePlane("New Plane", 1, core.currentScene, false);
                plane.id = this.GenerateUUID();
                this.ConfigureObject(plane, core);
                return plane;
            };
            // Adds a ground
            SceneFactory.AddGroundMesh = function (core) {
                var ground = BABYLON.Mesh.CreateGround("New Ground", 10, 10, 32, core.currentScene, false);
                ground.id = this.GenerateUUID();
                this.ConfigureObject(ground, core);
                return ground;
            };
            // Adds a height map
            SceneFactory.AddHeightMap = function (core) {
                var heightMap = BABYLON.Mesh.CreateGroundFromHeightMap("New Height Map", "", 10, 10, 32, 1, 1, core.currentScene, false);
                heightMap.id = this.GenerateUUID();
                this.ConfigureObject(heightMap, core);
                return heightMap;
            };
            // Adds a particle system
            SceneFactory.AddParticleSystem = function (core, chooseEmitter) {
                var _this = this;
                if (chooseEmitter === void 0) { chooseEmitter = true; }
                // Pick emitter
                if (chooseEmitter) {
                    var picker = new EDITOR.ObjectPicker(core);
                    picker.objectLists.push(core.currentScene.meshes);
                    picker.objectLists.push(core.currentScene.lights);
                    picker.windowName = "Select an emitter ?";
                    picker.selectButtonName = "Add";
                    picker.closeButtonName = "Cancel";
                    picker.minSelectCount = 0;
                    picker.onObjectPicked = function (names) {
                        if (names.length > 1) {
                            var dialog = new EDITOR.GUI.GUIDialog("ParticleSystemDialog", core, "Warning", "A Particle System can be attached to only one mesh.\n" +
                                "The first was considered as the mesh.");
                            dialog.buildElement(null);
                        }
                        var ps = EDITOR.GUIParticleSystemEditor.CreateParticleSystem(core.currentScene, 1000);
                        core.currentScene.meshes.pop();
                        ps.emitter.id = _this.GenerateUUID();
                        if (names.length > 0) {
                            var emitter = ps.emitter;
                            emitter.dispose(true);
                            ps.emitter = core.currentScene.getNodeByName(names[0]);
                            EDITOR.Event.sendSceneEvent(ps, EDITOR.SceneEventType.OBJECT_ADDED, core);
                        }
                        else {
                            core.currentScene.meshes.push(ps.emitter);
                            EDITOR.Event.sendSceneEvent(ps.emitter, EDITOR.SceneEventType.OBJECT_ADDED, core);
                            EDITOR.Event.sendSceneEvent(ps, EDITOR.SceneEventType.OBJECT_ADDED, core);
                        }
                        // To remove later, today particle systems can handle animations
                        ps.emitter.attachedParticleSystem = ps;
                    };
                    picker.onClosedPicker = function () {
                    };
                    picker.open();
                }
            };
            // Adds a lens flare system
            SceneFactory.AddLensFlareSystem = function (core, chooseEmitter, emitter) {
                if (chooseEmitter === void 0) { chooseEmitter = true; }
                // Pick emitter
                if (chooseEmitter) {
                    var picker = new EDITOR.ObjectPicker(core);
                    picker.objectLists.push(core.currentScene.meshes);
                    picker.objectLists.push(core.currentScene.lights);
                    picker.minSelectCount = 1;
                    picker.windowName = "Select an emitter...";
                    picker.onObjectPicked = function (names) {
                        if (names.length > 1) {
                            var dialog = new EDITOR.GUI.GUIDialog("ReflectionProbeDialog", picker.core, "Warning", "A Lens Flare System can be attached to only one mesh.\n" +
                                "The first was considered as the mesh.");
                            dialog.buildElement(null);
                        }
                        var emitter = core.currentScene.getNodeByName(names[0]);
                        if (emitter) {
                            var system = new BABYLON.LensFlareSystem("New Lens Flare System", emitter, core.currentScene);
                            var flare0 = SceneFactory.AddLensFlare(core, system, 0.2, 0, new BABYLON.Color3(1, 1, 1));
                            var flare1 = SceneFactory.AddLensFlare(core, system, 0.5, 0.2, new BABYLON.Color3(0.5, 0.5, 1));
                            var flare2 = SceneFactory.AddLensFlare(core, system, 0.2, 1.0, new BABYLON.Color3(1, 1, 1));
                            var flare3 = SceneFactory.AddLensFlare(core, system, 0.4, 0.4, new BABYLON.Color3(1, 0.5, 1));
                            var flare4 = SceneFactory.AddLensFlare(core, system, 0.1, 0.6, new BABYLON.Color3(1, 1, 1));
                            var flare5 = SceneFactory.AddLensFlare(core, system, 0.3, 0.8, new BABYLON.Color3(1, 1, 1));
                        }
                        EDITOR.Event.sendSceneEvent(system, EDITOR.SceneEventType.OBJECT_ADDED, core);
                    };
                    picker.open();
                    return null;
                }
            };
            // Adds a lens flare to the particle system
            SceneFactory.AddLensFlare = function (core, system, size, position, color) {
                var buffer = "data:image/png;base64,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";
                var texture = BABYLON.Texture.CreateFromBase64String(buffer, "lens.png", core.currentScene);
                texture.name = texture.name.replace("data:", "");
                var flare = new BABYLON.LensFlare(size, position, color, null, system);
                flare.texture = texture;
                return flare;
            };
            // Adds a reflection probe
            SceneFactory.AddReflectionProbe = function (core) {
                var rp = new BABYLON.ReflectionProbe("New Reflection Probe", 512, core.currentScene, true);
                this.ConfigureObject(rp, core);
                return rp;
            };
            // Adds a render target
            SceneFactory.AddRenderTargetTexture = function (core) {
                var rt = new BABYLON.RenderTargetTexture("New Render Target Texture", 512, core.currentScene, false);
                core.currentScene.customRenderTargets.push(rt);
                this.ConfigureObject(rt, core);
                return rt;
            };
            // Adds a skynode
            SceneFactory.AddSkyMesh = function (core) {
                var skyboxMaterial = new BABYLON.SkyMaterial("skyMaterial", core.currentScene);
                skyboxMaterial.backFaceCulling = false;
                var skybox = BABYLON.Mesh.CreateBox("skyBox", 1000.0, core.currentScene, false, BABYLON.Mesh.BACKSIDE);
                skybox.id = this.GenerateUUID();
                skybox.material = skyboxMaterial;
                this.ConfigureObject(skybox, core);
                return skybox;
            };
            // Adds a water mesh (with water material)
            SceneFactory.AddWaterMesh = function (core) {
                var waterMaterial = new BABYLON.WaterMaterial("waterMaterail", core.currentScene);
                /*
                Tools.CreateFileFromURL("website/textures/normal.png", (file: File) => {
                    waterMaterial.bumpTexture = new Texture("file:normal.png", core.currentScene, false, false, Texture.BILINEAR_SAMPLINGMODE);
                    waterMaterial.bumpTexture.name = (<any>waterMaterial.bumpTexture).url = file.name;
                }, true);
                */
                BABYLON.Tools.LoadFile("website/textures/normal.png", function (data) {
                    var base64 = BABYLON.Tools.EncodeArrayBufferTobase64(data);
                    var texture = waterMaterial.bumpTexture = BABYLON.Texture.CreateFromBase64String(base64, "normal.png", core.currentScene, false, false, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
                    texture.name = texture.name.replace("data:", "");
                }, null, null, true);
                var water = BABYLON.WaterMaterial.CreateDefaultMesh("waterMesh", core.currentScene);
                water.id = this.GenerateUUID();
                water.material = waterMaterial;
                this.ConfigureObject(water, core);
                // Add meshes in reflection automatically
                for (var i = 0; i < core.currentScene.meshes.length - 1; i++) {
                    waterMaterial.addToRenderList(core.currentScene.meshes[i]);
                }
                return water;
            };
            // Public members
            SceneFactory.HDRPipeline = null;
            SceneFactory.StandardPipeline = null;
            SceneFactory.SSAOPipeline = null;
            SceneFactory.VLSPostProcess = null;
            SceneFactory.EnabledPostProcesses = {
                hdr: false,
                attachHDR: true,
                ssao: false,
                ssaoOnly: false,
                attachSSAO: true,
                standard: false,
                attachStandard: true,
                vls: false
            };
            SceneFactory.NodesToStart = [];
            SceneFactory.AnimationSpeed = 1.0;
            return SceneFactory;
        }());
        EDITOR.SceneFactory = SceneFactory;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneManager = (function () {
            function SceneManager() {
            }
            // Reset configured objects
            SceneManager.ResetConfiguredObjects = function () {
                this._ConfiguredObjectsIDs = {};
            };
            // Switch action manager (editor and scene itself)
            SceneManager.SwitchActionManager = function () {
                var actionManager = this._SceneConfiguration.actionManager;
                this._SceneConfiguration.actionManager = this._SceneConfiguration.scene.actionManager;
                this._SceneConfiguration.scene.actionManager = actionManager;
                // Meshes configuration
                for (var thing in this._ConfiguredObjectsIDs) {
                    var obj = this._ConfiguredObjectsIDs[thing];
                    actionManager = obj.mesh.actionManager;
                    obj.mesh.actionManager = obj.actionManager;
                    obj.actionManager = actionManager;
                }
            };
            // Configures and object
            SceneManager.ConfigureObject = function (object, core, parentNode) {
                if (object instanceof BABYLON.AbstractMesh) {
                    var mesh = object;
                    var scene = mesh.getScene();
                    /*
                    if (this._alreadyConfiguredObjectsIDs[mesh.id])
                        return;
                    */
                    if (mesh instanceof BABYLON.Mesh && !mesh.geometry)
                        return;
                    this._ConfiguredObjectsIDs[mesh.id] = {
                        mesh: mesh,
                        actionManager: mesh.actionManager
                    };
                    // Configure mesh
                    mesh.actionManager = new BABYLON.ActionManager(scene);
                    mesh.isPickable = true;
                    // Pointer over / out
                    mesh.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, mesh, "showBoundingBox", true));
                    mesh.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, mesh, "showBoundingBox", false));
                    // Pointer click
                    var mouseX = scene.pointerX;
                    var mouseY = scene.pointerY;
                    mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function (evt) {
                        mouseX = scene.pointerX;
                        mouseY = scene.pointerY;
                    }));
                    mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickUpTrigger, function (evt) {
                        if (scene.pointerX === mouseX && scene.pointerY === mouseY) {
                            EDITOR.Event.sendSceneEvent(mesh, EDITOR.SceneEventType.OBJECT_PICKED, core);
                            core.editor.sceneGraphTool.sidebar.setSelected(mesh.id);
                        }
                    }));
                    if (parentNode && !mesh.parent) {
                        mesh.parent = parentNode;
                    }
                }
                // Send event configured
                var ev = new EDITOR.Event();
                ev.eventType = EDITOR.EventType.SCENE_EVENT;
                ev.sceneEvent = new EDITOR.SceneEvent(object, BABYLON.EDITOR.SceneEventType.OBJECT_PICKED);
                core.sendEvent(ev);
            };
            // Save objects states
            SceneManager.SaveObjectStates = function (scene) {
                var _this = this;
                this._ObjectsStatesConfiguration = {};
                var recursivelySaveStates = function (object, statesObject) {
                    for (var thing in object) {
                        if (thing[0] == "_")
                            continue;
                        var value = object[thing];
                        if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
                            statesObject[thing] = value;
                        }
                        else if (value instanceof BABYLON.Vector2 || value instanceof BABYLON.Vector3 || value instanceof BABYLON.Vector4) {
                            statesObject[thing] = value;
                        }
                        else if (value instanceof BABYLON.Color3 || value instanceof BABYLON.Color4) {
                            statesObject[thing] = value;
                        }
                        else if (value instanceof BABYLON.Material) {
                            statesObject[thing] = {};
                            recursivelySaveStates(value, statesObject[thing]);
                        }
                    }
                };
                var saveObjects = function (objects) {
                    for (var i = 0; i < objects.length; i++) {
                        var id = "Scene";
                        if (!(objects[i] instanceof BABYLON.Scene))
                            id = objects[i].id;
                        _this._ObjectsStatesConfiguration[id] = {};
                        recursivelySaveStates(objects[i], _this._ObjectsStatesConfiguration[id]);
                    }
                };
                saveObjects(scene.meshes);
                saveObjects(scene.cameras);
                saveObjects(scene.lights);
                saveObjects([scene]);
            };
            // Restore object states
            SceneManager.RestoreObjectsStates = function (scene) {
                var _this = this;
                var recursivelyRestoreStates = function (object, statesObject) {
                    for (var thing in statesObject) {
                        var value = statesObject[thing];
                        if (thing === "material") {
                            recursivelyRestoreStates(object[thing], statesObject[thing]);
                        }
                        else {
                            object[thing] = statesObject[thing];
                        }
                    }
                };
                var restoreObjects = function (objects) {
                    for (var i = 0; i < objects.length; i++) {
                        var id = "Scene";
                        if (!(objects[i] instanceof BABYLON.Scene))
                            id = objects[i].id;
                        var statesObject = _this._ObjectsStatesConfiguration[id];
                        if (statesObject)
                            recursivelyRestoreStates(objects[i], statesObject);
                    }
                };
                restoreObjects(scene.meshes);
                restoreObjects(scene.cameras);
                restoreObjects(scene.lights);
                restoreObjects([scene]);
            };
            // Adds a custom meta data
            SceneManager.AddCustomMetadata = function (key, data) {
                this._CustomMetadatas[key] = data;
            };
            // Removes a custom meta data
            SceneManager.RemoveCustomMetadata = function (key) {
                if (!this._CustomMetadatas[key])
                    return false;
                delete this._CustomMetadatas[key];
                return true;
            };
            // Returns the custom metadata
            SceneManager.GetCustomMetadata = function (key) {
                if (!this._CustomMetadatas[key])
                    return null;
                return this._CustomMetadatas[key];
            };
            // Public members
            /**
            * Objects configuration
            */
            SceneManager._ConfiguredObjectsIDs = {};
            /**
            * Custom meta datas
            */
            SceneManager._CustomMetadatas = {};
            return SceneManager;
        }());
        EDITOR.SceneManager = SceneManager;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Storage = (function () {
            // Private members
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function Storage(core) {
                // Public members
                this.core = null;
                // Initialize
                this.core = core;
            }
            // Creates folders
            Storage.prototype.createFolders = function (folders, parentFolder, success, failed) { };
            // Gets children files
            Storage.prototype.getFiles = function (folder, success, failed) { };
            // Create files
            Storage.prototype.createFiles = function (files, folder, success, failed, progress) { };
            // Select folder
            Storage.prototype.selectFolder = function (success) { };
            return Storage;
        }());
        EDITOR.Storage = Storage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var OneDriveStorage = (function (_super) {
            __extends(OneDriveStorage, _super);
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function OneDriveStorage(core) {
                _super.call(this, core);
                this._editor = core.editor;
            }
            // When user authentificated using the popup window (and accepted BabylonJSEditor to access files)
            OneDriveStorage._OnAuthentificated = function () {
                // Get token from URL
                var token = "";
                var expires = "";
                if (window.location.hash) {
                    var response = window.location.hash.substring(1);
                    var authInfo = JSON.parse("{\"" + response.replace(/&/g, '","').replace(/=/g, '":"') + "\"}", function (key, value) { return key === "" ? value : decodeURIComponent(value); });
                    token = authInfo.access_token;
                    expires = authInfo.expires_in;
                }
                // Close popup
                window.opener.BABYLON.EDITOR.OneDriveStorage._ClosePopup(token, expires, window);
            };
            // Closes the login popup
            OneDriveStorage._ClosePopup = function (token, expires, window) {
                OneDriveStorage._TOKEN = token;
                if (token === "") {
                    EDITOR.GUI.GUIWindow.CreateAlert("Cannot connect to OneDrive or get token...");
                }
                else {
                    OneDriveStorage._TOKEN_EXPIRES_IN = parseInt(expires);
                    OneDriveStorage._TOKEN_EXPIRES_NOW = Date.now();
                }
                if (window.OneDriveStorageCallback) {
                    window.OneDriveStorageCallback();
                }
                window.close();
            };
            // Login into OneDrive
            OneDriveStorage._Login = function (core, success) {
                // OneDrive
                var now = (Date.now() - OneDriveStorage._TOKEN_EXPIRES_NOW) / 1000;
                if (OneDriveStorage._TOKEN === "" || now >= OneDriveStorage._TOKEN_EXPIRES_IN) {
                    var uri = "https://login.live.com/oauth20_authorize.srf"
                        + "?client_id=" + OneDriveStorage._ClientID
                        + "&redirect_uri=" + EDITOR.Tools.GetBaseURL() + "redirect.html"
                        + "&response_type=token&nonce=7a16fa03-c29d-4e6a-aff7-c021b06a9b27&scope=wl.basic onedrive.readwrite wl.offline_access";
                    var popup = EDITOR.Tools.OpenWindowPopup(uri, 512, 512);
                    popup.OneDriveStorageCallback = success;
                }
                else {
                    success();
                }
            };
            // Creates folders
            OneDriveStorage.prototype.createFolders = function (folders, parentFolder, success, failed) {
                OneDriveStorage._Login(this.core, function () {
                    var count = 0;
                    var error = "";
                    var callback = function () {
                        count++;
                        if (count === folders.length) {
                            if (error !== "" && failed) {
                                failed(error);
                            }
                            success();
                        }
                    };
                    for (var i = 0; i < folders.length; i++) {
                        $.ajax({
                            url: "https://Api.Onedrive.com/v1.0/drive/items/" + parentFolder.file.id + "/children",
                            type: "POST",
                            contentType: "application/json",
                            data: JSON.stringify({
                                "name": folders[i],
                                "folder": {},
                                "@name.conflictBehavior": "rename"
                            }),
                            headers: {
                                "Authorization": "Bearer " + OneDriveStorage._TOKEN
                            },
                            success: function () {
                                callback();
                            },
                            error: function (err) {
                                error += "- " + err.statusText + "\n";
                                callback();
                                BABYLON.Tools.Error("BABYLON.EDITOR.OneDriveStorage: Cannot create folders (POST)");
                            }
                        });
                    }
                });
            };
            // Creates files
            OneDriveStorage.prototype.createFiles = function (files, folder, success, failed, progress) {
                OneDriveStorage._Login(this.core, function () {
                    var count = 0;
                    var error = "";
                    var callback = function () {
                        count++;
                        if (progress)
                            progress(count);
                        if (count === files.length) {
                            if (error !== "" && failed) {
                                failed(error);
                            }
                            success();
                        }
                    };
                    for (var i = 0; i < files.length; i++) {
                        $.ajax({
                            url: "https://Api.Onedrive.com/v1.0/drive/items/" + (files[i].parentFolder ? files[i].parentFolder.id : folder.file.id) + ":/" + files[i].name + ":/content",
                            processData: false,
                            data: files[i].content,
                            type: "PUT",
                            headers: {
                                "Authorization": "Bearer " + OneDriveStorage._TOKEN
                            },
                            success: function () {
                                callback();
                            },
                            error: function (err) {
                                error += "- " + err.statusText + "\n";
                                callback();
                                BABYLON.Tools.Error("BABYLON.EDITOR.OneDriveStorage: Cannot upload files (PUT) of " + folder.name);
                            }
                        });
                    }
                });
            };
            // Gets the children files of a folder
            OneDriveStorage.prototype.getFiles = function (folder, success, failed) {
                OneDriveStorage._Login(this.core, function () {
                    $.ajax({
                        url: "https://Api.Onedrive.com/v1.0/drive/" + (folder ? "items/" + folder.file.id : "root") + "/children",
                        type: "GET",
                        headers: {
                            "Authorization": "Bearer " + OneDriveStorage._TOKEN
                        },
                        success: function (response) {
                            var children = [];
                            for (var i = 0; i < response.value.length; i++)
                                children.push({ file: response.value[i], name: response.value[i].name });
                            success(children);
                        },
                        error: function (err) {
                            var message = "BABYLON.EDITOR.OneDriveStorage: Cannot get files (GET, children) of " + (folder ? "folder " + folder.name : "root");
                            if (failed)
                                failed(message);
                            else
                                BABYLON.Tools.Error(message);
                        }
                    });
                });
            };
            OneDriveStorage._ClientID = "0000000048182B1B";
            OneDriveStorage._TOKEN = "";
            OneDriveStorage._TOKEN_EXPIRES_IN = 0;
            OneDriveStorage._TOKEN_EXPIRES_NOW = 0;
            OneDriveStorage._POPUP = null;
            return OneDriveStorage;
        }(EDITOR.Storage));
        EDITOR.OneDriveStorage = OneDriveStorage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Exporter = (function () {
            /**
            * Constructor
            */
            function Exporter(core) {
                // private members
                this._window = null;
                this._editor = null;
                this._editorID = "BABYLON-EDITOR-EXPORT-WINDOW-EDITOR";
                this._generatedCode = "";
                // Initialize
                this.core = core;
            }
            // Opens the scene exporter
            Exporter.prototype.openSceneExporter = function (babylonScene) {
                var _this = this;
                // Create window
                var windowBody = EDITOR.GUI.GUIElement.CreateDivElement(this._editorID, "width: 100%; height: 100%");
                this._window = new EDITOR.GUI.GUIWindow("WindowExport", this.core, "Export Project", windowBody);
                this._window.buildElement(null);
                this._window.onToggle = function (maximized, width, height) {
                    _this._editor.resize();
                };
                // Create ace editor
                this._editor = ace.edit(this._editorID);
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/javascript");
                // Finish
                this._generatedCode = this.generateCode(babylonScene);
            };
            // Generates the code
            Exporter.prototype.generateCode = function (babylonScene) {
                var scene = this.core.currentScene;
                var finalString = "";
                if (babylonScene) {
                    var obj = BABYLON.SceneSerializer.Serialize(this.core.currentScene);
                    finalString = JSON.stringify(obj, null, "\t");
                }
                else {
                    /*
                    finalString = [
                        "var getTextureByName = " + this._getTextureByName + "\n",
                        "function CreateBabylonScene(scene) {",
                        "\tvar engine = scene.getEngine();",
                        "\tvar node = null;",
                        "\tvar animation = null;",
                        "\tvar keys = null;",
                        "\tvar particleSystem = null;\n",
                        this._exportPostProcesses(),
                        this._exportScene(),
                        this._exportReflectionProbes(),
                        this._traverseNodes(),
                        this._exportSceneValues(),
                        "}\n"
                    ].join("\n");
                    */
                    finalString = EDITOR.ProjectExporter.ExportProject(this.core, true);
                }
                if (this._editor) {
                    this._editor.setValue(finalString, -1);
                    if (!babylonScene)
                        this._editor.getSession().setUseWrapMode(false);
                }
                return finalString;
            };
            // Exports the code
            Exporter.ExportCode = function (core) {
                var exporter = new Exporter(core);
                var finalString = [
                    "var getTextureByName = " + exporter._getTextureByName + "\n",
                    "function CreateBabylonScene(scene) {",
                    "\tvar engine = scene.getEngine();",
                    "\tvar node = null;",
                    "\tvar animation = null;",
                    "\tvar keys = null;",
                    "\tvar particleSystem = null;\n",
                    exporter._exportPostProcesses(),
                    exporter._exportScene(),
                    exporter._exportReflectionProbes(),
                    exporter._traverseNodes(),
                    exporter._exportSceneValues(),
                    "}\n"
                ].join("\n");
                return finalString;
            };
            // Export the scene values
            Exporter.prototype._exportSceneValues = function () {
                // Common values
                var finalString = "\n" +
                    "\tif (BABYLON.EDITOR) {\n" +
                    "\t    BABYLON.EDITOR.SceneFactory.AnimationSpeed = " + EDITOR.SceneFactory.AnimationSpeed + ";\n";
                for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                    var node = EDITOR.SceneFactory.NodesToStart[i];
                    if (node instanceof BABYLON.Scene)
                        finalString += "\t    BABYLON.EDITOR.SceneFactory.NodesToStart.push(scene);\n";
                    else
                        finalString += "\t    BABYLON.EDITOR.SceneFactory.NodesToStart.push(scene.getNodeByName(\"" + node.name + "\"));\n";
                }
                finalString += "\t}\n";
                finalString += "\telse {\n";
                for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                    var node = EDITOR.SceneFactory.NodesToStart[i];
                    if (node instanceof BABYLON.Scene)
                        finalString += "\t    scene.beginAnimation(scene, 0, Number.MAX_VALUE, false, " + EDITOR.SceneFactory.AnimationSpeed + "); \n";
                    else
                        finalString += "\t    scene.beginAnimation(scene.getNodeByName(\"" + node.name + "\"), 0, Number.MAX_VALUE, false, " + EDITOR.SceneFactory.AnimationSpeed + ");\n";
                }
                finalString += "\t}\n";
                return finalString;
            };
            // Export scene
            Exporter.prototype._exportScene = function () {
                var scene = this.core.currentScene;
                var finalString = "\n\t// Export scene\n";
                // Set values
                for (var thing in scene) {
                    var value = scene[thing];
                    var result = "";
                    if (thing[0] === "_")
                        continue;
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else
                        continue;
                    finalString += "\tscene." + thing + " = " + result + ";\n";
                }
                var animations = scene.animations;
                if (animations && animations.length > 0) {
                    finalString += "\tscene.animations = [];\n";
                    finalString += "\tnode = scene;\n";
                    finalString += this._exportAnimations(scene);
                }
                return finalString;
            };
            // Export reflection probes
            Exporter.prototype._exportReflectionProbes = function () {
                var scene = this.core.currentScene;
                var finalString = "\t// Export reflection probes\n";
                finalString += "\tvar reflectionProbe = null;";
                var t = new BABYLON.ReflectionProbe("", 512, scene, false);
                for (var i = 0; i < scene.reflectionProbes.length; i++) {
                    var rp = scene.reflectionProbes[i];
                    var texture = rp.cubeTexture;
                    if (rp.name === "")
                        continue;
                    finalString += "\treflectionProbe = new BABYLON.ReflectionProbe(\"" + rp.name + "\", " + texture.getSize().width + ", scene, " + texture._generateMipMaps + ");\n";
                    // Render list
                    for (var j = 0; j < rp.renderList.length; j++) {
                        var node = rp.renderList[j];
                        finalString += "\treflectionProbe.renderList.push(scene.getNodeByName(\"" + node.name + "\"));\n";
                    }
                }
                return finalString;
            };
            // Export node's transformation
            Exporter.prototype._exportNodeTransform = function (node) {
                var finalString = "";
                if (node.position) {
                    finalString += "\tnode.position = " + this._exportVector3(node.position) + ";\n";
                }
                if (node.rotation) {
                    finalString += "\tnode.rotation = " + this._exportVector3(node.rotation) + ";\n";
                }
                if (node.rotationQuaternion) {
                    finalString += "\tnode.rotationQuaternion = " + this._exportQuaternion(node.rotationQuaternion) + ";\n";
                }
                if (node.scaling) {
                    finalString += "\tnode.scaling = " + this._exportVector3(node.scaling) + ";\n";
                }
                return finalString;
            };
            // Returns a BaseTexture from its name
            Exporter.prototype._getTextureByName = function (name, scene) {
                // "this" is forbidden since this code is exported directly
                for (var i = 0; i < scene.textures.length; i++) {
                    var texture = scene.textures[i];
                    if (texture.name === name) {
                        return texture;
                    }
                }
                return null;
            };
            // Exports the post-processes
            Exporter.prototype._exportPostProcesses = function () {
                var finalString = "";
                if (EDITOR.SceneFactory.HDRPipeline) {
                    finalString +=
                        "\tvar ratio = {\n" +
                            "\t    finalRatio: 1.0,\n" +
                            "\t    blurRatio: 0.5\n" +
                            "\t};\n";
                    finalString +=
                        "\tvar hdr = new BABYLON.HDRRenderingPipeline(\"hdr\", scene, ratio, null, scene.cameras, new BABYLON.Texture(\"Textures/lensdirt.jpg\", scene));\n" +
                            "\thdr.exposureAdjustment = " + EDITOR.SceneFactory.HDRPipeline.exposureAdjustment + ";\n" +
                            "\thdr.brightThreshold = " + EDITOR.SceneFactory.HDRPipeline.brightThreshold + ";\n" +
                            "\thdr.gaussCoeff = " + EDITOR.SceneFactory.HDRPipeline.gaussCoeff + ";\n" +
                            "\thdr.gaussMean = " + EDITOR.SceneFactory.HDRPipeline.gaussMean + ";\n" +
                            "\thdr.gaussStandDev = " + EDITOR.SceneFactory.HDRPipeline.gaussStandDev + ";\n" +
                            "\thdr.minimumLuminance = " + EDITOR.SceneFactory.HDRPipeline.minimumLuminance + ";\n" +
                            "\thdr.luminanceDecreaseRate = " + EDITOR.SceneFactory.HDRPipeline.luminanceDecreaseRate + ";\n" +
                            "\thdr.luminanceIncreaserate = " + EDITOR.SceneFactory.HDRPipeline.luminanceIncreaserate + ";\n" +
                            "\thdr.exposure = " + EDITOR.SceneFactory.HDRPipeline.exposure + ";\n" +
                            "\thdr.gaussMultiplier = " + EDITOR.SceneFactory.HDRPipeline.gaussMultiplier + ";\n";
                    finalString +=
                        "\tif (BABYLON.EDITOR) {\n" +
                            "\t    BABYLON.EDITOR.SceneFactory.HDRPipeline = hdr;\n" +
                            "\t}\n";
                }
                return finalString;
            };
            // Export node's animations
            Exporter.prototype._exportAnimations = function (node) {
                var finalString = "\n";
                for (var i = 0; i < node.animations.length; i++) {
                    var anim = node.animations[i];
                    // Check tags here
                    // ....
                    if (!BABYLON.Tags.HasTags(anim) || !BABYLON.Tags.MatchesQuery(anim, "modified"))
                        continue;
                    var keys = anim.getKeys();
                    finalString += "\tkeys = [];\n";
                    finalString += "\tanimation = new BABYLON.Animation(\"" + anim.name + "\", \"" + anim.targetPropertyPath.join(".") + "\", " + anim.framePerSecond + ", " + anim.dataType + ", " + anim.loopMode + "); \n";
                    finalString += "\tBABYLON.Tags.AddTagsTo(animation, \"modified\");\n";
                    if (!keys)
                        continue;
                    for (var j = 0; j < keys.length; j++) {
                        var value = keys[j].value;
                        var result = value.toString();
                        if (value instanceof BABYLON.Vector3) {
                            result = this._exportVector3(value);
                        }
                        else if (value instanceof BABYLON.Vector2) {
                            result = this._exportVector2(value);
                        }
                        else if (value instanceof BABYLON.Color3) {
                            result = this._exportColor3(value);
                        }
                        finalString += "\tkeys.push({ frame: " + keys[j].frame + ", value: " + result + " });\n";
                    }
                    finalString += "\tanimation.setKeys(keys);\n";
                    finalString += "\tnode.animations.push(animation);\n";
                }
                return finalString;
            };
            // Export node's material
            Exporter.prototype._exportNodeMaterial = function (node, subMeshId) {
                var material = null;
                //node.material;
                if (node instanceof BABYLON.AbstractMesh) {
                    material = node.material;
                }
                else if (node instanceof BABYLON.SubMesh) {
                    material = node.getMaterial();
                }
                var isStandard = material instanceof BABYLON.StandardMaterial;
                if (!material || (isStandard && !BABYLON.Tags.HasTags(material)))
                    return "";
                var finalString = "\n";
                // Set constructor
                var materialString = "\tnode.material";
                if (node instanceof BABYLON.SubMesh) {
                    materialString = "\tnode.material.subMaterials[" + subMeshId + "]";
                }
                if (material instanceof BABYLON.StandardMaterial) {
                }
                else if (material instanceof BABYLON.PBRMaterial) {
                    finalString += materialString + " =  new BABYLON.PBRMaterial(\"" + material.name + "\", scene);\n";
                }
                else if (material instanceof BABYLON.SkyMaterial) {
                    finalString += materialString + " =  new BABYLON.SkyMaterial(\"" + material.name + "\", scene);\n";
                }
                // Set values
                for (var thing in material) {
                    var value = material[thing];
                    var result = "";
                    if (thing[0] === "_" || value === null)
                        continue;
                    if (isStandard && !BABYLON.Tags.MatchesQuery(material, thing))
                        continue;
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (value instanceof BABYLON.Vector3) {
                        result += this._exportVector3(value);
                    }
                    else if (value instanceof BABYLON.Vector2) {
                        result += this._exportVector2(value);
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else if (value instanceof BABYLON.Color4) {
                        result += this._exportColor4(value);
                    }
                    else if (value instanceof BABYLON.BaseTexture) {
                        result += "getTextureByName(\"" + value.name + "\", scene);";
                    }
                    else
                        continue;
                    if (node instanceof BABYLON.AbstractMesh) {
                        finalString += "\tnode.material." + thing + " = " + result + ";\n";
                    }
                    else if (node instanceof BABYLON.SubMesh) {
                        finalString += "\tnode.material.subMaterials[" + subMeshId + "]." + thing + " = " + result + ";\n";
                    }
                }
                return finalString + "\n";
            };
            Exporter.prototype._exportSky = function (node) {
                var finalString = "\tnode = BABYLON.Mesh.CreateBox(\"" + node.name + "\", 1000, scene);\n";
                return finalString;
            };
            Exporter.prototype._exportParticleSystem = function (particleSystem) {
                var node = particleSystem.emitter;
                var finalString = "";
                if (!node.geometry)
                    finalString = "\tnode = new BABYLON.Mesh(\"" + node.name + "\", scene, null, null, true);\n";
                else
                    finalString = "\tnode = scene.getMeshByName(\"" + node.name + "\");\n";
                finalString += "\tparticleSystem = new BABYLON.ParticleSystem(\"" + particleSystem.name + "\", " + particleSystem.getCapacity() + ", scene);\n";
                finalString += "\tparticleSystem.emitter = node;\n";
                for (var thing in particleSystem) {
                    if (thing[0] === "_")
                        continue;
                    var value = particleSystem[thing];
                    var result = "";
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (typeof value === "string") {
                        result += "\"" + value + "\"";
                    }
                    else if (value instanceof BABYLON.Vector3) {
                        result = this._exportVector3(value);
                    }
                    else if (value instanceof BABYLON.Color4) {
                        result += this._exportColor4(value);
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else if (value instanceof BABYLON.Texture) {
                        result += "BABYLON.Texture.CreateFromBase64String(\"" + value._buffer + "\", \"" + value.name + "\", scene)";
                    }
                    else
                        continue;
                    finalString += "\tparticleSystem." + thing + " = " + result + ";\n";
                }
                finalString += "\tnode.attachedParticleSystem = particleSystem;\n";
                if (!particleSystem._stopped)
                    finalString += "\tparticleSystem.start();\n";
                return finalString;
            };
            // Exports a light
            Exporter.prototype._exportLight = function (light) {
                var finalString = "";
                var shadows = light.getShadowGenerator();
                if (!shadows)
                    return finalString;
                for (var thing in light) {
                    if (thing[0] === "_")
                        continue;
                    var value = light[thing];
                    var result = "";
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (typeof value === "string") {
                        result += "\"" + value + "\"";
                    }
                    else if (value instanceof BABYLON.Vector3) {
                        result += this._exportVector3(value);
                    }
                    else if (value instanceof BABYLON.Vector2) {
                        result += this._exportVector2(value);
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else
                        continue;
                    finalString += "\tnode." + thing + " = " + result + ";\n";
                }
                finalString += "\n";
                // Shadow generator
                var shadowsGenerator = light.getShadowGenerator();
                if (!shadowsGenerator)
                    return finalString;
                var serializationObject = shadowsGenerator.serialize();
                finalString +=
                    "\tvar shadowGenerator = node.getShadowGenerator();\n"
                        + "\tif (!shadowGenerator) {\n" // Do not create another
                        + "\t\tshadowGenerator = new BABYLON.ShadowGenerator(" + serializationObject.mapSize + ", node);\n";
                for (var i = 0; i < serializationObject.renderList.length; i++) {
                    var mesh = serializationObject.renderList[i];
                    finalString += "\t\tshadowGenerator.getShadowMap().renderList.push(scene.getMeshByID(\"" + mesh + "\"));\n";
                }
                finalString += "\t}\n";
                for (var thing in shadowsGenerator) {
                    if (thing[0] === "_")
                        continue;
                    var value = shadowsGenerator[thing];
                    var result = "";
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (typeof value === "string") {
                        result += "\"" + value + "\"";
                    }
                    else
                        continue;
                    finalString += "\tshadowGenerator." + thing + " = " + result + ";\n";
                }
                return finalString;
            };
            // Exports a BABYLON.Vector2
            Exporter.prototype._exportVector2 = function (vector) {
                return "new BABYLON.Vector2(" + vector.x + ", " + vector.y + ")";
            };
            // Exports a BABYLON.Vector3
            Exporter.prototype._exportVector3 = function (vector) {
                return "new BABYLON.Vector3(" + vector.x + ", " + vector.y + ", " + vector.z + ")";
            };
            // Exports a BABYLON.Quaternion
            Exporter.prototype._exportQuaternion = function (quaternion) {
                return "new BABYLON.Quaternion(" + quaternion.x + ", " + quaternion.y + ", " + quaternion.z + ", " + quaternion.w + ")";
            };
            // Exports a BABYLON.Color3
            Exporter.prototype._exportColor3 = function (color) {
                return "new BABYLON.Color3(" + color.r + ", " + color.g + ", " + color.b + ")";
            };
            // Exports a BABYLON.Color4
            Exporter.prototype._exportColor4 = function (color) {
                return "new BABYLON.Color4(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + ")";
            };
            // Traverses nodes
            Exporter.prototype._traverseNodes = function (node) {
                var scene = this.core.currentScene;
                if (!node) {
                    var rootNodes = [];
                    var finalString = "";
                    this._fillRootNodes(rootNodes, "lights");
                    this._fillRootNodes(rootNodes, "cameras");
                    this._fillRootNodes(rootNodes, "meshes");
                    for (var i = 0; i < rootNodes.length; i++) {
                        finalString += this._traverseNodes(rootNodes[i]);
                    }
                    return finalString;
                }
                else {
                    var finalString = "";
                    if (node.id.indexOf(EDITOR.SceneFactory.DummyNodeID) === -1 && node !== this.core.camera) {
                        finalString = "\t// Configure node " + node.name + "\n";
                        var foundParticleSystems = false;
                        for (var i = 0; i < scene.particleSystems.length; i++) {
                            var ps = scene.particleSystems[i];
                            if (ps.emitter === node) {
                                finalString += "\n" + this._exportParticleSystem(ps);
                                foundParticleSystems = true;
                            }
                        }
                        var foundSky = false;
                        if (!foundParticleSystems) {
                            if (node instanceof BABYLON.Mesh && node.material instanceof BABYLON.SkyMaterial) {
                                finalString += "\n" + this._exportSky(node);
                                foundSky = true;
                            }
                        }
                        if (!foundSky)
                            finalString += "\tnode = scene.getNodeByName(\"" + node.name + "\");\n";
                        // Transformation
                        if (foundParticleSystems || foundSky)
                            finalString += this._exportNodeTransform(node);
                        if (node instanceof BABYLON.AbstractMesh) {
                            // Material
                            if (node.material instanceof BABYLON.MultiMaterial) {
                                for (var i = 0; i < node.subMeshes.length; i++) {
                                    finalString += this._exportNodeMaterial(node.subMeshes[i], i);
                                }
                            }
                            else {
                                finalString += this._exportNodeMaterial(node);
                            }
                        }
                        else if (node instanceof BABYLON.Light) {
                            finalString += this._exportLight(node);
                        }
                        if (node.animations.length > 0) {
                            finalString += this._exportAnimations(node);
                        }
                    }
                    for (var i = 0; i < node.getDescendants().length; i++) {
                        finalString += this._traverseNodes(node.getDescendants()[i]);
                    }
                    return finalString;
                }
            };
            // Fills array of root nodes
            Exporter.prototype._fillRootNodes = function (data, propertyPath) {
                var scene = this.core.currentScene;
                var nodes = scene[propertyPath];
                for (var i = 0; i < nodes.length; i++) {
                    if (!nodes[i].parent)
                        data.push(nodes[i]);
                }
            };
            return Exporter;
        }());
        EDITOR.Exporter = Exporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ProjectExporter = (function () {
            function ProjectExporter() {
            }
            // Public members
            // None
            // Private members
            // None
            // Exports the project
            ProjectExporter.ExportProject = function (core, requestMaterials) {
                if (requestMaterials === void 0) { requestMaterials = false; }
                BABYLON.SceneSerializer.ClearCache();
                if (!core.isPlaying)
                    EDITOR.SceneManager.SwitchActionManager();
                var project = {
                    globalConfiguration: this._SerializeGlobalAnimations(),
                    materials: [],
                    particleSystems: [],
                    nodes: [],
                    shadowGenerators: [],
                    postProcesses: this._SerializePostProcesses(),
                    lensFlares: this._SerializeLensFlares(core),
                    renderTargets: this._SerializeRenderTargets(core),
                    actions: this._SerializeActionManager(core.currentScene),
                    sounds: this._SerializeSounds(core),
                    requestedMaterials: requestMaterials ? [] : undefined,
                    customMetadatas: this._SerializeCustomMetadatas()
                };
                this._TraverseNodes(core, null, project);
                if (!core.isPlaying)
                    EDITOR.SceneManager.SwitchActionManager();
                return JSON.stringify(project, null, "\t");
            };
            // Serialize global animations
            ProjectExporter._SerializeGlobalAnimations = function () {
                var config = {
                    globalAnimationSpeed: EDITOR.SceneFactory.AnimationSpeed,
                    framesPerSecond: EDITOR.GUIAnimationEditor.FramesPerSecond,
                    animatedAtLaunch: []
                };
                for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                    var node = EDITOR.SceneFactory.NodesToStart[i];
                    var type = "Node";
                    if (node instanceof BABYLON.Scene) {
                        type = "Scene";
                    }
                    else if (node instanceof BABYLON.Sound) {
                        type = "Sound";
                    }
                    else if (node instanceof BABYLON.ParticleSystem) {
                        type = "ParticleSystem";
                    }
                    var obj = {
                        name: node.name,
                        type: type
                    };
                    config.animatedAtLaunch.push(obj);
                }
                return config;
            };
            // Serialize sounds
            ProjectExporter._SerializeSounds = function (core) {
                var config = [];
                var index = 0;
                for (index = 0; index < core.currentScene.soundTracks[0].soundCollection.length; index++) {
                    var sound = core.currentScene.soundTracks[0].soundCollection[index];
                    if (!BABYLON.Tags.HasTags(sound) || !BABYLON.Tags.MatchesQuery(sound, "added"))
                        continue;
                    config.push({
                        name: sound.name,
                        serializationObject: sound.serialize()
                    });
                }
                return config;
            };
            // Serialize render targets
            ProjectExporter._SerializeRenderTargets = function (core) {
                var config = [];
                var index = 0;
                // Probes
                for (index = 0; index < core.currentScene.reflectionProbes.length; index++) {
                    var rp = core.currentScene.reflectionProbes[index];
                    var attachedMesh = rp._attachedMesh;
                    var obj = {
                        isProbe: true,
                        serializationObject: {}
                    };
                    if (attachedMesh) {
                        obj.serializationObject.attachedMeshId = attachedMesh.id;
                    }
                    obj.serializationObject.name = rp.name;
                    obj.serializationObject.size = rp.cubeTexture.getBaseSize().width;
                    obj.serializationObject.generateMipMaps = rp.cubeTexture._generateMipMaps;
                    obj.serializationObject.renderList = [];
                    for (var i = 0; i < rp.renderList.length; i++) {
                        obj.serializationObject.renderList.push(rp.renderList[i].id);
                    }
                    config.push(obj);
                }
                // Render targets
                for (index = 0; index < core.currentScene.customRenderTargets.length; index++) {
                    var rt = core.currentScene.customRenderTargets[index];
                    if (!BABYLON.Tags.HasTags(rt) || !BABYLON.Tags.MatchesQuery(rt, "added"))
                        continue;
                    var obj = {
                        isProbe: false,
                        serializationObject: rt.serialize()
                    };
                    config.push(obj);
                }
                return config;
            };
            // Serialize lens flares
            ProjectExporter._SerializeLensFlares = function (core) {
                var config = [];
                for (var i = 0; i < core.currentScene.lensFlareSystems.length; i++) {
                    var lf = core.currentScene.lensFlareSystems[i];
                    var obj = {
                        serializationObject: lf.serialize()
                    };
                    var flares = obj.serializationObject.flares;
                    for (var i = 0; i < flares.length; i++) {
                        flares[i].base64Name = flares[i].textureName;
                        delete flares[i].textureName;
                        flares[i].base64Buffer = lf.lensFlares[i].texture._buffer;
                    }
                    config.push(obj);
                }
                return config;
            };
            // Serialize  post-processes
            ProjectExporter._SerializePostProcesses = function () {
                var config = [];
                var serialize = function (object) {
                    var obj = {};
                    for (var thing in object) {
                        if (thing[0] === "_")
                            continue;
                        if (typeof object[thing] === "number")
                            obj[thing] = object[thing];
                        if (object[thing] instanceof BABYLON.Texture) {
                            obj[thing] = {
                                base64Name: object[thing].name,
                                base64Buffer: object[thing]._buffer
                            };
                        }
                    }
                    return obj;
                };
                if (EDITOR.SceneFactory.SSAOPipeline) {
                    /*
                    config.push({
                        attach: SceneFactory.EnabledPostProcesses.attachSSAO,
                        name: "SSAOPipeline",
                        serializationObject: serialize(SceneFactory.SSAOPipeline)
                    });
                    */
                    config.push({
                        attach: EDITOR.SceneFactory.EnabledPostProcesses.attachSSAO,
                        name: "SSAOPipeline",
                        serializationObject: this._ConfigureBase64Texture(EDITOR.SceneFactory.SSAOPipeline, EDITOR.SceneFactory.SSAOPipeline.serialize())
                    });
                }
                if (EDITOR.SceneFactory.HDRPipeline) {
                    /*
                    config.push({
                        attach: SceneFactory.EnabledPostProcesses.attachHDR,
                        name: "HDRPipeline",
                        serializationObject: serialize(SceneFactory.HDRPipeline)
                    });
                    */
                    config.push({
                        attach: EDITOR.SceneFactory.EnabledPostProcesses.attachHDR,
                        name: "HDRPipeline",
                        serializationObject: this._ConfigureBase64Texture(EDITOR.SceneFactory.HDRPipeline, EDITOR.SceneFactory.HDRPipeline.serialize())
                    });
                }
                return config;
            };
            // Traverses nodes
            ProjectExporter._TraverseNodes = function (core, node, project) {
                var scene = core.currentScene;
                if (!node) {
                    this._TraverseNodes(core, core.currentScene, project);
                    var rootNodes = [];
                    this._FillRootNodes(core, rootNodes, "lights");
                    this._FillRootNodes(core, rootNodes, "cameras");
                    this._FillRootNodes(core, rootNodes, "meshes");
                    for (var i = 0; i < rootNodes.length; i++) {
                        this._TraverseNodes(core, rootNodes[i], project);
                    }
                }
                else {
                    if (node !== core.camera) {
                        // Check particle systems
                        for (var i = 0; i < scene.particleSystems.length; i++) {
                            var ps = scene.particleSystems[i];
                            if (ps.emitter === node) {
                                var psObj = {
                                    hasEmitter: !(BABYLON.Tags.HasTags(node) && BABYLON.Tags.MatchesQuery(node, "added_particlesystem")),
                                    serializationObject: ps.serialize()
                                };
                                if (!psObj.hasEmitter)
                                    psObj.emitterPosition = ps.emitter.position.asArray();
                                // Patch texture base64 string
                                psObj.serializationObject.base64TextureName = ps.particleTexture.name;
                                psObj.serializationObject.base64Texture = ps.particleTexture._buffer;
                                delete psObj.serializationObject.textureName;
                                project.particleSystems.push(psObj);
                            }
                        }
                        // Check materials
                        if (node instanceof BABYLON.AbstractMesh && node.material && !(node.material instanceof BABYLON.StandardMaterial)) {
                            var material = node.material;
                            if (!BABYLON.Tags.HasTags(material) || !BABYLON.Tags.MatchesQuery(material, "furShellMaterial")) {
                                if (material instanceof BABYLON.MultiMaterial) {
                                    for (var materialIndex = 0; materialIndex < material.subMaterials.length; materialIndex++) {
                                        var subMaterial = material.subMaterials[materialIndex];
                                        if (!(subMaterial instanceof BABYLON.StandardMaterial)) {
                                            var matObj = {
                                                meshesNames: [node.name],
                                                newInstance: true,
                                                serializedValues: subMaterial.serialize()
                                            };
                                            this._ConfigureMaterial(material, matObj);
                                            project.materials.push(matObj);
                                            this._RequestMaterial(core, project, subMaterial);
                                        }
                                    }
                                }
                                var serializedMaterial = this._GetSerializedMaterial(project, material.name);
                                if (serializedMaterial) {
                                    serializedMaterial.meshesNames.push(node.name);
                                }
                                else {
                                    var matObj = {
                                        meshesNames: [node.name],
                                        newInstance: true,
                                        serializedValues: material.serialize()
                                    };
                                    this._ConfigureMaterial(material, matObj);
                                    project.materials.push(matObj);
                                    this._RequestMaterial(core, project, material);
                                }
                            }
                        }
                        // Check modified nodes
                        var nodeObj = {
                            name: node instanceof BABYLON.Scene ? "Scene" : node.name,
                            id: node instanceof BABYLON.Scene ? "Scene" : node instanceof BABYLON.Sound ? "Sound" : node.id,
                            type: node instanceof BABYLON.Scene ? "Scene"
                                : node instanceof BABYLON.Sound ? "Sound"
                                    : node instanceof BABYLON.Light ? "Light"
                                        : node instanceof BABYLON.Camera ? "Camera"
                                            : "Mesh",
                            animations: []
                        };
                        var addNodeObj = false;
                        if (BABYLON.Tags.HasTags(node)) {
                            if (BABYLON.Tags.MatchesQuery(node, "added_particlesystem"))
                                addNodeObj = true;
                            if (BABYLON.Tags.MatchesQuery(node, "added")) {
                                addNodeObj = true;
                                if (node instanceof BABYLON.Mesh) {
                                    nodeObj.serializationObject = BABYLON.SceneSerializer.SerializeMesh(node, false, false);
                                    for (var meshIndex = 0; meshIndex < nodeObj.serializationObject.meshes.length; meshIndex++) {
                                        delete nodeObj.serializationObject.meshes[meshIndex].animations;
                                        delete nodeObj.serializationObject.meshes[meshIndex].actions;
                                    }
                                }
                                else {
                                    nodeObj.serializationObject = node.serialize();
                                    delete nodeObj.serializationObject.animations;
                                }
                                delete nodeObj.serializationObject.animations;
                            }
                        }
                        // Shadow generators
                        if (node instanceof BABYLON.Light) {
                            var shadows = node.getShadowGenerator();
                            if (shadows && BABYLON.Tags.HasTags(shadows) && BABYLON.Tags.MatchesQuery(shadows, "added"))
                                project.shadowGenerators.push(node.getShadowGenerator().serialize());
                        }
                        // Check animations
                        if (node.animations) {
                            var animatable = node;
                            for (var animIndex = 0; animIndex < animatable.animations.length; animIndex++) {
                                var animation = animatable.animations[animIndex];
                                if (!BABYLON.Tags.HasTags(animation) || !BABYLON.Tags.MatchesQuery(animation, "modified"))
                                    continue;
                                addNodeObj = true;
                                // Add values
                                var animObj = {
                                    events: [],
                                    serializationObject: animation.serialize(),
                                    targetName: node instanceof BABYLON.Scene ? "Scene" : node.name,
                                    targetType: node instanceof BABYLON.Scene ? "Scene" : node instanceof BABYLON.Sound ? "Sound" : "Node",
                                };
                                // Setup events
                                /*
                                var keys = animation.getKeys();
                                for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
                                    var events: INTERNAL.IAnimationEvent[] = keys[keyIndex].events;
    
                                    if (!events)
                                        continue;
    
                                    animObj.events.push({
                                        events: events,
                                        frame: keys[keyIndex].frame
                                    });
                                }
                                */
                                // Add
                                nodeObj.animations.push(animObj);
                            }
                        }
                        // Actions
                        if (node instanceof BABYLON.AbstractMesh)
                            nodeObj.actions = this._SerializeActionManager(node);
                        // Add
                        if (addNodeObj) {
                            project.nodes.push(nodeObj);
                        }
                    }
                    if (node instanceof BABYLON.Node) {
                        for (var i = 0; i < node.getDescendants().length; i++) {
                            this._TraverseNodes(core, node.getDescendants()[i], project);
                        }
                    }
                }
            };
            // Serializes action manager of an object or scene
            // Returns null if does not exists or not added from the editor
            ProjectExporter._SerializeActionManager = function (object) {
                if (object.actionManager && BABYLON.Tags.HasTags(object.actionManager) && BABYLON.Tags.MatchesQuery(object.actionManager, "added")) {
                    return object.actionManager.serialize(object instanceof BABYLON.Scene ? "Scene" : object.name);
                }
                return null;
            };
            // Serializes the custom metadatas, largely used by plugins like post-process builder
            // plugin.
            ProjectExporter._SerializeCustomMetadatas = function () {
                var dict = {};
                for (var thing in EDITOR.SceneManager._CustomMetadatas) {
                    dict[thing] = EDITOR.SceneManager._CustomMetadatas[thing];
                }
                return dict;
            };
            // Setups the requested materials (to be uploaded in template or release)
            ProjectExporter._RequestMaterial = function (core, project, material) {
                if (!material || material instanceof BABYLON.StandardMaterial || material instanceof BABYLON.MultiMaterial || material instanceof BABYLON.PBRMaterial || !project.requestedMaterials)
                    return;
                var constructorName = material.constructor ? material.constructor.name : null;
                if (!constructorName)
                    return;
                var index = project.requestedMaterials.indexOf(constructorName);
                if (index === -1)
                    project.requestedMaterials.push(constructorName);
            };
            // Returns if a material has been already serialized
            ProjectExporter._GetSerializedMaterial = function (project, materialName) {
                for (var i = 0; i < project.materials.length; i++) {
                    if (project.materials[i].serializedValues.name === materialName)
                        return project.materials[i];
                }
                return null;
            };
            // Configures the material (configure base64 textures etc.)
            ProjectExporter._ConfigureMaterial = function (material, projectMaterial) {
                for (var thing in material) {
                    var value = material[thing];
                    if (!(value instanceof BABYLON.BaseTexture) || !projectMaterial.serializedValues[thing] || !value._buffer)
                        continue;
                    projectMaterial.serializedValues[thing].base64String = value._buffer;
                }
            };
            // Configures the texture (configure base64 texture)
            ProjectExporter._ConfigureBase64Texture = function (source, objectToConfigure) {
                for (var thing in source) {
                    var value = source[thing];
                    if (!(value instanceof BABYLON.BaseTexture) || !objectToConfigure[thing] || !value._buffer)
                        continue;
                    objectToConfigure[thing].base64String = value._buffer;
                }
                return objectToConfigure;
            };
            // Fills array of root nodes
            ProjectExporter._FillRootNodes = function (core, data, propertyPath) {
                var scene = core.currentScene;
                var nodes = scene[propertyPath];
                for (var i = 0; i < nodes.length; i++) {
                    if (!nodes[i].parent)
                        data.push(nodes[i]);
                }
            };
            return ProjectExporter;
        }());
        EDITOR.ProjectExporter = ProjectExporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ProjectImporter = (function () {
            function ProjectImporter() {
            }
            // Public members
            // None
            // Private members
            // None
            // Imports the project
            ProjectImporter.ImportProject = function (core, data) {
                var project = JSON.parse(data);
                EDITOR.Tools.CleanProject(project);
                // First, create the render targets (maybe used by the materials)
                // (serialized materials will be able to retrieve the textures)
                for (var i = 0; i < project.renderTargets.length; i++) {
                    var rt = project.renderTargets[i];
                    if (rt.isProbe) {
                        var reflectionProbe = new BABYLON.ReflectionProbe(rt.serializationObject.name, rt.serializationObject.size, core.currentScene, rt.serializationObject.generateMipMaps);
                        reflectionProbe._waitingRenderList = rt.serializationObject.renderList;
                        rt.waitingTexture = reflectionProbe;
                    }
                    else {
                        var texture = BABYLON.Texture.Parse(rt.serializationObject, core.currentScene, "./");
                        texture._waitingRenderList = undefined;
                        rt.waitingTexture = texture;
                        BABYLON.Tags.EnableFor(texture);
                        BABYLON.Tags.AddTagsTo(texture, "added");
                    }
                }
                // Second, create materials
                // (serialized meshes will be able to retrieve the materials)
                // Etc.
                for (var i = 0; i < project.materials.length; i++) {
                    var material = project.materials[i];
                    // For now, continue
                    // If no customType, the changes can be done in the modeler (3ds Max, Blender, Unity3D, etc.)
                    if (!material.newInstance || !material.serializedValues.customType)
                        continue;
                    var materialType = BABYLON.Tools.Instantiate(material.serializedValues.customType);
                    material._babylonMaterial = materialType.Parse(material.serializedValues, core.currentScene, "file:");
                }
                // Sounds
                for (var i = 0; i < project.sounds.length; i++) {
                    var sound = BABYLON.Sound.Parse(project.sounds[i].serializationObject, core.currentScene, "");
                    sound.name = project.sounds[i].name;
                    BABYLON.Tags.EnableFor(sound);
                    BABYLON.Tags.AddTagsTo(sound, "added");
                }
                // Parse the nodes
                for (var i = 0; i < project.nodes.length; i++) {
                    var node = project.nodes[i];
                    var newNode = null;
                    switch (node.type) {
                        case "Mesh":
                        case "Light":
                        case "Camera":
                            if (node.serializationObject) {
                                if (node.type === "Mesh") {
                                    var vertexDatas = node.serializationObject.geometries.vertexData;
                                    for (var vertexDataIndex = 0; vertexDataIndex < vertexDatas.length; vertexDataIndex++) {
                                        BABYLON.Geometry.Parse(vertexDatas[vertexDataIndex], core.currentScene, "./");
                                    }
                                    var meshes = node.serializationObject.meshes;
                                    for (var meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
                                        newNode = BABYLON.Mesh.Parse(meshes[meshIndex], core.currentScene, "./");
                                        BABYLON.Tags.EnableFor(newNode);
                                    }
                                }
                                else if (node.type === "Light") {
                                    newNode = BABYLON.Light.Parse(node.serializationObject, core.currentScene);
                                }
                                else if (node.type === "Camera") {
                                    newNode = BABYLON.Camera.Parse(node.serializationObject, core.currentScene);
                                }
                            }
                            else {
                                newNode = core.currentScene.getNodeByName(node.name);
                            }
                            break;
                        case "Scene":
                            newNode = core.currentScene;
                            break;
                        default:
                            continue;
                    }
                    // Check particles system
                    if (!newNode) {
                        for (var psIndex = 0; psIndex < project.particleSystems.length; psIndex++) {
                            var ps = project.particleSystems[psIndex];
                            if (!ps.hasEmitter && node.id && ps.serializationObject && ps.serializationObject.emitterId === node.id) {
                                newNode = new BABYLON.Mesh(node.name, core.currentScene, null, null, true);
                                newNode.id = node.id;
                                BABYLON.Tags.EnableFor(newNode);
                                BABYLON.Tags.AddTagsTo(newNode, "added_particlesystem");
                                break;
                            }
                        }
                    }
                    if (!newNode) {
                        BABYLON.Tools.Warn("Cannot configure node named " + node.name + " , with ID " + node.id);
                        continue;
                    }
                    // Animations
                    if (node.animations.length > 0 && !newNode.animations)
                        newNode.animations = [];
                    for (var animationIndex = 0; animationIndex < node.animations.length; animationIndex++) {
                        var animation = node.animations[animationIndex];
                        var newAnimation = BABYLON.Animation.Parse(animation.serializationObject);
                        newNode.animations.push(newAnimation);
                        BABYLON.Tags.EnableFor(newAnimation);
                        BABYLON.Tags.AddTagsTo(newAnimation, "modified");
                    }
                    // Actions
                    if (newNode instanceof BABYLON.AbstractMesh) {
                        var oldActionManager = newNode.actionManager;
                        if (node.actions) {
                            BABYLON.ActionManager.Parse(node.actions, newNode, core.currentScene);
                            BABYLON.Tags.EnableFor(newNode.actionManager);
                            BABYLON.Tags.AddTagsTo(newNode.actionManager, "added");
                            if (EDITOR.SceneManager._ConfiguredObjectsIDs[newNode.id])
                                EDITOR.SceneManager._ConfiguredObjectsIDs[newNode.id].actionManager = newNode.actionManager;
                            newNode.actionManager = oldActionManager; // Created by the editor
                        }
                        // Register node
                        if (!EDITOR.SceneManager._ConfiguredObjectsIDs[newNode.id]) {
                            EDITOR.SceneManager.ConfigureObject(newNode, core);
                        }
                    }
                }
                // Particle systems
                for (var i = 0; i < project.particleSystems.length; i++) {
                    var ps = project.particleSystems[i];
                    var newPs = BABYLON.ParticleSystem.Parse(ps.serializationObject, core.currentScene, "./");
                    var buffer = ps.serializationObject.base64Texture;
                    newPs.particleTexture = BABYLON.Texture.CreateFromBase64String(ps.serializationObject.base64Texture, ps.serializationObject.base64TextureName, core.currentScene);
                    newPs.particleTexture.name = newPs.particleTexture.name.replace("data:", "");
                    if (!ps.hasEmitter && ps.emitterPosition)
                        newPs.emitter.position = BABYLON.Vector3.FromArray(ps.emitterPosition);
                    newPs.emitter.attachedParticleSystem = newPs;
                }
                // Lens flares
                for (var i = 0; i < project.lensFlares.length; i++) {
                    var lf = project.lensFlares[i];
                    var newLf = BABYLON.LensFlareSystem.Parse(lf.serializationObject, core.currentScene, "./");
                    for (var i = 0; i < newLf.lensFlares.length; i++) {
                        var flare = lf.serializationObject.flares[i];
                        newLf.lensFlares[i].texture = BABYLON.Texture.CreateFromBase64String(flare.base64Buffer, flare.base64Name.replace("data:", ""), core.currentScene);
                    }
                }
                // Shadow generators
                for (var i = 0; i < project.shadowGenerators.length; i++) {
                    var shadows = project.shadowGenerators[i];
                    var newShadowGenerator = BABYLON.ShadowGenerator.Parse(shadows, core.currentScene);
                    BABYLON.Tags.EnableFor(newShadowGenerator);
                    BABYLON.Tags.AddTagsTo(newShadowGenerator, "added");
                    newShadowGenerator.getShadowMap().renderList.some(function (value, index, array) {
                        if (!value) {
                            array.splice(index, 1);
                            return true;
                        }
                        return false;
                    });
                }
                // Actions
                if (project.actions) {
                    BABYLON.ActionManager.Parse(project.actions, null, core.currentScene);
                    BABYLON.Tags.EnableFor(core.currentScene.actionManager);
                    BABYLON.Tags.AddTagsTo(core.currentScene.actionManager, "added");
                    EDITOR.SceneManager._SceneConfiguration.actionManager = core.currentScene.actionManager;
                }
                // Set global animations
                EDITOR.SceneFactory.AnimationSpeed = project.globalConfiguration.globalAnimationSpeed;
                EDITOR.GUIAnimationEditor.FramesPerSecond = project.globalConfiguration.framesPerSecond || EDITOR.GUIAnimationEditor.FramesPerSecond;
                core.editor.sceneToolbar.setFramesPerSecond(EDITOR.GUIAnimationEditor.FramesPerSecond);
                for (var i = 0; i < project.globalConfiguration.animatedAtLaunch.length; i++) {
                    var animated = project.globalConfiguration.animatedAtLaunch[i];
                    switch (animated.type) {
                        case "Scene":
                            EDITOR.SceneFactory.NodesToStart.push(core.currentScene);
                            break;
                        case "Node":
                            EDITOR.SceneFactory.NodesToStart.push(core.currentScene.getNodeByName(animated.name));
                            break;
                        case "Sound":
                            EDITOR.SceneFactory.NodesToStart.push(core.currentScene.getSoundByName(animated.name));
                            break;
                        case "ParticleSystem":
                            EDITOR.SceneFactory.NodesToStart.push(EDITOR.Tools.GetParticleSystemByName(core.currentScene, animated.name));
                            break;
                        default: break;
                    }
                }
                // Post processes
                for (var i = 0; i < project.postProcesses.length; i++) {
                    var pp = project.postProcesses[i];
                    if (EDITOR.SceneFactory["Create" + pp.name]) {
                        var newPp = EDITOR.SceneFactory["Create" + pp.name](core, pp.serializationObject);
                        if (pp.attach !== undefined && !pp.attach) {
                            newPp._detachCameras(core.currentScene.cameras);
                        }
                    }
                }
                // Render tagets, fill waiting renderlists
                for (var i = 0; i < project.renderTargets.length; i++) {
                    var rt = project.renderTargets[i];
                    if (rt.isProbe && rt.serializationObject.attachedMeshId) {
                        rt.waitingTexture.attachToMesh(core.currentScene.getMeshByID(rt.serializationObject.attachedMeshId));
                    }
                    for (var renderId = 0; renderId < rt.serializationObject.renderList.length; renderId++) {
                        var obj = core.currentScene.getMeshByID(rt.serializationObject.renderList[renderId]);
                        if (obj)
                            rt.waitingTexture.renderList.push(obj);
                    }
                }
                // Set materials
                for (var i = 0; i < project.materials.length; i++) {
                    var material = project.materials[i];
                    if (!material.meshesNames || !material.serializedValues.customType)
                        continue;
                    var meshesNames = project.materials[i].meshesNames;
                    for (var meshName = 0; meshName < meshesNames.length; meshName++) {
                        var mesh = core.currentScene.getMeshByName(meshesNames[meshName]);
                        if (mesh)
                            mesh.material = project.materials[i]._babylonMaterial;
                    }
                }
                // Custom metadatas
                for (var thing in project.customMetadatas) {
                    EDITOR.SceneManager.AddCustomMetadata(thing, project.customMetadatas[thing]);
                }
            };
            return ProjectImporter;
        }());
        EDITOR.ProjectImporter = ProjectImporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var StorageExporter = (function () {
            /**
            * Constructor
            */
            function StorageExporter(core, storageType) {
                if (storageType === void 0) { storageType = StorageExporter.OneDriveStorage; }
                this._window = null;
                this._filesList = null;
                this._currentChildrenFolder = null;
                this._currentFolder = null;
                this._previousFolders = null;
                this._onFolderSelected = null;
                this._statusBarId = "ONE-DRIVE-STATUS-BAR";
                // Initialize
                this.core = core;
                core.eventReceivers.push(this);
                this._storage = new BABYLON.EDITOR[storageType](this.core);
            }
            Object.defineProperty(StorageExporter, "OneDriveStorage", {
                // Static members
                get: function () {
                    return "OneDriveStorage";
                },
                enumerable: true,
                configurable: true
            });
            // On event received
            StorageExporter.prototype.onEvent = function (event) {
                var _this = this;
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.caller === this._filesList && event.guiEvent.eventType === EDITOR.GUIEventType.GRID_SELECTED) {
                    var selected = this._filesList.getSelectedRows()[0];
                    var current = this._filesList.getRow(selected);
                    if (current.type === "folder") {
                        var folder = this._getFileFolder(current.name, "folder", this._currentChildrenFolder);
                        this._previousFolders.push(this._currentFolder);
                        this._updateFolderDialog(folder);
                    }
                    else if (current.type === "previous") {
                        var previousFolder = this._previousFolders.pop();
                        this._updateFolderDialog(previousFolder);
                    }
                    return true;
                }
                else if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.caller === this._window && event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED) {
                    var button = event.guiEvent.data;
                    var selectedRows = this._filesList.getSelectedRows();
                    if (button === "Choose" && this._currentFolder) {
                        this._storage.getFiles(this._currentFolder, function (children) {
                            _this._onFolderSelected(_this._currentFolder, children);
                        });
                    }
                    this._window.close();
                    return true;
                }
                return false;
            };
            // Creates a template
            StorageExporter.prototype.createTemplate = function () {
                var _this = this;
                this._openFolderDialog(function (folder, folderChildren) {
                    // Status bar
                    _this.core.editor.statusBar.addElement(_this._statusBarId, "Exporting Template...", "icon-one-drive");
                    _this.core.editor.statusBar.showSpinner(_this._statusBarId);
                    StorageExporter._projectFolder = folder;
                    StorageExporter._projectFolderChildren = folderChildren;
                    // Dont replace or rename already existing folders
                    var folders = ["Materials", "Textures", "js", "Scene", "defines"];
                    for (var i = 0; i < folderChildren.length; i++) {
                        var folderIndex = folders.indexOf(folderChildren[i].name);
                        if (folderIndex !== -1)
                            folders.splice(folderIndex, 1);
                    }
                    if (folders.length === 0)
                        _this._createTemplate();
                    else {
                        _this._storage.createFolders(folders, folder, function () {
                            _this._createTemplate();
                        }, function () {
                            _this.core.editor.statusBar.removeElement(_this._statusBarId);
                        });
                    }
                });
            };
            // Exports
            StorageExporter.prototype.export = function () {
                var _this = this;
                if (!StorageExporter._projectFolder) {
                    this._openFolderDialog(function (folder, folderChildren) {
                        StorageExporter._projectFolder = folder;
                        StorageExporter._projectFolderChildren = folderChildren;
                        _this.export();
                    });
                    return;
                }
                if (EDITOR.Tools.CheckIfElectron())
                    this.core.editor.statusBar.addElement(this._statusBarId, "Exporting...", "icon-save");
                else
                    this.core.editor.statusBar.addElement(this._statusBarId, "Exporting...", "icon-one-drive");
                this.core.editor.statusBar.showSpinner(this._statusBarId);
                this._updateFileList(function () {
                    var files = [
                        { name: "scene.editorproject", content: EDITOR.ProjectExporter.ExportProject(_this.core) }
                    ];
                    _this._storage.createFiles(files, StorageExporter._projectFolder, function () {
                        _this.core.editor.statusBar.removeElement(_this._statusBarId);
                    });
                });
            };
            // Returns the folder object from its name
            StorageExporter.prototype.getFolder = function (name) {
                return this._getFileFolder(name, "folder", StorageExporter._projectFolderChildren);
            };
            // Returns the file object from its name
            StorageExporter.prototype.getFile = function (name) {
                return this._getFileFolder(name, "file", StorageExporter._projectFolderChildren);
            };
            // Creates the template with all files
            StorageExporter.prototype._createTemplate = function () {
                var _this = this;
                this._updateFileList(function () {
                    // Files
                    var files = [];
                    //var url = window.location.href;
                    //url = url.replace(BABYLON.Tools.GetFilename(url), "");
                    var url = EDITOR.Tools.GetBaseURL();
                    var projectContent = EDITOR.ProjectExporter.ExportProject(_this.core, true);
                    var project = JSON.parse(projectContent);
                    var sceneFolder = _this.getFolder("Scene");
                    // Files already loaded
                    //files.push({ name: "scene.js", content: projectContent });
                    //files.push({ name: "template.js", content: Exporter.ExportCode(this.core), parentFolder: this.getFolder("js").file });
                    var sceneToLoad = _this.core.editor.filesInput._sceneFileToLoad;
                    files.push({ name: sceneToLoad ? sceneToLoad.name : "scene.babylon", content: JSON.stringify(EDITOR.BabylonExporter.GenerateFinalBabylonFile(_this.core)), parentFolder: sceneFolder.file });
                    files.push({ name: "scene.editorproject", content: JSON.stringify(project), parentFolder: sceneFolder.file });
                    files.push({ name: "extensions.editorextensions", content: JSON.stringify(project.customMetadatas), parentFolder: sceneFolder.file });
                    // Lens flare textures
                    for (var i = 0; i < project.lensFlares.length; i++) {
                        var lf = project.lensFlares[i].serializationObject;
                        for (var j = 0; j < lf.flares.length; j++) {
                            if (!_this._fileExists(files, lf.flares[j].base64Name, sceneFolder)) {
                                files.push({
                                    name: lf.flares[j].base64Name,
                                    content: EDITOR.Tools.ConvertBase64StringToArrayBuffer(lf.flares[j].base64Buffer),
                                    parentFolder: sceneFolder.file
                                });
                            }
                        }
                    }
                    // Particle system textures
                    for (var i = 0; i < project.particleSystems.length; i++) {
                        var ps = project.particleSystems[i].serializationObject;
                        if (!_this._fileExists(files, ps.base64TextureName, sceneFolder)) {
                            files.push({
                                name: ps.base64TextureName,
                                content: EDITOR.Tools.ConvertBase64StringToArrayBuffer(ps.base64Texture),
                                parentFolder: sceneFolder.file
                            });
                        }
                    }
                    // Textures
                    if (EDITOR.SceneFactory.HDRPipeline && EDITOR.SceneFactory.HDRPipeline.lensTexture) {
                        var lensTextureName = EDITOR.SceneFactory.HDRPipeline.lensTexture.name;
                        //files.push({ name: lensTextureName, url: url + "Textures/" + lensTextureName, content: null, parentFolder: this.getFolder("Textures").file, type: "arraybuffer" });
                        files.push({
                            name: lensTextureName,
                            content: EDITOR.Tools.ConvertBase64StringToArrayBuffer(EDITOR.SceneFactory.HDRPipeline.lensTexture._buffer),
                            parentFolder: _this.getFolder("Textures").file
                        });
                    }
                    // Files to load
                    var count = files.length;
                    files.push({ name: "index.html", url: url + "templates/index.html", content: null });
                    files.push({ name: "Web.config", url: url + "templates/Template.xml", content: null });
                    files.push({ name: "babylon.max.js", url: url + "libs/preview bjs/babylon.max.js", content: null, parentFolder: _this.getFolder("js").file });
                    files.push({ name: "babylon.editor.extensions.js", url: url + "libs/preview release/babylon.editor.extensions.js", content: null, parentFolder: _this.getFolder("js").file });
                    //files.push({ name: "babylon.d.ts", url: url + "../defines/babylon.d.ts", content: null, parentFolder: this.getFolder("defines").file });
                    //files.push({ name: "babylon.d.ts", url: url + "../Tools/EditorExtensions/babylon.editor.extensions.d.ts", content: null, parentFolder: this.getFolder("defines").file });
                    // Materials
                    for (var i = 0; i < project.requestedMaterials.length; i++) {
                        var name = "babylon." + project.requestedMaterials[i] + ".js";
                        files.push({ name: name, url: url + "libs/materials/" + name, content: null, parentFolder: _this.getFolder("Materials").file });
                    }
                    // Load files
                    var loadCallback = function (indice) {
                        return function (data) {
                            count++;
                            if (indice >= 0) {
                                if (files[indice].name === "index.html") {
                                    data = _this._processIndexHTML(project, data);
                                }
                                files[indice].content = data;
                            }
                            if (count >= files.length) {
                                _this._storage.createFiles(files, StorageExporter._projectFolder, function () {
                                    _this.core.editor.statusBar.removeElement(_this._statusBarId);
                                }, function (message) {
                                    _this.core.editor.statusBar.removeElement(_this._statusBarId);
                                }, function (count) {
                                    _this.core.editor.statusBar.setText(_this._statusBarId, "Exporting Template... " + count + " / " + files.length);
                                });
                            }
                        };
                    };
                    if (count === files.length) {
                        // No files to load
                        loadCallback(-1)(null);
                    }
                    else {
                        // Files from server
                        for (var i = 0; i < files.length; i++) {
                            if (files[i].url)
                                BABYLON.Tools.LoadFile(files[i].url, loadCallback(i), null, null, files[i].type === "arraybuffer");
                        }
                        // Files from FilesInput
                        for (var textureName in BABYLON.FilesInput.FilesTextures) {
                            files.push({ name: textureName, content: null, parentFolder: sceneFolder.file });
                            BABYLON.Tools.ReadFile(BABYLON.FilesInput.FilesTextures[textureName], loadCallback(files.length - 1), null, true);
                        }
                        for (var fileName in BABYLON.FilesInput.FilesToLoad) {
                            files.push({ name: fileName, content: null, parentFolder: sceneFolder.file });
                            BABYLON.Tools.ReadFile(BABYLON.FilesInput.FilesToLoad[fileName], loadCallback(files.length - 1), null, true);
                        }
                    }
                });
            };
            // Returns true if a file exists
            StorageExporter.prototype._fileExists = function (files, name, parent) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].name === name && files[i].parentFolder === parent.file) {
                        return true;
                    }
                }
                return false;
            };
            // Processes the index.html file
            StorageExporter.prototype._processIndexHTML = function (project, content) {
                var finalString = content;
                var scripts = "";
                for (var i = 0; i < project.requestedMaterials.length; i++) {
                    scripts += "\t<script src=\"Materials/babylon." + project.requestedMaterials[i] + ".js\" type=\"text/javascript\"></script>\n";
                }
                var sceneToLoad = this.core.editor.filesInput._sceneFileToLoad;
                finalString = finalString.replace("EXPORTER-SCENE-NAME", sceneToLoad ? sceneToLoad.name : "scene.babylon");
                finalString = finalString.replace("EXPORTER-JS-FILES-TO-ADD", scripts);
                return finalString;
            };
            // Creates the UI dialog to choose folder
            StorageExporter.prototype._openFolderDialog = function (success) {
                var _this = this;
                this._onFolderSelected = success;
                var gridID = "BABYLON-STORAGE-EXPORTER-GRID";
                var gridDiv = EDITOR.GUI.GUIElement.CreateElement("div", gridID);
                // Window
                this._window = new EDITOR.GUI.GUIWindow("BABYLON-STORAGE-EXPORTER-WINDOW", this.core, "Choose folder...", gridDiv);
                this._window.modal = true;
                this._window.showMax = false;
                this._window.buttons = [
                    "Choose",
                    "Cancel"
                ];
                this._window.setOnCloseCallback(function () {
                    _this.core.removeEventReceiver(_this);
                    _this._filesList.destroy();
                });
                this._window.buildElement(null);
                // Grid
                this._filesList = new EDITOR.GUI.GUIGrid(gridID, this.core);
                this._filesList.header = "Files and Folders";
                this._filesList.createColumn("name", "name", "80%");
                this._filesList.createColumn("type", "type", "20%");
                this._filesList.buildElement(gridID);
                // Finish
                this._previousFolders = [];
                this._updateFolderDialog();
            };
            // Gets a list of files and folders
            StorageExporter.prototype._updateFolderDialog = function (folder) {
                var _this = this;
                if (folder === void 0) { folder = null; }
                this._filesList.lock("Loading...", true);
                this._filesList.clear();
                this._currentFolder = folder;
                this._filesList.addRow({
                    name: "..",
                    type: "previous",
                    recid: 0
                });
                this._storage.getFiles(folder, function (children) {
                    _this._currentChildrenFolder = children;
                    for (var i = 0; i < children.length; i++) {
                        _this._filesList.addRow({
                            name: children[i].name,
                            type: children[i].file.folder ? "folder" : "file",
                            recid: i + 1
                        });
                    }
                    _this._filesList.unlock();
                }, function () {
                    _this._filesList.unlock();
                });
            };
            // Updates the file list
            StorageExporter.prototype._updateFileList = function (onSuccess) {
                // Update files list and create files
                this._storage.getFiles(StorageExporter._projectFolder, function (children) {
                    StorageExporter._projectFolderChildren = children;
                    onSuccess();
                });
            };
            // Returns the appropriate child from its name and its type
            StorageExporter.prototype._getFileFolder = function (name, type, files) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].file.name === name && files[i].file[type])
                        return files[i];
                }
                return {
                    file: null,
                    name: ""
                };
            };
            // Locks the panel
            StorageExporter.prototype._lockPanel = function (message) {
                this.core.editor.layouts.setPanelSize("bottom", 0);
                this.core.editor.layouts.lockPanel("bottom", message, true);
            };
            // Unlocks the panel
            StorageExporter.prototype._unlockPanel = function () {
                this.core.editor.layouts.setPanelSize("bottom", 0);
                this.core.editor.layouts.unlockPanel("bottom");
            };
            // Static members
            StorageExporter._projectFolder = null;
            StorageExporter._projectFolderChildren = null;
            return StorageExporter;
        }());
        EDITOR.StorageExporter = StorageExporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EContextMenuID;
        (function (EContextMenuID) {
            EContextMenuID[EContextMenuID["COPY"] = 0] = "COPY";
            EContextMenuID[EContextMenuID["PASTE"] = 1] = "PASTE";
            EContextMenuID[EContextMenuID["PASTE_KEYS"] = 2] = "PASTE_KEYS";
        })(EContextMenuID || (EContextMenuID = {}));
        var GUIAnimationEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function GUIAnimationEditor(core, object) {
                // Public members
                this.core = null;
                // Private members
                this._animationsList = null;
                this._keysList = null;
                this._valuesForm = null;
                this._currentAnimation = null;
                this._currentKey = null;
                this._addAnimationWindow = null;
                this._addAnimationLayout = null;
                this._addAnimationGraph = null;
                this._addAnimationForm = null;
                this._addAnimationName = "New Animation";
                this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE;
                this._addAnimationTypeName = "Cycle";
                this._editedAnimation = null;
                this._graphPaper = null;
                this._graphLines = [];
                this._graphValueTexts = [];
                this._graphMiddleLine = null;
                this._graphTimeLines = [];
                this._graphTimeTexts = [];
                // Initialize
                this.core = core;
                this.core.eventReceivers.push(this);
                this.object = object;
                this.core.editor.editPanel.close();
                this._createUI();
            }
            // Event receiver
            GUIAnimationEditor.prototype.onEvent = function (event) {
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                // Window
                if (event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED && event.guiEvent.caller === this._addAnimationWindow) {
                    var button = event.guiEvent.data;
                    if (button === "Cancel") {
                        this._addAnimationWindow.close();
                        return true;
                    }
                    this._onAddAnimation();
                    return true;
                }
                // Animations list
                if (event.guiEvent.caller === this._animationsList) {
                    this._setRecords(0, "");
                    return true;
                }
                else if (event.guiEvent.caller === this._keysList && this._currentAnimation !== null) {
                    this.core.editor.timeline.reset();
                    return true;
                }
                return false;
            };
            // Creates an animation
            GUIAnimationEditor.prototype._createAnimation = function () {
                var _this = this;
                if (this._editedAnimation) {
                    this._addAnimationName = this._editedAnimation.name;
                    this._addAnimationTypeName = "Cycle";
                    switch (this._addAnimationType) {
                        case BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE:
                            this._addAnimationTypeName = "Relative";
                            break;
                        case BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT:
                            this._addAnimationTypeName = "Constant";
                            break;
                        default: break;
                    }
                }
                // HTML elements
                var layoutID = "BABYLON-EDITOR-EDIT-ANIMATIONS-ADD";
                var graphID = "BABYLON-EDITOR-EDIT-ANIMATIONS-ADD-GRAPH";
                var editID = "BABYLON-EDITOR-EDIT-ANIMATIONS-ADD-EDIT";
                var layoutDiv = EDITOR.GUI.GUIElement.CreateDivElement(layoutID, "width: 100%; height: 100%;");
                // Window
                this._addAnimationWindow = new EDITOR.GUI.GUIWindow("AddAnimation", this.core, "Add Animation", layoutDiv, new BABYLON.Vector2(800, 600));
                this._addAnimationWindow.modal = true;
                this._addAnimationWindow.showClose = true;
                this._addAnimationWindow.showMax = false;
                this._addAnimationWindow.buttons = ["Apply", "Cancel"];
                this._addAnimationWindow.buildElement(null);
                this._addAnimationWindow.setOnCloseCallback(function () {
                    _this._addAnimationWindow.destroy();
                    _this._addAnimationGraph.destroy();
                    _this._addAnimationLayout.destroy();
                });
                // Layout
                var leftDiv = EDITOR.GUI.GUIElement.CreateElement("div", graphID);
                var rightDiv = EDITOR.GUI.GUIElement.CreateElement("div", editID);
                this._addAnimationLayout = new EDITOR.GUI.GUILayout(layoutID, this.core);
                this._addAnimationLayout.createPanel(leftDiv, "left", 380, false).setContent(leftDiv);
                this._addAnimationLayout.createPanel(rightDiv, "main", 380, false).setContent(rightDiv);
                this._addAnimationLayout.buildElement(layoutID);
                // Edit element
                this._addAnimationForm = new EDITOR.GUI.GUIEditForm(editID, this.core);
                this._addAnimationForm.buildElement(editID);
                this._addAnimationForm.add(this, "_addAnimationName").name("Name");
                this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE;
                this._addAnimationForm.add(this, "_addAnimationTypeName", ["Cycle", "Relative", "Constant"], "Loop Mode").onFinishChange(function (result) {
                    switch (result) {
                        case "Relative":
                            _this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE;
                            break;
                        case "Cycle":
                            _this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE;
                            break;
                        case "Constant":
                            _this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT;
                            break;
                        default: break;
                    }
                });
                // Graph
                this._addAnimationGraph = new EDITOR.GUI.GUIGraph(graphID, this.core);
                this._addAnimationGraph.buildElement(graphID);
                var types = [
                    "Vector4", "Vector3", "Vector2",
                    "Color4", "Color3",
                    "Number", "number",
                    "Boolean", "boolean"
                ];
                var instances = [
                    "Material", "ParticleSystem"
                ];
                // Fill Graph
                var addProperties = function (property, parentNode) {
                    for (var thing in property) {
                        var value = property[thing];
                        if (value === null || value === undefined)
                            continue;
                        // Check
                        var constructorName = EDITOR.Tools.GetConstructorName(value);
                        var canAdd = true;
                        if (thing[0] === "_" || types.indexOf(constructorName) === -1)
                            canAdd = false;
                        for (var i = 0; i < instances.length; i++) {
                            if (value instanceof BABYLON[instances[i]]) {
                                canAdd = true;
                            }
                        }
                        if (!canAdd)
                            continue;
                        // Add node
                        var icon = "icon-edit";
                        if (constructorName.indexOf("Vector") !== -1)
                            icon = "icon-position";
                        else if (constructorName.indexOf("Color") !== -1)
                            icon = "icon-effects";
                        else if (value instanceof BABYLON.Material)
                            icon = "icon-shaders";
                        else if (value instanceof BABYLON.ParticleSystem)
                            icon = "icon-particles";
                        var node = _this._addAnimationGraph.createNode(EDITOR.SceneFactory.GenerateUUID(), thing, icon, value);
                        _this._addAnimationGraph.addNodes(node, parentNode);
                        addProperties(value, node.id);
                    }
                };
                addProperties(this.object, "");
            };
            // Returns the effective target
            GUIAnimationEditor.prototype._getEffectiveTarget = function (value) {
                var effectiveTarget = this.object;
                for (var i = 0; i < this._currentAnimation.targetPropertyPath.length - (value ? 1 : 0); i++) {
                    effectiveTarget = effectiveTarget[this._currentAnimation.targetPropertyPath[i]];
                }
                if (value) {
                    effectiveTarget[this._currentAnimation.targetPropertyPath[this._currentAnimation.targetPropertyPath.length - 1]] = value;
                }
                return effectiveTarget;
            };
            // Gets frame time (min,s,ms)
            GUIAnimationEditor.prototype._getFrameTime = function (frame) {
                if (frame === 0)
                    return "0mins 0secs";
                var fps = this._currentAnimation.framePerSecond;
                var seconds = frame / fps;
                var mins = BABYLON.Tools.Format(Math.floor(seconds / 60), 0);
                var secs = BABYLON.Tools.Format(seconds % 60, 1);
                return "" + mins + "mins " + secs + "secs";
            };
            // Sets the records
            GUIAnimationEditor.prototype._setRecords = function (frame, value) {
                this._valuesForm.setRecord("frame", frame.toString());
                this._valuesForm.setRecord("value", this._getFrameValue());
                this._valuesForm.refresh();
            };
            // Sets the frame value and returns if the frame changed
            GUIAnimationEditor.prototype._setFrameValue = function () {
                var frame = this._valuesForm.getRecord("frame");
                var value = this._valuesForm.getRecord("value");
                var changedFrame = false;
                var frameValue = parseFloat(frame);
                if (this._currentKey.frame !== frameValue)
                    changedFrame = true;
                this._currentKey.frame = frameValue;
                if (typeof this._currentKey.value === "number" || typeof this._currentKey.value === "boolean") {
                    this._currentKey.value = parseFloat(value);
                }
                else {
                    var ctr = EDITOR.Tools.GetConstructorName(this._currentKey.value);
                    if (BABYLON[ctr] && BABYLON[ctr].FromArray) {
                        var spl = value.split(",");
                        var arr = [];
                        for (var i in spl) {
                            arr.push(parseFloat(spl[i]));
                        }
                        this._currentKey.value = BABYLON[ctr].FromArray(arr);
                    }
                }
                if (!BABYLON.Tags.HasTags(this._currentAnimation)) {
                    BABYLON.Tags.EnableFor(this._currentAnimation);
                }
                if (!BABYLON.Tags.MatchesQuery(this._currentAnimation, "modified")) {
                    BABYLON.Tags.AddTagsTo(this._currentAnimation, "modified");
                }
                return changedFrame;
            };
            // Gets the frame value
            GUIAnimationEditor.prototype._getFrameValue = function () {
                if (this._currentKey === null)
                    return "";
                var value = this._currentKey.value;
                if (typeof value === "number" || typeof value === "boolean")
                    return Number(value).toString();
                if (value.asArray) {
                    var arr = value.asArray();
                    return arr.toString();
                }
                return "";
            };
            // Configure graph
            GUIAnimationEditor.prototype._configureGraph = function () {
                var keys = this._currentAnimation.getKeys();
                var maxValue = 0;
                var getMaxValue = function (param) {
                    var value;
                    for (var i = 0; i < keys.length; i++) {
                        value = keys[i].value;
                        if (param)
                            value = value[param];
                        value = Math.abs(value);
                        if (value > maxValue)
                            maxValue = value;
                    }
                };
                var width = this._graphPaper.canvas.getBoundingClientRect().width;
                var height = this._graphPaper.canvas.getBoundingClientRect().height;
                var middle = height / 2;
                var maxFrame = keys[keys.length - 1].frame;
                var colorParameters = ["r", "g", "b"];
                var vectorParameters = ["x", "y", "z"];
                var currentParameters;
                var parametersCount = 1;
                // Reset lines
                for (var lineIndex = 0; lineIndex < this._graphLines.length; lineIndex++)
                    this._graphLines[lineIndex].attr("path", "");
                // Configure drawing and max values
                switch (this._currentAnimation.dataType) {
                    case BABYLON.Animation.ANIMATIONTYPE_VECTOR2:
                        parametersCount = 2;
                        getMaxValue("x");
                        getMaxValue("y");
                        currentParameters = vectorParameters;
                        break;
                    case BABYLON.Animation.ANIMATIONTYPE_VECTOR3:
                        parametersCount = 3;
                        getMaxValue("x");
                        getMaxValue("y");
                        getMaxValue("z");
                        currentParameters = vectorParameters;
                        break;
                    case BABYLON.Animation.ANIMATIONTYPE_COLOR3:
                        parametersCount = 3;
                        getMaxValue("r");
                        getMaxValue("g");
                        getMaxValue("b");
                        currentParameters = colorParameters;
                        break;
                    default:
                        getMaxValue();
                        break;
                }
                // Draw values
                this._graphValueTexts[0].attr("y", 10);
                this._graphValueTexts[0].attr("text", Math.floor(maxValue));
                this._graphValueTexts[1].attr("y", middle);
                this._graphValueTexts[1].attr("text", 0);
                this._graphValueTexts[2].attr("y", middle * 2 - 10);
                this._graphValueTexts[2].attr("text", -Math.floor(maxValue));
                // Draw middle line
                this._graphMiddleLine.attr("path", ["M", 0, middle, "L", this._graphPaper.canvas.getBoundingClientRect().width, middle]);
                // Draw time lines and texts
                for (var i = 0; i < 10; i++) {
                    var x = ((maxFrame / 10) * width) / maxFrame * (i + 1);
                    this._graphTimeLines[i].attr("path", ["M", x, 0, "L", x, middle * 2]);
                    this._graphTimeTexts[i].attr("text", Math.floor((x * maxFrame) / width));
                    this._graphTimeTexts[i].attr("y", height - 10);
                    this._graphTimeTexts[i].attr("x", x - this._graphTimeTexts[i].attr("width") * 2);
                }
                // Draw lines
                for (var lineIndex = 0; lineIndex < parametersCount; lineIndex++) {
                    var path = [];
                    for (var i = 0; i < keys.length; i++) {
                        var value = keys[i].value;
                        if (parametersCount > 1)
                            value = value[currentParameters[lineIndex]];
                        var frame = keys[i].frame;
                        var x = (frame * width) / maxFrame;
                        var y = middle;
                        if (value !== 0 && maxValue !== 0)
                            y += (value * middle) / (maxValue * (value > 0 ? 1 : -1)) * (value > 0 ? -1 : 1);
                        if (isNaN(x))
                            x = 0;
                        if (isNaN(y))
                            y = 0;
                        path.push(i === 0 ? "M" : "L");
                        path.push(x);
                        path.push(y);
                    }
                    this._graphLines[lineIndex].attr("path", path);
                }
            };
            // On selected animation
            GUIAnimationEditor.prototype._onSelectedAnimation = function () {
                var index = this._animationsList.getSelectedRows()[0];
                var animation = this.object.animations[index];
                var keys = animation.getKeys();
                this._currentAnimation = animation;
                this._currentKey = null;
                this._keysList.clear();
                for (var i = 0; i < keys.length; i++) {
                    this._keysList.addRecord({
                        key: keys[i].frame.toString(),
                        value: this._getFrameTime(keys[i].frame),
                        recid: i
                    });
                }
                this._keysList.refresh();
                this.core.editor.timeline.setFramesOfAnimation(animation);
                this._configureGraph();
            };
            // On add animation
            GUIAnimationEditor.prototype._onAddAnimation = function () {
                if (this._editedAnimation) {
                    var selectedRows = this._animationsList.getSelectedRows();
                    if (selectedRows.length > 0) {
                        this._animationsList.modifyRow(selectedRows[0], {
                            name: this._addAnimationName
                        });
                    }
                }
                var node = this._addAnimationGraph.getSelectedNode();
                if (!node)
                    return;
                // Build property
                var property = "";
                var data = node.data;
                data = (typeof data === "number" || typeof data === "boolean") ? data : data.clone();
                while (node.parent && node.text) {
                    property = node.text + (property === "" ? "" : "." + property);
                    node = node.parent;
                }
                // Create animation
                var constructorName = EDITOR.Tools.GetConstructorName(data);
                var dataType = -1;
                switch (constructorName.toLowerCase()) {
                    case "number":
                    case "boolean":
                        dataType = BABYLON.Animation.ANIMATIONTYPE_FLOAT;
                        break;
                    case "vector3":
                        dataType = BABYLON.Animation.ANIMATIONTYPE_VECTOR3;
                        break;
                    case "color3":
                    case "color4":
                        dataType = BABYLON.Animation.ANIMATIONTYPE_COLOR3;
                        break;
                    case "vector2":
                        dataType = BABYLON.Animation.ANIMATIONTYPE_VECTOR2;
                        break;
                    default: return;
                }
                var animation = new BABYLON.Animation(this._addAnimationName, property, GUIAnimationEditor.FramesPerSecond, dataType, this._addAnimationType);
                if (!this._editedAnimation) {
                    animation.setKeys([{
                            frame: 0,
                            value: data
                        }, {
                            frame: 1,
                            value: data
                        }]);
                    this.object.animations.push(animation);
                    this._animationsList.addRow({
                        name: this._addAnimationName
                    });
                }
                else {
                    animation.setKeys(this._editedAnimation.getKeys());
                    var selectedRows = this._animationsList.getSelectedRows();
                    if (selectedRows.length > 0) {
                        this.object.animations[selectedRows[0]] = animation;
                    }
                }
                // Finish
                if (!BABYLON.Tags.HasTags(animation) || !BABYLON.Tags.MatchesQuery(animation, "modified"))
                    BABYLON.Tags.AddTagsTo(animation, "modified");
                this.core.editor.timeline.reset();
                this._addAnimationWindow.close();
            };
            // On modify key
            GUIAnimationEditor.prototype._onModifyKey = function () {
                /*
                if (this._keysList.getSelectedRows().length <= 0)
                    return;
                */
                if (!this._currentKey)
                    return;
                var needRefresh = this._setFrameValue();
                var indice = this._keysList.getSelectedRows()[0];
                this._keysList.modifyRow(indice, { key: this._currentKey.frame, value: this._getFrameTime(this._currentKey.frame) });
                this.core.editor.timeline.reset();
                if (needRefresh) {
                    this._currentAnimation.getKeys().sort(function (a, b) {
                        return a.frame - b.frame;
                    });
                    var key = this._currentKey;
                    this._onSelectedAnimation();
                    this._currentKey = key;
                }
                else
                    this._configureGraph();
                this._keysList.setSelected([indice]);
            };
            // On animation menu selected
            GUIAnimationEditor.prototype._onAnimationMenuSelected = function (id) {
                if (id === EContextMenuID.COPY) {
                    GUIAnimationEditor._CopiedAnimations = [];
                    var selected = this._animationsList.getSelectedRows();
                    for (var i = 0; i < selected.length; i++) {
                        GUIAnimationEditor._CopiedAnimations.push(this.object.animations[selected[i]]);
                    }
                }
                else if (id === EContextMenuID.PASTE) {
                    for (var i = 0; i < GUIAnimationEditor._CopiedAnimations.length; i++) {
                        var anim = GUIAnimationEditor._CopiedAnimations[i];
                        var animKeys = anim.getKeys();
                        var animation = new BABYLON.Animation(anim.name, anim.targetPropertyPath.join("."), anim.framePerSecond, anim.dataType, anim.loopMode);
                        var keys = [];
                        for (var j = 0; j < animKeys.length; j++) {
                            keys.push({
                                frame: animKeys[j].frame,
                                value: animKeys[j].value
                            });
                        }
                        animation.setKeys(keys);
                        this.object.animations.push(animation);
                        BABYLON.Tags.AddTagsTo(animation, "modified");
                        this._animationsList.addRow({
                            name: anim.name
                        });
                    }
                }
                else if (id === EContextMenuID.PASTE_KEYS) {
                    var selected = this._animationsList.getSelectedRows();
                    if (GUIAnimationEditor._CopiedAnimations.length === 1 && selected.length === 1) {
                        var animation = this.object.animations[selected[0]];
                        var anim = GUIAnimationEditor._CopiedAnimations[0];
                        var keys = anim.getKeys();
                        var length = animation.getKeys().length;
                        for (var i = 0; i < keys.length; i++) {
                            animation.getKeys().push({
                                frame: keys[i].frame,
                                value: keys[i].value
                            });
                            this._keysList.addRow({
                                key: String(keys[i].frame),
                                value: this._getFrameTime(keys[i].frame),
                                recid: length
                            });
                            length++;
                        }
                    }
                }
            };
            // On delete animations
            GUIAnimationEditor.prototype._onDeleteAnimations = function () {
                var selected = this._animationsList.getSelectedRows();
                var offset = 0;
                for (var i = 0; i < selected.length; i++) {
                    this.object.animations.splice(selected[i] - offset, 1);
                    offset++;
                }
                this._keysList.clear();
                this.core.currentScene.stopAnimation(this.object);
            };
            // Onkey selected
            GUIAnimationEditor.prototype._onKeySelected = function () {
                var index = this._keysList.getSelectedRows()[0];
                var key = this._currentAnimation.getKeys()[index];
                this._currentKey = key;
                this._setRecords(key.frame, key.value);
                var effectiveTarget = this._getEffectiveTarget(this._currentKey.value);
            };
            // On add key
            GUIAnimationEditor.prototype._onAddKey = function () {
                var keys = this._currentAnimation.getKeys();
                var lastKey = keys[keys.length - 1];
                var frame = lastKey ? lastKey.frame + 1 : 0;
                var value = 0;
                var effectiveTarget = this._getEffectiveTarget();
                if (typeof effectiveTarget !== "number" && typeof effectiveTarget !== "boolean")
                    value = effectiveTarget.clone();
                else
                    value = effectiveTarget;
                keys.push({
                    frame: frame,
                    value: value
                });
                this._keysList.addRow({
                    key: String(frame),
                    value: this._getFrameTime(frame),
                    recid: keys.length - 1
                });
                // Reset list
                this._onSelectedAnimation();
            };
            // On remove key(s)
            GUIAnimationEditor.prototype._onRemoveKeys = function () {
                var selected = this._keysList.getSelectedRows();
                var keys = this._currentAnimation.getKeys();
                var offset = 0;
                for (var i = 0; i < selected.length; i++) {
                    var nextRow = this._keysList.getRow(selected[i + 1]);
                    if (nextRow) {
                        nextRow.recid--;
                    }
                    keys.splice(selected[i] - offset, 1);
                    offset++;
                }
                // Reset list
                this._onSelectedAnimation();
            };
            // Create the UI
            GUIAnimationEditor.prototype._createUI = function () {
                var _this = this;
                this.core.editor.editPanel.setPanelSize(40);
                var animationsListID = "BABYLON-EDITOR-ANIMATION-EDITOR-ANIMATIONS";
                var keysListID = "BABYLON-EDITOR-ANIMATION-EDITOR-KEYS";
                var valuesFormID = "BABYLON-EDITOR-ANIMATION-EDITOR-VALUES";
                var graphCanvasID = "BABYLON-EDITOR-ANIMATION-EDITOR-CANVAS";
                var animationsListElement = EDITOR.GUI.GUIElement.CreateDivElement(animationsListID, "width: 30%; height: 100%; float: left;");
                var keysListElement = EDITOR.GUI.GUIElement.CreateDivElement(keysListID, "width: 30%; height: 100%; float: left;");
                var valuesFormElement = EDITOR.GUI.GUIElement.CreateDivElement(valuesFormID, "width: 40%; height: 50%;");
                var graphCanvasElement = EDITOR.GUI.GUIElement.CreateDivElement(graphCanvasID, "width: 40%; height: 50%; float: right;");
                this.core.editor.editPanel.addContainer(animationsListElement, animationsListID);
                this.core.editor.editPanel.addContainer(keysListElement, keysListID);
                this.core.editor.editPanel.addContainer(valuesFormElement, valuesFormID);
                this.core.editor.editPanel.addContainer(graphCanvasElement, graphCanvasID);
                // Animations List
                this._animationsList = new EDITOR.GUI.GUIGrid(animationsListID, this.core);
                this._animationsList.header = "Animations";
                this._animationsList.createColumn("name", "name", "100%");
                this._animationsList.showSearch = false;
                this._animationsList.showOptions = false;
                this._animationsList.showDelete = true;
                this._animationsList.showAdd = true;
                this._animationsList.showEdit = true;
                this._animationsList.addMenu(EContextMenuID.COPY, "Copy", "icon-copy");
                this._animationsList.addMenu(EContextMenuID.PASTE, "Paste", "icon-copy");
                this._animationsList.addMenu(EContextMenuID.PASTE_KEYS, "Paste Keys", "icon-copy");
                this._animationsList.buildElement(animationsListID);
                for (var i = 0; i < this.object.animations.length; i++) {
                    this._animationsList.addRow({
                        name: this.object.animations[i].name,
                        recid: i
                    });
                }
                this._animationsList.onDelete = function (selected) {
                    _this._onDeleteAnimations();
                };
                this._animationsList.onAdd = function () {
                    _this._createAnimation();
                };
                this._animationsList.onEdit = function () {
                    var selectedRows = _this._animationsList.getSelectedRows();
                    if (selectedRows.length > 0) {
                        _this._editedAnimation = _this.object.animations[selectedRows[0]];
                        _this._createAnimation();
                    }
                };
                this._animationsList.onMenuClick = function (id) {
                    _this._onAnimationMenuSelected(id);
                };
                this._animationsList.onClick = function (selected) {
                    _this._onSelectedAnimation();
                };
                // Keys List
                this._keysList = new EDITOR.GUI.GUIGrid(keysListID, this.core);
                this._keysList.header = "Keys";
                this._keysList.createColumn("key", "key", "20%");
                this._keysList.createColumn("value", "value", "80%");
                this._keysList.showSearch = false;
                this._keysList.showOptions = false;
                this._keysList.showDelete = true;
                this._keysList.showAdd = true;
                this._keysList.buildElement(keysListID);
                this._keysList.onAdd = function () {
                    _this._onAddKey();
                };
                this._keysList.onDelete = function (selected) {
                    _this._onRemoveKeys();
                };
                this._keysList.onClick = function (selected) {
                    _this._onKeySelected();
                };
                // Values form
                this._valuesForm = new EDITOR.GUI.GUIForm(valuesFormID, "Value", this.core);
                this._valuesForm.header = "";
                this._valuesForm.createField("frame", "float", "Frame :", 3);
                this._valuesForm.createField("value", "text", "Value :", 3);
                this._valuesForm.buildElement(valuesFormID);
                this._valuesForm.onFormChanged = function () {
                    _this._onModifyKey();
                };
                // Graph
                this._graphPaper = Raphael(graphCanvasID, "100%", "100%");
                var rect = this._graphPaper.rect(0, 0, 0, 0);
                rect.attr("width", "100%");
                rect.attr("height", "100%");
                rect.attr("fill", "#f5f6f7");
                for (var i = 0; i < 3; i++) {
                    var line = this._graphPaper.path("");
                    this._graphLines.push(line);
                }
                this._graphLines[0].attr("stroke", Raphael.rgb(255, 0, 0));
                this._graphLines[1].attr("stroke", Raphael.rgb(0, 255, 0));
                this._graphLines[2].attr("stroke", Raphael.rgb(0, 0, 255));
                for (var i = 0; i < 3; i++) {
                    var text = this._graphPaper.text(5, 0, "");
                    text.attr("font-size", 11);
                    text.attr("text-anchor", "start");
                    this._graphValueTexts.push(text);
                }
                this._graphMiddleLine = this._graphPaper.path("");
                this._graphMiddleLine.attr("stroke", Raphael.rgb(128, 128, 128));
                for (var i = 0; i < 10; i++) {
                    var line = this._graphPaper.path("");
                    line.attr("stroke", Raphael.rgb(200, 200, 200));
                    this._graphTimeLines.push(line);
                    var text = this._graphPaper.text(0, 0, "");
                    this._graphTimeTexts.push(text);
                }
                // Finish
                this.core.editor.editPanel.onClose = function () {
                    _this._animationsList.destroy();
                    _this._keysList.destroy();
                    _this._valuesForm.destroy();
                    _this._graphPaper.clear();
                    _this.core.removeEventReceiver(_this);
                };
            };
            // Static method that gives the last animation frame of an object
            GUIAnimationEditor.GetEndFrameOfObject = function (object) {
                var count = 0;
                if (!object.animations)
                    return count;
                for (var animIndex = 0; animIndex < object.animations.length; animIndex++) {
                    var anim = object.animations[animIndex];
                    var keys = anim.getKeys();
                    for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
                        if (keys[keyIndex].frame > count) {
                            count = keys[keyIndex].frame;
                        }
                    }
                }
                return count;
            };
            // Static methods that gives the last scene frame
            GUIAnimationEditor.GetSceneFrameCount = function (scene) {
                var count = 0;
                var getTotal = function (objs) {
                    for (var i = 0; i < objs.length; i++) {
                        if (!objs[i].animations)
                            continue;
                        for (var animIndex = 0; animIndex < objs[i].animations.length; animIndex++) {
                            var anim = objs[i].animations[animIndex];
                            var keys = anim.getKeys();
                            for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
                                if (keys[keyIndex].frame > count) {
                                    count = keys[keyIndex].frame;
                                }
                            }
                        }
                    }
                };
                getTotal([scene]);
                getTotal(scene.meshes);
                getTotal(scene.lights);
                getTotal(scene.cameras);
                getTotal(scene.particleSystems);
                // Skeletons
                for (var skeletonIndex = 0; skeletonIndex < scene.skeletons.length; skeletonIndex++) {
                    getTotal(scene.skeletons[skeletonIndex].bones);
                }
                return count;
            };
            // Static methods that sets the current frame
            GUIAnimationEditor.SetCurrentFrame = function (core, objs, frame) {
                for (var i = 0; i < objs.length; i++) {
                    core.currentScene.stopAnimation(objs[i]);
                    core.currentScene.beginAnimation(objs[i], frame, frame + 1, false, 1.0);
                }
            };
            // Static members
            GUIAnimationEditor.FramesPerSecond = 24;
            GUIAnimationEditor._CopiedAnimations = [];
            return GUIAnimationEditor;
        }());
        EDITOR.GUIAnimationEditor = GUIAnimationEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var BabylonExporter = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function BabylonExporter(core) {
                this._window = null;
                this._layout = null;
                this._editor = null;
                this._configForm = null;
                // Initialize
                this._core = core;
                this._core.eventReceivers.push(this);
            }
            // On Event
            BabylonExporter.prototype.onEvent = function (event) {
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED && event.guiEvent.caller === this._window) {
                    var button = event.guiEvent.data;
                    if (button === "Generate") {
                        var obj = BabylonExporter.GenerateFinalBabylonFile(this._core); //BABYLON.SceneSerializer.Serialize(this._core.currentScene);
                        var camera = this._core.currentScene.getCameraByName(this._configForm.getRecord("activeCamera"));
                        obj.activeCameraID = camera ? camera.id : undefined;
                        this._editor.setValue(JSON.stringify(obj, null, "\t"), -1);
                    }
                    else if (button === "Close") {
                        this._window.close();
                    }
                    return true;
                }
                else if (event.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED) {
                    this._editor.resize(true);
                }
                return false;
            };
            // Create the UI
            BabylonExporter.prototype.createUI = function () {
                var _this = this;
                // IDs
                var codeID = "BABYLON-EXPORTER-CODE-EDITOR";
                var codeDiv = EDITOR.GUI.GUIElement.CreateElement("div", codeID);
                var configID = "BABYLON-EXPORTER-CONFIG";
                var configDiv = EDITOR.GUI.GUIElement.CreateElement("div", configID);
                var layoutID = "BABYLON-EXPORTER-LAYOUT";
                var layoutDiv = EDITOR.GUI.GUIElement.CreateElement("div", layoutID);
                // Window
                this._window = new EDITOR.GUI.GUIWindow("BABYLON-EXPORTER-WINDOW", this._core, "Export to .babylon", layoutDiv);
                this._window.modal = true;
                this._window.showMax = true;
                this._window.buttons = [
                    "Generate",
                    "Close"
                ];
                this._window.setOnCloseCallback(function () {
                    _this._core.removeEventReceiver(_this);
                    _this._layout.destroy();
                    _this._configForm.destroy();
                });
                this._window.buildElement(null);
                this._window.onToggle = function (maximized, width, height) {
                    if (!maximized) {
                        width = _this._window.size.x;
                        height = _this._window.size.y;
                    }
                    _this._layout.setPanelSize("left", width / 2);
                    _this._layout.setPanelSize("main", width / 2);
                };
                // Layout
                this._layout = new EDITOR.GUI.GUILayout(layoutID, this._core);
                this._layout.createPanel("CODE-PANEL", "left", 380, false).setContent(codeDiv);
                this._layout.createPanel("CONFIG-PANEL", "main", 380, false).setContent(configDiv);
                this._layout.buildElement(layoutID);
                // Code editor
                this._editor = ace.edit(codeID);
                this._editor.setValue("Click on \"Generate\" to generate the .babylon file\naccording to the following configuration", -1);
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/javascript");
                // Form
                var cameras = [];
                for (var i = 0; i < this._core.currentScene.cameras.length; i++) {
                    var camera = this._core.currentScene.cameras[i];
                    if (camera !== this._core.camera) {
                        cameras.push(camera.name);
                    }
                }
                this._configForm = new EDITOR.GUI.GUIForm(configID, "Configuration", this._core);
                this._configForm.createField("activeCamera", "list", "Active Camera :", 5, "", { items: cameras });
                this._configForm.buildElement(configID);
                if (this._core.playCamera)
                    this._configForm.setRecord("activeCamera", this._core.playCamera.name);
            };
            // Generates the final .babylon file
            BabylonExporter.GenerateFinalBabylonFile = function (core) {
                // Set action managers, serialize and reset action managers
                if (!core.isPlaying)
                    EDITOR.SceneManager.SwitchActionManager();
                var obj = BABYLON.SceneSerializer.Serialize(core.currentScene);
                if (!core.isPlaying)
                    EDITOR.SceneManager.SwitchActionManager();
                if (core.playCamera)
                    obj.activeCameraID = core.playCamera.id;
                // Set auto play
                var maxFrame = EDITOR.GUIAnimationEditor.GetSceneFrameCount(core.currentScene);
                var setAutoPlay = function (objects) {
                    for (var i = 0; i < objects.length; i++) {
                        var name = objects[i].name;
                        for (var j = 0; j < EDITOR.SceneFactory.NodesToStart.length; j++) {
                            if (!EDITOR.SceneFactory.NodesToStart[j].name === name)
                                continue;
                            objects[i].autoAnimate = true;
                            objects[i].autoAnimateFrom = 0;
                            objects[i].autoAnimateTo = maxFrame;
                            objects[i].autoAnimateLoop = false;
                            objects[i].autoAnimateSpeed = EDITOR.SceneFactory.AnimationSpeed;
                        }
                    }
                };
                // Scene autoplay
                if (EDITOR.SceneFactory.NodesToStart.some(function (value, index, array) { return value instanceof BABYLON.Scene; })) {
                    obj.autoAnimate = true;
                    obj.autoAnimateFrom = 0;
                    obj.autoAnimateTo = maxFrame;
                    obj.autoAnimateLoop = false;
                    obj.autoAnimateSpeed = EDITOR.SceneFactory.AnimationSpeed;
                }
                // Configure sounds url and autoplay
                for (var i = 0; i < obj.sounds.length; i++) {
                    var sound = obj.sounds[i];
                    if (sound.url)
                        sound.url = sound.url.replace("file:", "");
                    if (EDITOR.SceneFactory.NodesToStart.some(function (value, index, array) { return value instanceof BABYLON.Sound && value.name == sound.name; })) {
                        sound.autoplay = true;
                    }
                }
                // Nodes autoplay
                setAutoPlay(obj.cameras);
                setAutoPlay(obj.lights);
                setAutoPlay(obj.meshes);
                setAutoPlay(obj.particleSystems);
                return obj;
            };
            return BabylonExporter;
        }());
        EDITOR.BabylonExporter = BabylonExporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LaunchEditor = (function () {
            // Private members
            /**
            * Constructor
            * @param core: the editor core
            */
            function LaunchEditor(core) {
                // Initialize
                this.core = core;
                var picker = new EDITOR.ObjectPicker(core);
                picker.objectLists.push([core.currentScene]);
                picker.objectLists.push(core.currentScene.lights);
                picker.objectLists.push(core.currentScene.cameras);
                picker.objectLists.push(core.currentScene.meshes);
                picker.objectLists.push(core.currentScene.particleSystems);
                picker.objectLists.push(core.currentScene.soundTracks[0].soundCollection);
                picker.selectedObjects = EDITOR.SceneFactory.NodesToStart;
                picker.minSelectCount = 0;
                picker.includePostProcesses = true;
                picker.open();
                picker.onObjectPicked = function (names) {
                    EDITOR.SceneFactory.NodesToStart = [];
                    for (var i = 0; i < names.length; i++) {
                        var node = core.currentScene.getNodeByName(names[i]);
                        if (!node && names[i] === "Scene")
                            node = core.currentScene;
                        // Particle system
                        if (!node) {
                            //node = core.currentScene.getParticleSystemByName(names[i]);
                            node = EDITOR.Tools.GetParticleSystemByName(core.currentScene, names[i]);
                        }
                        if (!node) {
                            // Sound ?
                            node = core.currentScene.getSoundByName(names[i]);
                        }
                        if (!node && EDITOR.SceneFactory.StandardPipeline && names[i] === EDITOR.SceneFactory.StandardPipeline._name)
                            node = EDITOR.SceneFactory.StandardPipeline;
                        if (!node)
                            continue;
                        EDITOR.SceneFactory.NodesToStart.push(node);
                    }
                    core.editor.timeline.reset();
                };
            }
            return LaunchEditor;
        }());
        EDITOR.LaunchEditor = LaunchEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ObjectPicker = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function ObjectPicker(core) {
                // Public members
                this.core = null;
                this.objectLists = new Array();
                this.selectedObjects = new Array();
                this.minSelectCount = 1;
                this.windowName = "Select Object...";
                this.selectButtonName = "Select";
                this.closeButtonName = "Close";
                this.includePostProcesses = false;
                // Private members
                this._window = null;
                this._list = null;
                // Initialize
                this.core = core;
                this.core.eventReceivers.push(this);
            }
            // On event received
            ObjectPicker.prototype.onEvent = function (event) {
                // Manage event
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType !== EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED)
                    return false;
                if (event.guiEvent.caller === this._window) {
                    var button = event.guiEvent.data;
                    if (button === this.closeButtonName) {
                        if (this.onClosedPicker)
                            this.onClosedPicker();
                        this._window.close();
                    }
                    else if (button === this.selectButtonName) {
                        var selected = this._list.getSelectedRows();
                        if (selected.length < this.minSelectCount) {
                            this._window.notify("Please select at least 1 object...");
                        }
                        else {
                            if (this.onObjectPicked) {
                                var selectedNames = [];
                                for (var i = 0; i < selected.length; i++) {
                                    selectedNames.push(this._list.getRow(selected[i]).name);
                                }
                                this.onObjectPicked(selectedNames);
                            }
                            this._window.close();
                        }
                    }
                    return true;
                }
                return false;
            };
            // Opens the object picker
            ObjectPicker.prototype.open = function () {
                var _this = this;
                //IDs
                var listID = "OBJECT-PICKER-LIST";
                var listDiv = EDITOR.GUI.GUIElement.CreateElement("div", listID);
                // Create window
                this._window = new EDITOR.GUI.GUIWindow("OBJECT-PICKER-WINDOW", this.core, this.windowName, listDiv);
                this._window.modal = true;
                this._window.showMax = false;
                this._window.buttons = [
                    this.selectButtonName,
                    this.closeButtonName
                ];
                this._window.setOnCloseCallback(function () {
                    _this.core.removeEventReceiver(_this);
                    _this._list.destroy();
                });
                this._window.buildElement(null);
                // Create list
                this._list = new EDITOR.GUI.GUIGrid(listID, this.core);
                this._list.header = "Objects";
                this._list.createColumn("name", "name", "100%");
                this._list.buildElement(listID);
                var selected = [];
                var recid = 0;
                for (var i = 0; i < this.objectLists.length; i++) {
                    var list = this.objectLists[i];
                    for (var j = 0; j < list.length; j++) {
                        if (list[j] === this.core.camera)
                            continue;
                        this._list.addRecord({
                            name: list[j].name || "Scene",
                            recid: recid
                        });
                        if (this.selectedObjects.indexOf(list[j]) !== -1)
                            selected.push(recid);
                        recid++;
                    }
                }
                if (this.includePostProcesses && EDITOR.SceneFactory.StandardPipeline)
                    this._list.addRecord({
                        name: EDITOR.SceneFactory.StandardPipeline._name,
                        recid: recid++
                    });
                this._list.refresh();
                // Set selected
                if (selected.length > 0)
                    this._list.setSelected(selected);
            };
            return ObjectPicker;
        }());
        EDITOR.ObjectPicker = ObjectPicker;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUIParticleSystemEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function GUIParticleSystemEditor(core, particleSystem, createUI) {
                var _this = this;
                if (createUI === void 0) { createUI = true; }
                // Public members
                this.core = null;
                // Private members
                this._window = null;
                this._layouts = null;
                this._leftPanel = null;
                this._layoutID = "BABYLON-EDITOR-CREATE-PARTICLE-SYSTEM";
                this._formTabID = this._layoutID + "TAB-UPDATE-FORM";
                this._editorTabID = this._layoutID + "TAB-UPDATE-EDITOR";
                this._editElement = null;
                this._editElementID = this._layoutID + "FORM";
                this._inputElementID = this._layoutID + "INPUT";
                this._editor = null;
                this._editorElementID = this._layoutID + "EDITOR";
                this._engine = null;
                this._scene = null;
                this._camera = null;
                this._particleSystem = null;
                this._particleSystemToEdit = null;
                this._particleSystemCapacity = "";
                // Initialize
                this.core = core;
                this._uiCreated = createUI;
                if (createUI) {
                    // UI
                    this._createUI();
                    // Scene
                    this._engine = new BABYLON.Engine(document.getElementById(this._layoutID + "CANVAS"));
                    this._scene = new BABYLON.Scene(this._engine);
                    this._camera = new BABYLON.ArcRotateCamera("Camera", 1, 1.3, 30, new BABYLON.Vector3(0, 0, 0), this._scene);
                    this._camera.attachControl(this._engine.getRenderingCanvas(), false);
                    this._engine.runRenderLoop(function () {
                        _this._scene.render();
                    });
                    this._particleSystem = GUIParticleSystemEditor.CreateParticleSystem(this._scene, particleSystem.getCapacity(), particleSystem);
                    this._particleSystemToEdit = particleSystem;
                    // Finish
                    core.eventReceivers.push(this);
                    this._createEditor();
                }
                else {
                    // Assume that particleSystem isn't null
                    this._particleSystem = particleSystem;
                    this._scene = particleSystem._scene;
                }
            }
            // On event
            GUIParticleSystemEditor.prototype.onEvent = function (event) {
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED && event.guiEvent.caller === this._window) {
                    var button = event.guiEvent.data;
                    if (button === "Apply") {
                        this._setParticleSystem();
                        this._window.close();
                        EDITOR.Event.sendSceneEvent(this._particleSystemToEdit, EDITOR.SceneEventType.OBJECT_PICKED, this.core);
                    }
                    else if (button === "Cancel") {
                        this._window.close();
                    }
                    return true;
                }
                else if (event.guiEvent.eventType === EDITOR.GUIEventType.TAB_CHANGED) {
                    var panel = this._layouts.getPanelFromType("left");
                    if (event.guiEvent.caller !== this._leftPanel)
                        return false;
                    // Code here to change tab
                    var tabID = event.guiEvent.data;
                    var form = $("#" + this._layoutID + "FORM").hide();
                    var editor = $("#" + this._layoutID + "EDITOR").hide();
                    if (tabID === this._formTabID) {
                        form.show();
                    }
                    else if (tabID === this._editorTabID) {
                        editor.show();
                        var exporter = this.core.editor.exporter;
                        this._editor.setValue("var " + new EDITOR.Exporter(this.core)._exportParticleSystem(this._particleSystemToEdit).replace("\t", ""), -1);
                    }
                    return true;
                }
                return false;
            };
            // Creates the UI
            GUIParticleSystemEditor.prototype._createUI = function () {
                var _this = this;
                // Window
                var layoutDiv = EDITOR.GUI.GUIElement.CreateDivElement(this._layoutID, "width: 100%; height: 100%;");
                this._window = new EDITOR.GUI.GUIWindow("EditParticleSystem", this.core, "Edit Particle System", layoutDiv, new BABYLON.Vector2(800, 600));
                this._window.modal = true;
                this._window.showMax = true;
                this._window.showClose = true;
                this._window.buttons = ["Apply", "Cancel"];
                this._window.buildElement(null);
                this._window.onToggle = function (maximized, width, height) {
                    if (!maximized) {
                        width = _this._window.size.x;
                        height = _this._window.size.y;
                    }
                    _this._layouts.setPanelSize("left", width / 2);
                    _this._layouts.setPanelSize("main", width / 2);
                };
                this._window.on({ type: "open" }, function () {
                    _this._window.maximize();
                });
                this._window.setOnCloseCallback(function () {
                    _this._window.destroy();
                    _this._layouts.destroy();
                    _this.core.removeEventReceiver(_this);
                });
                // Layout
                var leftDiv = EDITOR.GUI.GUIElement.CreateDivElement(this._editElementID)
                    + EDITOR.GUI.GUIElement.CreateElement("div", this._editorElementID)
                    + EDITOR.GUI.GUIElement.CreateElement("input type=\"file\"", this._inputElementID, "display: none;");
                var rightDiv = EDITOR.GUI.GUIElement.CreateElement("canvas", this._layoutID + "CANVAS");
                this._layouts = new EDITOR.GUI.GUILayout(this._layoutID, this.core);
                this._leftPanel = this._layouts.createPanel(leftDiv, "left", 380, true).setContent(leftDiv);
                this._layouts.createPanel(rightDiv, "main", 380, true).setContent(rightDiv);
                this._layouts.buildElement(this._layoutID);
                var leftPanel = this._layouts.getPanelFromType("left");
                var editTabID = this._layoutID + "TAB-EDIT";
                leftPanel.createTab({ id: this._formTabID, caption: "Edit" });
                leftPanel.createTab({ id: this._editorTabID, caption: "Generated Code" });
                this._layouts.on({ type: "resize" }, function () {
                    _this._engine.resize();
                    _this._editElement.width = leftPanel.width - 30;
                    _this._editor.resize();
                });
                // Code editor
                this._editor = ace.edit(this._editorElementID);
                this._editor.setValue([
                    "var callback = function (particles) {",
                    "\t",
                    "};"
                ].join("\n"), -1);
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/javascript");
                this._editor.getSession().on("change", function (e) {
                    /*
                    var value = this._editor.getValue() + "\ncallback;";
                    try {
                        var result = eval.call(window, value);
    
                        //Test function
                        result((<any>this._particleSystem)._stockParticles);
    
                        this._particleSystem.updateFunction = result;
                    }
                    catch (e) {
                        // Catch silently
                        debugger;
                    }
                    */
                });
                $(this._editor.container).hide();
            };
            // Creates the editor
            GUIParticleSystemEditor.prototype._createEditor = function (container) {
                var _this = this;
                var elementId = container ? container : this._layoutID + "FORM";
                this._editElement = new EDITOR.GUI.GUIEditForm(elementId, this.core);
                this._editElement.buildElement(elementId);
                var ps = this._particleSystem;
                this._editElement.remember(ps);
                // Edit
                var functionsFolder = this._editElement.addFolder("Functions");
                if (!this._uiCreated)
                    functionsFolder.add(this, "_editParticleSystem").name("Edit...");
                functionsFolder.add(this, "_startParticleSystem").name("Start Particle System");
                functionsFolder.add(this, "_stopParticleSystem").name("Stop Particle System");
                // Common
                var commonFolder = this._editElement.addFolder("Common");
                commonFolder.add(ps, "name").name("Name").onChange(function (result) {
                    if (!_this._uiCreated) {
                        _this._updateGraphNode(result);
                    }
                });
                this._particleSystemCapacity = "" + this._particleSystem.getCapacity();
                commonFolder.add(this, "_particleSystemCapacity").name("Capacity").onFinishChange(function (result) {
                    result = parseFloat(result);
                    var emitter = _this._particleSystem.emitter;
                    var scene = _this._uiCreated ? _this._scene : _this.core.currentScene;
                    _this._particleSystem.emitter = null;
                    var newParticleSystem = GUIParticleSystemEditor.CreateParticleSystem(scene, result, _this._particleSystem, emitter);
                    _this._particleSystem.dispose();
                    _this._particleSystem = newParticleSystem;
                    if (_this._uiCreated) {
                        _this._editElement.remove();
                        _this._createEditor();
                    }
                    else {
                        _this._updateGraphNode(_this._particleSystem.name, _this._particleSystem);
                    }
                });
                // Texture
                commonFolder.add(this, "_setParticleTexture").name("Choose Texture...");
                commonFolder.add(ps, "blendMode", ["ONEONE", "STANDARD"]).name("Blend Mode: ").onFinishChange(function (result) {
                    switch (result) {
                        case "ONEONE":
                            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
                            break;
                        case "STANDARD":
                            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
                            break;
                        default: break;
                    }
                });
                // Emitter
                var emitterFolder = this._editElement.addFolder("Emitter");
                var minEmitBoxFolder = emitterFolder.addFolder("Min Emitter");
                minEmitBoxFolder.open();
                minEmitBoxFolder.add(ps.minEmitBox, "x").step(0.01);
                minEmitBoxFolder.add(ps.minEmitBox, "y").step(0.01);
                minEmitBoxFolder.add(ps.minEmitBox, "z").step(0.01);
                var minEmitBoxFolder = emitterFolder.addFolder("Max Emitter");
                minEmitBoxFolder.open();
                minEmitBoxFolder.add(ps.maxEmitBox, "x").step(0.01);
                minEmitBoxFolder.add(ps.maxEmitBox, "y").step(0.01);
                minEmitBoxFolder.add(ps.maxEmitBox, "z").step(0.01);
                // Emission
                var emissionFolder = this._editElement.addFolder("Emission");
                emissionFolder.add(ps, "minSize").name("Min Size").min(0.0).step(0.01);
                emissionFolder.add(ps, "maxSize").name("Max Size").min(0.0).step(0.01);
                emissionFolder.add(ps, "minLifeTime").name("Min Life Time").min(0.0).step(0.01);
                emissionFolder.add(ps, "maxLifeTime").name("Max Life Time").min(0.0).step(0.01);
                emissionFolder.add(ps, "emitRate").name("Emit Rate").min(0.0).step(1);
                emissionFolder.add(ps, "minEmitPower").name("Min Emit Power").min(0.0).step(0.01);
                emissionFolder.add(ps, "maxEmitPower").name("Max Emit Power").min(0.0).step(0.01);
                emissionFolder.add(ps, "updateSpeed").name("Update Speed").min(0.0).step(0.001);
                emissionFolder.add(ps, "minAngularSpeed").name("Min Angular Speed").min(0.0).max(2 * Math.PI).step(0.01);
                emissionFolder.add(ps, "maxAngularSpeed").name("Max Angular Speed").min(0.0).max(2 * Math.PI).step(0.01);
                // Gravity
                var gravityDirectionFolder = this._editElement.addFolder("Gravity and directions");
                var gravityFolder = gravityDirectionFolder.addFolder("Gravity");
                gravityFolder.open();
                gravityFolder.add(ps.gravity, "x").step(0.01);
                gravityFolder.add(ps.gravity, "y").step(0.01);
                gravityFolder.add(ps.gravity, "z").step(0.01);
                var direction1Folder = gravityDirectionFolder.addFolder("Direction 1");
                direction1Folder.add(ps.direction1, "x").step(0.01);
                direction1Folder.add(ps.direction1, "y").step(0.01);
                direction1Folder.add(ps.direction1, "z").step(0.01);
                var direction2Folder = gravityDirectionFolder.addFolder("Direction 2");
                direction2Folder.add(ps.direction2, "x").step(0.01);
                direction2Folder.add(ps.direction2, "y").step(0.01);
                direction2Folder.add(ps.direction2, "z").step(0.01);
                // Colors
                var colorFolder = this._editElement.addFolder("Colors");
                var color1Folder = colorFolder.addFolder("Color 1");
                color1Folder.add(ps.color1, "r").step(0.01).min(0.0).max(1.0);
                color1Folder.add(ps.color1, "g").step(0.01).min(0.0).max(1.0);
                color1Folder.add(ps.color1, "b").step(0.01).min(0.0).max(1.0);
                //color1Folder.add(ps.color1, "a").step(0.01).min(0.0).max(1.0);
                var color2Folder = colorFolder.addFolder("Color 2");
                color2Folder.add(ps.color2, "r").step(0.01).min(0.0).max(1.0);
                color2Folder.add(ps.color2, "g").step(0.01).min(0.0).max(1.0);
                color2Folder.add(ps.color2, "b").step(0.01).min(0.0).max(1.0);
                //color2Folder.add(ps.color2, "a").step(0.01).min(0.0).max(1.0);
                var colorDeadFolder = colorFolder.addFolder("Color Dead");
                colorDeadFolder.add(ps.colorDead, "r").step(0.01).min(0.0).max(1.0);
                colorDeadFolder.add(ps.colorDead, "g").step(0.01).min(0.0).max(1.0);
                colorDeadFolder.add(ps.colorDead, "b").step(0.01).min(0.0).max(1.0);
                //colorDeadFolder.add(ps.colorDead, "a").step(0.01).min(0.0).max(1.0);
                return this._editElement;
            };
            // Set the particle system
            GUIParticleSystemEditor.prototype._setParticleSystem = function () {
                var excluded = ["id"];
                // If capacity changed
                if (this._particleSystem.getCapacity() !== this._particleSystemToEdit.getCapacity()) {
                    var emitter = this._particleSystemToEdit.emitter;
                    this._particleSystemToEdit.emitter = null;
                    var newParticleSystem = GUIParticleSystemEditor.CreateParticleSystem(this.core.currentScene, this._particleSystem.getCapacity(), this._particleSystem, emitter);
                    this._particleSystemToEdit.dispose();
                    this._particleSystemToEdit = newParticleSystem;
                    this._updateGraphNode(this._particleSystem.name, this._particleSystemToEdit);
                    return;
                }
                for (var thing in this._particleSystem) {
                    if (thing[0] === "_" || excluded.indexOf(thing) !== -1)
                        continue;
                    var value = this._particleSystem[thing];
                    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean")
                        this._particleSystemToEdit[thing] = value;
                    if (value instanceof BABYLON.Vector3 || value instanceof BABYLON.Color4)
                        this._particleSystemToEdit[thing] = value;
                    if (value instanceof BABYLON.Texture)
                        this._particleSystemToEdit[thing] = BABYLON.Texture.CreateFromBase64String(value._buffer, value.name, this.core.currentScene);
                }
                this._updateGraphNode(this._particleSystem.name);
            };
            // Edit particle system
            GUIParticleSystemEditor.prototype._editParticleSystem = function () {
                var psEditor = new GUIParticleSystemEditor(this.core, this._particleSystem);
            };
            // Start particle system
            GUIParticleSystemEditor.prototype._startParticleSystem = function () {
                this._particleSystem.start();
            };
            // Stop particle system
            GUIParticleSystemEditor.prototype._stopParticleSystem = function () {
                this._particleSystem.stop();
            };
            // Set the new name of the sidebar graph node
            GUIParticleSystemEditor.prototype._updateGraphNode = function (result, data) {
                var sidebar = this.core.editor.sceneGraphTool.sidebar;
                var element = sidebar.getSelectedNode();
                if (element) {
                    element.text = result;
                    if (data) {
                        element.data = data;
                    }
                    sidebar.refresh();
                }
            };
            // Set the particle texture
            GUIParticleSystemEditor.prototype._setParticleTexture = function () {
                var _this = this;
                var input = $("#" + this._inputElementID);
                if (!input[0])
                    $("#BABYLON-EDITOR-UTILS").append(EDITOR.GUI.GUIElement.CreateElement("input type=\"file\"", this._inputElementID, "display: none;"));
                input = $("#" + this._inputElementID);
                input.change(function (data) {
                    var files = data.target.files || data.currentTarget.files;
                    if (files.length < 1)
                        return;
                    var file = files[0];
                    BABYLON.Tools.ReadFileAsDataURL(file, function (result) {
                        var texture = BABYLON.Texture.CreateFromBase64String(result, file.name, _this._scene);
                        texture.name = texture.name.replace("data:", "");
                        _this._particleSystem.particleTexture = texture;
                        input.remove();
                        EDITOR.Event.sendSceneEvent(texture, EDITOR.SceneEventType.OBJECT_ADDED, _this.core);
                    }, null);
                });
                input.click();
            };
            // Plays all particle systems
            GUIParticleSystemEditor.PlayStopAllParticleSystems = function (scene, play) {
                for (var i = 0; i < scene.particleSystems.length; i++) {
                    if (play)
                        scene.particleSystems[i].start();
                    else
                        scene.particleSystems[i].stop();
                }
            };
            // Creates a new particle system
            // particleSystem = the original particle system to copy
            // emitter = if null, creates a dummy node as emitter
            GUIParticleSystemEditor.CreateParticleSystem = function (scene, capacity, particleSystem, emitter) {
                particleSystem = particleSystem || {};
                var dummy = null;
                if (emitter)
                    dummy = emitter;
                else {
                    dummy = new BABYLON.Mesh("New Particle System", scene, null, null, true);
                    BABYLON.Tags.EnableFor(dummy);
                    BABYLON.Tags.AddTagsTo(dummy, "added_particlesystem");
                }
                var ps = new BABYLON.ParticleSystem("New Particle System", capacity, scene);
                if (particleSystem.animations) {
                    for (var i = 0; i < particleSystem.animations.length; i++) {
                        ps.animations.push(particleSystem.animations[i].clone());
                    }
                }
                ps.name = particleSystem.name || ps.name;
                ps.id = EDITOR.SceneFactory.GenerateUUID();
                ps.emitter = dummy;
                ps.minEmitBox = particleSystem.minEmitBox || new BABYLON.Vector3(-1, 0, 0);
                ps.maxEmitBox = particleSystem.maxEmitBox || new BABYLON.Vector3(1, 0, 0);
                ps.color1 = particleSystem.color1 || new BABYLON.Color3(0.7, 0.8, 1.0);
                ps.color2 = particleSystem.color2 || new BABYLON.Color3(0.2, 0.5, 1.0);
                ps.colorDead = particleSystem.colorDead || new BABYLON.Color3(0, 0, 0.2);
                ps.minSize = particleSystem.minSize || 0.1;
                ps.maxSize = particleSystem.maxSize || 0.5;
                ps.minLifeTime = particleSystem.minLifeTime || 0.3;
                ps.maxLifeTime = particleSystem.maxLifeTime || 1.5;
                ps.emitRate = particleSystem.emitRate || 1500;
                // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
                ps.blendMode = particleSystem.blendMode || BABYLON.ParticleSystem.BLENDMODE_ONEONE;
                var buffer = particleSystem.particleTexture ? particleSystem.particleTexture._buffer : null;
                var texture = particleSystem.particleTexture ? BABYLON.Texture.CreateFromBase64String(buffer, particleSystem.particleTexture.name, scene) : BABYLON.Texture.CreateFromBase64String("data:image/png;base64,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", "particleTexture.png", scene);
                texture.name = texture.name.replace("data:", "");
                ps.particleTexture = texture;
                ps.gravity = particleSystem.gravity || new BABYLON.Vector3(0, -9.81, 0);
                ps.direction1 = particleSystem.direction1 || new BABYLON.Vector3(-7, 8, 3);
                ps.direction2 = particleSystem.direction2 || new BABYLON.Vector3(7, 8, -3);
                ps.minAngularSpeed = particleSystem.minAngularSpeed || 0;
                ps.maxAngularSpeed = particleSystem.maxAngularSpeed || Math.PI;
                ps.minEmitPower = particleSystem.minEmitPower || 1;
                ps.maxEmitPower = particleSystem.maxEmitPower || 3;
                ps.updateSpeed = particleSystem.updateSpeed || 0.005;
                ps.start();
                dummy.attachedParticleSystem = ps;
                return ps;
            };
            // Static members
            GUIParticleSystemEditor._CurrentParticleSystem = null;
            GUIParticleSystemEditor._CopiedParticleSystem = null;
            return GUIParticleSystemEditor;
        }());
        EDITOR.GUIParticleSystemEditor = GUIParticleSystemEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var coordinatesModes = [
            { id: 0, text: "EXPLICIT_MODE" },
            { id: 1, text: "SPHERICAL_MODE" },
            { id: 2, text: "PLANAR_MODE" },
            { id: 3, text: "CUBIC_MODE" },
            { id: 4, text: "PROJECTION_MODE" },
            { id: 5, text: "SKYBOX_MODE" },
            { id: 6, text: "INVCUBIC_MODE" },
            { id: 7, text: "EQUIRECTANGULAR_MODE" },
            { id: 8, text: "FIXED_EQUIRECTANGULAR_MODE" }
        ];
        var GUITextureEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            * @param object: the object to edit
            * @param propertyPath: the path to the texture property of the object
            */
            function GUITextureEditor(core, objectName, object, propertyPath) {
                this._targetTexture = null;
                this._selectedTexture = null;
                this._currentRenderTarget = null;
                this._currentPixels = null;
                this._dynamicTexture = null;
                this._texturesList = null;
                this._engine = null;
                this._scene = null;
                // Initialize
                this._core = core;
                this._core.eventReceivers.push(this);
                this._core.editor.editPanel.close();
                this.object = object;
                this.propertyPath = propertyPath;
                this._objectName = objectName;
                // Initialize object and property path
                if (object && propertyPath) {
                    this._targetObject = object[propertyPath];
                    if (!this._targetObject || !(this._targetObject instanceof BABYLON.BaseTexture)) {
                        this._targetObject = null;
                    }
                }
                // Finish
                this._createUI();
            }
            // On Event
            GUITextureEditor.prototype.onEvent = function (ev) {
                if (ev.eventType === EDITOR.EventType.SCENE_EVENT) {
                    var eventType = ev.sceneEvent.eventType;
                    if (eventType === EDITOR.SceneEventType.OBJECT_ADDED || eventType === EDITOR.SceneEventType.OBJECT_REMOVED || eventType === EDITOR.SceneEventType.NEW_SCENE_CREATED) {
                        this._fillTextureList();
                    }
                    else if (eventType === EDITOR.SceneEventType.OBJECT_CHANGED && ev.sceneEvent.object === this._selectedTexture) {
                        if (this._selectedTexture instanceof BABYLON.DynamicTexture)
                            this._targetTexture.update(true);
                    }
                }
                else if (ev.eventType === EDITOR.EventType.GUI_EVENT) {
                    if (ev.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED) {
                        this._engine.resize();
                    }
                }
                return false;
            };
            // Creates the UI
            GUITextureEditor.prototype._createUI = function () {
                var _this = this;
                this._core.editor.editPanel.setPanelSize(40);
                // IDs and elements
                var texturesListID = "BABYLON-EDITOR-TEXTURES-EDITOR-TEXTURES";
                var canvasID = "BABYLON-EDITOR-TEXTURES-EDITOR-CANVAS";
                var texturesListElement = EDITOR.GUI.GUIElement.CreateDivElement(texturesListID, "width: 50%; height: 100%; float: left;");
                var canvasElement = EDITOR.GUI.GUIElement.CreateElement("canvas", canvasID, "width: 50%; height: 100%; float: right;");
                this._core.editor.editPanel.addContainer(texturesListElement, texturesListID);
                this._core.editor.editPanel.addContainer(canvasElement, canvasID);
                // Texture canvas
                this._engine = new BABYLON.Engine($("#" + canvasID)[0], true);
                this._scene = new BABYLON.Scene(this._engine);
                this._scene.clearColor = new BABYLON.Color3(0, 0, 0);
                var camera = new BABYLON.ArcRotateCamera("TextureEditorCamera", 0, 0, 10, BABYLON.Vector3.Zero(), this._scene);
                camera.attachControl(this._engine.getRenderingCanvas());
                var material = new BABYLON.StandardMaterial("TextureEditorSphereMaterial", this._scene);
                material.diffuseColor = new BABYLON.Color3(1, 1, 1);
                material.disableLighting = true;
                var light = new BABYLON.HemisphericLight("TextureEditorHemisphericLight", BABYLON.Vector3.Zero(), this._scene);
                var sphere = BABYLON.Mesh.CreateSphere("TextureEditorSphere", 32, 5, this._scene);
                sphere.setEnabled(false);
                sphere.material = material;
                var postProcess = new BABYLON.PassPostProcess("PostProcessTextureEditor", 1.0, camera);
                postProcess.onApply = function (effect) {
                    if (_this._targetTexture)
                        effect.setTexture("textureSampler", _this._targetTexture);
                };
                this._engine.runRenderLoop(function () {
                    _this._scene.render();
                });
                // Textures list
                this._texturesList = new EDITOR.GUI.GUIGrid(texturesListID, this._core);
                this._texturesList.header = this._objectName ? this._objectName : "Textures ";
                this._texturesList.createColumn("name", "name", "100px");
                this._texturesList.createEditableColumn("coordinatesMode", "Coordinates Mode", { type: "select", items: coordinatesModes }, "80px");
                this._texturesList.createEditableColumn("uScale", "uScale", { type: "float" }, "80px");
                this._texturesList.createEditableColumn("uScale", "vScale", { type: "float" }, "80px");
                this._texturesList.showSearch = true;
                this._texturesList.showOptions = true;
                this._texturesList.showAdd = true;
                this._texturesList.hasSubGrid = true;
                this._texturesList.buildElement(texturesListID);
                this._fillTextureList();
                this._texturesList.onClick = function (selected) {
                    if (selected.length === 0)
                        return;
                    if (_this._currentRenderTarget)
                        _this._restorRenderTarget();
                    var selectedTexture = _this._core.currentScene.textures[selected[0]];
                    /*
                    if (selectedTexture.name.toLowerCase().indexOf(".hdr") !== -1)
                        return;
                    */
                    if (_this._targetTexture) {
                        _this._targetTexture.dispose();
                        _this._targetTexture = null;
                    }
                    // If render target, configure canvas. Else, set target texture 
                    if (selectedTexture.isRenderTarget && !selectedTexture.isCube) {
                        _this._currentRenderTarget = selectedTexture;
                        _this._configureRenderTarget();
                    }
                    else {
                        var serializationObject = selectedTexture.serialize();
                        if (selectedTexture instanceof BABYLON.DynamicTexture) {
                            _this._targetTexture = new BABYLON.DynamicTexture(selectedTexture.name, { width: selectedTexture.getBaseSize().width, height: selectedTexture.getBaseSize().height }, _this._scene, selectedTexture.noMipmap);
                            var canvas = _this._targetTexture._canvas;
                            canvas.remove();
                            _this._targetTexture._context = selectedTexture._context;
                            _this._targetTexture._canvas = selectedTexture._canvas;
                            _this._targetTexture.update(true);
                        }
                        else {
                            // Guess texture
                            if (selectedTexture._buffer) {
                                serializationObject.base64String = selectedTexture._buffer;
                            }
                            else {
                                var file = BABYLON.FilesInput.FilesTextures[selectedTexture.name.toLowerCase()];
                                if (file) {
                                    serializationObject.name = selectedTexture.url;
                                }
                                serializationObject.url = serializationObject.url || serializationObject.name;
                                if (serializationObject.url.substring(0, 5) !== "file:") {
                                    serializationObject.name = "file:" + serializationObject.name;
                                }
                                if (!file && serializationObject.name.indexOf(".hdr") !== -1) {
                                    _this._targetTexture = new BABYLON.HDRCubeTexture(serializationObject.name, _this._scene, serializationObject.isBABYLONPreprocessed ? null : serializationObject.size);
                                    _this._targetTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
                                }
                            }
                            if (!_this._targetTexture)
                                _this._targetTexture = BABYLON.Texture.Parse(serializationObject, _this._scene, "");
                        }
                    }
                    if (_this.object) {
                        _this.object[_this.propertyPath] = selectedTexture;
                    }
                    if (selectedTexture) {
                        _this._selectedTexture = selectedTexture;
                        camera.detachPostProcess(postProcess);
                        if (selectedTexture.isCube) {
                            sphere.setEnabled(true);
                            material.reflectionTexture = _this._targetTexture;
                        }
                        else {
                            sphere.setEnabled(false);
                            camera.attachPostProcess(postProcess);
                        }
                    }
                };
                if (this.object && this.object[this.propertyPath]) {
                    var index = this._core.currentScene.textures.indexOf(this.object[this.propertyPath]);
                    if (index !== -1) {
                        this._texturesList.setSelected([index]);
                        this._texturesList.onClick([index]);
                        this._texturesList.scrollIntoView(index);
                    }
                }
                this._texturesList.onAdd = function () {
                    var inputFiles = $("#BABYLON-EDITOR-LOAD-TEXTURE-FILE");
                    inputFiles[0].onchange = function (data) {
                        for (var i = 0; i < data.target.files.length; i++) {
                            var name = data.target.files[i].name;
                            var lowerName = name.toLowerCase();
                            if (name.indexOf(".babylon.hdr") !== -1) {
                                BABYLON.Tools.ReadFile(data.target.files[i], _this._onReadFileCallback(name), null, true);
                            }
                            else if (name.indexOf(".hdr") !== -1) {
                                BABYLON.FilesInput.FilesToLoad[name] = data.target.files[i];
                                BABYLON.HDRCubeTexture.generateBabylonHDR("file:" + name, 256, _this._onReadFileCallback(name), function () {
                                    EDITOR.GUI.GUIWindow.CreateAlert("An error occured when converting HDR Texture", "HR Error");
                                });
                            }
                            else if (lowerName.indexOf(".png") !== -1 || lowerName.indexOf(".jpg") !== -1) {
                                BABYLON.Tools.ReadFileAsDataURL(data.target.files[i], _this._onReadFileCallback(name), null);
                            }
                            else {
                                EDITOR.GUI.GUIWindow.CreateAlert("Texture format not supported", "Textre Format Error");
                            }
                        }
                    };
                    inputFiles.click();
                };
                this._texturesList.onReload = function () {
                    _this._fillTextureList();
                };
                this._texturesList.onExpand = function (id, recid) {
                    var originalTexture = _this._core.currentScene.textures[recid];
                    if (!originalTexture)
                        null;
                    var subGrid = new EDITOR.GUI.GUIGrid(id, _this._core);
                    subGrid.showColumnHeaders = false;
                    subGrid.createColumn("name", "Property", "25%", "background-color: #efefef; border-bottom: 1px solid white; padding-right: 5px;");
                    subGrid.createColumn("value", "Value", "75%");
                    subGrid.addRecord({ name: "width", value: originalTexture.getSize().width });
                    subGrid.addRecord({ name: "height", value: originalTexture.getSize().height });
                    subGrid.addRecord({ name: "name", value: originalTexture.name });
                    if (originalTexture instanceof BABYLON.Texture) {
                        subGrid.addRecord({ name: "url", value: originalTexture.url });
                    }
                    return subGrid;
                };
                this._texturesList.onEditField = function (recid, value) {
                    var changes = _this._texturesList.getChanges();
                    for (var i = 0; i < changes.length; i++) {
                        var diff = changes[i];
                        var texture = _this._core.currentScene.textures[diff.recid];
                        delete diff.recid;
                        for (var thing in diff) {
                            if (thing === "coordinatesMode") {
                                texture.coordinatesMode = parseInt(diff.coordinatesMode);
                            }
                            else {
                                texture[thing] = diff[thing];
                            }
                        }
                    }
                };
                // Finish
                this._core.editor.editPanel.onClose = function () {
                    _this._texturesList.destroy();
                    _this._scene.dispose();
                    _this._engine.dispose();
                    _this._core.removeEventReceiver(_this);
                };
            };
            // Configures a render target to be rendered
            GUITextureEditor.prototype._configureRenderTarget = function () {
                var _this = this;
                var width = this._currentRenderTarget.getSize().width;
                var height = this._currentRenderTarget.getSize().height;
                var imgData = new ImageData(width, height);
                this._currentOnAfterRender = this._currentRenderTarget.onAfterRender;
                this._dynamicTexture = new BABYLON.DynamicTexture("RenderTargetTexture", { width: width, height: height }, this._scene, false);
                this._currentRenderTarget.onAfterRender = function (faceIndex) {
                    if (_this._currentOnAfterRender)
                        _this._currentOnAfterRender(faceIndex);
                    _this._currentPixels = _this._core.engine.readPixels(0, 0, width, height);
                    for (var i = 0; i < _this._currentPixels.length; i++)
                        imgData.data[i] = _this._currentPixels[i];
                    _this._dynamicTexture.getContext().putImageData(imgData, 0, 0);
                    _this._dynamicTexture.update(false);
                };
                this._targetTexture = this._dynamicTexture;
            };
            // Restores the render target
            GUITextureEditor.prototype._restorRenderTarget = function () {
                this._currentRenderTarget.onAfterRender = this._currentOnAfterRender;
                this._dynamicTexture.dispose();
                this._dynamicTexture = null;
                this._currentPixels = null;
                this._currentRenderTarget = null;
            };
            // Fills the texture list
            GUITextureEditor.prototype._fillTextureList = function () {
                this._texturesList.clear();
                for (var i = 0; i < this._core.currentScene.textures.length; i++) {
                    var texture = this._core.currentScene.textures[i];
                    var row = {
                        name: texture.name,
                        coordinatesMode: coordinatesModes[texture.coordinatesMode].text,
                        uScale: texture instanceof BABYLON.Texture ? texture.uScale : 0,
                        vScale: texture instanceof BABYLON.Texture ? texture.vScale : 0,
                        recid: i
                    };
                    if (texture.isCube) {
                        row.style = "background-color: #FBFEC0";
                    }
                    else if (texture.isRenderTarget) {
                        row.style = "background-color: #C2F5B4";
                    }
                    this._texturesList.addRecord(row);
                }
                this._texturesList.refresh();
            };
            GUITextureEditor.prototype._addTextureToList = function (texture) {
                this._texturesList.addRow({
                    name: texture.name,
                    coordinatesMode: coordinatesModes[texture.coordinatesMode].text,
                    uScale: texture instanceof BABYLON.Texture ? texture.uScale : 0,
                    vScale: texture instanceof BABYLON.Texture ? texture.vScale : 0,
                    recid: this._texturesList.getRowCount() - 1
                });
                this._core.editor.editionTool.updateEditionTool();
            };
            // On readed texture file callback
            GUITextureEditor.prototype._onReadFileCallback = function (name) {
                var _this = this;
                return function (data) {
                    var texture = null;
                    if (name.indexOf(".hdr") !== -1) {
                        var hdrData = new Blob([data], { type: 'application/octet-stream' });
                        var hdrUrl = window.URL.createObjectURL(hdrData);
                        try {
                            texture = new BABYLON.HDRCubeTexture(hdrUrl, _this._core.currentScene);
                            texture.name = name;
                            BABYLON.FilesInput.FilesToLoad[name] = EDITOR.Tools.CreateFile(new Uint8Array(data), name);
                        }
                        catch (e) {
                            EDITOR.GUI.GUIWindow.CreateAlert("Cannot load HDR texture...", "HDR Texture Error");
                        }
                    }
                    else {
                        texture = BABYLON.Texture.CreateFromBase64String(data, name, _this._core.currentScene, false, false, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
                        texture.name = texture.name.replace("data:", "");
                    }
                    _this._addTextureToList(texture);
                };
            };
            return GUITextureEditor;
        }());
        EDITOR.GUITextureEditor = GUITextureEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUIActionsBuilder = (function () {
            /**
            * Constructor
            * @param core: the editor core
            * @param object: the object to edit
            * @param propertyPath: the path to the texture property of the object
            */
            function GUIActionsBuilder(core, object, actionManager) {
                var _this = this;
                // Create window
                var iframeID = "BABYLON-EDITOR-ACTIONS-BUILDER-IFRAME";
                var iframe = EDITOR.GUI.GUIElement.CreateElement("iframe sandbox=\"allow-same-origin allow-scripts\"", iframeID, "width: 100%; height: 100%");
                var objectName = object instanceof BABYLON.Node ? object.name : "Scene";
                this._window = new EDITOR.GUI.GUIWindow("BABYLON-ACTIONS-BUILDER-WINDOW", core, "Actions Builder - " + objectName, iframe);
                this._window.modal = true;
                this._window.showMax = true;
                this._window.buttons = [
                    "Apply",
                    "Cancel"
                ];
                this._window.setOnCloseCallback(function () {
                    // Empty for the moment
                });
                this._window.buildElement(null);
                this._window.lock();
                // Configure iframe
                var iframeElement = $("#" + iframeID);
                iframeElement.attr("src", "libs/actionsBuilder/index.html");
                var iframeWindow = iframeElement[0].contentWindow;
                iframeElement[0].onload = function () {
                    _this._getNames(core.currentScene.meshes, iframeWindow.setMeshesNames);
                    _this._getNames(core.currentScene.lights, iframeWindow.setLightsNames);
                    _this._getNames(core.currentScene.cameras, iframeWindow.setCamerasNames);
                    _this._getNames(core.currentScene.mainSoundTrack.soundCollection, iframeWindow.setSoundsNames);
                    // Set parameters
                    var parameters = [];
                    if (object instanceof BABYLON.AbstractMesh) {
                        if (object.material) {
                            parameters.push("");
                        }
                    }
                    if (parameters.length === 0)
                        parameters.push("None"); // No additional parameters
                    iframeWindow.configureParameters(parameters);
                    // Configure
                    if (object instanceof BABYLON.Scene)
                        iframeWindow.setIsScene();
                    else
                        iframeWindow.setIsObject();
                    iframeWindow.resetList();
                    var iframeDocument = iframeWindow.document;
                    iframeDocument.getElementById("ActionsBuilderObjectName").value = objectName;
                    iframeDocument.getElementById("ActionsBuilderJSON").value = JSON.stringify(actionManager.serialize(objectName));
                    // Set theme
                    iframeWindow.getList().setColorTheme("rgb(147, 148, 148)");
                    iframeWindow.getViewer().setColorTheme("-ms-linear-gradient(top, rgba(73, 74, 74, 1) 0%, rgba(125, 126, 125, 1) 100%)");
                    iframeWindow.getViewer().setColorTheme("linear-gradient(top, rgba(73, 74, 74, 1) 0%, rgba(125, 126, 125, 1) 100%)");
                    iframeWindow.getViewer().setColorTheme("-webkit-linear-gradient(top, rgba(73, 74, 74, 1) 0%, rgba(125, 126, 125, 1) 100%)");
                    iframeWindow.getViewer().setColorTheme("-o-linear-gradient(top, rgba(73, 74, 74, 1) 0%, rgba(125, 126, 125, 1) 100%)");
                    iframeDocument.getElementById("ParametersElementID").style.backgroundColor = "rgb(147, 148, 148)";
                    iframeDocument.getElementById("ParametersHelpElementID").style.backgroundColor = "rgb(64, 65, 65)";
                    iframeDocument.getElementById("ToolbarElementID").style.backgroundColor = "rgb(64, 65, 65)";
                    // Finish
                    iframeWindow.updateObjectName();
                    iframeWindow.loadFromJSON();
                    _this._window.unlock();
                };
                // Configure window's button
                this._window.onButtonClicked = function (id) {
                    if (id === "Cancel") {
                        _this._window.close();
                    }
                    else if (id === "Apply") {
                        iframeWindow.createJSON();
                        var iframeDocument = iframeWindow.document;
                        var parsedActionManager = iframeDocument.getElementById("ActionsBuilderJSON").value;
                        var oldActionManager = object.actionManager;
                        BABYLON.ActionManager.Parse(JSON.parse(parsedActionManager), object instanceof BABYLON.Scene ? null : object, core.currentScene);
                        BABYLON.Tags.EnableFor(object.actionManager);
                        BABYLON.Tags.AddTagsTo(object.actionManager, "added");
                        if (!core.isPlaying) {
                            if (object instanceof BABYLON.Scene)
                                EDITOR.SceneManager._SceneConfiguration.actionManager = object.actionManager;
                            else
                                EDITOR.SceneManager._ConfiguredObjectsIDs[object.id].actionManager = object.actionManager;
                            object.actionManager = oldActionManager;
                        }
                        _this._window.close();
                    }
                };
            }
            // Get names of a collection of nodes
            GUIActionsBuilder.prototype._getNames = function (objects, func) {
                for (var i = 0; i < objects.length; i++)
                    func(objects[i].name);
            };
            return GUIActionsBuilder;
        }());
        EDITOR.GUIActionsBuilder = GUIActionsBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var PluginManager = (function () {
            function PluginManager() {
            }
            // Functions
            PluginManager.RegisterEditionTool = function (tool) {
                this.EditionToolPlugins.push(tool);
            };
            PluginManager.RegisterMainToolbarPlugin = function (plugin) {
                this.MainToolbarPlugins.push(plugin);
            };
            PluginManager.RegisterCustomUpdatePlugin = function (plugin) {
                this.CustomUpdatePlugins.push(plugin);
            };
            // Plugins
            PluginManager.EditionToolPlugins = [];
            PluginManager.MainToolbarPlugins = [];
            PluginManager.CustomUpdatePlugins = [];
            return PluginManager;
        }());
        EDITOR.PluginManager = PluginManager;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SimpleMaterialTool = (function (_super) {
            __extends(SimpleMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function SimpleMaterialTool(editionTool) {
                _super.call(this, editionTool, "SIMPLE-MATERIAL", "SIMPLE", "Simple");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.SimpleMaterial; };
            }
            // Update
            SimpleMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Add a simple element
                this._element.add(this.material, "name").name("Name");
                // Add a folder
                var diffuseFolder = this._element.addFolder("Diffuse");
                // Add color and texture elements with "diffuseFolder" as parent
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
                this.addTextureButton("Diffuse Texture", "diffuseTexture", diffuseFolder).open();
                // Finish
                return true;
            };
            return SimpleMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.SimpleMaterialTool = SimpleMaterialTool;
        // Finally, register the plugin using the plugin manager
        EDITOR.PluginManager.RegisterEditionTool(SimpleMaterialTool);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GeometriesMenuPlugin = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function GeometriesMenuPlugin(mainToolbar) {
                // Public members
                this.menuID = "GEOMETRIES-MENU";
                this._createCubeID = "CREATE-CUBE";
                this._createSphereID = "CREATE-SPHERE";
                this._createGroundID = "CREATE-GROUND";
                this._createPlane = "CREATE-PLANE";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                // Create menu
                var menu = toolbar.createMenu("menu", this.menuID, "Geometry", "icon-bounding-box");
                // Create items
                toolbar.createMenuItem(menu, "button", this._createCubeID, "Add Cube", "icon-box-mesh");
                toolbar.createMenuItem(menu, "button", this._createSphereID, "Add Sphere", "icon-sphere-mesh");
                toolbar.addBreak(menu); // Or not
                toolbar.createMenuItem(menu, "button", this._createGroundID, "Add Ground", "icon-mesh");
                toolbar.createMenuItem(menu, "button", this._createPlane, "Add Plane", "icon-mesh");
                // Etc.
            }
            /**
            * Called when a menu item is selected by the user
            * "selected" is the id of the selected item
            */
            GeometriesMenuPlugin.prototype.onMenuItemSelected = function (selected) {
                // Switch selected menu id
                switch (selected) {
                    case this._createCubeID:
                        EDITOR.SceneFactory.AddBoxMesh(this._core);
                        break;
                    case this._createSphereID:
                        EDITOR.SceneFactory.AddSphereMesh(this._core);
                        break;
                    case this._createGroundID:
                        EDITOR.SceneFactory.AddGroundMesh(this._core);
                        break;
                    case this._createPlane:
                        EDITOR.SceneFactory.AddPlaneMesh(this._core);
                        break;
                    default: break;
                }
            };
            return GeometriesMenuPlugin;
        }());
        EDITOR.GeometriesMenuPlugin = GeometriesMenuPlugin;
        // Finally, register the plugin using the plugin manager
        EDITOR.PluginManager.RegisterMainToolbarPlugin(GeometriesMenuPlugin);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LightsMenuPlugin = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function LightsMenuPlugin(mainToolbar) {
                // Public members
                this.menuID = "LIGHTS-MENU";
                this._addPointLight = "ADD-POINT-LIGHT";
                this._addDirectionalLight = "ADD-DIRECTIONAL-LIGHT";
                this._addSpotLight = "ADD-SPOT-LIGHT";
                this._addHemisphericLight = "ADD-HEMISPHERIC-LIGHT";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                // Create menu
                var menu = toolbar.createMenu("menu", this.menuID, "Lights", "icon-light");
                // Create items
                toolbar.createMenuItem(menu, "button", this._addPointLight, "Add Point Light", "icon-light");
                toolbar.createMenuItem(menu, "button", this._addDirectionalLight, "Add Directional Light", "icon-directional-light");
                toolbar.createMenuItem(menu, "button", this._addSpotLight, "Add Spot Light", "icon-directional-light");
                toolbar.createMenuItem(menu, "button", this._addHemisphericLight, "Add Hemispheric Light", "icon-light");
            }
            // When an item has been selected
            LightsMenuPlugin.prototype.onMenuItemSelected = function (selected) {
                switch (selected) {
                    case this._addPointLight:
                        EDITOR.SceneFactory.AddPointLight(this._core);
                        break;
                    case this._addDirectionalLight:
                        EDITOR.SceneFactory.AddDirectionalLight(this._core);
                        break;
                    case this._addSpotLight:
                        EDITOR.SceneFactory.AddSpotLight(this._core);
                        break;
                    case this._addHemisphericLight:
                        EDITOR.SceneFactory.AddHemisphericLight(this._core);
                        break;
                }
            };
            // Configure the sound
            LightsMenuPlugin.prototype._configureSound = function (sound) {
                BABYLON.Tags.EnableFor(sound);
                BABYLON.Tags.AddTagsTo(sound, "added");
            };
            return LightsMenuPlugin;
        }());
        EDITOR.LightsMenuPlugin = LightsMenuPlugin;
        // Register plugin
        EDITOR.PluginManager.RegisterMainToolbarPlugin(LightsMenuPlugin);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SoundsMenuPlugin = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function SoundsMenuPlugin(mainToolbar) {
                // Public members
                this.menuID = "SOUNDS-MENU";
                this._addSoundtrack = "ADD-SOUNDTRACK";
                this._add3DSound = "ADD-3D-SOUND";
                this._stopAllSounds = "STOP-ALL-SOUNDS";
                this._playAllSounds = "PLAY-ALL-SOUNDS";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                // Create menu
                var menu = toolbar.createMenu("menu", this.menuID, "Sound", "icon-sound");
                // Create items
                toolbar.createMenuItem(menu, "button", this._addSoundtrack, "Add Soundtracks", "icon-sound");
                toolbar.createMenuItem(menu, "button", this._add3DSound, "Add 3D Sound", "icon-sound");
                toolbar.addBreak(menu);
                toolbar.createMenuItem(menu, "button", this._stopAllSounds, "Stop All Sounds", "icon-play-game");
                toolbar.createMenuItem(menu, "button", this._playAllSounds, "Play All Sounds", "icon-error");
                // Etc.
            }
            // When an item has been selected
            SoundsMenuPlugin.prototype.onMenuItemSelected = function (selected) {
                var _this = this;
                // Switch selected menu id
                switch (selected) {
                    case this._addSoundtrack:
                    case this._add3DSound:
                        this._createInput(function (name, data) {
                            var options = {
                                autoplay: false,
                                spatialSound: selected === _this._add3DSound
                            };
                            var sound = new BABYLON.Sound(name, data, _this._core.currentScene, null, options);
                            EDITOR.Event.sendSceneEvent(sound, EDITOR.SceneEventType.OBJECT_ADDED, _this._core);
                            _this._configureSound(sound);
                        });
                        break;
                    case this._stopAllSounds:
                        this._stopPlayAllSounds(false);
                        break;
                    case this._playAllSounds:
                        this._stopPlayAllSounds(true);
                        break;
                    default: break;
                }
            };
            // Stop or play all sounds
            SoundsMenuPlugin.prototype._stopPlayAllSounds = function (play) {
                var soundtrack = this._core.currentScene.mainSoundTrack;
                for (var i = 0; i < soundtrack.soundCollection.length; i++) {
                    var sound = soundtrack.soundCollection[i];
                    if (play && !sound.isPlaying)
                        sound.play();
                    else
                        sound.stop();
                }
            };
            // Configure the sound
            SoundsMenuPlugin.prototype._configureSound = function (sound) {
                BABYLON.Tags.EnableFor(sound);
                BABYLON.Tags.AddTagsTo(sound, "added");
            };
            // Creates an input to select file
            SoundsMenuPlugin.prototype._createInput = function (callback) {
                var _this = this;
                var inputFiles = EDITOR.Tools.CreateFileInpuElement("BABYLON-EDITOR-LOAD-SOUND-FILE");
                inputFiles[0].onchange = function (data) {
                    for (var i = 0; i < data.target.files.length; i++) {
                        var file = data.target.files[i];
                        switch (file.type) {
                            case "audio/wav":
                            case "audio/x-wav":
                            case "audio/mp3":
                            case "audio/mpeg":
                            case "audio/mpeg3":
                            case "audio/x-mpeg-3":
                            case "audio/ogg":
                                BABYLON.Tools.ReadFile(file, _this._onReadFileCallback(file.name, callback), null, true);
                                BABYLON.FilesInput.FilesToLoad[name.toLowerCase()] = file;
                                break;
                        }
                    }
                    inputFiles.remove();
                };
                inputFiles.click();
            };
            // On read file callback
            SoundsMenuPlugin.prototype._onReadFileCallback = function (name, callback) {
                return function (data) {
                    callback(name, data);
                };
            };
            return SoundsMenuPlugin;
        }());
        EDITOR.SoundsMenuPlugin = SoundsMenuPlugin;
        // Register plugin
        EDITOR.PluginManager.RegisterMainToolbarPlugin(SoundsMenuPlugin);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ToolsMenu = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function ToolsMenu(mainToolbar) {
                // Public members
                this.menuID = "TOOLS-PLUGIN-MENU";
                this._openActionsBuilder = "OPEN-ACTIONS-BUILDER";
                this._openPostProcessBuilder = "OPEN-POST-PROCESS-BUILDER";
                this._openCosmos = "OPEN-COSMOS";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                // Create menu
                var menu = toolbar.createMenu("menu", this.menuID, "Tools", "icon-scenario");
                // Create items
                toolbar.createMenuItem(menu, "button", this._openActionsBuilder, "Open Actions Builder", "icon-graph");
                toolbar.addBreak(menu);
                toolbar.createMenuItem(menu, "button", this._openPostProcessBuilder, "Open Post-Process Builder", "icon-render");
                toolbar.addBreak(menu);
                toolbar.createMenuItem(menu, "button", this._openCosmos, "Open Cosmos Editor", "icon-shaders");
                // Test
                // ActionsBuilder.GetInstance(this._core);
                // new PostProcessBuilder(this._core);
                // new CosmosEditor(this._core);
            }
            // Called when a menu item is selected by the user
            ToolsMenu.prototype.onMenuItemSelected = function (selected) {
                switch (selected) {
                    case this._openActionsBuilder:
                        EDITOR.ActionsBuilder.GetInstance(this._core);
                        break;
                    case this._openPostProcessBuilder:
                        new EDITOR.PostProcessBuilder(this._core);
                        break;
                    case this._openCosmos:
                        new EDITOR.CosmosEditor(this._core);
                        break;
                    default: break;
                }
            };
            return ToolsMenu;
        }());
        EDITOR.ToolsMenu = ToolsMenu;
        // Finally, register the plugin using the plugin manager
        EDITOR.PluginManager.RegisterMainToolbarPlugin(ToolsMenu);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        (function (EACTION_TYPE) {
            EACTION_TYPE[EACTION_TYPE["TRIGGER"] = 0] = "TRIGGER";
            EACTION_TYPE[EACTION_TYPE["ACTION"] = 1] = "ACTION";
            EACTION_TYPE[EACTION_TYPE["CONTROL"] = 2] = "CONTROL";
        })(EDITOR.EACTION_TYPE || (EDITOR.EACTION_TYPE = {}));
        var EACTION_TYPE = EDITOR.EACTION_TYPE;
        var ActionsBuilder = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function ActionsBuilder(core) {
                this._babylonModule = null;
                this._actionsClasses = null;
                this._controlsClasses = null;
                this._containerElement = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._triggersList = null;
                this._actionsList = null;
                this._controlsList = null;
                this._graph = null;
                this._currentSelected = null;
                this._parametersEditor = null;
                this._currentNode = null;
                // Configure this
                this._core = core;
                core.eventReceivers.push(this);
                // Create UI
                this._createUI();
                if (!ActionsBuilder._Classes)
                    this._loadDefinitionsFile();
                else {
                    this._babylonModule = this._getModule("BABYLON");
                    this._configureUI();
                }
            }
            ActionsBuilder.GetInstance = function (core) {
                if (!ActionsBuilder._ActionsBuilderInstance)
                    ActionsBuilder._ActionsBuilderInstance = new ActionsBuilder(core);
                return ActionsBuilder._ActionsBuilderInstance;
            };
            // On event
            ActionsBuilder.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.DOCUMENT_UNCLICK) {
                    var mouseEvent = event.guiEvent.data;
                    var caller = $(mouseEvent.target);
                    // Until I find how to get the working canvas of cytoscape
                    if (caller.parent() && caller.parent().parent()) {
                        if (caller.parent().parent()[0] !== this._graph.canvasElement[0])
                            this._currentSelected = null;
                        else {
                            this._graph.setMousePosition(mouseEvent.offsetX, mouseEvent.offsetY);
                        }
                    }
                    this._containerElement.css("cursor", "default");
                    return false;
                }
                else if (event.eventType === EDITOR.EventType.SCENE_EVENT && event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                    var object = event.sceneEvent.object;
                    if (object instanceof BABYLON.AbstractMesh || object instanceof BABYLON.Scene) {
                        this._object = event.sceneEvent.object;
                        this._onObjectSelected();
                    }
                }
                return false;
            };
            /**
            * Disposes the application
            */
            ActionsBuilder.prototype.dispose = function () {
                this._core.removeEventReceiver(this);
                this._triggersList.destroy();
                this._actionsList.destroy();
                this._controlsList.destroy();
                this._layouts.destroy();
                ActionsBuilder._ActionsBuilderInstance = null;
            };
            /**
            * Serializes the graph
            */
            ActionsBuilder.prototype.serializeGraph = function (root, parent) {
                if (!root) {
                    root = {
                        name: this._object instanceof BABYLON.Scene ? "Scene" : this._object.name,
                        type: this._object instanceof BABYLON.Scene ? 3 : 4,
                        properties: [],
                        children: [],
                        comment: ""
                    };
                }
                var nodes = parent ? this._graph.getNodesWithParent(parent) : this._graph.getRootNodes();
                for (var i = 0; i < nodes.length; i++) {
                    var data = this._graph.getNodeData(nodes[i]).data;
                    var childData = {
                        name: data.name,
                        type: data.type,
                        properties: [],
                        children: [],
                        comment: data.comment
                    };
                    // Configure properties
                    for (var j = 0; j < data.properties.length; j++) {
                        var property = data.properties[j];
                        var newProperty = { name: property.name, value: property.value, targetType: property.targetType };
                        if (property.name === "target" && property.value === "Scene")
                            newProperty.targetType = "SceneProperties";
                        childData.properties.push(newProperty);
                    }
                    this.serializeGraph(childData, nodes[i]);
                    root.children.push(childData);
                }
                return root;
            };
            /**
            * Deserializes the graph
            */
            ActionsBuilder.prototype.deserializeGraph = function (data, parent) {
                for (var i = 0; i < data.children.length; i++) {
                    var child = data.children[i];
                    if (child.type === EACTION_TYPE.TRIGGER && child.children.length === 0)
                        continue;
                    var childData = {
                        name: child.name,
                        type: child.type,
                        properties: child.properties,
                        children: [],
                        comment: child.comment
                    };
                    var nodeData = {
                        class: this._getNodeParametersClass(childData.type, childData.name),
                        data: childData
                    };
                    var childNode = this._graph.addNode(child.name, child.name, this._getNodeColor(child.type), this._getNodeTypeString(child.type), parent, nodeData);
                    this.deserializeGraph(child, childNode);
                }
            };
            /**
            * Creates the UI
            */
            ActionsBuilder.prototype._createUI = function () {
                var _this = this;
                // Create tab and container
                this._containerID = this._core.editor.createContainer();
                this._tab = this._core.editor.createTab("Actions Builder", this._containerID, this, true);
                this._containerElement = $("#" + this._containerID);
                // Create layout
                this._layouts = new EDITOR.GUI.GUILayout(this._containerID, this._core);
                this._layouts.createPanel("SCENARIO-MAKER-MODULES", "left", 200, true).setContent("<div id=\"ACTIONS-BUILDER-TRIGGERS\" style=\"width: 100%; height: 33.33%;\"></div>" +
                    "<div id=\"ACTIONS-BUILDER-ACTIONS\" style=\"width: 100%; height: 33.33%;\"></div>" +
                    "<div id=\"ACTIONS-BUILDER-CONTROLS\" style=\"width: 100%; height: 33.33%;\"></div>");
                var mainPanel = this._layouts.createPanel("ACTIONS-BUILDER-MAIN-PANEL", "main", undefined, undefined).setContent("<div id=\"ACTIONS-BUILDER-CANVAS\" style=\"height: 100%; width: 100%; position: absolute;\"></div>");
                mainPanel.style = "overflow: hidden;";
                this._layouts.createPanel("ACTIONS-BUILDER-RIGHT-PANEL", "right", 300, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "ACTIONS-BUILDER-EDIT"));
                this._layouts.buildElement(this._containerID);
                // Create triggers list
                this._triggersList = new EDITOR.GUI.GUIGrid("ACTIONS-BUILDER-TRIGGERS", this._core);
                this._triggersList.showAdd = this._triggersList.showEdit = this._triggersList.showOptions = this._triggersList.showRefresh = false;
                this._triggersList.header = "Triggers";
                this._triggersList.fixedBody = true;
                this._triggersList.createColumn("name", "name", "100%");
                this._triggersList.onMouseDown = function () { return _this._onListElementClicked(_this._triggersList); };
                this._triggersList.buildElement("ACTIONS-BUILDER-TRIGGERS");
                // Create actions list
                this._actionsList = new EDITOR.GUI.GUIGrid("ACTIONS-BUILDER-ACTIONS", this._core);
                this._actionsList.showAdd = this._actionsList.showEdit = this._actionsList.showOptions = this._actionsList.showRefresh = false;
                this._actionsList.header = "Actions";
                this._actionsList.fixedBody = true;
                this._actionsList.multiSelect = false;
                this._actionsList.createColumn("name", "name", "100%");
                this._actionsList.onMouseDown = function () { return _this._onListElementClicked(_this._actionsList); };
                this._actionsList.buildElement("ACTIONS-BUILDER-ACTIONS");
                // Create controls list
                this._controlsList = new EDITOR.GUI.GUIGrid("ACTIONS-BUILDER-CONTROLS", this._core);
                this._controlsList.showAdd = this._controlsList.showEdit = this._controlsList.showOptions = this._controlsList.showRefresh = false;
                this._controlsList.header = "Controls";
                this._controlsList.fixedBody = true;
                this._controlsList.multiSelect = false;
                this._controlsList.createColumn("name", "name", "100%");
                this._controlsList.onMouseDown = function () { return _this._onListElementClicked(_this._controlsList); };
                this._controlsList.buildElement("ACTIONS-BUILDER-CONTROLS");
                // Create graph
                this._graph = new EDITOR.ActionsBuilderGraph(this._core);
                this._graph.onMouseUp = function () { return _this._onMouseUpOnGraph(); };
                // Create parameters
                this._parametersEditor = new EDITOR.ActionsBuilderParametersEditor(this._core, "ACTIONS-BUILDER-EDIT");
                this._parametersEditor.onSave = function () { return _this._onSave(); };
                this._parametersEditor.onRemove = function () { return _this._onRemoveNode(false); };
                this._parametersEditor.onRemoveAll = function () { return _this._onRemoveNode(true); };
            };
            // Fills the lists on the left (triggers, actions and controls)
            ActionsBuilder.prototype._configureUI = function () {
                // Triggers
                for (var i = BABYLON.ActionManager.NothingTrigger; i <= BABYLON.ActionManager.OnKeyUpTrigger; i++) {
                    this._triggersList.addRecord({ recid: i, name: BABYLON.ActionManager.GetTriggerName(i), style: "background-color: rgb(133, 154, 185)" });
                }
                this._triggersList.refresh();
                // Actions
                this._actionsClasses = this._getClasses(this._babylonModule, "BABYLON.Action");
                for (var i = 0; i < this._actionsClasses.length; i++) {
                    this._actionsList.addRecord({ recid: i, name: this._actionsClasses[i].name, style: "background-color: rgb(182, 185, 132)" });
                }
                this._actionsList.refresh();
                // Controls
                this._controlsClasses = this._getClasses(this._babylonModule, "BABYLON.Condition");
                for (var i = 0; i < this._controlsClasses.length; i++) {
                    this._controlsList.addRecord({ recid: i, name: this._controlsClasses[i].name, style: "background-color: rgb(185, 132, 140)" });
                }
                this._controlsList.refresh();
                // Graph
                this._graph.createGraph("ACTIONS-BUILDER-CANVAS");
            };
            // When the user removes a node
            ActionsBuilder.prototype._onRemoveNode = function (removeChildren) {
                if (!this._currentNode)
                    return;
                this._graph.removeNode(this._currentNode, removeChildren);
            };
            // When the user selects an object, configure the graph
            ActionsBuilder.prototype._onObjectSelected = function () {
                if (!ActionsBuilder._Classes)
                    return;
                var actionManager = null;
                this._graph.clear();
                var metadata = EDITOR.SceneManager.GetCustomMetadata("ActionsBuilder") || {};
                var graph = metadata[this._object instanceof BABYLON.Scene ? "Scene" : this._object.name];
                if (graph) {
                    this.deserializeGraph(graph, "");
                    this._graph.layout();
                }
            };
            // When the user saves the graph
            ActionsBuilder.prototype._onSave = function () {
                var _this = this;
                if (!this._object) {
                    // Create a window to select an object
                    var inputID = EDITOR.SceneFactory.GenerateUUID();
                    // Window
                    var window = new EDITOR.GUI.GUIWindow("SELECT-OBJECT-WINDOW", this._core, "Select object", EDITOR.GUI.GUIElement.CreateElement("input", inputID, "width: 100%;"), new BABYLON.Vector2(400, 150), ["Select", "Close"]);
                    window.setOnCloseCallback(function () {
                        window.destroy();
                    });
                    window.buildElement(null);
                    // List
                    var items = [];
                    this._parametersEditor.populateStringArray(items, ["Scene"]);
                    this._parametersEditor.populateStringArray(items, this._core.currentScene.meshes, "name");
                    var list = new EDITOR.GUI.GUIList(inputID, this._core);
                    list.renderDrop = true;
                    list.items = items;
                    list.buildElement(inputID);
                    // Events
                    window.onButtonClicked = function (buttonId) {
                        if (buttonId === "Select") {
                            var selected = list.getValue();
                            if (selected === "Scene")
                                _this._object = _this._core.currentScene;
                            else
                                _this._object = _this._core.currentScene.getMeshByName(selected);
                        }
                        window.close();
                        _this._onSave();
                    };
                }
                else {
                    var graph = this.serializeGraph();
                    var metadata = EDITOR.SceneManager.GetCustomMetadata("ActionsBuilder") || {};
                    metadata[this._object instanceof BABYLON.Scene ? "Scene" : this._object.name] = graph;
                    EDITOR.SceneManager.AddCustomMetadata("ActionsBuilder", metadata);
                    var actionManager = null;
                    if (!this._core.isPlaying)
                        actionManager = this._object.actionManager;
                    BABYLON.ActionManager.Parse(graph, this._object, this._core.currentScene);
                    if (!this._core.isPlaying) {
                        if (this._object instanceof BABYLON.AbstractMesh)
                            EDITOR.SceneManager._ConfiguredObjectsIDs[this._object.id].actionManager = this._object.actionManager;
                        else
                            EDITOR.SceneManager._SceneConfiguration.actionManager = this._object.actionManager;
                        this._object.actionManager = actionManager;
                    }
                }
                this._graph.layout();
            };
            // When a list element is clicked
            ActionsBuilder.prototype._onListElementClicked = function (list) {
                var selected = list.getSelectedRows();
                this._containerElement.css("cursor", "copy");
                if (selected.length) {
                    this._currentSelected = { id: list.getRow(selected[0]).name, list: list };
                }
            };
            // Returns the node class parameters for the given type
            ActionsBuilder.prototype._getNodeParametersClass = function (type, name) {
                if (type === EACTION_TYPE.ACTION)
                    return this._getClass(this._actionsClasses, name);
                else if (type === EACTION_TYPE.CONTROL)
                    return this._getClass(this._controlsClasses, name);
                return null;
            };
            // Returns the node color for the given type
            ActionsBuilder.prototype._getNodeColor = function (type) {
                var color = "rgb(133, 154, 185)"; // Trigger as default
                if (type === EACTION_TYPE.ACTION)
                    return "rgb(182, 185, 132)";
                else if (type === EACTION_TYPE.CONTROL)
                    return "rgb(185, 132, 140)";
                return color;
            };
            // Returns the node's type string from type
            ActionsBuilder.prototype._getNodeTypeString = function (type) {
                var typeStr = "trigger"; // Trigger as default
                if (type === EACTION_TYPE.ACTION)
                    return "action";
                else if (type === EACTION_TYPE.CONTROL)
                    return "control";
                return typeStr;
            };
            // When the user unclicks on the graph
            ActionsBuilder.prototype._onMouseUpOnGraph = function () {
                this._containerElement.css("cursor", "default");
                if (this._currentSelected) {
                    // Get target type and choose if add node or not
                    var color = "rgb(133, 154, 185)"; // Trigger as default
                    var type = "trigger"; // Trigger as default
                    var data = {
                        class: null,
                        data: { name: this._currentSelected.id, properties: [], type: 0 /*Trigger as default*/ }
                    };
                    if (this._currentSelected.list === this._triggersList) {
                        this._configureActionsBuilderData(data, EACTION_TYPE.TRIGGER);
                    }
                    else if (this._currentSelected.list === this._actionsList) {
                        color = "rgb(182, 185, 132)";
                        type = "action";
                        data.class = this._getClass(this._actionsClasses, this._currentSelected.id);
                        this._configureActionsBuilderData(data, EACTION_TYPE.ACTION);
                    }
                    else if (this._currentSelected.list === this._controlsList) {
                        color = "rgb(185, 132, 140)";
                        type = "control";
                        data.class = this._getClass(this._controlsClasses, this._currentSelected.id);
                        this._configureActionsBuilderData(data, EACTION_TYPE.CONTROL);
                    }
                    // Check target type
                    var targetType = this._graph.getTargetNodeType();
                    if (type === "trigger" && targetType !== null || type !== "trigger" && targetType === null) {
                        this._currentSelected = null;
                        return;
                    }
                    // Check children.length > 1 and not a trigger
                    var targetNodeId = this._graph.getTargetNodeId();
                    if (targetNodeId) {
                        var targetNodeData = this._graph.getNodeData(targetNodeId);
                        var children = this._graph.getNodesWithParent(targetNodeId);
                        if (children.length > 0 && targetNodeData.data.type !== EACTION_TYPE.TRIGGER) {
                            this._currentSelected = null;
                            return;
                        }
                    }
                    // Finally, add node and configure it
                    this._graph.addNode(this._currentSelected.id, this._currentSelected.id, color, type, null, data);
                    this._currentSelected = null;
                }
                else {
                    var target = this._graph.getTargetNodeId();
                    if (!target)
                        return;
                    var data = this._graph.getNodeData(target);
                    this._parametersEditor.drawProperties(data);
                    this._currentNode = target;
                }
            };
            // Configures the actions builder data property
            // used by actions serializer / deserializer
            ActionsBuilder.prototype._configureActionsBuilderData = function (data, type) {
                /*
                Example of serialized value:
    
                "actions": {
                    "children": [
                        {
                            "type": 0,
                            "children": [
                                {
                                    "type": 1,
                                    "children": [],
                                    "name": "InterpolateValueAction",
                                    "properties": [
                                        {
                                            "name": "target",
                                            "targetType": "MeshProperties",
                                            "value": "sphereGlass"
                                        },
                                        {
                                            "name": "propertyPath",
                                            "value": "position"
                                        },
                                        {
                                            "name": "value",
                                            "value": "0, 0, 0"
                                        },
                                        {
                                            "name": "duration",
                                            "value": "1000"
                                        },
                                        {
                                            "name": "stopOtherAnimations",
                                            "value": "false"
                                        }
                                    ]
                                }
                            ],
                            "name": "OnEveryFrameTrigger",
                            "properties": []
                        }
                    ],
                    "name": "Scene",
                    "type": 3,
                    "properties": []
                }
                */
                data.data.type = type;
                if (!data.class) {
                    // It's a trigger
                    var triggerName = data.data.name;
                    if (triggerName === "OnKeyDownTrigger" || triggerName === "OnKeyUpTrigger") {
                        data.data.properties.push({ name: "parameter", value: "a", targetType: null });
                    }
                    else if (triggerName === "OnIntersectionEnterTrigger" || triggerName === "OnIntersectionExitTrigger") {
                        data.data.properties.push({ name: "target", value: null, targetType: "MeshProperties" });
                    }
                }
                else {
                    // It's an action or condition
                    var constructor = data.class.constructors[0];
                    var allowedTypes = ["number", "string", "boolean", "any", "Vector3", "Vector2", "Sound", "ParticleSystem"];
                    for (var i = 0; i < constructor.parameters.length; i++) {
                        var param = constructor.parameters[i];
                        var property = {
                            name: param.name,
                            value: null,
                            targetType: null
                        };
                        if (param.name === "triggerOptions" || param.name === "condition" || allowedTypes.indexOf(param.type) === -1)
                            continue;
                        if (param.name === "target") {
                            property.targetType = null;
                            property.value = "Scene"; //this._core.currentScene.meshes.length > 0 ? this._core.currentScene.meshes[0].name : "";
                        }
                        data.data.properties.push(property);
                    }
                }
            };
            // Loads the definitions file which contains definitions of the Babylon.js framework
            // defined in a more simple JSON format
            ActionsBuilder.prototype._loadDefinitionsFile = function () {
                var _this = this;
                this._layouts.lockPanel("main", "Loading...", true);
                BABYLON.Tools.LoadFile("website/resources/classes.min.json", function (data) {
                    ActionsBuilder._Classes = JSON.parse(data);
                    _this._babylonModule = _this._getModule("BABYLON");
                    _this._configureUI();
                    _this._layouts.unlockPanel("main");
                });
            };
            // Returns a module of the definitions file
            ActionsBuilder.prototype._getModule = function (name) {
                for (var i = 0; i < ActionsBuilder._Classes.length; i++) {
                    var module = ActionsBuilder._Classes[i];
                    if (module && module.name === name)
                        return module;
                }
                return null;
            };
            // Returns the classes of the the given module
            // Only classes that heritages "heritates"'s value ?
            ActionsBuilder.prototype._getClasses = function (module, heritates) {
                var classes = [];
                for (var i = 0; i < module.classes.length; i++) {
                    var currentClass = module.classes[i];
                    if (ActionsBuilder._ExcludedClasses.indexOf(currentClass.name) !== -1)
                        continue;
                    if (heritates) {
                        if (!currentClass.heritageClauses || !currentClass.heritageClauses.some(function (value) { return value === heritates; }))
                            continue;
                    }
                    classes.push(currentClass);
                }
                return classes;
            };
            // Returns the class which has the given name
            ActionsBuilder.prototype._getClass = function (classes, name) {
                for (var i = 0; i < classes.length; i++) {
                    if (classes[i].name === name)
                        return classes[i];
                }
                return null;
            };
            // Static members
            ActionsBuilder._ActionsBuilderInstance = null;
            ActionsBuilder._Classes = null;
            ActionsBuilder._ExcludedClasses = [
                "PredicateCondition",
                "ExecuteCodeAction",
                "CombineAction"
            ];
            return ActionsBuilder;
        }());
        EDITOR.ActionsBuilder = ActionsBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ActionsBuilderGraph = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function ActionsBuilderGraph(core) {
                // Public members
                this.canvasElement = null;
                this.onMouseUp = function () { };
                this._mousex = 0;
                this._mousey = 0;
                // Configure this
                this._core = core;
            }
            // Creates the graph
            ActionsBuilderGraph.prototype.createGraph = function (containerID) {
                var _this = this;
                this.canvasElement = $("#" + containerID);
                this._graph = cytoscape({
                    container: this.canvasElement[0],
                    zoomingEnabled: false,
                    layout: {
                        name: "grid"
                    }
                });
                this.canvasElement.on("mousemove", function (event) {
                    _this.setMousePosition(event.offsetX, event.offsetY);
                });
                this.canvasElement.on("mouseup", function (event) {
                    _this._graph.trigger("mouseup");
                });
                this._graph.on("mouseup", function (event) {
                    if (_this.onMouseUp)
                        _this.onMouseUp();
                });
                // Layout
                this._graph.layout({ name: "grid" });
            };
            // Clears the graph
            ActionsBuilderGraph.prototype.clear = function () {
                this._graph.remove(this._graph.nodes());
            };
            // Layout
            ActionsBuilderGraph.prototype.layout = function () {
                //this._graph.layout(<any>{ name: "breadthfirst", condense: true, padding: 45, directed: false, animate: true });
                this._graph.layout({ name: 'breadthfirst', directed: true, padding: 0, spacingFactor: 1, animate: true });
            };
            // Sets the mouse position
            ActionsBuilderGraph.prototype.setMousePosition = function (x, y) {
                this._mousex = x;
                this._mousey = y;
            };
            // Adds a trigger node
            ActionsBuilderGraph.prototype.addNode = function (id, name, color, type, parent, data) {
                // Create node
                var node = this._graph.add({
                    data: { id: id + "_" + EDITOR.SceneFactory.GenerateUUID(), name: name, type: type, actionsBuilderData: data },
                });
                // If parent
                var parentNode = parent && parent !== "" ? this._graph.nodes("[id=\"" + parent + "\"]") : parent === "" ? null : this._getNodeAtPosition(this._mousex, this._mousey);
                if (parentNode) {
                    var edge = this._graph.add({
                        data: { name: "", source: parentNode.id(), target: node.id() }
                    });
                    edge.css("target-arrow-shape", "triangle");
                    edge.css("curve-style", "unbundled-bezier");
                    edge.css("control-point-distances", "10 -10");
                    edge.css("control-point-weights", "0.25 0.75");
                    edge.css("label", (data["data"] && data["data"]["comment"] ? data["data"]["comment"].substr(0, 20) + "..." : ""));
                }
                // Configure node
                node.css("shape", "roundrectangle");
                node.css("background-color", color);
                node.css("width", "200px");
                node.css("height", "40px");
                node.css("label", name.length > 23 ? name.substr(0, 20) + "..." : name);
                node.css("text-valign", "center");
                node.css("text-halign", "center");
                node.renderedPosition({ x: this._mousex, y: parentNode ? this._mousey + parentNode.height() + 35 : this._mousey });
                return node.id();
            };
            // Removes the given node id
            ActionsBuilderGraph.prototype.removeNode = function (id, removeChildren) {
                if (removeChildren === void 0) { removeChildren = false; }
                var node = this._graph.nodes("[id=\"" + id + "\"]");
                if (node.length === 0)
                    return;
                var children = this.getNodesWithParent(id);
                if (removeChildren) {
                    for (var i = 0; i < children.length; i++) {
                        this.removeNode(children[i], removeChildren);
                    }
                }
                var edges = this._graph.edges();
                for (var i = 0; i < edges.length; i++) {
                    var data = edges[i].data();
                    if (data.target === id) {
                        edges[i].remove();
                        if (children.length !== 0 && !removeChildren) {
                            var edge = this._graph.add({
                                data: { name: "", source: data.source, target: children[0] }
                            });
                            edge.css("target-arrow-shape", "triangle");
                            edge.css("curve-style", "unbundled-bezier");
                            edge.css("control-point-distances", "10 -10");
                            edge.css("control-point-weights", "0.25 0.75");
                        }
                        break;
                    }
                }
                node.remove();
            };
            // Returns the target node type
            // For example, a trigger MUSTN'T have any parent
            ActionsBuilderGraph.prototype.getTargetNodeType = function () {
                var target = this._getNodeAtPosition(this._mousex, this._mousey);
                return target ? target.data().type : null;
            };
            // Returns the target node id
            ActionsBuilderGraph.prototype.getTargetNodeId = function () {
                var target = this._getNodeAtPosition(this._mousex, this._mousey);
                return target ? target.id() : null;
            };
            // Returns the given node data
            ActionsBuilderGraph.prototype.getNodeData = function (id) {
                var node = this._graph.nodes("[id=\"" + id + "\"]");
                return node.length > 0 ? node[0].data().actionsBuilderData : null;
            };
            // Returns the nodes which have the given parent
            ActionsBuilderGraph.prototype.getNodesWithParent = function (parent) {
                var edges = this._graph.edges();
                var nodes = [];
                for (var i = 0; i < edges.length; i++) {
                    if (edges[i].data().source === parent)
                        nodes.push(edges[i].data().target);
                }
                return nodes;
            };
            // Returns the root nodes
            ActionsBuilderGraph.prototype.getRootNodes = function () {
                var edges = this._graph.edges();
                var nodes = this._graph.nodes();
                var rootNodes = [];
                var found = false;
                for (var i = 0; i < nodes.length; i++) {
                    found = false;
                    for (var j = 0; j < edges.length; j++) {
                        if (edges[j].data().target === nodes[i].id()) {
                            found = true;
                            break;
                        }
                    }
                    if (!found)
                        rootNodes.push(nodes[i].id());
                }
                return rootNodes;
            };
            // Returns the node which is a position (x, y)
            ActionsBuilderGraph.prototype._getNodeAtPosition = function (x, y) {
                var nodes = this._graph.nodes();
                for (var i = 0; i < nodes.length; i++) {
                    var node = nodes[i];
                    var position = node.renderedPosition();
                    if (x >= (position.x - node.width() / 2) && x <= (position.x + node.width() / 2) && y >= (position.y - node.height() / 2) && y <= (position.y + node.height() / 2))
                        return node;
                }
                return null;
            };
            return ActionsBuilderGraph;
        }());
        EDITOR.ActionsBuilderGraph = ActionsBuilderGraph;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ActionsBuilderParametersEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            * @param containerID: the div container ID
            */
            function ActionsBuilderParametersEditor(core, containerID) {
                // Public members
                this.onSave = function () { };
                this.onRemove = function () { };
                this.onRemoveAll = function () { };
                this._guiElements = [];
                this._currentTarget = null;
                this._currentProperty = null;
                this._editors = [];
                // Initialize
                this._core = core;
                this._container = $("#" + containerID);
                this._currentTarget = core.currentScene;
                this._destroyGUIElements();
            }
            // Creates the fields to configure the currently selected
            // element (action, trigger, etc.)
            ActionsBuilderParametersEditor.prototype.drawProperties = function (data) {
                var _this = this;
                var actionsBuilderData = data.data;
                this._destroyGUIElements();
                this._createHeader(actionsBuilderData.name, data.data.type);
                // Add "remove" buttons
                var removeButton = EDITOR.GUI.GUIElement.CreateButton(this._container, EDITOR.SceneFactory.GenerateUUID(), "Remove");
                removeButton.css("width", "100%");
                removeButton.addClass("btn-orange");
                removeButton.click(function (event) {
                    _this._destroyGUIElements();
                    if (_this.onRemove)
                        _this.onRemove();
                });
                this._container.append("<br />");
                this._container.append("<hr>");
                var removeAllButton = EDITOR.GUI.GUIElement.CreateButton(this._container, EDITOR.SceneFactory.GenerateUUID(), "Remove Branch");
                removeAllButton.css("width", "100%");
                removeAllButton.addClass("btn-red");
                removeAllButton.click(function (event) {
                    _this._destroyGUIElements();
                    if (_this.onRemoveAll)
                        _this.onRemoveAll();
                });
                this._container.append("<br />");
                this._container.append("<hr>");
                /*
                if (!data.class)
                    return;
                */
                // Create parameters fields
                var constructor = data.class ? data.class.constructors[0] : null;
                for (var i = 0; i < actionsBuilderData.properties.length; i++) {
                    var property = actionsBuilderData.properties[i];
                    var propertyType = constructor ? this._getParameterType(constructor, property.name) : "string";
                    if (property.name === "target") {
                        if (property.value === null) {
                            property.value = "Scene"; // At least a scene
                            if (property.targetType === "MeshProperties")
                                property.value = this._core.currentScene.meshes[0].name;
                            else if (property.targetType === "LightProperties")
                                property.value = this._core.currentScene.lights[0].name;
                            else if (property.targetType === "CameraProperties")
                                property.value = this._core.currentScene.cameras[0].name;
                        }
                        var list = this._createListOfElements(property, this._getCollectionOfObjects(property.targetType), function (value) {
                            if (value === "Scene")
                                _this._currentTarget = _this._core.currentScene;
                            else
                                _this._currentTarget = _this._core.currentScene.getNodeByName(value);
                            //property.value = "";
                            _this.drawProperties(data);
                        });
                    }
                    else if (property.name === "propertyPath") {
                        var list = this._createListOfElements(property, this._createPropertyPath(this._currentTarget));
                        if (property.value === null)
                            property.value = list.items[0];
                    }
                    else if (property.name === "sound") {
                        var list = this._createListOfElements(property, this._createSoundsList());
                        if (property.value === null)
                            this._core.currentScene.mainSoundTrack.soundCollection.length > 0 ? property.value = list.items[0] : property.value = "";
                    }
                    else if (property.name === "particleSystem") {
                        var list = this._createListOfElements(property, this._createParticleSystemList());
                        if (property.value === null)
                            this._core.currentScene.particleSystems.length > 0 ? property.value = list.items[0] : property.value = "";
                    }
                    else if (propertyType === "boolean") {
                        this._createCheckbox(property);
                        if (property.value === null)
                            property.value = "false";
                    }
                    else if (propertyType === "string" && property.name === "data") {
                        var defaultData = [
                            "{",
                            "   eventName: \"myEvent\",",
                            "   eventData: {",
                            "       ",
                            "   }",
                            "}"
                        ].join("\n");
                        this._createEditor(property, defaultData);
                    }
                    else if (propertyType === "number" || propertyType === "string" || propertyType === "any") {
                        if (property.value === "true" || property.value === "false")
                            this._createCheckbox(property, "Set Active");
                        else
                            this._createField(property);
                        if (property.value === null)
                            (propertyType === "number") ? property.value = "0" : property.value = "new value";
                    }
                    this._container.append("<hr>");
                }
                // Comments
                var commentsID = EDITOR.SceneFactory.GenerateUUID();
                this._container.append(EDITOR.GUI.GUIElement.CreateElement("textarea", commentsID, "width: 100%; height: 150px;", data.data.comment || "your comment..."));
                var comments = $("#" + commentsID);
                comments.keyup(function (event) {
                    data.data.comment = comments.val();
                });
                this._container.append("<br />");
                this._container.append("<hr>");
            };
            // Populates the given string array with another
            ActionsBuilderParametersEditor.prototype.populateStringArray = function (array, values, property) {
                for (var i = 0; i < values.length; i++) {
                    if (property)
                        array.push(values[i][property]);
                    else
                        array.push(values[i]);
                }
            };
            // Creates a generic field
            ActionsBuilderParametersEditor.prototype._createField = function (property) {
                var text = EDITOR.GUI.GUIElement.CreateElement("p", EDITOR.SceneFactory.GenerateUUID(), "width: 100%; height: 0px;", property.name + ":", true);
                this._container.append(text);
                var id = name + EDITOR.SceneFactory.GenerateUUID();
                var input = EDITOR.GUI.GUIElement.CreateElement(["input", "type=\"text\""], id, "width: 100%;", "", true);
                this._container.append(input);
                var inputElement = $("#" + id);
                inputElement.val(property.value);
                inputElement.keyup(function (event) {
                    property.value = inputElement.val();
                });
                return $("#" + id);
            };
            // Creates a checkbox element
            ActionsBuilderParametersEditor.prototype._createCheckbox = function (property, customText) {
                var id = name + EDITOR.SceneFactory.GenerateUUID();
                var input = EDITOR.GUI.GUIElement.CreateElement(["input", "type=\"checkbox\""], id, "", customText || property.name + " ", true);
                this._container.append(input);
                var inputElement = $("#" + id);
                inputElement[0].checked = property.value === "true";
                inputElement.change(function (event) {
                    property.value = event.target.checked ? "true" : "false";
                });
                return $("#" + id);
            };
            // Creates a list of elements (GUI.GUIList)
            ActionsBuilderParametersEditor.prototype._createListOfElements = function (property, items, callback) {
                var text = EDITOR.GUI.GUIElement.CreateElement("p", EDITOR.SceneFactory.GenerateUUID(), "width: 100%; height: 0px;", property.name + ":", true);
                this._container.append(text);
                var id = property.name + EDITOR.SceneFactory.GenerateUUID();
                var input = EDITOR.GUI.GUIElement.CreateElement("input", id, "width: 100%;", "", true);
                this._container.append(input);
                var list = new EDITOR.GUI.GUIList(id, this._core);
                list.renderDrop = true;
                if (items)
                    list.items = items;
                else {
                    list.items = [];
                    this.populateStringArray(list.items, ["Scene"]);
                    this.populateStringArray(list.items, this._core.currentScene.meshes, "name");
                    this.populateStringArray(list.items, this._core.currentScene.lights, "name");
                    this.populateStringArray(list.items, this._core.currentScene.cameras, "name");
                    this.populateStringArray(list.items, this._core.currentScene.particleSystems, "name");
                }
                list.selected = property.value;
                list.buildElement(id);
                list.onChange = function (selected) {
                    property.value = selected;
                    if (callback)
                        callback(property.value);
                };
                return list;
            };
            // Creates a new editor
            ActionsBuilderParametersEditor.prototype._createEditor = function (property, defaultValue) {
                var divID = EDITOR.SceneFactory.GenerateUUID();
                var div = EDITOR.GUI.GUIElement.CreateElement("div", divID, "width: 100%; height: 300px;", "", true);
                this._container.append(div);
                var editor = ace.edit(divID);
                editor.setTheme("ace/theme/clouds");
                editor.getSession().setMode("ace/mode/javascript");
                editor.getSession().setValue(property.value || defaultValue);
                editor.getSession().on("change", function (e) { return property.value = editor.getSession().getValue(); });
                this._editors.push(editor);
                return editor;
            };
            // Creates the header
            ActionsBuilderParametersEditor.prototype._createHeader = function (name, type) {
                var color = "";
                switch (type) {
                    case EDITOR.EACTION_TYPE.TRIGGER:
                        color = "rgb(133, 154, 185)";
                        break;
                    case EDITOR.EACTION_TYPE.ACTION:
                        color = "rgb(182, 185, 132)";
                        break;
                    case EDITOR.EACTION_TYPE.CONTROL:
                        color = "rgb(185, 132, 140)";
                        break;
                }
                // Div container
                var divID = EDITOR.SceneFactory.GenerateUUID();
                var div = EDITOR.GUI.GUIElement.CreateElement("div", divID, "width: 100%; height: 30px; text-align: center; border: 1px solid grey; margin-left: auto; margin-right: auto; background: " + color, name, true);
                this._container.append(div);
                // Text
                var divContainer = $(divID, this._container);
                var text = EDITOR.GUI.GUIElement.CreateElement("a", divID, "width: 100%; height: 100%; vertical-align: middle; line-height: 25px;", name, true);
                divContainer.append(text);
            };
            // Destroys the existing elements
            ActionsBuilderParametersEditor.prototype._destroyGUIElements = function () {
                var _this = this;
                for (var i = 0; i < this._guiElements.length; i++)
                    this._guiElements[i].destroy();
                for (var i = 0; i < this._editors.length; i++)
                    this._editors[i].destroy();
                this._container.empty();
                this._guiElements = [];
                this._editors = [];
                // Create save button
                var saveButton = EDITOR.GUI.GUIElement.CreateButton(this._container, EDITOR.SceneFactory.GenerateUUID(), "Save");
                saveButton.css("width", "100%");
                saveButton.css("position", "absolute");
                saveButton.css("bottom", "10px");
                saveButton.addClass("btn-green");
                saveButton.click(function (event) {
                    if (_this.onSave)
                        _this.onSave();
                });
            };
            // Returns the parameter's type
            ActionsBuilderParametersEditor.prototype._getParameterType = function (entry, parameter) {
                for (var i = 0; i < entry.parameters.length; i++) {
                    if (entry.parameters[i].name === parameter)
                        return entry.parameters[i].type;
                }
                return null;
            };
            // Returns the effective target of an object
            ActionsBuilderParametersEditor.prototype._getEffectiveTarget = function (object, target) {
                var properties = target.split(".");
                for (var i = 0; i < properties.length - 1; i++)
                    object = object[properties[i]];
                return object;
            };
            // Creates an array of elements
            ActionsBuilderParametersEditor.prototype._createPropertyPath = function (node, properties) {
                if (!properties)
                    properties = [];
                var allowedTypes = ["number", "string", "boolean"];
                var allowedClasses = ["Vector3", "Vector2", "Color3", "Material"];
                var fillProperties = function (object, path) {
                    for (var thing in object) {
                        if (thing[0] === "_")
                            continue;
                        var value = object[thing];
                        if (allowedTypes.indexOf(typeof value) !== -1) {
                            properties.push(path + thing);
                        }
                        else if (allowedClasses.indexOf(EDITOR.Tools.GetConstructorName(value)) !== -1) {
                            fillProperties(value, path + thing + ".");
                        }
                    }
                };
                fillProperties(node, "");
                return properties;
            };
            // Creates an array of sounds names
            ActionsBuilderParametersEditor.prototype._createSoundsList = function () {
                var sounds = [];
                for (var i = 0; i < this._core.currentScene.mainSoundTrack.soundCollection.length; i++) {
                    sounds.push(this._core.currentScene.mainSoundTrack.soundCollection[i].name);
                }
                return sounds;
            };
            // Creates an array of particle systems ids
            ActionsBuilderParametersEditor.prototype._createParticleSystemList = function () {
                var ps = [];
                for (var i = 0; i < this._core.currentScene.particleSystems.length; i++) {
                    ps.push(this._core.currentScene.particleSystems[i].id);
                }
                return ps;
            };
            // Returns the colleciton of objects according to type
            ActionsBuilderParametersEditor.prototype._getCollectionOfObjects = function (type) {
                var array = [];
                if (type === "SceneProperties")
                    return ["Scene"];
                if (type === "MeshProperties")
                    this.populateStringArray(array, this._core.currentScene.meshes, "name");
                if (type === "LightProperties")
                    this.populateStringArray(array, this._core.currentScene.lights, "name");
                if (type === "CameraProperties")
                    this.populateStringArray(array, this._core.currentScene.cameras, "name");
                return array.length === 0 ? null : array;
            };
            return ActionsBuilderParametersEditor;
        }());
        EDITOR.ActionsBuilderParametersEditor = ActionsBuilderParametersEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var PostProcessBuilder = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function PostProcessBuilder(core) {
                var _this = this;
                this._engine = null;
                this._scene = null;
                this._camera = null;
                this._texture = null;
                this._scenePassPostProcess = null;
                this._containerElement = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._mainPanel = null;
                this._postProcessesList = null;
                this._toolbar = null;
                this._glslTabId = null;
                this._configurationTabId = null;
                this._currentTabId = null;
                this._selectTemplateWindow = null;
                this._editor = null;
                this._console = null;
                this._currentSelected = 0;
                // Configure this
                this._core = core;
                core.eventReceivers.push(this);
                // Finalize
                this._getConfigurationFile(function () {
                    // Metadatas
                    _this._datas = EDITOR.SceneManager.GetCustomMetadata("PostProcessBuilder");
                    if (!_this._datas) {
                        _this._datas = [{ name: "NewPostProcess", id: EDITOR.SceneFactory.GenerateUUID(), program: BABYLON.Effect.ShadersStore["passPixelShader"], configuration: PostProcessBuilder._ConfigurationFileContent }];
                        EDITOR.SceneManager.AddCustomMetadata("PostProcessBuilder", _this._datas);
                    }
                    // Create UI
                    _this._createUI();
                    _this._onPostProcessSelected([0]);
                    // Extensions
                    _this._extension = new EDITOR.EXTENSIONS.PostProcessBuilderExtension(_this._scene);
                    _this._extension.placeHolderTexture = _this._texture;
                    _this._mainExtension = new EDITOR.EXTENSIONS.PostProcessBuilderExtension(_this._core.currentScene);
                });
            }
            /**
            * Disposes the application
            */
            PostProcessBuilder.prototype.dispose = function () {
                // Remove post-processes
                for (var i = 0; i < this._datas.length; i++) {
                    if (this._datas[i].postProcess) {
                        this._mainExtension.removePostProcess(this._datas[i].postProcess);
                        if (this._datas[i].editorPostProcess)
                            this._extension.removePostProcess(this._datas[i].editorPostProcess);
                        this._datas[i].postProcess = null;
                        this._datas[i].editorPostProcess = null;
                    }
                }
                // Finalize dispose
                this._core.removeEventReceiver(this);
                this._toolbar.destroy();
                this._postProcessesList.destroy();
                this._editor.destroy();
                this._console.destroy();
                this._layouts.destroy();
                this._engine.dispose();
            };
            /**
            * On event
            */
            PostProcessBuilder.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.KEY_EVENT) {
                    if (event.keyEvent.control && event.keyEvent.key === "b" && !event.keyEvent.isDown) {
                        this._onApplyPostProcessChain(false);
                    }
                }
                return false;
            };
            // Creates the UI
            PostProcessBuilder.prototype._createUI = function () {
                var _this = this;
                // Create tab and container
                this._containerID = this._core.editor.createContainer();
                this._tab = this._core.editor.createTab("Post-Process Builder", this._containerID, this, true);
                this._containerElement = $("#" + this._containerID);
                // Layout
                this._layouts = new EDITOR.GUI.GUILayout(this._containerID, this._core);
                this._layouts.createPanel("POST-PROCESS-BUILDER-TOP-PANEL", "top", 45, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-TOOLBAR"));
                this._layouts.createPanel("POST-PROCESS-BUILDER-LEFT-PANEL", "left", 300, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-EDIT", "width: 100%; height: 100%;"));
                this._layouts.createPanel("POST-PROCESS-BUILDER-MAIN-PANEL", "main", 0, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-PROGRAM"));
                this._layouts.createPanel("POST-PROCESS-BUILDER-PREVIEW-PANEL", "preview", 150, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-CONSOLE"));
                this._layouts.buildElement(this._containerID);
                this._layouts.on("resize", function (event) {
                    _this._editor.resize(true);
                });
                this._glslTabId = this._currentTabId = EDITOR.SceneFactory.GenerateUUID();
                this._configurationTabId = EDITOR.SceneFactory.GenerateUUID();
                this._mainPanel = this._layouts.getPanelFromType("main");
                this._mainPanel.createTab({ caption: "GLSL", closable: false, id: this._glslTabId });
                this._mainPanel.createTab({ caption: "Configuration", closable: false, id: this._configurationTabId });
                this._mainPanel.onTabChanged = function (id) { return _this._onTabChanged(id); };
                // GUI
                var container = $("#POST-PROCESS-BUILDER-EDIT");
                container.append(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-EDIT-LIST", "width: 100%; height: 200px;"));
                // Toolbar
                this._toolbar = new EDITOR.GUI.GUIToolbar("POST-PROCESS-BUILDER-TOOLBAR", this._core);
                this._toolbar.createMenu("button", "BUILD-CHAIN", "Apply Chain (CTRL + B)", "icon-play-game", false, "Builds post-processes and applies chain");
                this._toolbar.addBreak();
                this._toolbar.createMenu("button", "BUILD-CHAIN-SCENE", "Apply Chain on Scene", "icon-scene", false, "Builds post-processes and applies chain on scene");
                this._toolbar.buildElement("POST-PROCESS-BUILDER-TOOLBAR");
                this._toolbar.onClick = function (item) { return _this._onApplyPostProcessChain(item.parent === "BUILD-CHAIN-SCENE"); };
                // List
                this._postProcessesList = new EDITOR.GUI.GUIGrid("POST-PROCESS-BUILDER-EDIT-LIST", this._core);
                this._postProcessesList.createEditableColumn("name", "name", { type: "string" }, "100%");
                this._postProcessesList.multiSelect = false;
                this._postProcessesList.showAdd = true;
                this._postProcessesList.showDelete = true;
                this._postProcessesList.showOptions = false;
                this._postProcessesList.onClick = function (selected) { return _this._onPostProcessSelected(selected); };
                this._postProcessesList.onAdd = function () { return _this._onPostProcessAdd(); };
                this._postProcessesList.onDelete = function (selected) { return _this._onPostProcessRemove(selected); };
                this._postProcessesList.onEditField = function (recid, value) { return _this._onPostProcessEditField(recid, value); };
                this._postProcessesList.buildElement("POST-PROCESS-BUILDER-EDIT-LIST");
                for (var i = 0; i < this._datas.length; i++)
                    this._postProcessesList.addRecord({ name: this._datas[i].name, recid: i });
                this._postProcessesList.refresh();
                // Canvas
                container.append("<br />");
                container.append("<hr>");
                container.append(EDITOR.GUI.GUIElement.CreateElement("p", EDITOR.SceneFactory.GenerateUUID(), "width: 100%;", "Preview:", false));
                var canvasID = EDITOR.SceneFactory.GenerateUUID();
                container.append(EDITOR.GUI.GUIElement.CreateElement("canvas", canvasID, "width: 100%; height: 300px", null, true));
                this._engine = new BABYLON.Engine($("#" + canvasID)[0]);
                this._scene = new BABYLON.Scene(this._engine);
                this._camera = new BABYLON.Camera("PostProcessCamera", BABYLON.Vector3.Zero(), this._scene);
                this._texture = new BABYLON.Texture("website/Tests/textures/no_smoke.png", this._scene);
                this._engine.runRenderLoop(function () { return _this._scene.render(); });
                // Editor
                this._editor = ace.edit("POST-PROCESS-BUILDER-PROGRAM");
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/glsl");
                this._editor.getSession().setValue(BABYLON.Effect.ShadersStore["passPixelShader"]);
                this._editor.getSession().on("change", function (e) { return _this._onEditorChanged(); });
                // Console
                this._console = ace.edit("POST-PROCESS-BUILDER-CONSOLE");
                this._console.getSession().setValue("Ready.");
                BABYLON.Tools.Error = function (entry) {
                    _this._console.getSession().setValue(_this._console.getSession().getValue() + "\n" + entry);
                };
            };
            // On tab changed
            PostProcessBuilder.prototype._onTabChanged = function (id) {
                this._currentTabId = id;
                if (id === this._glslTabId) {
                    this._editor.getSession().setMode("ace/mode/glsl");
                    this._editor.getSession().setValue(this._datas[this._currentSelected].program);
                }
                else {
                    this._editor.getSession().setMode("ace/mode/javascript");
                    this._editor.getSession().setValue(this._datas[this._currentSelected].configuration);
                }
            };
            // When the user selects an item
            PostProcessBuilder.prototype._onPostProcessSelected = function (selected) {
                if (selected.length < 1)
                    return;
                this._currentSelected = selected[0];
                this._editor.getSession().setValue(this._currentTabId === this._glslTabId ? this._datas[selected[0]].program : this._datas[selected[0]].configuration);
            };
            // When the user adds a new post-process
            PostProcessBuilder.prototype._onPostProcessAdd = function () {
                var _this = this;
                var inputID = EDITOR.SceneFactory.GenerateUUID();
                // Window
                this._selectTemplateWindow = new EDITOR.GUI.GUIWindow("SELECT-TEMPLATE-WINDOW", this._core, "Select template", EDITOR.GUI.GUIElement.CreateElement("input", inputID, "width: 100%;"), new BABYLON.Vector2(400, 120), ["Select", "Close"]);
                this._selectTemplateWindow.setOnCloseCallback(function () {
                    _this._selectTemplateWindow.destroy();
                });
                this._selectTemplateWindow.buildElement(null);
                // List
                var items = [];
                for (var thing in BABYLON.Effect.ShadersStore) {
                    if (BABYLON.Effect.ShadersStore[thing].indexOf("textureSampler") !== -1)
                        items.push(thing);
                }
                var list = new EDITOR.GUI.GUIList(inputID, this._core);
                list.renderDrop = true;
                list.items = items;
                list.buildElement(inputID);
                // Events
                this._selectTemplateWindow.onButtonClicked = function (buttonId) {
                    if (buttonId === "Select") {
                        var selected = list.getValue();
                        var data = { name: selected + _this._datas.length, id: EDITOR.SceneFactory.GenerateUUID(), program: BABYLON.Effect.ShadersStore[selected], configuration: PostProcessBuilder._ConfigurationFileContent };
                        _this._datas.push(data);
                        _this._postProcessesList.addRecord({ name: data.name });
                        _this._postProcessesList.refresh();
                    }
                    _this._selectTemplateWindow.close();
                };
            };
            // When the user removes a post-process
            PostProcessBuilder.prototype._onPostProcessRemove = function (selected) {
                var data = this._datas[selected[0]];
                if (data.postProcess)
                    this._mainExtension.removePostProcess(data.postProcess);
                if (data.editorPostProcess)
                    this._extension.removePostProcess(data.editorPostProcess);
                this._datas.splice(selected[0], 1);
                this._currentSelected = -1;
                this._storeMetadatas();
            };
            // When the user edits a row
            PostProcessBuilder.prototype._onPostProcessEditField = function (recid, value) {
                debugger;
            };
            // When the user modifies a post-process
            PostProcessBuilder.prototype._onEditorChanged = function () {
                if (this._currentSelected >= 0) {
                    var value = this._editor.getSession().getValue();
                    if (this._currentTabId === this._glslTabId)
                        this._datas[this._currentSelected].program = value;
                    else
                        this._datas[this._currentSelected].configuration = value;
                }
            };
            // When the user applies the post-process chain
            PostProcessBuilder.prototype._onApplyPostProcessChain = function (applyOnScene) {
                // Clear logs
                this._console.getSession().setValue("Ready.");
                // Remove post-processes
                for (var i = 0; i < this._datas.length; i++) {
                    if (this._datas[i].editorPostProcess) {
                        this._extension.removePostProcess(this._datas[i].editorPostProcess);
                        delete BABYLON.Effect.ShadersStore[this._datas[i].editorPostProcess.name + "PixelShader"];
                        this._datas[i].editorPostProcess = null;
                    }
                    if (this._datas[i].postProcess) {
                        this._mainExtension.removePostProcess(this._datas[i].postProcess);
                        delete BABYLON.Effect.ShadersStore[this._datas[i].postProcess.name + "PixelShader"];
                        this._datas[i].postProcess = null;
                    }
                }
                for (var i = 0; i < this._datas.length; i++) {
                    var data = this._datas[i];
                    data.id = EDITOR.SceneFactory.GenerateUUID();
                    this._extension.applyPostProcess(data);
                    data.editorPostProcess = data.postProcess;
                    data.postProcess = null;
                    if (applyOnScene) {
                        data.id = EDITOR.SceneFactory.GenerateUUID();
                        this._mainExtension.applyPostProcess(data);
                    }
                }
                this._storeMetadatas();
            };
            // Stores the datas into the custom metadatas
            PostProcessBuilder.prototype._storeMetadatas = function () {
                var customData = [];
                for (var i = 0; i < this._datas.length; i++) {
                    var data = this._datas[i];
                    customData.push({ name: data.name, id: data.id, program: data.program, configuration: data.configuration, postProcess: null, editorPostProcess: null });
                }
                EDITOR.SceneManager.AddCustomMetadata("PostProcessBuilder", customData);
            };
            // Gets the configuration file
            PostProcessBuilder.prototype._getConfigurationFile = function (callback) {
                var _this = this;
                if (!PostProcessBuilder._ConfigurationFileContent) {
                    this._core.editor.layouts.lockPanel("preview", "Loading...", true);
                    BABYLON.Tools.LoadFile("website/resources/template.postprocess.configuration.json", function (data) {
                        PostProcessBuilder._ConfigurationFileContent = data;
                        _this._core.editor.layouts.unlockPanel("preview");
                        callback();
                    });
                }
                else
                    callback();
            };
            // Static members
            PostProcessBuilder._ConfigurationFileContent = null;
            return PostProcessBuilder;
        }());
        EDITOR.PostProcessBuilder = PostProcessBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var CosmosEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function CosmosEditor(core) {
                this._engine = null;
                this._scene = null;
                this._camera = null;
                this._light = null;
                this._skybox = null;
                this._containerElement = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._editor = null;
                this._extension = null;
                this._dummyIdSearch = "";
                // Configure this
                this._core = core;
                // Create UI
                this._createUI();
            }
            /**
            * Disposes the application
            */
            CosmosEditor.prototype.dispose = function () {
                this._layouts.destroy();
                this._engine.dispose();
            };
            // Creates the UI
            CosmosEditor.prototype._createUI = function () {
                var _this = this;
                // Create tab and container
                this._containerID = this._core.editor.createContainer();
                this._tab = this._core.editor.createTab("Cosmos Editor", this._containerID, this, true);
                this._containerElement = $("#" + this._containerID);
                // Layout
                this._layouts = new EDITOR.GUI.GUILayout(this._containerID, this._core);
                this._layouts.createPanel("COSMOS-EDITOR-LEFT-PANEL", "left", 300, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "COSMOS-EDITOR-EDIT", "width: 100%; height: 100%;"));
                this._layouts.createPanel("COSMOS-EDITOR-MAIN-PANEL", "main", 0, false).setContent(EDITOR.GUI.GUIElement.CreateElement("canvas", "COSMOS-EDITOR-CANVAS"));
                this._layouts.buildElement(this._containerID);
                this._layouts.on("resize", function (event) {
                    _this._engine.resize();
                });
                // Canvas
                this._engine = new BABYLON.Engine($("#COSMOS-EDITOR-CANVAS")[0]);
                this._scene = new BABYLON.Scene(this._engine);
                this._scene.clearColor = BABYLON.Color3.Black();
                this._camera = new BABYLON.FreeCamera("CosmosFreeCamera", new BABYLON.Vector3(150, 150, 150), this._scene);
                this._camera.setTarget(BABYLON.Vector3.Zero());
                this._camera.attachControl(this._engine.getRenderingCanvas());
                this._light = new BABYLON.PointLight("CosmosLight", BABYLON.Vector3.Zero(), this._scene);
                this._light.parent = this._camera;
                this._skybox = BABYLON.Mesh.CreateBox("skyBox", 10000.0, this._scene);
                var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this._scene);
                skyboxMaterial.backFaceCulling = false;
                var files = [
                    "website/textures/space/space_left.jpg",
                    "website/textures/space/space_up.jpg",
                    "website/textures/space/space_front.jpg",
                    "website/textures/space/space_right.jpg",
                    "website/textures/space/space_down.jpg",
                    "website/textures/space/space_back.jpg",
                ];
                skyboxMaterial.reflectionTexture = BABYLON.CubeTexture.CreateFromImages(files, this._scene);
                skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
                skyboxMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
                skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
                skyboxMaterial.disableLighting = true;
                this._skybox.material = skyboxMaterial;
                var standard = new BABYLON.StandardRenderingPipeline("StandardRenderingPipeline", this._scene, 1.0 / devicePixelRatio, null, [this._camera]);
                standard.LensFlareEnabled = true;
                standard.lensFlareStrength = 50;
                standard.brightThreshold = 1;
                standard.lensTexture = standard.lensFlareDirtTexture = new BABYLON.Texture("website/textures/lensdirt.jpg", this._scene);
                standard.lensStarTexture = new BABYLON.Texture("website/textures/lensstar.png", this._scene);
                standard.lensColorTexture = new BABYLON.Texture("website/textures/lenscolor.png", this._scene);
                this._engine.runRenderLoop(function () {
                    _this._scene.render();
                    _this._extension.updateMeshes();
                });
                // Create Extension
                this._extension = new EDITOR.EXTENSIONS.CosmosExtension(this._scene);
                // Editor
                this._editor = new EDITOR.GUI.GUIEditForm("COSMOS-EDITOR-EDIT", this._core);
                this._editor.buildElement("COSMOS-EDITOR-EDIT");
                var rootFolder = this._editor.addFolder("Root node");
                rootFolder.add(this._extension, "distanceToRoot").min(1).max(1000).step(1).name("Distance to root").onChange(function () { return _this._reset(); });
                rootFolder.add(this._extension, "heightFromRoot").min(1).max(500).step(1).name("Height from root").onChange(function () { return _this._reset(); });
                var functionsFolder = this._editor.addFolder("Functions nodes");
                functionsFolder.add(this._extension, "distanceToFunction").min(0).max(100).name("Distance to function").onChange(function () { return _this._reset(); });
                functionsFolder.add(this._extension, "functionsDistance").min(0.01).max(10).step(0.01).name("Functions distance").onChange(function () { return _this._reset(); });
                functionsFolder.add(this._extension, "sphereDiameter").min(0).max(100).step(0.01).name("Spheres diameter").onChange(function () { return _this._reset(); });
                var animationsFolder = this._editor.addFolder("Animations");
                animationsFolder.add(this._extension, "animationsDistance").min(1).max(10).step(0.01).name("Animations distance").onChange(function () { return _this._reset(); });
                var searchFolder = this._editor.addFolder("Search");
                searchFolder.add(this, "_dummyIdSearch").name("Search title").onChange(function (value) {
                    _this._extension.animateCameraToId(value === "" ? "root" : value);
                });
            };
            // Reset the extension
            CosmosEditor.prototype._reset = function () {
                this._extension.reset();
                // Add custom metadatas
                var data = {
                    distanceToRoot: this._extension.distanceToRoot,
                    heightFromRoot: this._extension.heightFromRoot,
                    functionsDistance: this._extension.functionsDistance,
                    animationsDistance: this._extension.animationsDistance,
                    sphereDiameter: this._extension.sphereDiameter
                };
                EDITOR.SceneManager.AddCustomMetadata("CosmosExtension", data);
                this._extension.apply(data);
            };
            // Static members
            CosmosEditor._ConfigurationFileContent = null;
            return CosmosEditor;
        }());
        EDITOR.CosmosEditor = CosmosEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ElectronHelper = (function () {
            function ElectronHelper() {
            }
            /**
            * Creates "File" objects from filenames
            */
            ElectronHelper.CreateFilesFromFileNames = function (filenames, isOpenScene, callback) {
                var _this = this;
                var fs = require("fs");
                // Transform readed files as File
                var counter = 0;
                var files = [];
                var filesLength = filenames.length;
                var createFile = function (filename, indice) {
                    return function (err, data) {
                        if (!data)
                            return;
                        // Create file
                        var file = new File([new Blob([data])], BABYLON.Tools.GetFilename(EDITOR.Tools.NormalizeUri(filename)), {
                            type: EDITOR.Tools.GetFileType(EDITOR.Tools.GetFileExtension(filename))
                        });
                        files.push(file);
                        // If scene file, watch file
                        var extension = EDITOR.Tools.GetFileExtension(filename);
                        if (extension === "babylon" || extension === "obj" || extension === "stl") {
                            _this.SceneFilename = filename;
                            fs.watch(filename, null, function (event, modifiedFilename) {
                                if (!_this.ReloadSceneOnFileChanged)
                                    return;
                                fs.readFile(filename, function (err, data) {
                                    var file = new File([new Blob([data])], BABYLON.Tools.GetFilename(filename), {
                                        type: EDITOR.Tools.GetFileType(EDITOR.Tools.GetFileExtension(filename))
                                    });
                                    files[indice] = file;
                                    callback(files);
                                });
                            });
                        }
                        // If finished, call the callback
                        counter++;
                        if (counter === filesLength) {
                            callback(files);
                        }
                    };
                };
                // Read files
                for (var i = 0; i < filenames.length; i++) {
                    fs.readFile(filenames[i], createFile(filenames[i], i));
                }
            };
            /**
            * Watchs the specified file
            */
            ElectronHelper.WatchFile = function (filename, callback) {
                var fs = require("fs");
                fs.watch(filename, null, function (event, modifiedFilename) {
                    fs.readFile(filename, function (err, data) {
                        var file = new File([new Blob([data])], BABYLON.Tools.GetFilename(filename), {
                            type: EDITOR.Tools.GetFileType(EDITOR.Tools.GetFileExtension(filename))
                        });
                        callback(file);
                    });
                });
            };
            /**
            * Creates a save dialog
            */
            ElectronHelper.CreateSaveDialog = function (title, path, extension, callback) {
                var dialog = require("electron").remote.dialog;
                var options = {
                    title: title,
                    defaultPath: path,
                    filters: [{
                            name: "Babylon.js Editor Project",
                            extensions: []
                        }],
                    buttonLabel: ""
                };
                dialog.showSaveDialog(null, options, function (filename) {
                    callback(filename);
                });
            };
            /**
            * Scene file
            */
            ElectronHelper.ReloadSceneOnFileChanged = false;
            ElectronHelper.SceneFilename = "";
            return ElectronHelper;
        }());
        EDITOR.ElectronHelper = ElectronHelper;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var net = require("net");
        var ElectronPhotoshopPlugin = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function ElectronPhotoshopPlugin(core) {
                this._statusBarId = "STATUS-BAR-PHOTOSHOP";
                this._server = null;
                this._client = null;
                this._texture = null;
                // Initialize
                this._core = core;
                this._core.eventReceivers.push(this);
                // Status bar
                this._core.editor.statusBar.addElement(this._statusBarId, "Ready", "icon-photoshop-connect");
            }
            // On event
            ElectronPhotoshopPlugin.prototype.onEvent = function (event) {
                return false;
            };
            // Disconnect photoshop
            ElectronPhotoshopPlugin.prototype.disconnect = function () {
                if (this._server) {
                    this._server.close(function (err) {
                        console.log("Closed server...");
                        if (err)
                            console.log(err.message);
                    });
                }
                else
                    return false;
                if (this._client) {
                    this._client.destroy();
                }
                this._server = null;
                this._client = null;
                this._core.editor.statusBar.removeElement(this._statusBarId);
                return true;
            };
            // Connect to photoshop
            ElectronPhotoshopPlugin.prototype.connect = function () {
                var _this = this;
                this._core.editor.statusBar.showSpinner(this._statusBarId);
                this._core.editor.statusBar.setText(this._statusBarId, "Connecting...");
                var buffers = [];
                this._server = net.createServer(function (socket) {
                    _this._client = socket;
                    _this._client.on("data", function (data) {
                        _this._core.editor.statusBar.showSpinner(_this._statusBarId);
                        var buffer = new global.Buffer(data);
                        buffers.push(buffer);
                    });
                    _this._client.on("end", function () {
                        _this._client = null;
                        var finalBuffer = global.Buffer.concat(buffers);
                        buffers = [];
                        var bufferSize = finalBuffer.readUInt32BE(0);
                        var pixelsSize = finalBuffer.readUInt32BE(4);
                        var width = finalBuffer.readUInt32BE(8);
                        var height = finalBuffer.readUInt32BE(12);
                        var documentNameLength = finalBuffer.readUInt32BE(16);
                        var documentName = finalBuffer.toString("utf-8", 20, 20 + documentNameLength);
                        var texture = ElectronPhotoshopPlugin._Textures[documentName];
                        if (!texture || texture.getBaseSize().width !== width || texture.getBaseSize().height !== height) {
                            if (texture)
                                texture.dispose();
                            var texture = new BABYLON.DynamicTexture(documentName, { width: width, height: height }, _this._core.currentScene, false);
                            EDITOR.Event.sendSceneEvent(texture, EDITOR.SceneEventType.OBJECT_ADDED, _this._core);
                            ElectronPhotoshopPlugin._Textures[documentName] = texture;
                        }
                        var context = texture.getContext();
                        var data = context.getImageData(0, 0, width, height);
                        for (var i = 0; i < pixelsSize; i++) {
                            data.data[i] = finalBuffer.readUInt8(20 + documentNameLength + i);
                        }
                        context.putImageData(data, 0, 0);
                        texture.update(true);
                        EDITOR.Event.sendSceneEvent(texture, EDITOR.SceneEventType.OBJECT_CHANGED, _this._core);
                        _this._core.editor.statusBar.hideSpinner(_this._statusBarId);
                    });
                })
                    .on("error", function (error) {
                    _this._core.editor.statusBar.hideSpinner(_this._statusBarId);
                    throw error;
                });
                this._server.maxConnections = 1;
                this._server.listen(1337, "127.0.0.1", null, function () {
                    // Status bar
                    _this._core.editor.statusBar.setText(_this._statusBarId, "Listening...");
                    _this._core.editor.statusBar.hideSpinner(_this._statusBarId);
                });
                return true;
            };
            ElectronPhotoshopPlugin.Connect = function (core) {
                if (!this._Instance)
                    this._Instance = new ElectronPhotoshopPlugin(core);
                this._Instance.connect();
            };
            ElectronPhotoshopPlugin.Disconnect = function () {
                if (this._Instance)
                    this._Instance.disconnect();
                this._Instance = null;
            };
            ElectronPhotoshopPlugin._Textures = {};
            /*
            * Static methods
            */
            ElectronPhotoshopPlugin._Instance = null;
            return ElectronPhotoshopPlugin;
        }());
        EDITOR.ElectronPhotoshopPlugin = ElectronPhotoshopPlugin;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ElectronMenuPlugin = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function ElectronMenuPlugin(mainToolbar) {
                // Public members
                this.menuID = "ELECTRON-MENU";
                this._connectPhotoshop = "CONNECT-PHOTOSHOP";
                this._disconnectPhotoshop = "DISCONNECT-PHOTOSHOP";
                this._watchSceneFile = "WATCH-SCENE-FILE";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                this._toolbar = toolbar;
                // Create menu
                var menu = toolbar.createMenu("menu", this.menuID, "Electron", "icon-electron");
                // Create items
                toolbar.createMenuItem(menu, "button", this._connectPhotoshop, "Connect to Photoshop...", "icon-photoshop-connect");
                toolbar.createMenuItem(menu, "button", this._disconnectPhotoshop, "Disconnect Photoshop...", "icon-photoshop-disconnect");
                toolbar.addBreak(menu);
                toolbar.createMenuItem(menu, "button", this._watchSceneFile, "Automatically reload scene", "icon-helpers", false);
            }
            // When an item has been selected
            ElectronMenuPlugin.prototype.onMenuItemSelected = function (selected) {
                switch (selected) {
                    case this._connectPhotoshop:
                        EDITOR.ElectronPhotoshopPlugin.Connect(this._core);
                        break;
                    case this._disconnectPhotoshop:
                        EDITOR.ElectronPhotoshopPlugin.Disconnect();
                        break;
                    case this._watchSceneFile:
                        var checked = !this._toolbar.isItemChecked(this._watchSceneFile, this.menuID);
                        EDITOR.ElectronHelper.ReloadSceneOnFileChanged = checked;
                        this._toolbar.setItemChecked(this._watchSceneFile, checked, this.menuID);
                        this._toolbar.setItemText(this._watchSceneFile, checked ? "Disable automatic scene reload" : "Automatically reload scene", this.menuID);
                        break;
                    default: break;
                }
            };
            return ElectronMenuPlugin;
        }());
        EDITOR.ElectronMenuPlugin = ElectronMenuPlugin;
        // Register plugin
        if (EDITOR.Tools.CheckIfElectron())
            EDITOR.PluginManager.RegisterMainToolbarPlugin(ElectronMenuPlugin);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ElectronLocalStorage = (function (_super) {
            __extends(ElectronLocalStorage, _super);
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function ElectronLocalStorage(core) {
                _super.call(this, core);
                this._editor = core.editor;
            }
            // Creates folders
            ElectronLocalStorage.prototype.createFolders = function (folders, parentFolder, success, failed) {
                var fs = require("fs");
                var path = parentFolder.file.id + "/";
                for (var i = 0; i < folders.length; i++) {
                    try {
                        var stat = fs.lstatSync(path + folders[i]);
                        if (stat.isDirectory())
                            continue;
                    }
                    catch (e) {
                    }
                    fs.mkdirSync(path + folders[i]);
                }
                success();
            };
            // Creates files
            ElectronLocalStorage.prototype.createFiles = function (files, folder, success, failed, progress) {
                var fs = require("fs");
                var path = folder.file.id + "/";
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    var filePath = (file.parentFolder ? file.parentFolder.id + "/" : path) + file.name;
                    var data = null;
                    if (file.content instanceof ArrayBuffer || file.content instanceof Uint8Array)
                        data = new global.Buffer(file.content);
                    else
                        data = file.content;
                    fs.writeFileSync(filePath, data);
                    if (progress)
                        progress(i);
                }
                success();
            };
            // Gets the children files of a folder
            ElectronLocalStorage.prototype.getFiles = function (folder, success, failed) {
                var fs = require("fs");
                var path = (folder && folder.file ? folder.file.id : process.env.HOME || process.env.USERPROFILE) + "/";
                fs.readdir(path, null, function (err, files) {
                    if (err) {
                        failed(err.message);
                        return;
                    }
                    var children = [];
                    for (var i = 0; i < files.length; i++) {
                        var filePath = path + files[i];
                        var file = { id: filePath, name: files[i], folder: null };
                        if (fs.lstatSync(path).isDirectory()) {
                            file.folder = { name: filePath };
                        }
                        children.push({
                            file: file,
                            name: files[i]
                        });
                    }
                    success(children);
                });
            };
            return ElectronLocalStorage;
        }(EDITOR.Storage));
        EDITOR.ElectronLocalStorage = ElectronLocalStorage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
