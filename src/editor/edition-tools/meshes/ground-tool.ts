import { GroundMesh, VertexData, Texture, Color3, Vector2 } from 'babylonjs';

import AbstractEditionTool from '../edition-tool';
import TexturePicker from '../../components/texture-picker';
import { IStringDictionary } from '../../typings/typings';

interface HeightMapOptions {
    texture: Texture;
    minHeight: number;
    maxHeight: number;
    colorFilter: Color3;
}

interface DisplacementOptions {
    texture: Texture;
    uvScale: Vector2;
}

export default class GroundTool extends AbstractEditionTool<GroundMesh> {
    // Public members
    public divId: string = 'GROUND-TOOL';
    public tabName: string = 'Ground';

    // Private members
    private _subdivisions: number = 0;

    private _heightMapOptions: IStringDictionary<HeightMapOptions> = { };
    private _minHeight: number = 0;
    private _maxHeight: number = 1;

    private _displacementOptions: IStringDictionary<DisplacementOptions> = { };

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof GroundMesh;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(ground: GroundMesh): void {
        super.update(ground);

        this._subdivisions = this.object._subdivisionsX;

        this.tool.element.add(this.object, '_width').min(0.1).step(0.1).name('Width').onChange(() => this._propertyChanged());
        this.tool.element.add(this.object, '_height').min(0.1).step(0.1).name('Height').onChange(() => this._propertyChanged());
        this.tool.element.add(this, '_subdivisions').min(1).max(1000).step(1).name('Subdivisions').onChange(() => this._propertyChanged());

        // Height map
        const heightmap = this.tool.element.addFolder('Height Map');
        heightmap.open();
        heightmap.add(this, '_createFromHeightMap').name('Create From Height Map...');
        
        const heightMapOptions = this._heightMapOptions[this.object.id];
        if (heightMapOptions) {
            heightmap.add(heightMapOptions, 'minHeight').step(0.01).name('Min Height').onChange(() => this._heightMapTexture = heightMapOptions.texture);
            heightmap.add(heightMapOptions, 'maxHeight').step(0.01).name('Max Height').onChange(() => this._heightMapTexture = heightMapOptions.texture);
            this.tool.addColor(heightmap, 'Color Filter', heightMapOptions.colorFilter, () => this._heightMapTexture = heightMapOptions.texture).open();
        }

        // Displacement
        const displacement = this.tool.addFolder('Displacement');
        displacement.open();
        displacement.add(this, '_createFromDisplacement').name('Create From Displacement Map...');

        const displacementOptions = this._displacementOptions[this.object.id];
        if (displacementOptions) {
            displacement.add(displacementOptions.uvScale, 'x').step(0.01).name('U Scale').onChange(() => this._displacementTexture = displacementOptions.texture);
            displacement.add(displacementOptions.uvScale, 'y').step(0.01).name('V Scale').onChange(() => this._displacementTexture = displacementOptions.texture);
        }

        // Restore
        const restore = this.tool.addFolder('Restore');
        restore.open();
        restore.add(this, '_restoreGroundGeometry').name('Restore geometry');
    }

    // Property changed
    private _propertyChanged(): void {
        const heightMapOptions = this._heightMapOptions[this.object.id];
        if (heightMapOptions)
            this._heightMapTexture = heightMapOptions.texture;

        const displacementOptions = this._displacementOptions[this.object.id];
        if (displacementOptions)
            this._displacementTexture = displacementOptions.texture;

        if (!heightMapOptions && !displacementOptions) {
            this.object.geometry.setAllVerticesData(VertexData.CreateGround({
                width: this.object._width,
                height: this.object._height,
                subdivisions: this._subdivisions
            }), true);
        }

        this.object._subdivisionsX = this.object._subdivisionsY = this._subdivisions;
    }

    // Create ground from height map.
    private async _createFromHeightMap (): Promise<void> {
        const heightmap = await TexturePicker.Show(this.editor.core.scene, null, false, false);
        this._heightMapTexture = <Texture> heightmap;
    }

    // Create ground with displacement height map.
    private async _createFromDisplacement (): Promise<void> {
        const displacement = await TexturePicker.Show(this.editor.core.scene, null, false, false);
        this._displacementTexture = <Texture> displacement;
    }

    // Restores the ground geometry.
    private _restoreGroundGeometry (): void {
        this.object.geometry.setAllVerticesData(VertexData.CreateGround({
            width: this.object._width,
            height: this.object._height,
            subdivisions: this._subdivisions
        }), true);

        delete this._heightMapOptions[this.object.id];
        delete this._displacementOptions[this.object.id];
        this._propertyChanged();
        this.update(this.object);
    }

    // Sets the displacement map texture.
    private set _displacementTexture (texture: Texture) {
        let options = this._displacementOptions[this.object.id];
        let update = false;

        if (!options) {
            update = true;
            options = {
                texture: texture,
                uvScale: new Vector2(1, 1)
            };

            this._displacementOptions[this.object.id] = options;
        }

        const bufferView = texture.readPixels();
        this.object.applyDisplacementMapFromBuffer(new Uint8Array(bufferView.buffer), texture.getBaseSize().width, texture.getBaseSize().height, 0, 1, Vector2.Zero(), options.uvScale, true);

        // Update tool
        if (update)
            this.update(this.object);
    }

    // Sets the height map texture.
    private set _heightMapTexture (texture: Texture) {
        const bufferWidth = texture.getSize().width;
        const bufferHeight = texture.getSize().height;
        const buffer = new Uint8Array(texture.readPixels().buffer);

        let options = this._heightMapOptions[this.object.id];
        let update = false;
        
        if (!options) {
            update = true;
            options = {
                texture: texture,
                minHeight: 0,
                maxHeight: 1,
                colorFilter: new Color3(0.3, 0.59, 0.11)
            };
        }

        this.object.geometry.setAllVerticesData(VertexData.CreateGroundFromHeightMap({
            width: this.object._width,
            height: this.object._height,
            subdivisions: this._subdivisions,
            minHeight: options.minHeight,
            maxHeight: options.maxHeight,
            colorFilter: options.colorFilter,
            buffer: buffer,
            bufferWidth: bufferWidth,
            bufferHeight: bufferHeight,
            alphaFilter: 0
        }), true);

        // Update height map and options
        options.texture = texture;
        this._heightMapOptions[this.object.id] = options;

        this.object._subdivisionsX = this.object._subdivisionsY = this._subdivisions;

        // Update tool
        if (update)
            this.update(this.object);
    }
}
