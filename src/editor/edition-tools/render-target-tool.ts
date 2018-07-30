import { Light, RenderTargetTexture } from 'babylonjs';

import AbstractEditionTool from './edition-tool';

import Picker from '../gui/picker';

export default class RenderTargetTool extends AbstractEditionTool<Light | RenderTargetTexture> {
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
        return (object instanceof Light && !!object.getShadowGenerator()) || object instanceof RenderTargetTexture;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(node: Light | RenderTargetTexture): void {
        super.update(node);

        // Get render target
        this._renderTarget = node instanceof Light ? node.getShadowGenerator().getShadowMap() : node;

        // Common
        const common = this.tool.addFolder('Common');
        common.open();

        common.add(this._renderTarget, 'refreshRate').min(0).step(1).name('Refresh Rate');

        // Render list
        const renderList = this.tool.addFolder('Render List');
        renderList.open();

        renderList.add(this._renderTarget, 'renderParticles').name('Render Particles');
        renderList.add(this._renderTarget, 'renderSprites').name('Render Sprites');
        renderList.add(this, '_setRenderList').name('Configure Render List...');
    }

    // Sets the render list of the render target
    private _setRenderList (): void {
        const picker = new Picker('Render List');
        picker.addItems(this.object.getScene().meshes);
        picker.addSelected(this._renderTarget.renderList);
        picker.open((selected) => {
            const scene = this._renderTarget.getScene();

            this._renderTarget.renderList = [];
            selected.forEach(s => this._renderTarget.renderList.push(scene.getMeshByName(s.name)));
        });
    }
}
