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
    /// -----------------------------------------------------------------------------------------------------

    /// -----------------------------------------------------------------------------------------------------
    /* Core utils */
    /// -----------------------------------------------------------------------------------------------------

    /// Generates an UUID, inspired by
    /// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    Utils.generateUUID = function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
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
        return hex;
    }

    /// -----------------------------------------------------------------------------------------------------
    /* Textures utils */
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

    /// -----------------------------------------------------------------------------------------------------

    /// -----------------------------------------------------------------------------------------------------

    /// -----------------------------------------------------------------------------------------------------
    /* Events utils */
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