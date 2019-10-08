import { NodeMaterial, InputBlock, Observer } from 'babylonjs';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

import Window from '../../gui/window';
import CodeEditor from '../../gui/code';

export default class NodeMaterialTool extends MaterialTool<NodeMaterial> {
    /**
     * The div id of the tool. Must be provided by the tool.
     */
    public divId: string = 'NODE-MATERIAL-TOOL';
    /**
     * The name of the tab to display. Must be provided by the tool.
     */
    public tabName: string = 'Node Material';

    private _buildObserver: Observer<NodeMaterial> = null;

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof NodeMaterial;
    }

    /**
     * Called once the user selects a new object in
     * the scene of the graph
     */
    public clear (): void {
        if (!this.object)
            return;
        
        if (this._buildObserver) {
            this.object.onBuildObservable.remove(this._buildObserver);
            this._buildObserver = null;
        }

        super.clear();
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);

        // Edit...
        this.tool.add(this, '_edit').name('Edit...');
        this.tool.add(this, '_generateCode').name('Generate Code...');
        this.tool.add(this, '_generateShadersCode').name('Generate Shaders Code...');

        // Uniforms
        const inputs = this.object.getInputBlocks().filter(i => i.visibleInInspector);
        if (inputs.length > 0) {
            const inputsFolder = this.tool.addFolder('Inputs');
            inputsFolder.open();
            this._addInputBlocks(inputs, inputsFolder);
        }

        // Options
        super.addOptions();
    }

    // Adds the inputs folders
    private _addInputBlocks (blocks: InputBlock[], folder: dat.GUI): void {
        blocks.forEach(i => {
            const type = Tools.GetConstructorName(i.value).toLowerCase();
            switch (type) {
                case 'number':
                    folder.add(i, 'value').min(i.min).max(i.max).name(i.name);
                    break;
                case 'vector2':
                case 'vector3':
                case 'vector4':
                    this.tool.addVector(folder, i.name, i.value).open();
                    break;
                case 'color4':
                case 'color3':
                    this.tool.addColor(folder, i.name, i.value).open();
                    break;
            }
        });
    }

    // Edits the node material
    private async _edit (): Promise<void> {
        // Set global material editor
        const nodeEditor = await Tools.ImportScript<any>('babylonjs-node-editor');
        this.object['BJSNODEMATERIALEDITOR'] = nodeEditor;

        // Edit material
        await this.object.edit();
        this._buildObserver = this.object.onBuildObservable.add(() => {
            this.editor.core.renderScenes = true;
            this.update(this.object);
        });
    }

    // Generates the material code
    private _generateCode (): void {
        this._openCodeEditor(this.object.generateCode(), 'javascript');
    }

    // Generates the shaders code
    private _generateShadersCode (): void {
        this._openCodeEditor(this.object.compiledShaders, 'cpp'); // TODO: support glsl
    }

    // Opens a code editor with the 
    private _openCodeEditor (code: string, language: string): void {
        const win = new Window('ExportedCode');
        win.body = '<div id="NODE-MATERIAL-EXPORTED-CODE" style="width: 100%; height: 100%;"></div>';
        win.buttons = ['Close'];
        win.title = 'Exported Code...';
        win.showMax = true;
        win.showClose = true;
        win.onButtonClick = () => win.close();
        win.open();

        const codeEditor = new CodeEditor(language, code);
        codeEditor.build('NODE-MATERIAL-EXPORTED-CODE');

        win.onClose = () => codeEditor.dispose();
    }
}
