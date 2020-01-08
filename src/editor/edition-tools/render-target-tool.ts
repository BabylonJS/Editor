import { Light, RenderTargetTexture, ReflectionProbe } from 'babylonjs';

import AbstractEditionTool from './edition-tool';

import Picker from '../gui/picker';

export default class RenderTargetTool extends AbstractEditionTool<Light | RenderTargetTexture | ReflectionProbe> {
    // Public members
    public divId: string = 'RENDER-TARGET-TOOL';
    public tabName: string = 'Render Target';

    // Private members
    private _renderTarget: RenderTargetTexture = null;

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return (object instanceof Light && !!object.getShadowGenerator()) || object instanceof RenderTargetTexture || object instanceof ReflectionProbe;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(node: Light | RenderTargetTexture | ReflectionProbe): void {
        super.update(node);

        // Get render target
        this._renderTarget = 
            node instanceof Light ? node.getShadowGenerator().getShadowMap() :
            node instanceof ReflectionProbe ? node.cubeTexture :
            node;

        // Common
        const common = this.tool.addFolder('Common');
        common.open();

        common.add(node instanceof ReflectionProbe ? node : this._renderTarget, 'name').name('Name');
        common.add(this._renderTarget, 'refreshRate').min(0).step(1).name('Refresh Rate');

        // Render list
        const renderList = this.tool.addFolder('Render List');
        renderList.open();

        renderList.add(this._renderTarget, 'renderParticles').name('Render Particles');
        renderList.add(this._renderTarget, 'renderSprites').name('Render Sprites');
        renderList.add(this, '_setRenderList').name('Configure Render List...');

        // Reflection probe
        if (node instanceof ReflectionProbe) {
            const reflectionProbe = this.tool.addFolder('Reflection Probe');
            reflectionProbe.open();

            this.tool.addVector(reflectionProbe, 'Position', node.position).open();
            reflectionProbe.add(this, '_attachToMesh').name('Attach To Mesh...');
        }
    }

    // Sets the render list of the render target
    private _setRenderList (): void {
        const picker = new Picker('Render List');
        picker.addItems(this.object.getScene().meshes);
        picker.addSelected(this._renderTarget.renderList);
        picker.open((selected) => {
            const scene = this._renderTarget.getScene();

            this._renderTarget.renderList = [];
            selected.forEach(s => this._renderTarget.renderList.push(scene.meshes[s.id]));
        });
    }

    // Sets the attached mesh of the reflection probe
    private _attachToMesh (): void {
        const picker = new Picker('Render List');
        picker.addItems(this.object.getScene().meshes);

        const attached = (<ReflectionProbe> this.object)['_attachedMesh'];
        if (attached)
            picker.addSelected([(<ReflectionProbe> this.object)['_attachedMesh']]);
        
        
        picker.open((selected) => {
            const scene = this._renderTarget.getScene();
            (<ReflectionProbe> this.object).attachToMesh(scene.meshes[selected[0].id]);
        });
    }
}
