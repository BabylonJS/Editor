import { Animation, Animatable, IAnimatable, Scene } from "babylonjs";

import { SyncType } from "./types";
import { AnimationTools } from "./animation-to-dataset";

export interface ISyncAnimatable {
    /**
     * Defines the reference to the animatable being played.
     */
    animatable: Animatable;
    /**
     * Defines the reference to the object having its animations played.
     */
    object: IAnimatable;
    /**
     * Defines wether or not the animation has been complete.
     */
    complete?: boolean;
}

export class SyncTool {
    /**
     * Updates the given object at the given frame.
     * @param frame defines the frame where to update the update to.
     * @param syncType defines the synchronization type (animation, object or scene).
     * @param object defines the reference to the object to update.
     * @param animation defines the reference to the animation.
     * @param scene defines the reference to the scene used to play animation.
     */
    public static UpdateObjectToFrame(frame: number, syncType: SyncType, object: IAnimatable, animation: Animation, scene: Scene): void {
        const range = AnimationTools.GetFramesRange(animation);
        const enableBlending = animation.enableBlending;

        animation.enableBlending = false;

        const animatables: ISyncAnimatable[] = [];
        switch (syncType) {
            case SyncType.Animation:
                animatables.push({
                    animatable: scene.beginDirectAnimation(object, [animation], range.min, range.max, false, 1.0),
                    object,
                });
                break;
            case SyncType.Object:
                animatables.push({
                    animatable: scene.beginAnimation(object, range.min, range.max, false, 1.0),
                    object,
                });
                break;
            case SyncType.Scene:
                this.GetSceneAnimatables(scene).forEach((a) => {
                    animatables.push({
                        animatable: scene.beginAnimation(a, range.min, range.max, false, 1.0),
                        object: a,
                    });
                });
                break;
        }

        animatables.forEach((a) => {
            a.animatable.goToFrame(frame);
            scene.stopAnimation(a.object);
        });

        animation.enableBlending = enableBlending;
    }

    /**
     * Plays the animation.
     * @param fromFrame defines the frame where to start the animation.
     * @param syncType defines the synchronization type (animation, object or scene).
     * @param object defines the reference to the object to update.
     * @param animation defines the reference to the animation.
     * @param scene defines the reference to the scene used to play animation.
     * @param onComplete defines the callback called on the animation is complete.
     */
    public static PlayAnimation(fromFrame: number, syncType: SyncType, object: IAnimatable, animation: Animation, scene: Scene, onComplete: () => void): ISyncAnimatable[] {
        const range = AnimationTools.GetFramesRange(animation);

        const animatables: ISyncAnimatable[] = [];
        switch (syncType) {
            case SyncType.Animation:
                animatables.push({
                    animatable: scene.beginDirectAnimation(object, [animation], Math.max(range.min, fromFrame), range.max, false, 1.0, () => {
                        onComplete();
                    }),
                    object,
                });
                break;
            case SyncType.Object:
                animatables.push({
                    animatable: scene.beginAnimation(object, Math.max(range.min, fromFrame), range.max, false, 1.0, () => {
                        onComplete();
                    }),
                    object,
                });
                break;
            case SyncType.Scene:
                this.GetSceneAnimatables(scene).forEach((a) => {
                    const animatable: ISyncAnimatable = {
                        animatable: scene.beginAnimation(a, Math.max(range.min, fromFrame), range.max, false, 1.0, () => {
                            animatable.complete = true;
                            const runningAnimatable = animatables.find((a) => !a.complete);
                            if (!runningAnimatable) {
                                onComplete();
                            }
                        }),
                        object: a,
                    };
                    animatables.push(animatable);
                });
                break;
        }

        return animatables;
    }

    /**
     * Returns the list of all available animatables in the scene.
     * @param scene defines the reference to the scene.
     */
    public static GetSceneAnimatables(scene: Scene): IAnimatable[] {
        return ([] as IAnimatable[])
                .concat(scene.meshes)
                .concat(scene.lights)
                .concat(scene.cameras)
                .concat(scene.textures)
                .concat(scene.materials)
                .concat(scene.particleSystems)
                .concat(scene.skeletons)
                .concat([scene]);
    }
}