// W2UI
declare var w2utils: {
    lock: (box: HTMLElement, message: string, spinner?: boolean) => void;
    unlock: (box: HTMLElement) => void;
};

// BABYLON
declare module BABYLON {
    interface Node {
        editorMetadatas: any;
    }

    interface Scene {
        editorMetadatas: any;
    }

    interface ParticleSystem {
        editorMetadatas: any;
        doNotSerialize: boolean;
    }
}
