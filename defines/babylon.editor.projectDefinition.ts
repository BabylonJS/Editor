/**
* File format definitions of the Babylon.js Editor
* to save projects with custom properties
* such as:
    - Tagged animations (created with the editor) including events
    - Configurations:
        - Nodes | Scene | Sound to animate on play
        - Sounds to play, on play
*/

module BABYLON.EDITOR.INTERNAL {
    /**
    * Animations
    */
    export interface IAnimationEventValue {
        property?: string; // The property to modify
        value?: number | boolean | Vector2 | Vector3 | Color3 | Quaternion; // The value to apply
    }

    export interface IAnimationEvent {
        type: string; // The event type (setEnabled, setVisible, switch boolean, etc.)
        target: Node | Scene; // The target of the event
        value: IAnimationEventValue;
    }

    export interface IAnimationEventFrame {
        frame: number;
        events: IAnimationEvent[];
    }

    export interface IAnimation {
        targetName: string; // The target name
        targetType: string; // The target type ("Node", "Sound", "Scene")

        serializationObject: any; // The serialized object from BABYLON.Animation

        events: IAnimationEventFrame[];
    }

    /**
    *  Global animation configuration of the project
    */
    export interface IAnimationConfigurationOnPlay {
        type: string; // Object type to animate/play on play
        name: string; // Object name
    }

    export interface IAnimationConfiguration {
        globalAnimationSpeed: number; // Global animation speed on play
        animatedAtLaunch: IAnimationConfigurationOnPlay[];
    }

    /**
    * Custom Materials (sky, gradient, water, etc.)
    */
    export interface IMaterial {
        serializedValues: any; // The serialized object from BABYLON[TheMaterial]
        meshName?: string;
        newInstance?: boolean;
    }

    /**
    * Modified nodes in the editor (custom animations, for custom materials, etc.)
    */
    export interface INode {
        name: string; // The node name
        type: string; // The type of node (Node, Scene or Sound)
        animations: IAnimation[]; // Animations of the node

        serializationObject?: any;
    }

    /**
    * Custom particle systems
    */
    export interface IParticleSystem {
        hasEmitter: boolean; // If the particle system as an emitter (from the .babylon scene). If not, editor will create an empty mesh
        serializationObject: any;
    }

    /**
    * Root object of project
    */
    export interface IProjectRoot {
        globalConfiguration: IAnimationConfiguration;
        materials: IMaterial[];
        particleSystems: IParticleSystem[];
        nodes: INode[];
    }
}