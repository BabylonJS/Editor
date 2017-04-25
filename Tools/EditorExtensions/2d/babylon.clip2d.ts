module BABYLON {
    export class Clip2D extends Sprite2D {
        // Public members
        
        // Private members
        private _spriteWidth: number = 1;
        private _spriteHeight: number = 1;

        private _animated: boolean = false;

        private _delay: number = 0;
        private _time: number = 0;

        private _clipRowIndex = 0;
        private _clipIndex = 0;
        private _clipCount = 0;

        private _clipPerLine: number = 0;
        private _clipPerColumn: number = 0;

        private _offsetx: number = 0;
        private _offsety: number = 0;

        // Constructor
        constructor(name: string, scene: Scene, parent?: Node) {
            super(name, scene, parent);
        }

        // Override render
        public render(subMesh: SubMesh, enableAlphaMode: boolean): Mesh {
            // Animate
            var texture = this.textures[this.textureIndex];
            if (this._animated && texture) {
                this._time += this.getEngine().getDeltaTime();

                this.textureScale.x = this.width / texture.getBaseSize().width;
                this.textureScale.y = this.height / texture.getBaseSize().height;

                if (this._time > this._delay) {
                    this._clipIndex += this._time / this._delay >> 0;
                    this._time = 0;

                    if (this._clipIndex > this._clipCount) {
                        this._clipIndex = 0;
                        this._clipRowIndex = 0;
                    }
                }

                var clipIndex = this._clipIndex;
                this._clipRowIndex = (this._clipIndex / this._clipPerLine) >> 0;

                if (clipIndex > this._clipPerLine)
                    clipIndex -= this._clipPerLine;

                this.textureOffset.x = this._offsetx * this._clipIndex;
                this.textureOffset.y = texture.getBaseSize().width / texture.getSize().width + this._offsety * this._clipRowIndex;
            }
        
            return super.render(subMesh, enableAlphaMode);
        }

        // Sets textures
        public setTextures(textures: Texture | Texture[]): void {
            super.setTextures(textures);
            this._configure();
        }

        // Sets the width of the sprite
        public set width(width: number) {
            this._spriteWidth = Math.max(width, 1);
            this._isBufferDirty = true;
            this._configure();
        }
        
        // Returns the width of the sprite
        public get width(): number { return this._spriteWidth; }

        // Sets the height of the sprite
        public set height(height: number) {
            this._spriteHeight = Math.max(height, 1);
            this._isBufferDirty = true;
            this._configure();
        }

        // Returns if the clip is playing
        public get isPlaying(): boolean { return this._animated; }

        // Returns the height of the sprite
        public get height(): number { return this._spriteHeight; }

        // Plays the clip
        public play(delay?: number, clipCount?: number): void {
            this._animated = true;
            this._delay = delay || this._delay;
            this._clipCount = clipCount || this._clipCount;

            this._configure();
        }

        // Stops the clip
        public stop(): void {
            this._animated = false;
            this._time = 0;
            this._clipIndex = 0;
        }

        // Pauses the clip
        public pause(): void {
            this._animated = false;
        }

        // Configures the clip
        private _configure(): void {
            var texture = this.textures[this.textureIndex];
            if (texture) {
                if (texture.isReady())
                    this._configureClip(texture);
                else
                    texture.onLoadObservable.add(() => this._configureClip(texture));
            }
        }

        private _configureClip(texture: Texture): void {
            this._clipPerLine = texture.getBaseSize().width / this.width;
            this._clipPerColumn = texture.getBaseSize().height / this.height;

            this._offsetx = 1.0 / this._clipPerLine;
            this._offsety = 1.0 - 1.0 / this._clipPerColumn;
        }
    }
}
