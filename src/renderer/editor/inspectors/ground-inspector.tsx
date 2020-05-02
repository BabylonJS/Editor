import { extname } from "path";

import { Nullable } from "../../../shared/types";

import { GUI } from "dat.gui";

import { GroundMesh, VertexData, Texture, Color3 } from "babylonjs";

import { Tools } from "../tools/tools";
import { Alert } from "../gui/alert";

import { Inspector } from "../components/inspector";
import { MeshInspector } from "./mesh-inspector";

export class GroundMeshInspector extends MeshInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: GroundMesh;

    private _groundFolder: Nullable<GUI> = null;
    private _heightMapFolder: Nullable<GUI> = null;
    private _colorFilterFolder: Nullable<GUI> = null;

    private _colorFilter: Color3 = Color3.Black();

    /**
     * Called on a controller changes.
     * @param folder the folder containing the modified controller.
     */
    public onControllerChange(folder: GUI): void {
        if (!this.selectedObject) { return; }

        if (folder !== this._groundFolder && folder !== this._heightMapFolder && folder !== this._colorFilterFolder) { return; }

        if (this.selectedObject.metadata?.heightMap) {
            this._applyHeightMap();
        } else {
            this.selectedObject.geometry?.setAllVerticesData(VertexData.CreateGround({
                width: this.selectedObject._width,
                height: this.selectedObject._height,
                subdivisionsX: this.selectedObject.subdivisionsX,
                subdivisionsY: this.selectedObject.subdivisionsY,
            }));
        }
    }

    /**
     * Adds the rendering editable properties.
     */
    protected addRendering(): GUI {
        const rendering = super.addRendering();

        this.addGround();

        return rendering;
    }

    /**
     * Adds all the ground editable properties.
     */
    protected addGround(): void {
        this._groundFolder = this._groundFolder ?? this.tool!.addFolder("Ground");
        this._groundFolder.open();

        this._groundFolder.add(this.selectedObject, "_width").min(0).step(0.1).name("Width");
        this._groundFolder.add(this.selectedObject, "_height").min(0).step(0.1).name("Height");
        this._groundFolder.add(this.selectedObject, "_subdivisionsX").min(1).step(0.1).name("Sub Divisions X");
        this._groundFolder.add(this.selectedObject, "_subdivisionsY").min(1).step(0.1).name("Sub Divisions Y");

        if (!this.selectedObject.metadata?.heightMap) {
            this._groundFolder.addButton("Create From Height Map...").onClick(async () => {
                await this._createFromHeightMap();
                this.clearFolder(this._groundFolder!);
                this.addGround();
                this._handleChanged(this._groundFolder!);
            });
        } else {
            this._addHeightMap();
        }
    }

    /**
     * Adds all the height map editable properties.
     */
    private _addHeightMap(): void {
        this._heightMapFolder = this._groundFolder!.addFolder("Height Map");
        this._heightMapFolder.open();

        this._heightMapFolder.addButton("Select New Height Map...").onClick(() => this._createFromHeightMap());
        this._heightMapFolder.add(this.selectedObject.metadata.heightMap.options, "minHeight").name("Min Height");
        this._heightMapFolder.add(this.selectedObject.metadata.heightMap.options, "maxHeight").name("Max Height");

        this._colorFilter = Color3.FromArray(this.selectedObject.metadata.heightMap.options.colorFilter);
        this._colorFilterFolder = this.addColor(this._heightMapFolder, "Color Filter", this, "_colorFilter", () => {
            this.selectedObject.metadata.heightMap.options.colorFilter = this._colorFilter.asArray();
        });

        this._heightMapFolder.addButton("Remove Height Map").onClick(() => {
            delete this.selectedObject.metadata.heightMap;
            this.clearFolder(this._groundFolder!);
            this.addGround();
            this.onControllerChange(this._groundFolder!);
            this._handleChanged(this._groundFolder!);
        });
    }

    /**
     * Configures the ground mesh from an height map.
     */
    private async _createFromHeightMap(): Promise<void> {
        const file = await Tools.ShowOpenFileDialog("Select Height Map Texture");

        const extensions = [".png", ".jpg", ".jpeg", ".bmp"];
        if (extensions.indexOf(extname(file).toLocaleLowerCase()) === -1) {
            return Alert.Show("Can't Setup From Height Map", `Only [${extensions.join(", ")}] extensions are supported.`);
        }

        const texture = await new Promise<Texture>((resolve, reject) => {
            const texture = new Texture(file, this.editor.engine!, false, false, Texture.TRILINEAR_SAMPLINGMODE, () => {
                resolve(texture);
            }, (message) => {
                reject(message);
            });
        });

        // Save texture
        this.selectedObject.metadata = this.selectedObject.metadata ?? { };
        this.selectedObject.metadata.heightMap = this.selectedObject.metadata.heightMap ?? { };
        
        this.selectedObject.metadata.heightMap.texture = Array.from(new Uint8Array(texture.readPixels()!.buffer));
        this.selectedObject.metadata.heightMap.textureWidth = texture.getSize().width;
        this.selectedObject.metadata.heightMap.textureHeight = texture.getSize().height;
        this.selectedObject.metadata.heightMap.options = this.selectedObject.metadata.heightMap.options ?? {
            minHeight: 0,
            maxHeight: 50,
            colorFilter: [0.3, 0.59, 0.11],
        };

        texture.dispose();
        this.onControllerChange(this._groundFolder!);
    }

    /**
     * Applies the heightmap.
     */
    private _applyHeightMap(): void {
        this.selectedObject.geometry?.setAllVerticesData(VertexData.CreateGroundFromHeightMap({
            width: this.selectedObject._width,
            height: this.selectedObject._height,
            subdivisions: this.selectedObject.subdivisions,
            minHeight: this.selectedObject.metadata.heightMap.options.minHeight,
            maxHeight: this.selectedObject.metadata.heightMap.options.maxHeight,
            colorFilter: Color3.FromArray(this.selectedObject.metadata.heightMap.options.colorFilter),
            buffer: Uint8Array.from(this.selectedObject.metadata.heightMap.texture),
            bufferWidth: this.selectedObject.metadata.heightMap.textureWidth,
            bufferHeight: this.selectedObject.metadata.heightMap.textureHeight,
            alphaFilter: 0
        }), true);
    }
}

Inspector.registerObjectInspector({
    ctor: GroundMeshInspector,
    ctorNames: ["GroundMesh"],
    title: "Ground",
});
