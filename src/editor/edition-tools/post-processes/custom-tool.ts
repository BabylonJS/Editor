import { Vector2, Vector3 } from 'babylonjs';

import PostProcessEditor, { CustomPostProcessConfig } from '../../../extensions/post-process-creator/post-process';
import AbstractEditionTool from '../edition-tool';
import Tools from '../../tools/tools';

export default class CustomPostProcessTool extends AbstractEditionTool<PostProcessEditor> {
    // Public members
    public divId: string = 'CUSTOM-POST-PROCESS-TOOL';
    public tabName: string = 'Custom Post-Process';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object.getClassName && object.getClassName() === 'PostProcessEditor';
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);
        this.setTabName('Custom Post-Process');

        // Get current config of the post-process
        const config = this.object.config;

        // Floats
        const floats = this.tool.addFolder('Floats');
        floats.open();

        config.floats.forEach(f => {
            if (this.object.userConfig[f] === undefined)
                this.object.userConfig[f] = 1;
            
            floats.add(this.object.userConfig, f).step(0.01).name(f);
        });

        // Vectors
        const vectors = this.tool.addFolder('Vectors');
        vectors.open();

        config.vectors2.forEach(v => {
            if (!this.object.userConfig[v] || !(this.object.userConfig[v] instanceof Vector2))
                this.object.userConfig[v] = Vector2.Zero();

            this.tool.addVector(vectors, v, <Vector2> this.object.userConfig[v]).open();
        });

        config.vectors3.forEach(v => {
            if (!this.object.userConfig[v] || !(this.object.userConfig[v] instanceof Vector3))
                this.object.userConfig[v] = Vector3.Zero();

            this.tool.addVector(vectors, v, <Vector3> this.object.userConfig[v]).open();
        });

        // Samplers
        const samplers = this.tool.addFolder('Samplers');
        samplers.open();
        
        config.textures.forEach(t => {
            this.tool.addTexture(samplers, this.editor, t, this.object.userConfig, false, false).name(t);
        });
    }
}
