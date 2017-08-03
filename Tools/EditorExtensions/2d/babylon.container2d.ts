module BABYLON {
    export class Container2D extends Mesh {
        // Public members
        @serialize()
        public dock: number = Dock.LEFT | Dock.BOTTOM;
        @serialize()
        public resize: number = Resize.NONE;

        @serialize()
        public fitCoefficient: number = 1;

        // Private members
        private _lastRenderWidth: number = -1;
        private _lastRenderHeight: number = -1;

        // Protected members
        @serializeAsVector2()
        protected _pivot: Vector3 = Vector3.Zero();
        protected _isBufferDirty: boolean = false;

        protected _x: number = 0;
        protected _y: number = 0;

        protected _scalex: number = 1;
        protected _scaley: number = 1;

        protected _width: number = 1;
        protected _height: number = 1;

        // Constructor
        constructor(name: string, scene: Scene, parent?: Node) {
            super(name, scene, parent);
        }

        // Override render
        public render(subMesh: SubMesh, enableAlphaMode: boolean): Mesh {
            // Render size changed ?
            var engine = this.getEngine();
            if (engine.getRenderWidth() !== this._lastRenderWidth || engine.getRenderHeight() !== this._lastRenderHeight) {
                this._isBufferDirty = true;
                this._lastRenderWidth = Container2D.RenderWidth = engine.getRenderWidth();
                this._lastRenderHeight = Container2D.RenderHeight = engine.getRenderHeight();
            }

            // Disable depth buffer
            this.getEngine().setDepthBuffer(false);

            // Render
            super.render(subMesh, enableAlphaMode);

            // Re-enable depth buffer
            this.getEngine().setDepthBuffer(true);

            return this;
        }

        public getWorldMatrix(): Matrix {
            if ((this.resize || this.dock) && this.isReady()) {
                var parentWidth = this.parent ? (<Container2D>this.parent).width : Container2D.RenderWidth;
                var parentHeight = this.parent ? (<Container2D>this.parent).height : Container2D.RenderHeight;

                if (this.resize === Resize.COVER) {
                    var ratio = Math.max(parentWidth * 2.0 / this.width, parentHeight * 2.0 / this.height);
                    this.scaling.x = this.scaling.y = ratio;
                }
                else if (this.resize === Resize.CONTAIN) {
                    var ratio = Math.min(parentWidth * 2.0 / this.width, parentHeight * 2.0 / this.height);
                    this.scaling.x = this.scaling.y = ratio;
                }
                else if (this.resize === Resize.FIT) {
                    var ratio = Math.min(parentWidth * 2.0 / this.width, parentHeight * 2.0 / this.height);
                    this.scaling.x = this.scaling.y = ratio * this.fitCoefficient;
                }
                else {
                    this.scaling.x = this._scalex;
                    this.scaling.y = this._scaley;
                }

                if (this.dock) {
                    if (this.dock & Dock.CENTER_HORIZONTAL) {
                        this.position.x = ((parentWidth / 2.0) + this._x) / parentWidth * 2.0 * this.scaling.x;
                    }
                    else if (this.dock & Dock.RIGHT) {
                        this.position.x = (parentWidth - this._x) / parentWidth * 2.0 * this.scaling.x;
                    }
                    else {
                        this.position.x = this._x / parentWidth * 2.0 * this.scaling.x;
                    }

                    if (this.dock & Dock.CENTER_VERTICAL) {
                        this.position.y = ((parentHeight / 2.0) + this._y) / parentHeight * 2.0 * this.scaling.y;
                    }
                    else if (this.dock & Dock.TOP) {
                        this.position.y = (parentHeight - this._y) / parentHeight * 2.0 * this.scaling.y;
                    }
                    else {
                        this.position.y = this._y / parentHeight * 2.0 * this.scaling.y;
                    }
                }

                // Adjust fit
                if (this.resize === Resize.FIT && this.dock) {
                    if (this.dock & Dock.RIGHT)
                        this.position.x -= this.scaling.x - 1.0;
                    else
                        this.position.x += this.scaling.x - 1.0;
                }
            }
        
            var matrix = super.getWorldMatrix();

            return matrix;
        }

        public setPivotPoint(point: Vector3, space?: Space): AbstractMesh {
            this._pivot.x = point.x;
            this._pivot.y = point.y;

            this._isBufferDirty = true;

            return this;
        }

        public getPivotPoint(): Vector3 {
            return this._pivot;
        }

        @serialize()
        public get x() { return this._x; }
        public set x(x: number) { this._x = x; }

        @serialize()
        public get y() { return this._y; }
        public set y(y: number) { this._y = y; }

        @serialize()
        public get rotationZ() { return this.rotation.z; }
        public set rotationZ(rotation: number) { this.rotation.z = rotation; }

        public set scaleXY(xy: number) { this._scalex = this._scaley = xy; }
        public get scaleXY() { return Math.max(this._scalex, this._scaley); }

        @serialize()
        public get scaleX() { return this._scalex; }
        public set scaleX(scalex: number) { this._scalex = scalex; }

        @serialize()
        public get scaleY() { return this._scaley; }
        public set scaleY(scaley: number) { this._scaley = scaley; }

        @serialize()
        public get width(): number { return this._width; }
        public set width(width: number) { this._width = Math.max(width, 1); }

        @serialize()
        public get height(): number { return this._height; }
        public set height(height: number) { this._height = Math.max(height, 1); }

        public static RenderWidth: number = 0;
        public static RenderHeight: number = 0;

        // Serializes the container
        public serialize(): any {
            var serializationObject = SerializationHelper.Serialize(this);
            serializationObject.customType = "Container2D";
            serializationObject.parentName = this.parent ? this.parent.name : null;
            return serializationObject;
        }

        // Parses the container
        public static Parse(serializationObject: any, scene: Scene, rootUrl: string): Container2D {
            var container = SerializationHelper.Parse(() => new Container2D(serializationObject.name, scene), serializationObject, scene, rootUrl);
            return container;
        }
    } 
}
