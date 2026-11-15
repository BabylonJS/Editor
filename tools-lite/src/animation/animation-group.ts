import { SceneContext } from "@babylonjs/lite";

import { Observable } from "../tools/observable";
import { getSceneData } from "../tools/scene";

import { _evaluateAnimationAt, EditorAnimation } from "./animation";
import { createAnimatedPropertyBinding, IAnimatedPropertyBinding } from "./property";

/**
 * Defines an animation targeting an object in an animation group.
 */
export interface IEditorTargetedAnimation {
	/**
	 * Defines the reference to the animation.
	 */
	readonly animation: EditorAnimation;
	/**
	 * Defines the reference to the animated object.
	 */
	readonly target: any;
}

interface _ITargetedAnimationRuntime extends IEditorTargetedAnimation {
	binding: IAnimatedPropertyBinding | null;
	stride: number;
	currentFrame: number;
	repeatCount: number;
	initialValue: number | number[] | null;
	ended: boolean;
}

/**
 * Defines a group of animations played together, the equivalent of a Babylon.js `AnimationGroup` for the Babylon
 * Lite objects. The group handles the playback (range, speed, loop modes (cycle, constant, relative, yoyo) and
 * animation events) and the values are evaluated the same way Babylon.js does, Babylon Lite animations supporting
 * neither Hermite tangents nor events.
 */
export class EditorAnimationGroup {
	/**
	 * Defines the name of the animation group.
	 */
	public name: string;
	/**
	 * Defines the metadata of the animation group.
	 */
	public metadata: any = null;

	/**
	 * Defines the speed ratio of the animation group (1 by default).
	 */
	public speedRatio: number = 1;
	/**
	 * Defines wether or not the animation group loops.
	 */
	public loopAnimation: boolean = false;
	/**
	 * Defines the weight of the animation group. Kept for compatibility, Babylon Lite doesn't blend the property animations of the tools.
	 */
	public weight: number = -1;
	/**
	 * Defines wether or not the animation group is additive. Kept for compatibility, additive animations are not supported.
	 */
	public isAdditive: boolean = false;

	/**
	 * Defines the observable notified when the animation group starts playing.
	 */
	public readonly onAnimationGroupPlayObservable: Observable<EditorAnimationGroup> = new Observable<EditorAnimationGroup>();
	/**
	 * Defines the observable notified when the animation group is paused.
	 */
	public readonly onAnimationGroupPauseObservable: Observable<EditorAnimationGroup> = new Observable<EditorAnimationGroup>();
	/**
	 * Defines the observable notified when the animation group ends (stopped or reached its last frame without looping).
	 */
	public readonly onAnimationGroupEndObservable: Observable<EditorAnimationGroup> = new Observable<EditorAnimationGroup>();
	/**
	 * Defines the observable notified each time the animation group loops.
	 */
	public readonly onAnimationGroupLoopObservable: Observable<EditorAnimationGroup> = new Observable<EditorAnimationGroup>();
	/**
	 * Defines the observable notified each time an animation of the group ends.
	 */
	public readonly onAnimationEndObservable: Observable<IEditorTargetedAnimation> = new Observable<IEditorTargetedAnimation>();
	/**
	 * Defines the observable notified each time an animation of the group loops.
	 */
	public readonly onAnimationLoopObservable: Observable<IEditorTargetedAnimation> = new Observable<IEditorTargetedAnimation>();

	/**
	 * Defines the reference to the scene the animation group belongs to.
	 */
	public readonly scene: SceneContext;

	private _from: number = Number.MAX_VALUE;
	private _to: number = -Number.MAX_VALUE;
	private _hasCustomRange: boolean = false;

	private _isStarted: boolean = false;
	private _isPaused: boolean = false;
	private _isDisposed: boolean = false;

	private _elapsedSeconds: number = 0;
	private _runtimes: _ITargetedAnimationRuntime[] = [];

	public constructor(name: string, scene: SceneContext) {
		this.name = name;
		this.scene = scene;

		const sceneData = getSceneData(scene);
		sceneData.animationGroups.push(this);
		sceneData._tickedAnimationGroups.add(this);
	}

	/**
	 * Gets the first frame of the animation group.
	 */
	public get from(): number {
		return this._from === Number.MAX_VALUE ? 0 : this._from;
	}

	/**
	 * Sets the first frame of the animation group.
	 */
	public set from(value: number) {
		this._from = value;
		this._hasCustomRange = true;
	}

	/**
	 * Gets the last frame of the animation group.
	 */
	public get to(): number {
		return this._to === -Number.MAX_VALUE ? 0 : this._to;
	}

	/**
	 * Sets the last frame of the animation group.
	 */
	public set to(value: number) {
		this._to = value;
		this._hasCustomRange = true;
	}

