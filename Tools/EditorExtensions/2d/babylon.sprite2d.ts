module BABYLON {
    export class Sprite2D extends Container2D {
        // Public members
        public textures: Texture[] = [];

        @serialize()
        public textureOffset: Vector2 = Vector2.Zero();
        @serialize()
        public textureScale: Vector2 = new Vector2(1, 1);

        @serialize()
        public invertY: boolean = false;

        // Private members
        private _vertices: number[] = [];
        private _vertexBuffer: VertexBuffer = null;
        private _indexBuffer: VertexBuffer = null;

        private _textureIndex: number = 0;

        // Constructor
        constructor(name: string, scene: Scene, parent?: Node) {
            super(name, scene, parent);

            // Initialize
            this.position.z = 1;
            this._prepareBuffers();
            this._prepareMaterial();
        }

        // Override render
        public render(subMesh: SubMesh, enableAlphaMode: boolean): Mesh {
            // Is dirty ?
            if (this._isBufferDirty) {
                this._updateBuffers(this.textures[this.textureIndex]);
                this._isBufferDirty = false;
            }

            if (this.material && this.material.alpha < 1)
                enableAlphaMode = true;

            super.render(subMesh, enableAlphaMode);

            return this;
        }

        public isReady(): boolean {
            var texture = this.textures[this._textureIndex];
            return texture && texture.isReady() && super.isReady();
        }

        // Sets textures
        public setTextures(textures: Texture | Texture[]): void {
            this.textures = Array.isArray(textures) ? textures : [textures];

            // Set new positions in vertex data
            if (this.textures[this._textureIndex]) {
                if (this.textures[this._textureIndex].isReady())
                    this._updateBuffers(this.textures[this._textureIndex]);
                else
                    this.textures[this._textureIndex].onLoadObservable.add(() => this._updateBuffers(this.textures[this._textureIndex]));
            }
        }

        // Sets the frame coordinates (x, y, width, height)
        public setFrameCoordinates(x: number, y: number, width: number, height: number): void {
            var texture = this.textures[this._textureIndex];
            if (texture.isReady())
                this._setFrameCoordinates(texture, x, y, width, height);
            else
                texture.onLoadObservable.add(() => this._setFrameCoordinates(texture, x, y, width, height));
        }

        // Returns the width of the sprite
        public get width() {
            var texture = this.textures[this._textureIndex];
            if (!texture)
                return 0;

            return texture.getBaseSize().width; // * this.scaleX;
        }

        // Returns the height of the sprite
        public get height() {
            var texture = this.textures[this._textureIndex];
            if (!texture)
                return 0;

            return texture.getBaseSize().height * this.scaleY;
        }

        // Returns the texture index
        @serialize("textureIndex")
        public get textureIndex(): number { return this._textureIndex; }

        // Sets the texture index
        public set textureIndex(textureIndex: number) {
            var newTexture = this.textures[textureIndex];

            if (!newTexture)
                return;

            var currentTexture = this.textures[this._textureIndex];

            if (!currentTexture || newTexture.getBaseSize().width !== currentTexture.getBaseSize().width || newTexture.getBaseSize().height !== currentTexture.getBaseSize().height) {
                if (newTexture.isReady())
                    this._updateBuffers(newTexture);
                else
                    newTexture.onLoadObservable.add(() => this._updateBuffers(newTexture));
            }

            this._textureIndex = textureIndex;
        }

        // Sets the frame coordinates
        private _setFrameCoordinates(texture: Texture, x: number, y: number, width: number, height: number): void {
            // Zoom
            this.textureScale.x = width / texture.getBaseSize().width;
            this.textureScale.y = height / texture.getBaseSize().height;

            // Offset
            this.textureOffset.x = x / texture.getBaseSize().width;
            this.textureOffset.y = y / texture.getBaseSize().height;
        }

        // Sets the vertex data
        private _updateBuffers(texture: Texture): void {
            if (!texture)
                return;
            
            var vertexBuffer = this._geometry.getVertexBuffer(VertexBuffer.PositionKind);
            var data = vertexBuffer.getData();

            var width = this.width / Container2D.RenderWidth;
            var height = this.height / Container2D.RenderHeight;

            data[0] = -1.0 - this._pivot.x * width;
            data[1] = -1.0 - this._pivot.y * height;

            data[3] = width - 1.0 - this._pivot.x * width;
            data[4] = -1.0 - this._pivot.y * height;

            data[6] = width - 1.0 - this._pivot.x * width;
            data[7] = height - 1.0 - this._pivot.y * height;

            data[9] = 0 - 1.0 - this._pivot.x * width;
            data[10] = height - 1.0 - this._pivot.y * height;

            // Update
            vertexBuffer.update(data);
            this.refreshBoundingInfo();
        }

        // Prepares the buffers for sprite
        private _prepareBuffers(): void {
            // VBO and indices
            var vertices = [
                 1,  1,  0,
                -1,  1,  0,
                -1, -1,  0,
                 1, -1,  0
            ];
            var indices = [0, 1, 2, 0, 2, 3];
            var uvs = [
                0, 0,
                1, 0,
                1, 1,
                0, 1
            ];

            // Geometry
            var vertexData = new VertexData();
            vertexData.indices = indices;
            vertexData.positions = vertices;
            vertexData.uvs = uvs;

            if (this._geometry)
                this._geometry.dispose();
            
            this._geometry = new Geometry(name, this.getScene(), vertexData, true, this);
            (<any> this._geometry).doNotSerialize = true;
        }

        // Prepares the sprite 2d material
        private _prepareMaterial(): void {
            var material = this._getMaterial();
            if (material) {
                material.dispose(true, false);
            }

            var shaderPath = {
                vertex: "sprite2d",
                fragment: "sprite2d"
            };

            var options = {
                attributes: ["position", "uv"],
                uniforms: ["world", "alpha", "uvOffset", "uvScale", "invertY"],
                samplers: ["textureSampler"]
            };

            material = new ShaderMaterial(this.name + "_mat", this.getScene(), shaderPath, options);
            material.onBind = (mesh: Mesh) => this._onBindMaterial(mesh);

            this.material = material;
        }

        // Binds the material
        private _onBindMaterial(mesh: Mesh): void {
            var material = this._getMaterial();
            
            // Texture
            var texture = this.textures[this._textureIndex];
            if (texture && texture.isReady()) {
                material.setTexture("textureSampler", this.textures[this._textureIndex]);
            }

            // Set world matrix
            material.setMatrix("world", mesh.getWorldMatrix());

            // Set misc
            material.setFloat("alpha", material.alpha);
            material.setVector2("uvScale", this.textureScale);
            material.setVector2("uvOffset", this.textureOffset);
            material.setFloat("invertY", this.invertY ? -1.0 : 1.0);
        }

        // Returns the material as ShaderMaterial
        private _getMaterial(): ShaderMaterial {
            return <ShaderMaterial> this.material
        }

        // Serializes the sprite
        public serialize(): any {
            var serializationObject = SerializationHelper.Serialize(this, super.serialize());
            serializationObject.customType = "Sprite2D";

            serializationObject.textures = [];
            for (var i = 0; i < this.textures.length; i++) {
                serializationObject.textures.push(this.textures[i].serialize());
            }

            return serializationObject;
        }

        // Parses the sprite
        public static Parse(serializationObject: any, scene: Scene, rootUrl: string): Sprite2D {
            var sprite = SerializationHelper.Parse(() => new Sprite2D(serializationObject.name, scene), serializationObject, scene, rootUrl);

            var textures: Texture[] = [];
            for (var i = 0; i < serializationObject.textures.length; i++) {
                textures.push(<Texture>Texture.Parse(serializationObject.textures[i], scene, rootUrl));
            }

            sprite.setTextures(textures);

            return sprite;
        }
    }
}
