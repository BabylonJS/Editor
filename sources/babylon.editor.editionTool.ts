module BABYLON.EDITOR {
    export class EditionTool implements ICustomUpdate, IEventReceiver {
        // Public members
        public object: any = null;
        public container: string = "BABYLON-EDITOR-EDITION-TOOL";

        public editionTools: Array<ICustomEditionTool> = new Array<ICustomEditionTool>();
        public panel: GUI.IGUIPanel = null;

        public core: EditorCore;

        // Private members
        private _editor: EditorMain;

        private _currentTab: string;

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._editor = core.editor;
            this.core = core;

            this.panel = this._editor.layouts.getPanelFromType("left");

            // Register this
            this.core.updates.push(this);
            this.core.eventReceivers.push(this);
        }

        // Pre update
        public onPreUpdate(): void {

        }
        
        // Post update
        public onPostUpdate(): void {

        }

        // Event
        public onEvent(event: Event): boolean {
            // GUI Event
            if (event.eventType === EventType.GUI_EVENT) {
                if (event.guiEvent.eventType === GUIEventType.TAB_CHANGED && event.guiEvent.caller === this.panel) {
                    var tabID = event.guiEvent.data;
                    if (this._currentTab !== tabID) {
                        this._currentTab = <string>tabID;

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
                else if (event.guiEvent.eventType === GUIEventType.LAYOUT_CHANGED) {
                    if (event.guiEvent.caller === this._editor.layouts) {
                        for (var i = 0; i < this.editionTools.length; i++) {
                            this.editionTools[i].resize();
                        }
                    }
                }
            }

            // Scene Event
            if (event.eventType === EventType.SCENE_EVENT) {
                if (event.sceneEvent.eventType === SceneEventType.OBJECT_PICKED) {
                    this.object = event.sceneEvent.object;

                    if (this.object)
                        this.isObjectSupported(this.object);

                    return false;
                }
            }

            return false;
        }

        public updateEditionTool(): void {
            this.isObjectSupported(this.object);
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            var tabAlreadyShown = false;
            var supportedTools: ICustomEditionTool[] = [];

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
        }

        // Creates the UI
        public createUI(): void {
            // Add default tools
            this.addTool(new GeneralTool(this));
            this.addTool(new SceneTool(this));
            this.addTool(new LightTool(this));
            this.addTool(new AnimationTool(this));
            this.addTool(new PostProcessesTool(this));
            this.addTool(new ReflectionProbeTool(this));
            this.addTool(new AudioTool(this));
            this.addTool(new ParticleSystemTool(this));
            this.addTool(new LensFlareTool(this));

            this.addTool(new MaterialTool(this));
            this.addTool(new StandardMaterialTool(this));
            this.addTool(new SkyMaterialTool(this));
            this.addTool(new PBRMaterialTool(this));
            this.addTool(new WaterMaterialTool(this));
            this.addTool(new LavaMaterialTool(this));
            this.addTool(new FurMaterialTool(this));
            this.addTool(new GradientMaterialTool(this));
            this.addTool(new TerrainMaterialTool(this));
            this.addTool(new TriPlanarMaterialTool(this));
            this.addTool(new GridMaterialTool(this));
            this.addTool(new FireMaterialTool(this));

            for (var i = 0; i < PluginManager.EditionToolPlugins.length; i++)
                this.addTool(new PluginManager.EditionToolPlugins[i](this));
        }

        // Adds a tool
        public addTool(tool: ICustomEditionTool): void {
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
        }
    }
}