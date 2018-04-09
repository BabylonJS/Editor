/**
 * Edition tools
 */
import { IEditionTool } from '../edition-tools/edition-tool';
import SceneTool from '../edition-tools/scene-tool';
import NodeTool from '../edition-tools/node-tool';
import LightTool from '../edition-tools/light-tool';
import PhysicsTool from '../edition-tools/physics-tool';
import RenderTargetTool from '../edition-tools/render-target-tool';
import ParticleSystemTool from '../edition-tools/particle-system-tool';
import SoundTool from '../edition-tools/sound-tool';

import AnimationTool from '../edition-tools/animation-tool';
import SkeletonTool from '../edition-tools/skeleton-tool';

import StandardMaterialTool from '../edition-tools/materials/standard-tool';
import PBRMaterialTool from '../edition-tools/materials/pbr-tool';
import WaterMaterialTool from '../edition-tools/materials/water-tool';
import CustomMaterialTool from '../edition-tools/materials/custom-tool';
import SkyMaterialTool from '../edition-tools/materials/sky-tool';
import FireMaterialTool from '../edition-tools/materials/fire-tool';
import CellMaterialTool from '../edition-tools/materials/cell-tool';
import GridMaterialTool from '../edition-tools/materials/grid-tool';
import TriPlanarMaterialTool from '../edition-tools/materials/tri-planar-tool';
import TerrainMaterialTool from '../edition-tools/materials/terrain-tool';
import LavaMaterialTool from '../edition-tools/materials/lava-tool';

import GuiImageTool from '../edition-tools/gui/image';

import PostProcessesTool from '../edition-tools/post-processes/post-processes-tool';
import PostProcessTool from '../edition-tools/post-processes/custom-tool';

import TextureTool from '../edition-tools/texture-tool';

import GroundTool from '../edition-tools/meshes/ground-tool';

/**
 * Editor
 */
import Layout from '../gui/layout';

import Editor from '../editor';
import UndoRedo from '../tools/undo-redo';

export interface EditionToolsOptions {
    layout?: Layout;
    panelType?: string;
    rootDiv?: string;
}

export default class EditorEditionTools {
    // Public members
    public tools: IEditionTool<any>[] = [];
    public currentTools: IEditionTool<any>[] = [];
    public root: string;

    public panel: W2UI.W2Panel;

    public currentObject: any = null;

    // Protected members
    protected lastTabName: string = null;

    /**
     * Constructor
     * @param editor: the editor's reference
     */
    constructor(protected editor: Editor, options: EditionToolsOptions = { }) {
        // Configure panel and div
        this.panel = (options.layout || editor.layout).getPanelFromType(options.panelType || 'left');
        this.root = options.rootDiv || 'EDITION';

        // Add tools
        this.addTool(new SceneTool());
        this.addTool(new NodeTool());
        this.addTool(new PhysicsTool());
        this.addTool(new LightTool());
        this.addTool(new RenderTargetTool());
        this.addTool(new ParticleSystemTool());
        this.addTool(new SoundTool());

        this.addTool(new AnimationTool());
        this.addTool(new SkeletonTool());
        
        this.addTool(new StandardMaterialTool());
        this.addTool(new PBRMaterialTool());
        this.addTool(new WaterMaterialTool());
        this.addTool(new CustomMaterialTool());
        this.addTool(new SkyMaterialTool());
        this.addTool(new FireMaterialTool());
        this.addTool(new CellMaterialTool());
        this.addTool(new GridMaterialTool());
        this.addTool(new TriPlanarMaterialTool());
        this.addTool(new TerrainMaterialTool());
        this.addTool(new LavaMaterialTool());

        this.addTool(new PostProcessesTool());
        this.addTool(new PostProcessTool());

        // TODO: wait for parse and serialize for GUI
        // this.addTool(new GuiImageTool());

        this.addTool(new TextureTool());

        this.addTool(new GroundTool());

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
        return;
        
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
        this.currentTools = [];
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

                // Manage undo / redo
                t.tool.onFinishChange(t.tool.element, (property, result, object, initialValue) => {
                    UndoRedo.Push({ property: property, to: result, from: initialValue, object: object });
                });

                this.currentTools.push(t);
            } else {
                // Hide
                $('#' + t.divId).hide();
                this.panel.tabs.hide(t.tabName);
            }
        });

        if (firstTool)
            this.changeTab(firstTool.tabName);

        // Current object
        this.currentObject = object;
    }

    /**
     * Updates the display of all visible edition tools
     */
    public updateDisplay (): void {
        this.currentTools.forEach(t => t.tool.updateDisplay());
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

        // Hack hack hack, makes dat.gui working better
        window.dispatchEvent(new Event('resize'));
    }
}
