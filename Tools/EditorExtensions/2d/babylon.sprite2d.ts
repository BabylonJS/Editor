module BABYLON {
    export class Sprite2D extends Container2D {
        // Public members
        public textures: Texture[] = [];
        public textureIndex: number = -1;

        // Private members
        private _vertices: number[] = [];
        private _vertexBuffer: VertexBuffer = null;
        private _indexBuffer: VertexBuffer = null;

        // Constructor
        constructor(name: string, scene: Scene, parent: Node) {
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

            super.render(subMesh, enableAlphaMode);

            return this;
        }

        public isReady(): boolean {
            var texture = this.textures[this.textureIndex];
            return texture && texture.isReady() && super.isReady();
        }

        // Sets textures
        public setTextures(textures: Texture | Texture[]): void {
            this.textures = Array.isArray(textures) ? textures : [textures];
            this.textureIndex = 0;

            // Set new positions in vertex data
            this.textures[0].onLoadObservable.add(() => {
                this._updateBuffers(this.textures[0]);
            });
        }

        // Returns the width of the sprite
        public get width() {
            var texture = this.textures[this.textureIndex];
            if (!texture)
                return 0;

            return texture.getBaseSize().width * this.scaleX;
        }

        // Returns the height of the sprite
        public get height() {
            var texture = this.textures[this.textureIndex];
            if (!texture)
                return 0;

            return texture.getBaseSize().height * this.scaleY;
        }

        // Sets the vertex data
        private _updateBuffers(texture: Texture): void {
            if (!texture)
                return;
            
            var vertexBuffer = this._geometry.getVertexBuffer(VertexBuffer.PositionKind);
            var data = vertexBuffer.getData();

            var width = texture.getBaseSize().width / Container2D.RenderWidth;
            var height = texture.getBaseSize().height / Container2D.RenderHeight;

            data[0] = -1.0 - this._pivot.x * width;
            data[1] = -1.0 - this._pivot.y * height;

            data[3] = width - 1.0 - this._pivot.x * width;
            data[4] = -1.0 - this._pivot.y * height;

            data[6] = width - 1.0 - this._pivot.x * width;
            data[7] = height - 1.0 - this._pivot.y * height;

            data[9] = 0 - 1.0 - this._pivot.x * width;
            data[10] = height - 1.0 - this._pivot.y * height;

            vertexBuffer.update(data);
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
                uniforms: ["world"],
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
            var texture = this.textures[this.textureIndex];
            if (texture && texture.isReady()) {
                material.setTexture("textureSampler", this.textures[this.textureIndex]);
            }

            // Set world matrix
            material.setMatrix("world", mesh.getWorldMatrix());
        }

        // Returns the material as ShaderMaterial
        private _getMaterial(): ShaderMaterial {
            return <ShaderMaterial> this.material
        }
    }
}