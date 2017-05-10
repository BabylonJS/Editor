declare module BABYLON {
    class Sprite2D extends Container2D {
        textures: Texture[];
        textureOffset: Vector2;
        textureScale: Vector2;
        invertY: boolean;
        private _vertices;
        private _vertexBuffer;
        private _indexBuffer;
        private _textureIndex;
        constructor(name: string, scene: Scene, parent?: Node);
        render(subMesh: SubMesh, enableAlphaMode: boolean): Mesh;
        isReady(): boolean;
        setTextures(textures: Texture | Texture[]): void;
        setFrameCoordinates(x: number, y: number, width: number, height: number): void;
        readonly width: number;
        readonly height: number;
        textureIndex: number;
        private _setFrameCoordinates(texture, x, y, width, height);
        private _updateBuffers(texture);
        private _prepareBuffers();
        private _prepareMaterial();
        private _onBindMaterial(mesh);
        private _getMaterial();
        serialize(): any;
        static Parse(serializationObject: any, scene: Scene, rootUrl: string): Sprite2D;
    }
}
