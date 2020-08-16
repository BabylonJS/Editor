import { LiteGraph } from "litegraph.js";

import { Number, String, Boolean } from "./basic/types";
import { Variable, GetVariable, UpdateVariable } from "./basic/variable";
import { Log } from "./basic/log";
import { Debugger } from "./basic/debugger";
import { Cast } from "./basic/cast";
import { KeyCode } from "./basic/key-code";

// Pointer
import { RequestPointerLock, ExitPointerLock } from "./basic/pointer-lock";

// Math
import { Add, Subtract, Multiply, Divide } from "./math/operation";
import { Random } from "./math/random";
import { Sinus, Cosinus, Tangent } from "./math/trigonometry";
import { Equals, And, Or, NotNull, NotUndefined, NotNullOrUndefined, Not } from "./math/logic";
import { ForLoop } from "./math/loop";

import { Vec2, Vec3, VectorLength } from "./math/vector";
import { AddVectors, MultiplyVectors } from "./math/vector-operation";
import { VectorSplitter } from "./math/vector-splitter";

import { Col3 } from "./math/color";

import { Sound } from "./sound/sound";
import { PlaySound } from "./sound/play";
import { StopSound } from "./sound/stop";

import { PointerEvent } from "./events/pointer-event";
import { KeyboardEvent } from "./events/keyboard-event";
import { TimeoutEvent } from "./events/set-timeout";
import { StartGameEvent } from "./events/start-game-event";
import { TickGameEvent } from "./events/tick-game-event";
import { CollisionEvent } from "./events/collision-event";

import { PickInfos } from "./data/pick-info";

import { GetProperty } from "./property/get-property";
import { SetProperty } from "./property/set-property";

import { CallNodeFunction } from "./node/call-function";

import { Camera } from "./camera/camera";
import { GetCamera } from "./camera/get-camera";
import { GetCameraDirection } from "./camera/get-direction";
import { TransformCamera } from "./camera/transform";

import { Light } from "./light/light";
import { GetLight } from "./light/get-light";
import { SetLightProperty } from "./light/set-property";
import { TransformLight } from "./light/transform";

import { TransformNode } from "./transform-node/transform-node";

import { Mesh } from "./mesh/mesh";
import { RotateMesh } from "./mesh/rotate";
import { Translate } from "./mesh/translate";
import { PickMesh } from "./mesh/pick";
import { TransformMesh } from "./mesh/transform";
import { AbsoluteTransformMesh } from "./mesh/absolute-transform";
import { GetMesh } from "./mesh/get-mesh";
import { CreateMeshInstance } from "./mesh/create-instance";
import { GetMeshDirection } from "./mesh/get-direction";

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
import { StopAnimation } from "./animation/stop-animations";

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

        LiteGraph.registerNodeType("basics/debugger", Debugger);
        LiteGraph.registerNodeType("basics/log", Log);
        LiteGraph.registerNodeType("basics/cast", Cast);

        LiteGraph.registerNodeType("basics/variable", Variable);
        LiteGraph.registerNodeType("basics/get_variable", GetVariable);
        LiteGraph.registerNodeType("basics/update_variable", UpdateVariable);

        LiteGraph.registerNodeType("basics/key_code", KeyCode);

        // Pointer
        LiteGraph.registerNodeType("pointer/request_pointer_lock", RequestPointerLock);
        LiteGraph.registerNodeType("pointer/exit_pointer_lock", ExitPointerLock);

        // Create math nodes
        LiteGraph.registerNodeType("math/add", Add);
        LiteGraph.registerNodeType("math/subtract", Subtract);
        LiteGraph.registerNodeType("math/multiply", Multiply);
        LiteGraph.registerNodeType("math/divide", Divide);
        LiteGraph.registerNodeType("math/random", Random);

        LiteGraph.registerNodeType("logic/equals", Equals);
        LiteGraph.registerNodeType("logic/and", And);
        LiteGraph.registerNodeType("logic/or", Or);
        LiteGraph.registerNodeType("logic/not", Not);
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
        LiteGraph.registerNodeType("events/collision_event", CollisionEvent);

        // Data
        LiteGraph.registerNodeType("data/pick_infos", PickInfos);

        // Utils
        LiteGraph.registerNodeType("utils/get_property", GetProperty);
        LiteGraph.registerNodeType("utils/set_property", SetProperty);

        // Node
        LiteGraph.registerNodeType("node/call_node_function", CallNodeFunction);

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

        // Transfor Node
        LiteGraph.registerNodeType("transform/transform_node", TransformNode);

        // Mesh
        LiteGraph.registerNodeType("mesh/mesh", Mesh);
        LiteGraph.registerNodeType("mesh/rotate_mesh", RotateMesh);
        LiteGraph.registerNodeType("mesh/translate_mesh", Translate);
        LiteGraph.registerNodeType("mesh/pick_mesh", PickMesh);
        LiteGraph.registerNodeType("mesh/transform_mesh", TransformMesh);
        LiteGraph.registerNodeType("mesh/absolute_transform_mesh", AbsoluteTransformMesh);
        LiteGraph.registerNodeType("mesh/get_mesh", GetMesh);
        LiteGraph.registerNodeType("mesh/create_mesh_instance", CreateMeshInstance);
        LiteGraph.registerNodeType("mesh/get_mesh_direction", GetMeshDirection);

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
    }
}
