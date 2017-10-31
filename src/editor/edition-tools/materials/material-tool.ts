import { Material, AbstractMesh } from 'babylonjs';

import AbstractEditionTool from '../edition-tool';
import Tools from '../../tools/tools';

export default abstract class MaterialTool<T extends Material> extends AbstractEditionTool<T> {
    // Public members

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return (object instanceof AbstractMesh) && !!object.material;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);
        super.setTabName(Tools.GetConstructorName(object.material).replace('Material', ''));

        this.object = object.material;

        // Common
        const common = this.tool.addFolder('Common');
        common.open();
        common.add(this.object, 'name').name('Name');
        common.add(this.object, 'alpha').min(0).max(1).name('Alpha');
        common.add(this.object, "wireframe").name("Wire Frame");
        common.add(this.object, "fogEnabled").name("Fog Enabled");
        common.add(this.object, "backFaceCulling").name("Back Face Culling");
        common.add(this.object, "checkReadyOnEveryCall").name("Check Ready On Every Call");
        common.add(this.object, "checkReadyOnlyOnce").name("Check Ready Only Once");
        common.add(this.object, "disableDepthWrite").name("Disable Depth Write");
    }
}
