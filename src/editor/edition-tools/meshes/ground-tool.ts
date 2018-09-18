import { GroundMesh, VertexData, Texture, Color3 } from 'babylonjs';

import AbstractEditionTool from '../edition-tool';
import { IStringDictionary } from '../../typings/typings';

interface HeightMapOptions {
    texture: Texture;
    minHeight: number;
    maxHeight: number;
    colorFilter: Color3;
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
        this.tool.element.add(this, '_createFromHeightMap').name('Create From Height Map...');

        // Height map
        const heightMapOptions = this._heightMapOptions[this.object.id];
        if (heightMapOptions) {
            const heightmap = this.tool.element.addFolder('Height Map');
            heightmap.open();
            heightmap.add(heightMapOptions, 'minHeight').step(0.01).name('Min Height').onChange(() => this._heightMapTexture = heightMapOptions.texture);
            heightmap.add(heightMapOptions, 'maxHeight').step(0.01).name('Max Height').onChange(() => this._heightMapTexture = heightMapOptions.texture);
            this.tool.addColor(heightmap, 'Color Filter', heightMapOptions.colorFilter, () => this._heightMapTexture = heightMapOptions.texture).open();
            heightmap.add(this, '_removeHeightMap').name('Remove Height Map');
        }
    }

    // Property changed
    private _propertyChanged(): void {
        const options = this._heightMapOptions[this.object.id];
        if (options)
            this._heightMapTexture = options.texture;
        else {
            this.object.geometry.setAllVerticesData(VertexData.CreateGround({
                width: this.object._width,
                height: this.object._height,
                subdivisions: this._subdivisions
            }));
        }

        this.object._subdivisionsX = this.object._subdivisionsY = this._subdivisions;
    }

    // Create ground from height map
    private _createFromHeightMap (): void {
        this.editor.addEditPanelPlugin('texture-viewer', true, 'Texture Viewer', this, '_heightMapTexture', false);
    }

    // Remove height map texture from ground
    private _removeHeightMap (): void {
        delete this._heightMapOptions[this.object.id];
        this._propertyChanged();
        this.update(this.object);
    }

    // Sets the height map texture
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
        }));

        // Update height map and options
        options.texture = texture;
        this._heightMapOptions[this.object.id] = options;

        this.object._subdivisionsX = this.object._subdivisionsY = this._subdivisions;

        // Update tool
        if (update)
            this.update(this.object);
    }
}
