import { Material, AbstractMesh, SubMesh, SerializationHelper, Tags } from 'babylonjs';
import * as BABYLON from 'babylonjs';

import AbstractEditionTool from '../edition-tool';
import Tools from '../../tools/tools';
import * as dat from 'dat-gui';

export default abstract class MaterialTool<T extends Material> extends AbstractEditionTool<T> {
    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        const supported = 
            object instanceof Material ||
            object instanceof AbstractMesh && !!object.material ||
            object instanceof SubMesh && !!object.getMaterial();

        if (supported) {
            // Set this.object
            this.object = <T>(
                object instanceof Material ? object :
                object instanceof AbstractMesh && !!object.material ? object.material :
                object instanceof SubMesh && !!object.getMaterial() ? object.getMaterial() : null);
        }

        return supported;
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
            this.object = object instanceof SubMesh ? object.getMaterial() : object.material;
        
        super.setTabName(Tools.GetConstructorName(this.object).replace('Material', '') + ' Material');

        // Common
        const common = this.tool.addFolder('Common');
        common.open();
        common.add(this.object, 'name').name('Name');
        common.add(this.object, 'alpha').min(0).max(1).name('Alpha');

        if (object instanceof AbstractMesh) {
            common.add(object, 'receiveShadows').name('Receive Shadows');
            common.add(object, 'applyFog').name('Apply Fog');
        }

        if (this.object.metadata.originalMaterial) {
            common.add(this, 'resetToOriginal').name('Reset to original');
        }
    }

    /**
     * Resets the current material to the original one
     */
    protected resetToOriginal (): void {
        const ctor = Tools.GetConstructorName(this.object);
        if (BABYLON[ctor]) {
            SerializationHelper.Parse(() => this.object, this.object.metadata.original, this.object.getScene(), 'file:');
            Tags.RemoveTagsFrom(this.object, 'modified');
            this.editor.edition.updateDisplay();
        }
    }

    /**
     * Add material options
     */
    protected addOptions (): dat.GUI {
        const options = this.tool.addFolder('Options');
        options.open();
        options.add(this.object, "wireframe").name("Wire Frame");
        options.add(this.object, "fogEnabled").name("Fog Enabled");
        options.add(this.object, "backFaceCulling").name("Back Face Culling");
        options.add(this.object, "checkReadyOnEveryCall").name("Check Ready On Every Call");
        options.add(this.object, "checkReadyOnlyOnce").name("Check Ready Only Once");
        options.add(this.object, "disableDepthWrite").name("Disable Depth Write");
        options.add(this.object, 'needDepthPrePass').name('Need Depth Pre Pass');
        
        this.object['useLogarithmicDepth'] = this.object['useLogarithmicDepth'] || false;
        options.add(this.object, "useLogarithmicDepth").name("Use Logarithmic Depth");

        return options;
    }
}
