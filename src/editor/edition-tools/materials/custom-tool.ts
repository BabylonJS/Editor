import { Material, Vector2, Vector3 } from 'babylonjs';

import CustomEditorMaterial from '../../../extensions/material-creator/material';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class CustomMaterialTool extends MaterialTool<CustomEditorMaterial> {
    // Public members
    public divId: string = 'CUSTOM-MATERIAL-TOOL';
    public tabName: string = 'Custom Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object.getClassName && this.object.getClassName() === 'CustomMaterial';
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);
        this.setTabName('Custom Material');

       // Get current config of the post-process
       const config = this.object.config;

       // Base Color
       this.tool.addColor(this.tool.element, 'Base Color', this.object.baseColor).open();

       // Floats
       const floats = this.tool.addFolder('Floats');
       floats.open();

       config.floats.forEach(f => {
           if (this.object.userConfig[f] === undefined)
               this.object.userConfig[f] = 1;
           
           floats.add(this.object.userConfig, f).step(0.01).name(f).onChange(() => this.object.markAsDirty(Material.MiscDirtyFlag));
       });

       // Vectors
       const vectors = this.tool.addFolder('Vectors');
       vectors.open();

       config.vectors2.forEach(v => {
           if (!this.object.userConfig[v] || !(this.object.userConfig[v] instanceof Vector2))
               this.object.userConfig[v] = Vector2.Zero();

           this.tool.addVector(vectors, v, <Vector2> this.object.userConfig[v], () => this.object.markAsDirty(Material.MiscDirtyFlag)).open();
       });

       config.vectors3.forEach(v => {
           if (!this.object.userConfig[v] || !(this.object.userConfig[v] instanceof Vector3))
               this.object.userConfig[v] = Vector3.Zero();

           this.tool.addVector(vectors, v, <Vector3> this.object.userConfig[v], () => this.object.markAsDirty(Material.MiscDirtyFlag)).open();
       });

       // Samplers
       const samplers = this.tool.addFolder('Samplers');
       samplers.open();
       
       config.textures.forEach(t => {
           this.tool.addTexture(samplers, this.editor, t.name, this.object.userConfig, false, false, () => this.object.markAsDirty(Material.TextureDirtyFlag)).name(t.name);
       });

        // Options
        super.addOptions();
    }
}
