/// <reference path="./../index.html" />

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

var GraphTool = (function () {
    function GraphTool(core) {
        this._core = core;
        this._core.eventReceivers.push(this);

        this._sidebar = null;

        this._graphRootName = 'babylon_editor_root_0';
    };

    GraphTool.prototype.onEvent = function (ev) {

        if (ev.eventType == BABYLON.Editor.EventType.SceneEvent) {

            if (ev.event.eventType == BABYLON.Editor.Event.SceneEvent.OBJECT_ADDED
                || ev.event.eventType == BABYLON.Editor.Event.SceneEvent.OBJECT_REMOVED) {

                var element = (ev.event.object.parent == null) ? null : ev.event.object.parent.id;

                /// An object was added
                if (ev.event.eventType == BABYLON.Editor.Event.SceneEvent.OBJECT_ADDED) {
                    if (ev.event.object != null)
                        this._modifyElement(ev.event.object, element, false);
                }

                else

                /// An object was removed
                if (ev.event.eventType == BABYLON.Editor.Event.SceneEvent.OBJECT_REMOVED) {
                    if (ev.event.object != null)
                        this._modifyElement(ev.event.object, element, true);
                }
            }

            else

            /// An object was picked
            if (ev.event.eventType == BABYLON.Editor.Event.SceneEvent.OBJECT_PICKED) {
                var mesh = ev.event.object;
                if (mesh != null) {
                    this._sidebar.setSelected(mesh.id);
                } else
                    this._sidebar.setSelected(this._graphRootName);
            }
            else
            /// An object changed
            if (ev.event.eventType == BABYLON.Editor.Event.SceneEvent.OBJECT_CHANGED) {
                var object = ev.event.object;
                if (object != null) {
                    BABYLON.Editor.GUISidebar.UpdateSidebarFromObject(this._sidebar, object);
                }
            }
        }

        else if (ev.eventType == BABYLON.Editor.EventType.GUIEvent) {

            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.CONTEXT_MENU_SELECTED) {
                if (ev.event.caller == this._sidebar) {
                    if (ev.event.result == 'BabylonEditorGraphToolRemoveNode') {
                        var object = BABYLON.Editor.Utils.GetNodeById(this._sidebar.getSelected(), this._core.currentScene);
                        BABYLON.Editor.Utils.SendEventObjectRemoved(object, this._core);
                        object.dispose();
                    }
                    return true;
                }
            }

        }

        return false;
    }

    GraphTool.prototype._getObjectIcon = function (object) {
        var icon = '';

        if (object instanceof BABYLON.Mesh) icon = 'icon-mesh';
        else if (object instanceof BABYLON.Light)
        {
            if (object instanceof BABYLON.DirectionalLight) icon = 'icon-directional-light';
            else if (object instanceof BABYLON.PointLight)  icon = 'icon-add-light';
        }

        return icon;
    }

    /// Fills the graph
    GraphTool.prototype._fillGraph = function (object, element) {
        var children = null;

        /// Set root as the root node of the side bar
        /// if the element isn't specified
        if (element == null) {
            this._sidebar.clear();
            this._sidebar.addNodes([this._sidebar.createNode(this._graphRootName, 'Root', 'icon-position', null)]);
            root = this._graphRootName;
        }

        /// Same as element
        if (object == null) {
            children = this._core.currentScene.meshes;
            children.push.apply(children, this._core.currentScene.lights);
        } else
            children = object.getDescendants();

        if (root == this._graphRootName)
            this._sidebar.setNodeExpanded(root, true);

        /// If children then fill the side bar recursively
        if (children != null) {
            for (var i = 0; i < children.length; i++) {

                var object = children[i];
                var icon = this._getObjectIcon(object);

                this._sidebar.addNodes([this._sidebar.createNode(object.id, object.name, icon, object)], root);
                this._fillGraph(object, object.id);

            }
        }

    }

    /// Adds or removes an element from the graph
    GraphTool.prototype._modifyElement = function (object, element, remove) {
        if (object == null)
            return null;

        if (element == null && !remove) {
            element = this._graphRootName;
        } else if (remove) {
            element = object.id;
        }

        if (!remove) {
            var icon = this._getObjectIcon(object);
            this._sidebar.addNodes([this._sidebar.createNode(object.id, object.name, icon, object)], element);
        } else
            this._sidebar.removeNode(element);

        this._sidebar.refresh();
    }

    GraphTool.prototype._createUI = function () {
        if (this._sidebar != null)
            this._sidebar.destroy();

        this._sidebar = new BABYLON.Editor.GUISidebar('BabylonEditorGraphTool', this._core);

        this._sidebar.addMenu('BabylonEditorGraphToolRemoveNode', 'Remove', 'icon-error');

        this._sidebar.buildElement('BabylonEditorGraphTool');

        /// Default node
        this._sidebar.addNodes([this._sidebar.createNode(this._graphRootName, 'Root', 'icon-position', null)]);

    }
    
    return GraphTool;

})();

BABYLON.Editor.GraphTool = GraphTool;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON