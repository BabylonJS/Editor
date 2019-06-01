import { BaseTexture, Texture, CubeTexture, ProceduralTexture, MirrorTexture, SerializationHelper, Tags } from 'babylonjs';

import AbstractEditionTool from './edition-tool';

export default class TextureTool extends AbstractEditionTool<BaseTexture> {
    // Public members
    public divId: string = 'TEXTURE-TOOL';
    public tabName: string = 'Texture';

    // Private members
    private _currentCoordinatesMode: string = '';
    private _textureSize: string = '';

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

        // Reset
        if (texture.metadata && texture.metadata.original) {
            this.tool.add(this, 'resetToOriginal').name('Reset to original');
        }

        // Common
        const common = this.tool.addFolder('Common');
        common.open();

        if (texture instanceof ProceduralTexture)
            common.add(texture, 'name').name('Name');

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

            const angles = this.tool.addFolder('Angles');
            angles.add(texture, 'uAng').step(0.01).name('Angle U');
            angles.add(texture, 'vAng').step(0.01).name('Angle V');
            angles.add(texture, 'wAng').step(0.01).name('Angle W');
        }
        else if (texture instanceof CubeTexture) {
            // TODO
        }
        
        // Mirror
        if (texture instanceof MirrorTexture) {
            // Plane
            const mirror = this.tool.addFolder('Mirror');
            mirror.open();

            mirror.add(texture.mirrorPlane, 'd').name('Distance');
            this.tool.addVector(mirror, 'Normal', texture.mirrorPlane.normal).open();
        }

        if (texture instanceof ProceduralTexture) {
            const procedural = this.tool.addFolder('Procedural');
            procedural.open();

            procedural.add(texture, 'refreshRate').step(1).min(0).name('Refresh Rate');
        }

        // Resize
        if (texture['resize']) {
            const size = this.tool.addFolder('Size');
            size.open();

            // Size
            const sizes: string[] = [];
            for (let i = 1; i < 12; i++)
                sizes.push(Math.pow(2, i).toString());
            
            this._textureSize = texture['_size'].toString();
            size.add(this, '_textureSize', sizes).name('Size').onFinishChange(r => {
                texture['resize'](parseInt(r), texture['_generateMipMaps']);
            });
        }
    }

    /**
     * Resets the current light to the original one
     */
    protected resetToOriginal (): void {
        SerializationHelper.Parse(() => this.object, this.object.metadata.original, this.object.getScene(), 'file:');
        setTimeout(() => Tags.RemoveTagsFrom(this.object, 'modified'), 1);
        this.editor.inspector.updateDisplay();
    }
}