	/**
	 * Returns wether or not the animation group is playing (started and not paused).
	 */
	public get isPlaying(): boolean {
		return this._isStarted && !this._isPaused;
	}

	/**
	 * Returns wether or not the animation group is started (playing or paused).
	 */
	public get isStarted(): boolean {
		return this._isStarted;
	}

	/**
	 * Returns the list of animations of the group with their targets.
	 */
	public get targetedAnimations(): IEditorTargetedAnimation[] {
		return this._runtimes.map((runtime) => ({ animation: runtime.animation, target: runtime.target }));
	}

	/**
	 * Returns the current frame of the animation group (the frame of its first animation).
	 */
	public getCurrentFrame(): number {
		return this._runtimes[0]?.currentFrame ?? this.from;
	}

	/**
	 * Adds the given animation to the group, animating the given target.
	 * @param animation defines the animation to add.
	 * @param target defines the object animated by the animation.
	 * @returns the targeted animation.
	 */
	public addTargetedAnimation(animation: EditorAnimation, target: any): IEditorTargetedAnimation {
		const runtime: _ITargetedAnimationRuntime = {
			animation,
			target,
			binding: null,
			stride: animation.getStride(),
			currentFrame: animation.getLowestFrame(),
			repeatCount: 0,
			initialValue: null,
			ended: false,
		};

		this._runtimes.push(runtime);

		if (!this._hasCustomRange) {
			this._from = Math.min(this._from, animation.getLowestFrame());
			this._to = Math.max(this._to, animation.getHighestFrame());
		}

		return { animation, target };
	}

	/**
	 * Removes the given animation from the group.
	 * @param animation defines the animation to remove.
	 */
	public removeTargetedAnimation(animation: EditorAnimation): void {
		this._runtimes = this._runtimes.filter((runtime) => runtime.animation !== animation);
	}

	/**
	 * Makes all the animations of the group start and end at the given frames by adding keys when needed.
	 * @param beginFrame defines the first frame of the group (the lowest frame of the animations by default).
	 * @param endFrame defines the last frame of the group (the highest frame of the animations by default).
	 */
	public normalize(beginFrame: number | null = null, endFrame: number | null = null): EditorAnimationGroup {
		const begin = beginFrame ?? this.from;
		const end = endFrame ?? this.to;

		this._runtimes.forEach((runtime) => {
			const keys = runtime.animation.getKeys();
			if (!keys.length) {
				return;
			}

			const startKey = keys[0];
			const endKey = keys[keys.length - 1];

			const newKeys = keys.slice();
			if (startKey.frame > begin) {
				newKeys.unshift({ ...startKey, frame: begin, inTangent: undefined, outTangent: undefined });
			}

			if (endKey.frame < end) {
				newKeys.push({ ...endKey, frame: end, inTangent: undefined, outTangent: undefined });
			}

			if (newKeys.length !== keys.length) {
				runtime.animation.setKeys(newKeys);
			}
		});

		this._from = begin;
		this._to = end;
		this._hasCustomRange = true;

		return this;
	}

	/**
	 * Starts playing the animation group.
	 * @param loop defines wether or not the animation group loops.
	 * @param speedRatio defines the speed ratio of the animation group.
	 * @param from defines the first frame to play (the first frame of the group by default).
	 * @param to defines the last frame to play (the last frame of the group by default).
	 */
	public start(loop: boolean = false, speedRatio: number = 1, from?: number, to?: number): EditorAnimationGroup {
		if (this._isStarted || !this._runtimes.length) {
			return this;
		}

		this.loopAnimation = loop;
		this.speedRatio = speedRatio;

		if (from !== undefined) {
			this.from = from;
		}

		if (to !== undefined) {
			this.to = to;
		}

		this._isStarted = true;
		this._isPaused = false;
		this._elapsedSeconds = 0;

		this._runtimes.forEach((runtime) => {
			runtime.ended = false;
			runtime.repeatCount = 0;
			runtime.currentFrame = this.from;
			runtime.initialValue = this._getBinding(runtime)?.read() ?? null;
			runtime.animation.getEvents().forEach((event) => {
				if (!event.onlyOnce) {
					event._isDone = false;
				}
			});
		});

		this._evaluate(true);

		this.onAnimationGroupPlayObservable.notifyObservers(this);

		return this;
	}

	/**
	 * Plays the animation group, or resumes it if it is paused.
	 * @param loop defines wether or not the animation group loops (keeps the current value by default).
	 */
	public play(loop?: boolean): EditorAnimationGroup {
		if (this._isStarted && this._isPaused) {
			if (loop !== undefined) {
				this.loopAnimation = loop;
			}

			this._isPaused = false;
			this.onAnimationGroupPlayObservable.notifyObservers(this);

			return this;
		}

		if (this._isStarted) {
			this.stop(true);
		}

		return this.start(loop ?? this.loopAnimation, this.speedRatio, this.from, this.to);
	}

