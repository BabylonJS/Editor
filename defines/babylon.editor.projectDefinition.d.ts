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
        property?: string;
        value?: number | boolean | Vector2 | Vector3 | Color3 | Quaternion;
    }
    interface IAnimationEvent {
        type: string;
        target: Node | Scene;
        value: IAnimationEventValue;
    }
    interface IAnimationEventFrame {
        frame: number;
        events: IAnimationEvent[];
    }
    interface IAnimation {
        targetName: string;
        targetType: string;
        serializationObject: any;
        events: IAnimationEventFrame[];
    }
    /**
    *  Global animation configuration of the project
    */
    interface IAnimationConfigurationOnPlay {
        type: string;
        name: string;
    }
    interface IAnimationConfiguration {
        globalAnimationSpeed: number;
        animatedAtLaunch: IAnimationConfigurationOnPlay[];
    }
    /**
    * Custom Materials (sky, gradient, water, etc.)
    */
    interface IMaterial {
        serializedValues: any;
        meshName?: string;
        newInstance?: boolean;
    }
    /**
    * Modified nodes in the editor (custom animations, for custom materials, etc.)
    */
    interface INode {
        name: string;
        type: string;
        animations: IAnimation[];
        serializationObject?: any;
    }
    /**
    * Custom particle systems
    */
    interface IParticleSystem {
        hasEmitter: boolean;
        serializationObject: any;
    }
    /**
    * Root object of project
    */
    interface IProjectRoot {
        globalConfiguration: IAnimationConfiguration;
        materials: IMaterial[];
        particleSystems: IParticleSystem[];
        nodes: INode[];
    }
}
