// <reference path="./index.html" />

var BABYLON;
(function (BABYLON) { /// namespace BAYBLON
var Editor;
(function (Editor) { /// namespace Editor

var BabylonEditor = (function () {

    function BabylonEditor(babylonEditorCore) {
        this.engine = null;

        /// An editor must manage multiple scenes. Then, you'll be able to mange different
        /// worlds in your video game
        this.scenes = new Array();

        /// Core
        this.transformer = null;

        this._core = babylonEditorCore;
        this._core.customUpdates.push(this);

        this.camera = null;

        /// Gui elements
        this._layouts = null;
        this._mainToolbar = null;
        this._editionTool = null;
        this._graphTool = null;

        /// Methods
        this._createUI();
    };

    BabylonEditor.prototype.update = function () {
        this._core.currentScene.render();
    }

    BabylonEditor.prototype.dragAndDrop = function (canvas) {
        var scope = this;

        /// scene loaded callback
        function sceneLoaded(file, scene) {
            /// Clear the graph tool
            scope._core.transformer.setNodeToTransform(null);
            /// Clears the graph if the graph already exists
            scope._graphTool._createUI();

            /// Scene already exists, just replace it
            var index = scope.scenes.indexOf(scope._core.currentScene);
            scope.scenes[index] = scene;
            scene.activeCamera = scope._core.currentScene.activeCamera;
            scene.cameras.splice(0, scene.cameras.length);
            scene.cameras.push(scope._core.currentScene.activeCamera);
            /// Remove current scene
            scope._core.currentScene.dispose();

            /// Send events
            for (var i = 0; i < scene.meshes.length; i++) {
                scene.meshes[i].checkCollisions = true;
                BABYLON.Editor.Utils.SendEventObjectAdded(scene.meshes[i], scope._core);
            }
            for (var i = 0; i < scene.lights; i++) {
                BABYLON.Editor.Utils.SendEventObjectAdded(scene.lights[i], scope._core);
            }

            /// Set as current scene
            scope._core.currentScene = scene;
        }

        /// Create file input and fill callbacks
        this._core.filesInput = new BABYLON.FilesInput(this.engine, null, canvas, sceneLoaded, null, function () {
            scope.engine.runRenderLoop(function () {
                scope._core.update();
                scope._core.transformer.update();
            });
        });
        this._core.filesInput.monitorElementForDragNDrop(canvas);
    }

    BabylonEditor.prototype._createUI = function () {

        /// Create panels
        this._layouts = new BABYLON.Editor.GUILayout('BabylonEditorMainLayout', core);
        var panel = this._layouts.createPanel('BabylonEditorEditionTool', 'left', 380, true).setContent('<div id="BabylonEditorEditObject"></div>');
        panel.createTab('GeneralTab', 'General');
        panel.createTab('MaterialTab', 'Material');

        this._layouts.createPanel('BabylonEditorMainToolbar', 'top', 70, false).setContent(
              '<div id="BabylonEditorMainToolbar" style="height: 50%"></div>'
            + '<div id="BabylonEditorToolsToolbar" style="height: 50%"></div>'
        );
        this._layouts.createPanel('BabylonEditorGraphTool', 'right', 350, true).setContent('<div id="BabylonEditorGraphTool" style="height: 100%"></div>');
        this._layouts.createPanel('BabylonEditorMainPanel', 'main').setContent('<canvas id="renderCanvas"></canvas>');
        this._layouts.createPanel('BabylonEditorBottomPanel', 'bottom', 70, true).setContent('<div id="MainOptionsBar" style="height: 100%"></div>');
        this._layouts.buildElement('BabylonEditorMainLayout');

        /// Create Babylon's engine here. Then, we'll be able to manage events like onClick, onResize, etc.
        var canvas = document.getElementById("renderCanvas");
        this._core.canvas = canvas;
        var scope = this;

        /// FIXME: Must work on IE
        canvas.addEventListener('dblclick', function (event) {
            scope._core.getPickedMesh({
                layerX: scope._core.currentScene.pointerX,
                layerY: scope._core.currentScene.pointerY
            }, true);
        });
        /*window.addEventListener('keydown', function (key) {
            if (key.which == 27) /// Escape
                BABYLON.Editor.Utils.ExitFullScreen(scope.engine, canvas);
        }, true);*/
        BabylonEditorUICreator.bindEvent(document, 'webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function (event) {
            if (scope.engine.isFullscreen)
                BABYLON.Editor.Utils.ExitFullScreen(scope.engine, canvas);
        });

        /// FIXME: events don't necessary call function(target, eventData);
        /// FIXED
        this._layouts.on('resize', function () {
            scope.engine.resize();
        });

        /// Configure "this"
        this.engine = new BABYLON.Engine(canvas, true);
        this._core.engine = this.engine;

        /// Create tool bar
        this._mainToolbar = new BABYLON.Editor.MainToolbar(this._core);
        this._mainToolbar._createUI();

        /// Create Left Edition Tool
        this._editionTool = new BABYLON.Editor.EditionTool(this._core, this._layouts);

        /// Create Right Sidebar (Scene Graph)
        this._graphTool = new BABYLON.Editor.GraphTool(this._core);
        this._graphTool._createUI();

        /// Finish configuration and create default camera
        var scene = new BABYLON.Scene(this.engine);

        this.scenes.push(scene);
        this._core.currentScene = scene;

        this.camera = new BABYLON.FreeCamera("BabylonEditorCamera", new BABYLON.Vector3(0, 5, -10), scene);
        this.camera.setTarget(new BABYLON.Vector3.Zero());
        this.camera.attachControl(canvas, false);

        this.transformer = new BABYLON.Editor.Transformer(this.engine, this._core);

        this._graphTool._fillGraph(null, null);

        this.dragAndDrop(canvas);
    };

    return BabylonEditor;
})();

BABYLON.Editor.BabylonEditor = BabylonEditor;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON