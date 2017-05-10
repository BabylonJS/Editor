declare module BABYLON.EDITOR.EXTENSIONS {
    interface IBotRoot {
        groups: IBotGroup[];
    }
    interface IBotFunction {
        title: string;
    }
    interface IBotGroup {
        title: string;
        functions: IBotFunction[];
    }
    interface ICosmosConfiguration {
        distanceToRoot: number;
        distanceToFunction: number;
        heightFromRoot: number;
        functionsDistance: number;
        animationsDistance: number;
        sphereDiameter: number;
    }
    class CosmosExtension implements IEditorExtension<ICosmosConfiguration> {
        extensionKey: string;
        applyEvenIfDataIsNull: boolean;
        distanceToRoot: number;
        distanceToFunction: number;
        heightFromRoot: number;
        functionsDistance: number;
        animationsDistance: number;
        sphereDiameter: number;
        private _scene;
        private _galaxies;
        private _sphereMesh;
        private _cameraTarget;
        static _BotDatas: IBotRoot;
        /**
        * Constructor
        * @param scene: the Babylon.js scene
        */
        constructor(scene: Scene);
        apply(data: ICosmosConfiguration): void;
        reset(): void;
        updateMeshes(): void;
        animateCameraToId(id: string): void;
        private _createCosmosGalaxy(name, rootPosition, names, distance, animate);
        private _loadBotDatas(callback);
    }
}