	/**
	 * Pauses the animation group.
	 */
	public pause(): EditorAnimationGroup {
		if (!this._isStarted || this._isPaused) {
			return this;
		}

		this._isPaused = true;
		this.onAnimationGroupPauseObservable.notifyObservers(this);

		return this;
	}

	/**
	 * Stops the animation group. The animated properties keep their current values.
	 * @param skipOnAnimationEnd defines wether or not the end observables should not be notified.
	 */
	public stop(skipOnAnimationEnd: boolean = false): EditorAnimationGroup {
		if (!this._isStarted) {
			return this;
		}

		this._isStarted = false;
		this._isPaused = false;

		if (!skipOnAnimationEnd) {
			this._runtimes.forEach((runtime) => this.onAnimationEndObservable.notifyObservers({ animation: runtime.animation, target: runtime.target }));
			this.onAnimationGroupEndObservable.notifyObservers(this);
		}

		return this;
	}

	/**
	 * Goes to the first frame of the animation group and applies the values of the animations.
	 */
	public reset(): EditorAnimationGroup {
		return this.goToFrame(this.from);
	}

	/**
	 * Restarts the animation group from its first frame.
	 */
	public restart(): EditorAnimationGroup {
		if (!this._isStarted) {
			return this;
		}

		this._elapsedSeconds = 0;
		this._isPaused = false;
		this._evaluate(true);

		return this;
	}

	/**
	 * Goes to the given frame and applies the values of the animations. The events set before the frame are
	 * considered as raised, the ones set after will be raised.
	 * @param frame defines the frame to go to.
	 */
	public goToFrame(frame: number): EditorAnimationGroup {
		const fps = this._runtimes[0]?.animation.framePerSecond ?? 60;
		this._elapsedSeconds = (frame - this.from) / (fps * (this.speedRatio || 1));

		this._runtimes.forEach((runtime) => {
			runtime.animation.getEvents().forEach((event) => {
				if (!event.onlyOnce) {
					event._isDone = event.frame < frame;
				}
			});
		});

		this._evaluate(true, frame);

		return this;
	}

	/**
	 * Clones the animation group.
	 * @param newName defines the name of the new animation group.
	 * @param targetConverter defines an optional function used to convert the targets of the animations.
	 * @param cloneAnimations defines wether or not the animations should be cloned too.
	 */
	public clone(newName: string, targetConverter?: (target: any) => any, cloneAnimations: boolean = false): EditorAnimationGroup {
		const clone = new EditorAnimationGroup(newName, this.scene);

		this._runtimes.forEach((runtime) => {
			clone.addTargetedAnimation(cloneAnimations ? runtime.animation.clone() : runtime.animation, targetConverter ? targetConverter(runtime.target) : runtime.target);
		});

		clone._from = this._from;
		clone._to = this._to;
		clone._hasCustomRange = this._hasCustomRange;

		clone.speedRatio = this.speedRatio;
		clone.loopAnimation = this.loopAnimation;
		clone.weight = this.weight;
		clone.isAdditive = this.isAdditive;
		clone.metadata = this.metadata;

		return clone;
	}

	/**
	 * Disposes the animation group: it is stopped and removed from the scene.
	 */
	public dispose(): void {
		if (this._isDisposed) {
			return;
		}

		this.stop(true);
		this._isDisposed = true;

		this._runtimes = [];

		const sceneData = getSceneData(this.scene);
		sceneData._tickedAnimationGroups.delete(this);

		const index = sceneData.animationGroups.indexOf(this);
		if (index !== -1) {
			sceneData.animationGroups.splice(index, 1);
		}

		this.onAnimationGroupPlayObservable.clear();
		this.onAnimationGroupPauseObservable.clear();
		this.onAnimationGroupEndObservable.clear();
		this.onAnimationGroupLoopObservable.clear();
		this.onAnimationEndObservable.clear();
		this.onAnimationLoopObservable.clear();
	}

	/**
	 * @internal
	 * Advances the animation group by the given time, called each frame by the scene.
	 */
	public _tick(deltaMs: number): void {
		if (!this._isStarted || this._isPaused) {
			return;
		}

		this._elapsedSeconds += (deltaMs / 1000) * this.speedRatio;
		this._evaluate(false);
	}

	private _getBinding(runtime: _ITargetedAnimationRuntime): IAnimatedPropertyBinding | null {
		if (!runtime.binding) {
			runtime.binding = createAnimatedPropertyBinding(runtime.target, runtime.animation.targetProperty, runtime.stride);
		}

		return runtime.binding;
	}

	private _evaluateRuntimeAt(runtime: _ITargetedAnimationRuntime, frame: number): number | number[] | null {
		return _evaluateAnimationAt(runtime.animation, frame);
	}

