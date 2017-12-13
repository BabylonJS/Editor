import { IEditionTool } from '../edition-tools/edition-tool';
import SceneTool from '../edition-tools/scene-tool';
import NodeTool from '../edition-tools/node-tool';
import LightTool from '../edition-tools/light-tool';
import PhysicsTool from '../edition-tools/physics-tool';
import RenderTargetTool from '../edition-tools/render-target-tool';
import PostProcessesTool from '../edition-tools/post-processes-tool';
import ParticleSystemTool from '../edition-tools/particle-system-tool';

import StandardMaterialTool from '../edition-tools/materials/standard-tool';
import PBRMaterialTool from '../edition-tools/materials/pbr-tool';
import WaterMaterialTool from '../edition-tools/materials/water-tool';

import TextureTool from '../edition-tools/texture-tool';

import Editor from '../editor';

export default class EditorEditionTools {
    // Public members
    public tools: IEditionTool<any>[] = [];
    public root: string = 'EDITION';

    public panel: W2UI.W2Panel;

    // Protected members
    protected lastTabName: string = null;

    /**
     * Constructor
     * @param editor: the editor's reference
     */
    constructor(protected editor: Editor) {
        // Get panel
        this.panel = editor.layout.getPanelFromType('left');

        // Add tools
        this.addTool(new SceneTool());
        this.addTool(new PostProcessesTool());
        this.addTool(new NodeTool());
        this.addTool(new PhysicsTool());
        this.addTool(new LightTool());
        this.addTool(new RenderTargetTool());
        this.addTool(new ParticleSystemTool());
        
        this.addTool(new StandardMaterialTool());
        this.addTool(new PBRMaterialTool());
        this.addTool(new WaterMaterialTool());

        this.addTool(new TextureTool());

        // Events
        this.editor.core.onSelectObject.add(node => this.setObject(node));
    }

    /**
     * Resizes the edition tools
     * @param width the width of the panel
     */
    public resize(width: number): void {
        this.tools.forEach(t => {
            if (t.tool && t.tool.element) {
                t.tool.element.width = width;
            }
        });
    }

    /**
     * Add the given tool (IEditionTool)
     * @param tool the tool to add
     */
    public addTool(tool: IEditionTool<any>): void {
        let current = this.root;

        // Create container
        //$('#' + current).append('<div id="' + tool.divId + '" style="width: 100%; height: 100%"></div>');
        $('#' + current).append('<div id="' + tool.divId + '"></div>');
        $('#' + tool.divId).hide();

        // Add tab
        this.panel.tabs.add({
            id: tool.tabName,
            caption: tool.tabName,
            closable: false,
            onClick: (event) => this.changeTab(event.target)
        });

        // Add & configure tool
        tool.editor = this.editor;
        this.tools.push(tool);

        // Last tab name?
        if (!this.lastTabName)
            this.lastTabName = tool.tabName;
    }

    /**
     * Sets the object to edit
     * @param object the object to edit
     */
    public setObject(object: any): void {
        let firstTool: IEditionTool<any> = null;

        this.tools.forEach(t => {
            if (t.isSupported(object)) {
                // Show
                $('#' + t.divId).show();

                this.panel.tabs.show(t.tabName);
                t.update(object);

                if (t.tabName === this.lastTabName)
                    firstTool = t;
                else if (!firstTool)
                    firstTool = t;
            } else {
                // Hide
                $('#' + t.divId).hide();
                this.panel.tabs.hide(t.tabName);
            }
        });

        if (firstTool)
            this.changeTab(firstTool.tabName);
    }

    /**
     * When a tab changed
     * @param target the target tab Id
     */
    protected changeTab(target: string): void {
        this.tools.forEach(t => {
            const container = $('#' + t.divId);

            if (t.tabName === target) {
                container.show();
                this.lastTabName = target;
            }
            else
                container.hide();
        });
    }
}
