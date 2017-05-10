declare module BABYLON {
    class Container2D extends Mesh {
        dock: number;
        resize: number;
        fitCoefficient: number;
        private _lastRenderWidth;
        private _lastRenderHeight;
        protected _pivot: Vector3;
        protected _isBufferDirty: boolean;
        protected _x: number;
        protected _y: number;
        protected _scalex: number;
        protected _scaley: number;
        protected _width: number;
        protected _height: number;
        constructor(name: string, scene: Scene, parent?: Node);
        render(subMesh: SubMesh, enableAlphaMode: boolean): Mesh;
        getWorldMatrix(): Matrix;
        setPivotPoint(point: Vector3, space?: Space): AbstractMesh;
        getPivotPoint(): Vector3;
        x: number;
        y: number;
        rotationZ: number;
        scaleXY: number;
        scaleX: number;
        scaleY: number;
        width: number;
        height: number;
        static RenderWidth: number;
        static RenderHeight: number;
        serialize(): any;
        static Parse(serializationObject: any, scene: Scene, rootUrl: string): Container2D;
    }
}
