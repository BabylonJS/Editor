import { Texture, FilesInputStore } from 'babylonjs';
import { Image } from 'babylonjs-gui';

import AbstractEditionTool from '../edition-tool';

export default class GuiImageTool extends AbstractEditionTool<Image> {
    // Public members
    public divId: string = 'GUI-IMAGE-TOOL';
    public tabName: string = 'Image';

    // Private members
    private _name: string = '';
    private _texture: Texture = null;

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof Image;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: Image): void {
        super.update(object);

        // Common
        const common = this.tool.addFolder('Common');
        common.open();

        this._name = object.name;
        common.add(this, '_name').name('Name').onFinishChange(r => {
            this.editor.graph.renameNode(object.name, r);
            this.object.name = r;
        });
        
        common.add(object, 'alpha').min(0).max(1).name('Alpha');
        common.add(object, 'autoScale').name('Auto Scale');
        common.add(object, 'isVisible').name('Is Visible');
        common.add(object, 'width').name('Width');
        common.add(object, 'height').name('height');

        // Transform
        const transform = this.tool.addFolder('Transform');
        transform.open();
        transform.add(object, 'rotation').step(0.1).name('Rotation');
        transform.add(object, 'scaleX').step(0.1).name('Scale X');
        transform.add(object, 'scaleY').step(0.1).name('Scale Y');

        // Texture
        const texture = this.tool.addFolder('Texture');
        texture.open();

        this.tool.addTexture(texture, this.editor, this.editor.core.scene, '_texture', this, false, false, (tex) => {
            let blobURL = '';
            try {
                blobURL = URL.createObjectURL(FilesInputStore.FilesToLoad[tex['url']]);
            }
            catch (ex) {
                // Chrome doesn't support oneTimeOnly parameter
                blobURL = URL.createObjectURL(FilesInputStore.FilesToLoad[tex['url']]);
            }

            object.source = blobURL;
        });
    }
}
