/// <reference path="./../index.html" />

function BabylonEditorGraphTool(babylonEditorCore) {
    this._core = babylonEditorCore;
    this._core.eventReceivers.push(this);

    this.sideBar = null;

    this._graphRootName = 'babylon_editor_root_0';
};

BabylonEditorGraphTool.prototype.onEvent = function (event) {

    if (event.EventType == BabylonEditorEventType.SceneEvent) {

        if (event.SceneEvent.Type == BabylonEditorEvents.SceneEvents.ObjectAdded
            || event.SceneEvent.Type == BabylonEditorEvents.SceneEvents.ObjectRemoved) {

            var element = (event.SceneEvent.UserData.mesh.parent == null) ? null : event.SceneEvent.UserData.mesh.parent.id;

            /// An object was added
            if (event.SceneEvent.Type == BabylonEditorEvents.SceneEvents.ObjectAdded) {
                if (event.SceneEvent.UserData.mesh != null)
                    this._modifyElement(event.SceneEvent.UserData.mesh, element, false);
            }
            
            else

            /// An object was removed
            if (event.SceneEvent.Type == BabylonEditorEvents.SceneEvents.ObjectRemoved) {
                if (event.SceneEvent.UserData.mesh != null)
                    this._modifyElement(event.SceneEvent.UserData.mesh, element, true);
            }
        }

        else

        /// An object was picked
        if (event.SceneEvent.Type == BabylonEditorEvents.SceneEvents.ObjectPicked) {
            var mesh = event.SceneEvent.UserData.mesh;
            if (mesh != null) {
                BabylonEditorUICreator.Sidebar.setSelected(this.sideBar, mesh.id);
                BabylonEditorUICreator.Sidebar.update(this.sideBar);
            } else
                BabylonEditorUICreator.Sidebar.setSelected(this.sideBar, this._graphRootName);
        }

        else

        /// An object changed
        if (event.SceneEvent.Type == BabylonEditorEvents.SceneEvents.ObjectChanged) {
            var object = event.SceneEvent.UserData.object;
            if (object != null) {
                BabylonEditorUICreator.Sidebar.updateNodeFromObject(this.sideBar, object);
                BabylonEditorUICreator.Sidebar.update(this.sideBar);
            }
        }
    }

}

BabylonEditorGraphTool.prototype._getObjectIcon = function (object) {
    var icon = '';

    if (object instanceof BABYLON.Mesh) icon = 'icon-mesh';
    else if (object instanceof BABYLON.Light) icon = 'icon-add-light';

    return icon;
}

/// Fills the graph
BabylonEditorGraphTool.prototype._fillGraph = function (object, element) {
    var children = null;

    /// Set root as the root node of the side bar
    /// if the element isn't specified
    if (element == null) {
        BabylonEditorUtils.clearSideBar(this.sideBar);
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
BabylonEditorGraphTool.prototype._modifyElement = function (object, element, remove) {
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

BabylonEditorGraphTool.prototype._createUI = function () {

    /// Create nodes
    var nodes = new Array();
    BabylonEditorUICreator.Sidebar.extendNodes(nodes, [
        BabylonEditorUICreator.Sidebar.createNode(this._graphRootName, 'Root', 'icon-position', null)
    ]);

    this.sideBar = BabylonEditorUICreator.Sidebar.createSideBar('MainGraphTool', nodes, this);

}
