/**
* File format definitions of the Babylon.js Editor
* to save projects with custom properties
* such as:
    - Tagged animations (created with the editor) including events
    - Configurations:
        - Nodes | Scene | Sound to animate on play
        - Sounds to play, on play
*/

declare module BABYLON.EDITOR.INTERNAL {
    /**
    * Animations
    */
    interface IAnimationEventValue {
        property?: string; // The property to modify
        value?: number | boolean | Vector2 | Vector3 | Color3 | Quaternion; // The value to apply
    }

    interface IAnimationEvent {
        type: string; // The event type (setEnabled, setVisible, switch boolean, etc.)
        target: Node | Scene; // The target of the event
        value: IAnimationEventValue;
    }

    interface IAnimationEventFrame {
        frame: number;
        events: IAnimationEvent[];
    }

    interface IAnimation {
        targetName: string; // The target name
        targetType: string; // The target type ("Node", "Sound", "Scene")

        serializationObject: any; // The serialized object from BABYLON.Animation

        events: IAnimationEventFrame[];
    }

    /**
    *  Global animation configuration of the project
    */
    interface IAnimationConfigurationOnPlay {
        type: string; // Object type to animate/play on play
        name: string; // Object name
    }

    interface IAnimationConfiguration {
        globalAnimationSpeed: number; // Global animation speed on play
        animatedAtLaunch: IAnimationConfigurationOnPlay[];
        framesPerSecond: number;
    }

    /**
    * Custom Materials (sky, gradient, water, etc.)
    */
    interface IMaterial {
        serializedValues: any; // The serialized object from BABYLON[TheMaterial]
        meshesNames?: string[]; // Array of meshes names that share this material
        newInstance?: boolean;

        _babylonMaterial?: Material; // Internally used
    }

    /**
    * Modified nodes in the editor (custom animations, for custom materials, etc.)
    */
    interface INode {
        name: string; // The node name
        id: string; // The node id
        type: string; // The type of node (Node, Scene or Sound)
        animations: IAnimation[]; // Animations of the node

        serializationObject?: any;
    }

    /**
    * Custom particle systems
    */
    interface IParticleSystem {
        hasEmitter: boolean; // If the particle system as an emitter (from the .babylon scene). If not, editor will create an empty mesh
        serializationObject: any;

        emitterPosition?: number[];
    }

    /**
    * Post-processes
    */
    interface IPostProcess {
        name: string;
        serializationObject: any;

        attach?: boolean; // If pipeline
        cameraName?: string;
    }

    /**
    * Lens Flares
    */
    interface ILensFlare {
        serializationObject: any;
    }

    /**
    * Render targets
    */
    interface IRenderTarget {
        isProbe: boolean;
        serializationObject: any;

        waitingTexture?: RenderTargetTexture | ReflectionProbe;
    }

    /**
    * Root object of project
    */
    interface IProjectRoot {
        globalConfiguration: IAnimationConfiguration;
        materials: IMaterial[];
        particleSystems: IParticleSystem[];
        nodes: INode[];
        shadowGenerators: any[];
        postProcesses: IPostProcess[];
        lensFlares: ILensFlare[];
        renderTargets: IRenderTarget[];

        requestedMaterials?: string[];
    }
}