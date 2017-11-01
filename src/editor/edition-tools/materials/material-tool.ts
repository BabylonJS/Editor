import { Material, AbstractMesh } from 'babylonjs';

import AbstractEditionTool from '../edition-tool';
import Tools from '../../tools/tools';

export default abstract class MaterialTool<T extends Material> extends AbstractEditionTool<T> {
    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof Material || (object instanceof AbstractMesh) && !!object.material;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);

        if (object instanceof Material)
            this.object = <T> object;
        else
            this.object = object.material;
        
        super.setTabName(Tools.GetConstructorName(this.object).replace('Material', ''));

        // Common
        const common = this.tool.addFolder('Common');
        common.open();
        common.add(this.object, 'name').name('Name');
        common.add(this.object, 'alpha').min(0).max(1).name('Alpha');
    }

    /**
     * Add material options
     */
    protected addOptions (): void {
        const options = this.tool.addFolder('Options');
        options.open();
        options.add(this.object, "wireframe").name("Wire Frame");
        options.add(this.object, "fogEnabled").name("Fog Enabled");
        options.add(this.object, "backFaceCulling").name("Back Face Culling");
        options.add(this.object, "checkReadyOnEveryCall").name("Check Ready On Every Call");
        options.add(this.object, "checkReadyOnlyOnce").name("Check Ready Only Once");
        options.add(this.object, "disableDepthWrite").name("Disable Depth Write");
        
        this.object['useLogarithmicDepth'] = this.object['useLogarithmicDepth'] || false;
        options.add(this.object, "useLogarithmicDepth").name("Use Logarithmic Depth");
    }
}