	private _evaluate(force: boolean, forcedFrame?: number): void {
		let loopedGroup = false;
		let allEnded = this._runtimes.length > 0;

		for (const runtime of this._runtimes) {
			const animation = runtime.animation;
			const from = this.from;
			const to = this.to;
			const range = to - from;

			let frame: number;
			let ended = false;
			let repeatCount = 0;

			if (forcedFrame !== undefined) {
				frame = Math.max(Math.min(forcedFrame, Math.max(from, to)), Math.min(from, to));
			} else {
				const absoluteFrame = this._elapsedSeconds * animation.framePerSecond;
				const loopMode = animation.loopMode;

				if (!this.loopAnimation && range >= 0 && absoluteFrame >= range) {
					frame = to;
					ended = true;
				} else if (!this.loopAnimation && range < 0 && absoluteFrame <= range) {
					frame = to;
					ended = true;
				} else if (range === 0) {
					frame = from;
				} else if (loopMode === EditorAnimation.ANIMATIONLOOPMODE_YOYO) {
					const position = Math.abs(absoluteFrame) / Math.abs(range);
					const cycle = Math.floor(position);
					const local = position - cycle;
					frame = from + (cycle % 2 === 0 ? local : 1 - local) * range;
					repeatCount = cycle;
				} else {
					repeatCount = Math.floor(absoluteFrame / range);
					frame = from + (absoluteFrame - repeatCount * range);

					if (loopMode === EditorAnimation.ANIMATIONLOOPMODE_CONSTANT && repeatCount > 0) {
						frame = to;
					}
				}
			}

			// Loop detection: reset the events.
			if (!force && repeatCount !== runtime.repeatCount) {
				loopedGroup = true;

				animation.getEvents().forEach((event) => {
					if (!event.onlyOnce) {
						event._isDone = false;
					}
				});

				this.onAnimationLoopObservable.notifyObservers({ animation, target: runtime.target });
			}

			runtime.currentFrame = frame;
			runtime.repeatCount = repeatCount;

			let value = this._evaluateRuntimeAt(runtime, frame);
			const binding = this._getBinding(runtime);

			if (value !== null && binding) {
				value = this._applyLoopOffsets(runtime, value, repeatCount);
				binding.write(value);
			}

			// Events
			const events = animation.getEvents();
			for (let i = 0; i < events.length; ++i) {
				const event = events[i];
				const inRange = range >= 0 ? frame >= event.frame && event.frame >= from : frame <= event.frame && event.frame <= from;

				if (inRange && !event._isDone) {
					event._isDone = true;
					event.action(frame);
				}
			}

			if (ended && !runtime.ended) {
				runtime.ended = true;
				this.onAnimationEndObservable.notifyObservers({ animation, target: runtime.target });
			}

			allEnded &&= runtime.ended;
		}

		if (loopedGroup) {
			this.onAnimationGroupLoopObservable.notifyObservers(this);
		}

		if (allEnded && forcedFrame === undefined && this._isStarted && !this.loopAnimation) {
			this._isStarted = false;
			this._isPaused = false;
			this.onAnimationGroupEndObservable.notifyObservers(this);
		}
	}

	/**
	 * Applies the offsets of the relative loop modes of Babylon.js: each loop adds the difference between the values
	 * of the last and first frames of the range.
	 */
	private _applyLoopOffsets(runtime: _ITargetedAnimationRuntime, value: number | number[], repeatCount: number): number | number[] {
		const loopMode = runtime.animation.loopMode;
		const isRelative = loopMode === EditorAnimation.ANIMATIONLOOPMODE_RELATIVE || loopMode === EditorAnimation.ANIMATIONLOOPMODE_RELATIVE_FROM_CURRENT;

		if (!isRelative || runtime.animation.dataType === EditorAnimation.ANIMATIONTYPE_QUATERNION) {
			return value;
		}

		const fromValue = this._evaluateRuntimeAt(runtime, this.from);
		const toValue = this._evaluateRuntimeAt(runtime, this.to);

		if (fromValue === null || toValue === null) {
			return value;
		}

		const initial = loopMode === EditorAnimation.ANIMATIONLOOPMODE_RELATIVE_FROM_CURRENT ? runtime.initialValue : null;

		if (typeof value === "number") {
			const offset = ((toValue as number) - (fromValue as number)) * repeatCount;
			const base = initial !== null && typeof initial === "number" ? initial - (fromValue as number) : 0;
			return value + offset + base;
		}

		return value.map((v, i) => {
			const offset = ((toValue as number[])[i] - (fromValue as number[])[i]) * repeatCount;
			const base = initial !== null && Array.isArray(initial) ? initial[i] - (fromValue as number[])[i] : 0;
			return v + offset + base;
		});
	}
}
