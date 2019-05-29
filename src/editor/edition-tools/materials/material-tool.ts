import { Material, AbstractMesh, SubMesh, SerializationHelper, Tags, Texture } from 'babylonjs';
import * as BABYLON from 'babylonjs';
import * as dat from 'dat-gui';

import AbstractEditionTool from '../edition-tool';
import Tools from '../../tools/tools';
import { IStringDictionary } from '../../typings/typings';

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

        // Reset
        if (this.object.metadata && this.object.metadata.original) {
            this.tool.add(this, 'resetToOriginal').name('Reset to original');
        }

        // Common
        const common = this.tool.addFolder('Common');
        common.open();
        common.add(this.object, 'name').name('Name');
        common.add(this.object, 'alpha').min(0).max(1).name('Alpha');

        if (object instanceof AbstractMesh) {
            common.add(object, 'receiveShadows').name('Receive Shadows');
            common.add(object, 'applyFog').name('Apply Fog');
        }
    }

    /**
     * Resets the current material to the original one
     */
    protected resetToOriginal (): void {
        const ctor = Tools.GetConstructorName(this.object);
        if (BABYLON[ctor]) {
            // Copy metadata
            const copy = { };
            for (const key in this.object.metadata.original)
                copy[key] = this.object.metadata.original[key];

            // Remove textures
            const textures: IStringDictionary<any> = { };
            for (const key in copy) {
                const value = copy[key];

                if (key.toLowerCase().indexOf('texture') === -1 || typeof(value) !== 'object')
                    continue;
                
                textures[key] = copy[key];
                delete copy[key];
            }

            // Simply parse
            SerializationHelper.Parse(() => this.object, copy, this.object.getScene(), 'file:');

            // Parse textures
            for (const key in textures) {
                const value = textures[key];
                const original = Tools.GetTextureByName(this.object.getScene(), value.name);

                if (original)
                    this.object[key] = SerializationHelper.Parse(() => original, textures[key], this.object.getScene(), 'file:');
                else
                    this.object[key] = Texture.Parse(textures[key], this.object.getScene(), 'file:');
            }

            setTimeout(() => Tags.RemoveTagsFrom(this.object, 'modified'), 1);
            this.editor.inspector.updateDisplay();
            this.editor.inspector.setObject(this.object);
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
