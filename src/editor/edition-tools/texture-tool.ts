import { BaseTexture, Texture, CubeTexture, ProceduralTexture } from 'babylonjs';

import AbstractEditionTool from './edition-tool';
import Tools from '../tools/tools';

export default class TextureTool extends AbstractEditionTool<BaseTexture> {
    // Public members
    public divId: string = 'TEXTURE-TOOL';
    public tabName: string = 'Texture';

    // Private members
    private _currentCoordinatesMode: string = '';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof BaseTexture;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(texture: BaseTexture): void {
        super.update(texture);

        // Common
        const common = this.tool.addFolder('Common');
        common.open();
        common.add(texture, 'invertZ').name('Invert Z');
        common.add(texture, 'hasAlpha').name('Has Alpha');
        common.add(texture, 'gammaSpace').name('Gamma Space');
        common.add(texture, 'getAlphaFromRGB').name('Get Alpha From RGB');

        const coordinates: string[] = [
            'EXPLICIT_MODE',
            'SPHERICAL_MODE',
            'PLANAR_MODE',
            'CUBIC_MODE',
            'PROJECTION_MODE',
            'SKYBOX_MODE',
            'INVCUBIC_MODE',
            'EQUIRECTANGULAR_MODE',
            'FIXED_EQUIRECTANGULAR_MODE',
            'FIXED_EQUIRECTANGULAR_MIRRORED_MODE'
        ];

        this._currentCoordinatesMode = coordinates[texture.coordinatesMode];
        common.add(this, '_currentCoordinatesMode', coordinates).name('Coordinates Mode').onFinishChange(r => {
            texture.coordinatesMode = Texture[r];
        });

        // Texture
        if (texture instanceof Texture) {
            const tex = this.tool.addFolder('Texture');
            tex.open();
            tex.add(texture, 'vScale').step(0.01).name('V Scale');
            tex.add(texture, 'uScale').step(0.01).name('U Scale');
        }
        else if (texture instanceof CubeTexture) {
            // TODO
        }

        if (texture instanceof ProceduralTexture) {
            const procedural = this.tool.addFolder('Procedural');
            procedural.open();

            procedural.add(texture, 'refreshRate').step(1).min(0).name('Refresh Rate');
        }
    }
}
