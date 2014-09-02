/// <reference path="./index.html" />

function BabylonEditor(babylonEditorCore) {
    this.engine = null;

    /// An editor must manage multiple scenes. Then, you'll be able to mange different
    /// worlds in your video game
    this.scenes = new Array();
    /// If multiple Canvas elements (view ports, etc.)
    this.canvases = new Array();

    /// Core
    this.transformer = null;

    this._core = babylonEditorCore;
    this._core.customUpdates.push(this);

    /// Gui elements
    this._mainToolbar = null;
    this._editionTool = null;
    this._graphTool = null;

    /// Methods
    this._createUI();
};

BabylonEditor.prototype.update = function () {
    this._core.currentScene.render();
}

BabylonEditor.prototype._createUI = function() {

    /// Global style
    var pstyle = 'background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;';

    /// Create Layouts in one shot
    var panels = new Array();
    BabylonEditorUICreator.Layout.extendPanels(panels, [
        BabylonEditorUICreator.Layout.createPanel('top', 50, true, pstyle, '<div id="MainToolBar" style="height: 100%"></div>'),
        BabylonEditorUICreator.Layout.createPanel('left', 350, true, pstyle, '<div id="MainEditorEditObject"></div>', 350),
        BabylonEditorUICreator.Layout.createPanel('main', 350, true, pstyle, '<canvas id="renderCanvas"></canvas>', 350, [
            BabylonEditorUICreator.Layout.createTab('MainScene', 'Main scene'),
            BabylonEditorUICreator.Layout.createTab('scene2', 'Test Scene')
        ]),
        BabylonEditorUICreator.Layout.createPanel('right', 350, true, pstyle, '<div id="MainGraphTool" style="height: 100%"></div>', 300),
        BabylonEditorUICreator.Layout.createPanel('bottom', 50, true, pstyle, '<div id="MainOptionsBar" style="height: 100%"></div>')
    ]);
    BabylonEditorUICreator.Layout.createLayout('Mainlayout', panels);

    /// Create Babylon's engine here. Then, we'll be able to manage events like onClick, onResize, etc.
    var canvas = document.getElementById("renderCanvas");
    var scope = this;

    /// FIXME: Must work on IE
    canvas.ondblclick = function (event) {
        scope._core.getPickedMesh(event, true);
    };

    /// FIXME: events don't necessary call function(target, eventData);
    BabylonEditorUICreator.addEvent('Mainlayout', 'resize', function (target, eventData) {
        scope.engine.resize();
    });

    /// Configure "this"
    this.canvases.push(canvas);
    this.engine = new BABYLON.Engine(canvas, true);
    this._core.engine = this.engine;

    /// Create tool bar
    this._mainToolbar = new BabylonEditorMainToolbar(this._core);
    this._mainToolbar._createUI();

    /// Create Left Edition Tool
    this._editionTool = new BabylonEditorEditionTool(this._core);

    /// Create Right Sidebar (Scene Graph)
    this._graphTool = new BabylonEditorGraphTool(this._core);
    this._graphTool._createUI();

    /// Create bottom toolbar (empty for the moment)
    BabylonEditorUICreator.Toolbar.createToolbar('MainOptionsToolbar', []);

    /// Finish configuration and create default camera
    var scene = new BABYLON.Scene(this.engine);

    this.scenes.push(scene);
    this._core.currentScene = scene;

    var camera = new BABYLON.FreeCamera("BabylonEditorCamera", new BABYLON.Vector3(0, 5, -10), scene);
    camera.setTarget(new BABYLON.Vector3.Zero());
    camera.attachControl(canvas, false);

    this.transformer = new BabylonEditorTransformer(this.engine, this._core);

    this._graphTool._fillGraph(null, null);
};
