/// <reference path="./../index.html" />

var BABYLON;
(function (BABYLON) {
var Editor;
(function (Editor) {

var GraphTool = (function () {
    function GraphTool(babylonEditorCore) {
        this._core = babylonEditorCore;
        this._core.eventReceivers.push(this);

        this.sideBar = null;

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
                    BabylonEditorUICreator.Sidebar.setSelected(this.sideBar, mesh.id);
                    BabylonEditorUICreator.Sidebar.update(this.sideBar);
                } else
                    BabylonEditorUICreator.Sidebar.setSelected(this.sideBar, this._graphRootName);
            }

            else

            /// An object changed
            if (ev.event.eventType == BABYLON.Editor.Event.SceneEvent.OBJECT_CHANGED) {
                var object = ev.event.object;
                if (object != null) {
                    BabylonEditorUICreator.Sidebar.updateNodeFromObject(this.sideBar, object);
                    BabylonEditorUICreator.Sidebar.update(this.sideBar);
                }
            }
        }

    }

    GraphTool.prototype._getObjectIcon = function (object) {
        var icon = '';

        if (object instanceof BABYLON.Mesh) icon = 'icon-mesh';
        else if (object instanceof BABYLON.Light) icon = 'icon-add-light';

        return icon;
    }

    /// Fills the graph
    GraphTool.prototype._fillGraph = function (object, element) {
        var children = null;

        /// Set root as the root node of the side bar
        /// if the element isn't specified
        if (element == null) {
            BABYLON.Editor.Utils.clearSideBar(this.sideBar);
            BabylonEditorUICreator.Sidebar.addNodes(this.sideBar, [
                BabylonEditorUICreator.Sidebar.createNode(this._graphRootName, 'Root', 'icon-position', null)
            ]);
            root = this._graphRootName;
        }

        /// Same as element
        if (object == null) {
            children = this._core.currentScene.meshes;
            children.push.apply(children, this._core.currentScene.lights);
        } else
            children = object.getDescendants();

        if (root == this._graphRootName)
            BabylonEditorUICreator.Sidebar.setNodeExpanded(this.sideBar, root, true);

        /// If children then fill the side bar recursively
        if (children != null) {
            for (var i = 0; i < children.length; i++) {

                var object = children[i];
                var icon = this._getObjectIcon(object);

                BabylonEditorUICreator.Sidebar.addNodes(this.sideBar, [
                    BabylonEditorUICreator.Sidebar.createNode(object.id, object.name, icon, object)
                ], root);
                this._fillGraph(object, object.id);

            }
        }

    }

    /// Adds or removes an element from the graph
    GraphTool.prototype._modifyElement = function (object, element, remove) {
        if (object == null)
            return null;

        if (element == null) {
            element = this._graphRootName;
        }

        if (!remove) {
            var icon = this._getObjectIcon(object);

            BabylonEditorUICreator.Sidebar.addNodes(this.sideBar, [
                BabylonEditorUICreator.Sidebar.createNode(object.id, object.name, icon, object)
            ], element);

        } else
            BabylonEditorUICreator.Sidebar.removeNode(this.sideBar, element);

        BabylonEditorUICreator.Sidebar.update(this.sideBar);
    }

    GraphTool.prototype._createUI = function () {

        /// Create nodes
        var nodes = new Array();
        BabylonEditorUICreator.Sidebar.extendNodes(nodes, [
            BabylonEditorUICreator.Sidebar.createNode(this._graphRootName, 'Root', 'icon-position', null)
        ]);

        this.sideBar = BabylonEditorUICreator.Sidebar.createSideBar('MainGraphTool', nodes, this);

    }
    
    return GraphTool;

})();

BABYLON.Editor.GraphTool = GraphTool;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON