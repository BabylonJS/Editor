module BABYLON {
    export class Dock {
        public static get LEFT() { return 1; }
        public static get TOP() { return 2; }
        public static get CENTER_HORIZONTAL() { return 4; }
        public static get CENTER_VERTICAL() { return 8; }
        public static get RIGHT() { return 16; }
        public static get BOTTOM() { return 32; }
        public static get CENTER_ALL() { return Dock.CENTER_HORIZONTAL | Dock.CENTER_VERTICAL; }
    }
}