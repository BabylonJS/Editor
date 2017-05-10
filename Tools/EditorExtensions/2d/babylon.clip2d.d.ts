declare module BABYLON {
    class Clip2D extends Sprite2D {
        private _spriteWidth;
        private _spriteHeight;
        private _animated;
        private _delay;
        private _time;
        private _clipRowIndex;
        private _clipIndex;
        private _clipCount;
        private _clipPerLine;
        private _clipPerColumn;
        private _offsetx;
        private _offsety;
        constructor(name: string, scene: Scene, parent?: Node);
        render(subMesh: SubMesh, enableAlphaMode: boolean): Mesh;
        setTextures(textures: Texture | Texture[]): void;
        width: number;
        height: number;
        readonly isPlaying: boolean;
        play(delay?: number, clipCount?: number): void;
        stop(): void;
        pause(): void;
        private _configure();
        private _configureClip(texture);
    }
}
