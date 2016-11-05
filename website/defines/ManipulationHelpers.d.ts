
declare module ManipulationHelpers {
    import Color3 = BABYLON.Color3;
    import Scene = BABYLON.Scene;
    import Vector3 = BABYLON.Vector3;
    import Quaternion = BABYLON.Quaternion;
    import Vector2 = BABYLON.Vector2;
    const enum RadixFeatures {
        None = 0,
        /**
         * Display the Arrow that follows the X Axis
         */
        ArrowX = 1,
        /**
         * Display the Arrow that follows the Y Axis
         */
        ArrowY = 2,
        /**
         * Display the Arrow that follows the Z Axis
         */
        ArrowZ = 4,
        /**
         * Display the Arrow that follows the XYZ Axis
         */
        ArrowsXYZ = 7,
        /**
         * Display the anchor that allow XY plane manipulation
         */
        PlaneSelectionXY = 16,
        /**
         * Display the anchor that allow XZ plane manipulation
         */
        PlaneSelectionXZ = 32,
        /**
         * Display the anchor that allow YZ plane manipulation
         */
        PlaneSelectionYZ = 64,
        /**
         * Display all the anchors that allow plane manipulation
         */
        AllPlanesSelection = 112,
        /**
         * Display the rotation cylinder that allows rotation manipulation along the X Axis
         */
        RotationX = 256,
        /**
         * Display the rotation cylinder that allows rotation manipulation along the Y Axis
         */
        RotationY = 512,
        /**
         * Display the rotation cylinder that allows rotation manipulation along the A Axis
         */
        RotationZ = 1024,
        /**
         * Display all rotation cylinders
         */
        Rotations = 1792,
    }
    /**
     * This class create the visual geometry to display a manipulation radix in a viewport.
     * It also implements the logic to handler intersection, hover on feature.
     */
    class Radix {
        private static pc;
        private static sc;
        /**
         * Set/get the Wire Selection Threshold, set a bigger value to improve tolerance while picking a wire mesh
         */
        wireSelectionThreshold: number;
        /**
         * Get/set the colors of the X Arrow
         */
        xArrowColor: Color3;
        /**
         * Get/set the colors of the Y Arrow
         */
        yArrowColor: Color3;
        /**
         * Get/set the colors of the Z Arrow
         */
        zArrowColor: Color3;
        /**
         * Get/set the colors of the XY Plane selection anchor
         */
        xyPlaneSelectionColor: Color3;
        /**
         * Get/set the colors of the XZ Plane selection anchor
         */
        xzPlaneSelectionColor: Color3;
        /**
         * Get/set the colors of the YZ Plane selection anchor
         */
        yzPlaneSelectionColor: Color3;
        /**
         * Get/set the feature of the Radix that are/must be highlighted
         * @returns {}
         */
        highlighted: RadixFeatures;
        /**
         * Get the Radix Features that were selected upon creation
         */
        features: RadixFeatures;
        /**
         * Create a new Radix instance. The length/radius members are optionals and the default value should suit most cases
         * @param scene the owner Scene
         * @param features the feature the radix must display
         * @param arrowLength the length of a row of an axis, include the rotation cylinder (if any), but always exclude the arrow cone
         * @param coneLength the length of the arrow cone. this is also the length taken for the rotation cylinder (if any)
         * @param coneRadius the radius of the arrow cone
         * @param planeSelectionLength the length of the selection plane
         */
        constructor(scene: Scene, features?: RadixFeatures, arrowLength?: number, coneLength?: number, coneRadius?: number, planeSelectionLength?: number);
        /**
         * make an intersection test between a point position in the viwport and the Radix, return the feature that is intersected, if any.
         * only the closer Radix Feature is picked.
         * @param pos the viewport position to create the picking ray from.
         */
        intersect(pos: Vector2): RadixFeatures;
        /**
         * Set the world coordinate of where the Axis should be displayed
         * @param position the position
         * @param rotation the rotation quaternion
         * @param scale the scale (should be uniform)
         */
        setWorld(position: Vector3, rotation: Quaternion, scale: Vector3): void;
        /**
         * Display the Radix on screen
         */
        show(): void;
        /**
         * Hide the Radix from the screen
         */
        hide(): void;
        private setVisibleState(mesh, state);
        private intersectMeshes(pos, startName, currentClosest);
        private constructGraphicalObjects();
        private constructArrow(feature, name, transform);
        private constructPlaneSelection(feature, name, transform);
        private constructRotation(feature, name, transform);
        private addSymbolicMeshToLit(mesh);
        private hasFeature(value);
        private hasHighlightedFeature(value);
        private updateMaterial(name, color);
        private updateMaterialFromHighlighted(feature, highlighted, name);
        private getMaterial(name);
        private _arrowLength;
        private _coneLength;
        private _coneRadius;
        private _planeSelectionLength;
        private _light1;
        private _light2;
        private _rootMesh;
        private _features;
        private _scene;
        private _materials;
        private _wireSelectionThreshold;
        private _xArrowColor;
        private _yArrowColor;
        private _zArrowColor;
        private _xyPlaneSelectionColor;
        private _xzPlaneSelectionColor;
        private _yzPlaneSelectionColor;
        private _highlighted;
    }
}
import Vector4 = BABYLON.Vector2;
declare module ManipulationHelpers {
    import Scene = BABYLON.Scene;
    import Node = BABYLON.Node;
    /**
     * This class is used to manipulated a single node.
     * Right now only node of type AbstractMesh is support.
     * In the future, manipulation on multiple selection could be possible.
     *
     * A manipulation start when left clicking and moving the mouse. It can be cancelled if the right mouse button is clicked before releasing the left one (this feature is only possible if noPreventContextMenu is false).
     * Per default translation is peformed when manipulating the arrow (axis or cone) or the plane anchor. If you press the shift key it will switch to rotation manipulation. The Shift key can be toggle while manipulating, the current manipulation is accept and a new one starts.
     *
     * You can set the rotation/translationStep (in radian) to enable snapping.
     *
     * The current implementation of this class creates a radix with all the features selected.
     */
    class ManipulatorInteractionHelper {
        /**
         * Rotation Step in Radian to perform rotation with the given step instead of a smooth one.
         * Set back to null/undefined to disable
         */
        rotationStep: number;
        /**
         * Translation Step in World unit to perform translation at the given step instread of a smooth one.
         * Set back to null/undefined to disable
         */
        translationStep: number;
        /**
         * Set to true if you want the context menu to be displayed while manipulating. The manipulation cancel feature (which is triggered by a right click) won't work in this case. Default value is false (context menu is not showed when right clicking during manipulation) and this should fit most of the cases.
         */
        noPreventContextMenu: boolean;
        /**
         * Attach a node to manipulate. Right now, only manipulation on a single node is supported, but this api will allow manipulation on a multiple selection in the future.
         * @param node
         */
        attachManipulatedNode(node: Node): void;
        /**
         * Detach the node to manipulate. Right now, only manipulation on a single node is supported, but this api will allow manipulation on a multiple selection in the future.
         */
        detachManipulatedNode(node: Node): void;
        constructor(scene: Scene);
        private onBeforeRender(scene, state);
        private onPointer(e, state);
        private beginDrag(rayPos, event);
        private endDragMode();
        private doRot(rayPos);
        private doPos(rayPos);
        private hasManipulatedMode(value);
        private hasManFlags(value);
        private clearManFlags(values);
        private setManFlags(values);
        private static ComputeRayHit(ray, distance);
        private setManipulatedNodeWorldMatrix(mtx);
        private getManipulatedNodeWorldMatrix();
        private setupIntersectionPlane(mode, plane2);
        private setupIntersectionPlanes(mode);
        private getRayPosition(event);
        private renderManipulator();
        private fromScreenToWorld(l, z);
        private static evalPosition(ray, u);
        private _flags;
        private _firstMousePos;
        private _prevMousePos;
        private _shiftKeyState;
        private _pos;
        private _right;
        private _up;
        private _view;
        private _oldPos;
        private _prevHit;
        private _firstTransform;
        private _scene;
        private _manipulatedMode;
        private _rotationFactor;
        private _manipulatedNode;
        private _radix;
    }
}
declare module ManipulationHelpers {
    import Scene = BABYLON.Scene;
    const enum SIHCurrentAction {
        None = 0,
        Selector = 1,
        Camerator = 2,
    }
    /**
     * The purpose of this class is to allow the camera manipulation, single node selection and manipulation.
     * You can use it as an example to create your more complexe/different interaction helper
     */
    class SimpleInteractionHelper {
        constructor(scene: Scene);
        currentAction: SIHCurrentAction;
        manipulator: ManipulatorInteractionHelper;
        getScene(): Scene;
        private pointerCallback(p, s);
        private doSelectorInteraction(p, s);
        private detectActionChanged(p, s);
        private static CameratorSwitchThreshold;
        private _pickedNode;
        private _actionStack;
        private _scene;
        private _pointerObserver;
        private _manipulator;
    }
}
declare module ManipulationHelpers {
    class SymbolicVisualHelper {
        render(): void;
        renderLight: boolean;
        renderManipulator: boolean;
    }
}
