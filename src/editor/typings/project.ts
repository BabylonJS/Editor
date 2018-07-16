import {
    Vector2, Vector3, Quaternion,
    Color3,
    Scene,
    Material,
    RenderTargetTexture, ReflectionProbe
} from 'babylonjs';

import { IStringDictionary } from './typings';

/**
* File format definitions of the Babylon.js Editor
* to save projects with custom properties
* such as:
    - Tagged animations (created with the editor) including events
    - Configurations:
        - Nodes | Scene | Sound to animate on play
        - Sounds to play, on play
*/

/**
* Animations
*/
export interface AnimationEventValue {
    property?: string; // The property to modify
    value?: number | boolean | Vector2 | Vector3 | Color3 | Quaternion; // The value to apply
}

export interface AnimationEvent {
    type: string; // The event type (setEnabled, setVisible, switch boolean, etc.)
    target: Node | Scene; // The target of the event
    value: AnimationEventValue;
}

export interface AnimationEventFrame {
    frame: number;
    events: AnimationEvent[];
}

export interface Animation {
    targetName: string; // The target name
    targetType: string; // The target type ("Node", "Sound", "Scene")

    serializationObject: any; // The serialized object from BABYLON.Animation

    events: AnimationEventFrame[];
}

/**
*  Global animation configuration of the project
*/
export interface AnimationConfigurationOnPlay {
    type: string; // Object type to animate/play on play
    name: string; // Object name
}

export interface AnimationConfiguration {
    globalAnimationSpeed: number; // Global animation speed on play
    animatedAtLaunch: AnimationConfigurationOnPlay[];
    framesPerSecond: number;
    //settings: Settings; TODO
}

/**
* Custom Materials (sky, gradient, water, etc.)
*/
export interface ProjectMaterial {
    serializedValues: any; // The serialized object from BABYLON[TheMaterial]
    meshesNames?: string[]; // Array of meshes names that share this material
    newInstance?: boolean;

    _babylonMaterial?: Material; // Internally used
}

/**
* Custom physics impostors
*/
export interface PhysicsImpostor {
    physicsMass: number;
    physicsFriction: number;
    physicsRestitution: number;
    physicsImpostor: number;
}

/**
* Modified nodes in the editor (custom animations, for custom materials, etc.)
*/
export interface Node {
    name: string; // The node name
    id: string; // The node id
    type: string; // The type of node (Node, Scene or Sound)
    animations: Animation[]; // Animations of the node
    actions?: any; // Related actions of the node
    physics?: PhysicsImpostor;

    serializationObject?: any;
}

/**
* Custom particle systems
*/
export interface ParticleSystem {
    hasEmitter: boolean; // If the particle system as an emitter (from the .babylon scene). If not, editor will create an empty mesh
    serializationObject: any;

    emitterPosition?: number[];
}

/**
* Lens Flares
*/
export interface LensFlare {
    serializationObject: any;
}

/**
* Render targets
*/
export interface RenderTarget {
    isProbe: boolean;
    serializationObject: any;

    waitingTexture?: RenderTargetTexture | ReflectionProbe;
}

/**
* Sounds
*/
export interface Sound {
    name: string;
    serializationObject: any;
}

export interface EffectLayer {
    name: string;
    serializationObject: any;
}

/**
* Root object of project
*/
export interface ProjectRoot {
    globalConfiguration: AnimationConfiguration;
    materials: ProjectMaterial[];
    particleSystems: ParticleSystem[];
    nodes: Node[];
    shadowGenerators: any[];
    lensFlares: LensFlare[];
    renderTargets: RenderTarget[];
    sounds: Sound[];
    actions: any;
    physicsEnabled: boolean;
    effectLayers: EffectLayer[];

    requestedMaterials?: string[];
    customMetadatas?: IStringDictionary<any>;

    gui: any[];
}
