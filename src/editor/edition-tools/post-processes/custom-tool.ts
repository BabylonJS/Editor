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

        const config = this.object.config;

        // Floats
        const floats = this.tool.addFolder('Floats');
        floats.open();

        config.floats.forEach(f => {
            if (!this.object[f])
                this.object[f] = 1;
            
            floats.add(this.object, f).step(0.01).name(f);
        });

        // Samplers
        const samplers = this.tool.addFolder('Samplers');
        samplers.open();
        
        config.textures.forEach(t => {
            this.tool.addTexture(samplers, this.editor, t, this.object, false, false).name(t);
        });
    }
}
