declare module BABYLON.EDITOR.EXTENSIONS {
    interface IEditorExtension<T> {
        extensionKey: string;
        apply(data: T): void;
        applyEvenIfDataIsNull: boolean;
    }
    type _EditorExtensionConstructor = new <T>(scene: Scene) => IEditorExtension<T>;
    class EditorExtension {
        private static _ExtensionsDatas;
        private static _Extensions;
        static LoadExtensionsFile(url: string, callback?: () => void): void;
        static GetExtensionData<T>(key: string): T;
        static ApplyExtensions(scene: Scene): void;
        static RegisterExtension(extension: _EditorExtensionConstructor): void;
    }
}
declare module BABYLON.EDITOR.EXTENSIONS {
    interface IPostProcessExtensionData {
        id: string;
        name: string;
        program: string;
        configuration: string;
        postProcess?: PostProcess;
    }
    class PostProcessBuilderExtension implements IEditorExtension<IPostProcessExtensionData[]> {
        extensionKey: string;
        applyEvenIfDataIsNull: boolean;
        placeHolderTexture: Texture;
        private _scene;
        private _scenePassPostProcess;
        private _postProcesses;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(scene: Scene);
        apply(data: IPostProcessExtensionData[]): void;
        removePostProcess(postProcess: PostProcess): void;
        applyPostProcess(data: IPostProcessExtensionData): void;
        private _postProcessCallback(postProcess, config);
    }
}
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
declare module BABYLON.EDITOR.EXTENSIONS {
    interface IDevelopentBaseExtensionEventData<T> {
        eventName: string;
        eventData: T;
    }
    class DevelopmentBaseExtension {
        namespace: string;
        private _events;
        protected scene: Scene;
        private static _EventReceivers;
        /**
        * Constructor
        * @param scene: the Babylon.js scene
        */
        constructor(scene: Scene, namespace: string);
        onEvent<T>(eventName: string, callback: (eventData: T) => void): void;
        removeEvent(eventName: string): boolean;
        callEvent<T>(eventData: IDevelopentBaseExtensionEventData<T>): void;
        /**
        * Static functions
        */
        static SendEvent<T>(namespace: string, eventData: IDevelopentBaseExtensionEventData<T>): void;
        static RegisterEventListener(listener: DevelopmentBaseExtension): void;
    }
}
declare module BABYLON {
    class StartParticleSystemAction extends Action {
        private _particleSystem;
        constructor(triggerOptions: any, particleSystem: ParticleSystem, condition?: Condition);
        _prepare(): void;
        execute(): void;
        serialize(parent: any): any;
    }
    class StopParticleSystemAction extends Action {
        private _particleSystem;
        constructor(triggerOptions: any, particleSystem: ParticleSystem, condition?: Condition);
        _prepare(): void;
        execute(): void;
        serialize(parent: any): any;
    }
}
declare module BABYLON {
    class SendDevelopmentEventAction extends Action {
        private _namespace;
        private _eventName;
        private _data;
        constructor(triggerOptions: any, namespace: string, eventName: string, data?: string, condition?: Condition);
        _prepare(): void;
        execute(): void;
        serialize(parent: any): any;
    }
}
declare module BABYLON {
    class TimerCondition extends Condition {
        _actionManager: ActionManager;
        private _value;
        private _started;
        private _finished;
        constructor(actionManager: ActionManager, value: number);
        isValid(): boolean;
        serialize(): any;
    }
}
declare module BABYLON {
    class DistanceToCameraCondition extends Condition {
        _actionManager: ActionManager;
        private _target;
        private _distance;
        private _operator;
        constructor(actionManager: ActionManager, target: any, distance: number, operator?: number);
        isValid(): boolean;
        serialize(): any;
    }
}
