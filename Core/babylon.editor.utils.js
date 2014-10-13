/// <reference path="../index.html" />

/*

*/

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

var Utils = (function () {

    /// -----------------------------------------------------------------------------------------------------
    /* UI utils */
    /// -----------------------------------------------------------------------------------------------------

    Utils = Utils || {};

    Utils.clearSideBar = function (sideBar) {
        /// Code taken from w2ui website (w2ui.com)
        var toRemove = [];
        for (var i = 0; i < sideBar.nodes.length; i++) {
            toRemove.push(sideBar.nodes[i].id);
        }
        sideBar.remove.apply(sideBar, toRemove);
    }
    /// -----------------------------------------------------------------------------------------------------

    /// -----------------------------------------------------------------------------------------------------
    /* Parsers */
    /// -----------------------------------------------------------------------------------------------------

    Utils.toFloat = function (string) {
        return parseFloat(string.replace(',', '.'));
    }

    Utils.GetStringFromValue = function (value, round, factor) {
        var string = '';
        factor = factor == null ? 1000 : factor;

        if (value instanceof BABYLON.Vector3 || value instanceof BABYLON.Vector2) {
            string += (round ? Math.round(value.x) / factor : value.x) + ', ' + (round ? Math.round(value.y) / factor : value.y);
            if (value instanceof BABYLON.Vector3)
                string += ', ' + (round ? Math.round(value.z) / factor : value.z);
        }
        else if (value instanceof String) {
            return value;
        }
        else if (value instanceof BABYLON.Color3 || value instanceof BABYLON.Color4) {
            string += (round ? Math.round(value.r) / factor : value.r) + ', ' + (round ? Math.round(value.g) / factor : value.g) + ', ' + (round ? Math.round(value.b) / factor : value.b);
            if (value instanceof BABYLON.Color4)
                string += ', ' + (round ? Math.round(value.a) / factor : value.a);
        } else {
            string += value; /// Float
        }

        return string;
    }
    /// -----------------------------------------------------------------------------------------------------

    /// -----------------------------------------------------------------------------------------------------
    /* Materials utils */
    /// -----------------------------------------------------------------------------------------------------
    /// name : string, material : BABYLON.ShaderMaterial
    Utils.GetValueFromShaderMaterial = function (name, material) {
        if (material._floats[name])
            return material._floats[name];
        else if (material._colors3[name])
            return material._colors3[name];
        else if (material._colors4[name])
            return material._colors4[name];
        else if (material._vectors2[name])
            return material._vectors2[name];
        else if (material._vectors3[name])
            return material._vectors3[name];

        return null;
    }

    Utils.GetMaterialByName = function (name, scene) {
        for (var i = 0; i < scene.materials.length; i++) {
            if (scene.materials[i].name == name)
                return scene.materials[i].name;
        }
        return null;
    }

    Utils.CreateMaterialShaderDiv = function (vertexShader, pixelShader) {
        var uuid = Utils.GenerateUUID();

        var vertexShaderElement = document.createElement('div');
        vertexShaderElement.innerHTML = vertexShader;
        vertexShaderElement.id = uuid;

        uuid = Utils.GenerateUUID();
        var pixelShaderElement = document.createElement('div');
        pixelShaderElement.innerHTML = pixelShader;
        pixelShaderElement.id = String(uuid);

        var e = document.getElementById('BabylonEditorShaders');
        e.appendChild(vertexShaderElement);
        e.appendChild(pixelShaderElement);

        return {
            vertexShaderId: vertexShaderElement.id,
            pixelShaderId: pixelShaderElement.id
        }
    }

    /// -----------------------------------------------------------------------------------------------------
    /* Core utils */
    /// -----------------------------------------------------------------------------------------------------

    /// Generates an UUID, inspired by
    /// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    Utils.GenerateUUID = function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    Utils.ExitFullScreen = function (engine, canvas) {
        var domElement = document.getElementById('layout_BabylonEditorMainLayout_panel_main');
        for (var i = 0; i < domElement.children.length; i++) {
            if (domElement.children[i].className == 'w2ui-panel-content') {
                domElement.children[i].appendChild(canvas);
                engine.resize();
                break;
            }
        }
    }

    Utils.isObjectCastingShadows = function (object, scene) {        
        return Utils._applyShadows(object, scene, { checkCast: true });
    }

    Utils.excludeObjectFromShadowsCalculations = function (object, scene) {
        Utils._applyShadows(object, scene, { remove: true });
    }

    Utils.addObjectInShadowsCalculations = function (object, scene) {
        Utils._applyShadows(object, scene, { add: true });
    }

    Utils._applyShadows = function (object, scene, params) {
        for (var i = 0; i < scene.lights.length; i++) {
            var shadowGenerator = scene.lights[i].getShadowGenerator();
            if (shadowGenerator != null) {
                var shadowMap = shadowGenerator.getShadowMap();

                if (params.checkCast) {
                    for (var j = 0; j < shadowMap.renderList.length; j++) {
                        if (shadowMap.renderList[j] == object)
                            return true;
                    }
                } else if (params.remove) {
                    var index = shadowMap.renderList.indexOf(object);
                    if (index != -1) {
                        shadowMap.renderList.splice(index, 1);
                    }
                } else if (params.add) {
                    shadowMap.renderList.push(object);
                }

            }
        }

        return false;
    }
    /// -----------------------------------------------------------------------------------------------------

    /// -----------------------------------------------------------------------------------------------------
    /* Colors utils */
    /// -----------------------------------------------------------------------------------------------------
    Utils.HexToRGBColor = function (hexColor) {
        if (hexColor == '#null')
            return null;

        var color = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
        return new BABYLON.Color3(parseInt(color[1], 16), parseInt(color[2], 16), parseInt(color[3], 16));
    }

    Utils.RGBToHexColor = function (rgbColor, addHash) {
        if (addHash == null)
            addHash = false;

        if (!rgbColor) return 'null';

        var hex = (addHash ? "#" : '') + ((1 << 24) + (rgbColor.r << 16) + (rgbColor.g << 8) + rgbColor.b).toString(16).slice(1);
        return hex.toUpperCase();
    }

    /// -----------------------------------------------------------------------------------------------------
    /* Textures utils */
    /// -----------------------------------------------------------------------------------------------------
    Utils.GetTextureFromName = function (name, scene) {
        for (var i = 0; i < scene.textures.length; i++) {
            if (scene.textures[i].name == name) {
                return scene.textures[i];
            }
        }

        return null;
    }

    Utils.GetTextureName = function (texture) {
        if (!texture)
            return 'None';
        else
            return texture.name;
    }

    Utils.GetTextureFromFile = function (file, scene, callback) {
        var name = file.name;
        var extension = name.substr(name.length - 4, 4).toLowerCase();
        var isDDS = scene.getEngine().getCaps().s3tc && (extension === ".dds");
        var isTGA = (extension === ".tga");

        var cb = function (name) {
            return function (result) {
                var url = 'data:' + name + ':';
                var tex = new BABYLON.Texture(url, scene, false, false, BABYLON.Texture.TRILINEAR_SAMPLINGMOD, result);
                tex.name = name;
                callback(tex);
            }
        };

        if (isDDS || isTGA)
            BABYLON.Tools.ReadFile(file, cb(name), null, true);
        else
            BABYLON.Tools.ReadFileAsDataURL(file, cb(name), null);
    }

    Utils.GetTextureScale = function (tex) {
        if (tex)
            return { u: tex.uScale, v: tex.vScale };
        else
            return { u: null, v: null };
    }

    /// -----------------------------------------------------------------------------------------------------

    /// -----------------------------------------------------------------------------------------------------
    /* Events utils */
    /// -----------------------------------------------------------------------------------------------------
    Utils.sendEventObjectAdded = function (object, core) {
        var ev = new BABYLON.Editor.Event();
        ev.eventType = BABYLON.Editor.EventType.SceneEvent;
        ev.event = new BABYLON.Editor.Event.SceneEvent();
        ev.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_ADDED;
        ev.event.object = object;
        core.sendEvent(ev);
    }

    Utils.sendEventObjectRemoved = function (object, core) {
        var ev = new BABYLON.Editor.Event();
        ev.eventType = BABYLON.Editor.EventType.SceneEvent;
        ev.event = new BABYLON.Editor.Event.SceneEvent();
        ev.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_REMOVED;
        ev.event.object = object;
        core.sendEvent(ev);
    }

    Utils.sendEventObjectChanged = function (object, core) {
        var ev = new BABYLON.Editor.Event();
        ev.eventType = BABYLON.Editor.EventType.SceneEvent;
        ev.event = new BABYLON.Editor.Event.SceneEvent();
        ev.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_CHANGED;
        ev.event.object = object;
        core.sendEvent(ev);
    }

    Utils.sendEventFileSelected = function (caller, event, core) {
        var ev = new BABYLON.Editor.Event();
        ev.eventType = BABYLON.Editor.EventType.GUIEvent;
        ev.event = new BABYLON.Editor.Event.GUIEvent();
        ev.event.eventType = BABYLON.Editor.Event.GUIEvent.FILE_SELECTED;
        ev.event.caller = caller;
        ev.event.result = event;
        core.sendEvent(ev);
    }

    Utils.sendEventButtonClicked = function (caller, core) {
        var ev = new BABYLON.Editor.Event();
        ev.eventType = BABYLON.Editor.EventType.GUIEvent;
        ev.event = new BABYLON.Editor.Event.GUIEvent();
        ev.event.eventType = BABYLON.Editor.Event.GUIEvent.BUTTON_CLICKED;
        ev.event.caller = caller;
        core.sendEvent(ev);
    }
    /// -----------------------------------------------------------------------------------------------------

    return Utils;

})();

BABYLON.Editor.Utils = Utils;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON