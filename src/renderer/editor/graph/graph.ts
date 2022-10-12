import { LiteGraph } from "litegraph.js";

import { Tools } from "../tools/tools";
import { IPluginGraph } from "../plugins/graph";

// Basics
import { Number, String, Boolean, Null, Undefined } from "./basic/types";
import { Variable, GetVariable, UpdateVariable } from "./basic/variable";
import { Log } from "./basic/log";
import { Debugger } from "./basic/debugger";
import { Cast } from "./basic/cast";
import { KeyCode } from "./basic/key-code";
import { ObjectNode } from "./basic/object";
import { GFunction, CallGFunction } from "./basic/function";
import { StringCase, StringConcat } from "./basic/string";

// Pointer
import { RequestPointerLock, ExitPointerLock } from "./basic/pointer-lock";

// Math
import { Add, Subtract, Multiply, Divide, Compare } from "./math/operation";
import { Random } from "./math/random";
import { Sinus, Cosinus, Tangent } from "./math/trigonometry";
import { Equals, And, Or, NotNull, NotUndefined, NotNullOrUndefined, Not, NotNaN, IsTrue } from "./math/logic";
import { ForLoop } from "./math/loop";

import { Vec2, Vec3, VectorLength } from "./math/vector";
import { AddVectors, MultiplyVectors } from "./math/vector-operation";
import { VectorSplitter } from "./math/vector-splitter";

import { Col3, Col4 } from "./math/color";

import { Sound } from "./sound/sound";
import { PlaySound } from "./sound/play";
import { StopSound } from "./sound/stop";

import { PointerEvent } from "./events/pointer-event";
import { KeyboardEvent } from "./events/keyboard-event";
import { TimeoutEvent } from "./events/set-timeout";
import { StartGameEvent } from "./events/start-game-event";
import { TickGameEvent } from "./events/tick-game-event";
import { CameraCollisionEvent } from "./events/collision-event";
import { WindowEvent } from "./events/window-event";
import { DispatchWindowEvent } from "./events/dispatch-window-event";
import { GraphObservable } from "./events/observable";

import { PickInfos } from "./data/pick-info";
import { LoadFile } from "./data/load-file";

import { GetProperty } from "./property/get-property";
import { SetProperty } from "./property/set-property";

import { CallNodeFunction } from "./node/call-function";
import { DisposeNode } from "./node/dispose";
import { SendNodeMessage } from "./node/send-message";

import { Camera } from "./camera/camera";
import { GetCamera } from "./camera/get-camera";
import { GetCameraDirection } from "./camera/get-direction";
import { TransformCamera } from "./camera/transform";

import { Light } from "./light/light";
import { GetLight } from "./light/get-light";
import { SetLightProperty } from "./light/set-property";
import { TransformLight } from "./light/transform";
import { AddMeshToShadowGenerator } from "./light/add-to-shadow-generator";

import { TransformNode } from "./transform-node/transform-node";

import { Mesh } from "./mesh/mesh";
import { RotateMesh } from "./mesh/rotate";
import { Translate } from "./mesh/translate";
import { MoveWithCollisions } from "./mesh/move-with-collisions";
import { PickMesh } from "./mesh/pick";
import { TransformMesh } from "./mesh/transform";
import { AbsoluteTransformMesh } from "./mesh/absolute-transform";
import { GetMesh } from "./mesh/get-mesh";
import { CreateMeshInstance } from "./mesh/create-instance";
import { GetMeshDirection } from "./mesh/get-direction";
import { SetMeshMaterial } from "./mesh/set-material";

import { ApplyImpulse } from "./physics/apply-impulse";
import { CreatePhysicsImpostor } from "./physics/create-physics-impostor";

// Animation
import { AnimationGroup } from "./animation/animation-group";
import { PlayAnimationGroup } from "./animation/start-animation-group";
import { StopAnimationGroup } from "./animation/stop-animation-group";
import { PauseAnimationGroup } from "./animation/pause-animation-group";

import { AnimationRatio } from "./animation/ratio";
import { InterpolationAnimation } from "./animation/interpolate";
import { PlayAnimation } from "./animation/start-animations";
import { GetAnimationWeight, PlayWeightedAnimation, SetAnimationWeight } from "./animation/weighted-animation";
import { StopAnimation } from "./animation/stop-animations";

import { EasingFunction } from "./animation/easing";
import { GetAnimationRange } from "./animation/get-animation-range";

// Particle systems
import { ParticleSystem } from "./particle-system/particle-system";
import { SetParticleSystemProperty } from "./particle-system/set-property";

// Textures
import { Texture } from "./texture/texture";

// Materials
import { Material } from "./material/material";
import { SetMaterialTextures } from "./material/set-textures";

// CSG
import { CSGOperation } from "./csg/operation";
import { CSGMesh, CSGToMesh } from "./csg/mesh";

export class GraphCode {
    private static _Initialized: boolean = false;
    
    /**
     * Initializes the graph system.
     */
    public static Init(): void {
        if (this._Initialized) { return; }

        // Remove all existing nodes
        LiteGraph.registered_node_types = { };

        // Create basic nodes
        LiteGraph.registerNodeType("basics/number", Number);
        LiteGraph.registerNodeType("basics/string", String);
        LiteGraph.registerNodeType("basics/boolean", Boolean);
        LiteGraph.registerNodeType("basics/null", Null);
        LiteGraph.registerNodeType("basics/undefined", Undefined);

        LiteGraph.registerNodeType("basics/debugger", Debugger);
        LiteGraph.registerNodeType("basics/log", Log);
        LiteGraph.registerNodeType("basics/cast", Cast);

        LiteGraph.registerNodeType("basics/variable", Variable);
        LiteGraph.registerNodeType("basics/get_variable", GetVariable);
        LiteGraph.registerNodeType("basics/update_variable", UpdateVariable);

        LiteGraph.registerNodeType("basics/key_code", KeyCode);

        LiteGraph.registerNodeType("basics/object", ObjectNode);

        LiteGraph.registerNodeType("basics/function", GFunction);
        LiteGraph.registerNodeType("basics/call_function", CallGFunction);

        // String
        LiteGraph.registerNodeType("string/string_case", StringCase);
        LiteGraph.registerNodeType("string/string_concat", StringConcat);

        // Pointer
        LiteGraph.registerNodeType("pointer/request_pointer_lock", RequestPointerLock);
        LiteGraph.registerNodeType("pointer/exit_pointer_lock", ExitPointerLock);

        // Create math nodes
        LiteGraph.registerNodeType("math/add", Add);
        LiteGraph.registerNodeType("math/subtract", Subtract);
        LiteGraph.registerNodeType("math/multiply", Multiply);
        LiteGraph.registerNodeType("math/divide", Divide);
        LiteGraph.registerNodeType("math/random", Random);
        LiteGraph.registerNodeType("math/compare", Compare);

        LiteGraph.registerNodeType("logic/equals", Equals);
        LiteGraph.registerNodeType("logic/and", And);
        LiteGraph.registerNodeType("logic/or", Or);
        LiteGraph.registerNodeType("logic/not", Not);
        LiteGraph.registerNodeType("logic/not_nan", NotNaN);
        LiteGraph.registerNodeType("logic/is_true", IsTrue);
        LiteGraph.registerNodeType("logic/not_null", NotNull);
        LiteGraph.registerNodeType("logic/not_undefined", NotUndefined);
        LiteGraph.registerNodeType("logic/not_null_or_undefined", NotNullOrUndefined);

        // Loops
        LiteGraph.registerNodeType("loops/for_loop", ForLoop);

        // Trigonometry
        LiteGraph.registerNodeType("trigonometry/sinus", Sinus);
        LiteGraph.registerNodeType("trigonometry/cosinus", Cosinus);
        LiteGraph.registerNodeType("trigonometry/tangent", Tangent);

        // Vectors
        LiteGraph.registerNodeType("vector/vector_2d", Vec2);
        LiteGraph.registerNodeType("vector/vector_3d", Vec3);
        LiteGraph.registerNodeType("vector/vector_length", VectorLength);

        LiteGraph.registerNodeType("math/add_vectors", AddVectors);
        LiteGraph.registerNodeType("math/multiply_vectors", MultiplyVectors);

        LiteGraph.registerNodeType("math/vector_splitter", VectorSplitter);

        // Colors
        LiteGraph.registerNodeType("math/color_3", Col3);
        LiteGraph.registerNodeType("math/color_4", Col4);

        // Sound
        LiteGraph.registerNodeType("sound/sound", Sound);
        LiteGraph.registerNodeType("sound/play_sound", PlaySound);
        LiteGraph.registerNodeType("sound/stop_sound", StopSound);

        // Events
        LiteGraph.registerNodeType("events/pointer_event", PointerEvent);
        LiteGraph.registerNodeType("events/keyboard_event", KeyboardEvent);
        LiteGraph.registerNodeType("events/timeout_event", TimeoutEvent);
        LiteGraph.registerNodeType("events/start_game_event", StartGameEvent);
        LiteGraph.registerNodeType("events/tick_game_event", TickGameEvent);
        LiteGraph.registerNodeType("events/collision_event", CameraCollisionEvent);
        LiteGraph.registerNodeType("events/window_event", WindowEvent);
        LiteGraph.registerNodeType("events/dispatch_window_event", DispatchWindowEvent);
        LiteGraph.registerNodeType("events/observable", GraphObservable);

        // Data
        LiteGraph.registerNodeType("data/pick_infos", PickInfos);
        LiteGraph.registerNodeType("data/load_file", LoadFile);

        // Utils
        LiteGraph.registerNodeType("utils/get_property", GetProperty);
        LiteGraph.registerNodeType("utils/set_property", SetProperty);

        // Node
        LiteGraph.registerNodeType("node/call_node_function", CallNodeFunction);
        LiteGraph.registerNodeType("node/dispose_node", DisposeNode);
        LiteGraph.registerNodeType("node/send_message_to_node", SendNodeMessage);

        // Camera
        LiteGraph.registerNodeType("camera/camera", Camera);
        LiteGraph.registerNodeType("camera/get_camera", GetCamera);
        LiteGraph.registerNodeType("camera/get_camera_direction", GetCameraDirection);
        LiteGraph.registerNodeType("camera/camera_transform", TransformCamera);

        // Light
        LiteGraph.registerNodeType("light/light", Light);
        LiteGraph.registerNodeType("light/get_light", GetLight);
        LiteGraph.registerNodeType("light/set_light_property", SetLightProperty);
        LiteGraph.registerNodeType("light/transform_light", TransformLight);
        LiteGraph.registerNodeType("light/add_mesh_to_shadow_generator", AddMeshToShadowGenerator);

        // Transfor Node
        LiteGraph.registerNodeType("transform/transform_node", TransformNode);

        // Mesh
        LiteGraph.registerNodeType("mesh/mesh", Mesh);
        LiteGraph.registerNodeType("mesh/rotate_mesh", RotateMesh);
        LiteGraph.registerNodeType("mesh/translate_mesh", Translate);
        LiteGraph.registerNodeType("mesh/move_with_collisions", MoveWithCollisions);
        LiteGraph.registerNodeType("mesh/pick_mesh", PickMesh);
        LiteGraph.registerNodeType("mesh/transform_mesh", TransformMesh);
        LiteGraph.registerNodeType("mesh/absolute_transform_mesh", AbsoluteTransformMesh);
        LiteGraph.registerNodeType("mesh/get_mesh", GetMesh);
        LiteGraph.registerNodeType("mesh/create_mesh_instance", CreateMeshInstance);
        LiteGraph.registerNodeType("mesh/get_mesh_direction", GetMeshDirection);
        LiteGraph.registerNodeType("mesh/set_mesh_material", SetMeshMaterial);

        // Physics
        LiteGraph.registerNodeType("physics/apply_impulse", ApplyImpulse);
        LiteGraph.registerNodeType("physics/create_physics_impostor", CreatePhysicsImpostor);

        // Animation
        LiteGraph.registerNodeType("animation/animation_group", AnimationGroup);
        LiteGraph.registerNodeType("animation/play_animation_group", PlayAnimationGroup);
        LiteGraph.registerNodeType("animation/stop_animation_group", StopAnimationGroup);
        LiteGraph.registerNodeType("animation/pause_animation_group", PauseAnimationGroup);

        LiteGraph.registerNodeType("animation/animation_ratio", AnimationRatio);
        LiteGraph.registerNodeType("animation/interpolation_animation", InterpolationAnimation);
        LiteGraph.registerNodeType("animation/play_animation", PlayAnimation);
        LiteGraph.registerNodeType("animation/stop_animation", StopAnimation);

        LiteGraph.registerNodeType("animation/get_animation_weight", GetAnimationWeight);
        LiteGraph.registerNodeType("animation/set_animation_weight", SetAnimationWeight);
        LiteGraph.registerNodeType("animation/play_weighted_animation", PlayWeightedAnimation);

        LiteGraph.registerNodeType("animation/easing_function", EasingFunction);
        LiteGraph.registerNodeType("animation/get_animation_range", GetAnimationRange);

        // Particle systems
        LiteGraph.registerNodeType("particles/particles_system", ParticleSystem);
        LiteGraph.registerNodeType("particles/set_particles_system_property", SetParticleSystemProperty);

        // Textures
        LiteGraph.registerNodeType("texture/texture", Texture);

        // Materials
        LiteGraph.registerNodeType("material/material", Material);
        LiteGraph.registerNodeType("material/set_material_textures", SetMaterialTextures);

        // CSG
        LiteGraph.registerNodeType("csg/mesh_to_csg", CSGMesh);
        LiteGraph.registerNodeType("csg/csg_to_mesh", CSGToMesh);
        LiteGraph.registerNodeType("csg/csg_operation", CSGOperation);

        // Plugins
        const preferences = Tools.GetEditorPreferences();
        preferences?.plugins?.forEach((p) => {
            if (!p.enabled) { return; }

            try {
                const exports = require(p.path);

                const graphConfiguration = exports.registerGraphConfiguration?.() as IPluginGraph;
                if (!graphConfiguration) { return; }

                graphConfiguration.nodes?.forEach((n) => {
                    LiteGraph.registerNodeType(n.creatorPath, n.ctor);
                });
            } catch (e) {
                console.error(e);
            }
        });
    }
}
