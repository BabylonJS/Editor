import { Nullable } from "../../../shared/types";

import {
	Animation, AnimationGroup, Color3, Color4, IAnimationKey, Matrix, Quaternion, Scene, Vector2, Vector3,
} from "babylonjs";

import { CinematicTrackType } from "./track";
import { ICinematic, ICinematicCamera, ICinematicTrack } from "./base";

export class Cinematic implements ICinematic {
	/**
	 * @hidden
	 */
	public _animationGroup: Nullable<AnimationGroup> = null;

	/**
	 * Plays the cinematic.
	 */
	public play(scene: Scene, from?: number): void {
		this._animationGroup = this.generateAnimationGroup(scene);
		this._animationGroup.start(false, 1.0, from);
	}

	/**
	 * Stops the cinematic.
	 */
	public stop(): void {
		if (this._animationGroup) {
			this._animationGroup.stop();
			this._animationGroup.dispose();
		}

		this._animationGroup = null;
	}

	/**
	 * Generates the animation group and returns its reference.
	 */
	public generateAnimationGroup(scene: Scene): AnimationGroup {
		const group = new AnimationGroup(this.name, scene);
		group.metadata = {
			doNotSerialize: true,
			embedInSceneFile: this.embedInSceneFile,
		};

		this._generateTrack(scene, group, this.camera.fov);
		this._generateTrack(scene, group, this.camera.position);
		this._generateTrack(scene, group, this.camera.target);

		this._generateTrack(scene, group, this.camera.focusDistance);
		this._generateTrack(scene, group, this.camera.fStop);
		this._generateTrack(scene, group, this.camera.focalLength);

		this.tracks.forEach((t) => this._generateTrack(scene, group, t));

		group.normalize();

		return group;
	}

	/**
	 * Generates the given track and pushes its animations in the group.
	 */
	private _generateTrack(scene: Scene, group: AnimationGroup, track: ICinematicTrack): void {
		switch (track.type) {
			case CinematicTrackType.Group:
				track.group!.tracks.forEach((t) => this._generateTrack(scene, group, t));
				break;

			case CinematicTrackType.Property:
				this._generatePropertyTrack(scene, group, track);
				break;
				
			case CinematicTrackType.PropertyGroup:
				this._generatePropertyGroupTrack(scene, group, track);
				break;

			case CinematicTrackType.AnimationGroup:
				this._generateAnimationGroupTrack(scene, group, track);
				break;
		}
	}

	/**
	 * Generates the given property track.
	 */
	private _generatePropertyTrack(scene: Scene, group: AnimationGroup, track: ICinematicTrack): void {
		if (!track.property!.keys.length) {
			return;
		}

		const node = track.property!.nodeId === "__editor__scene__" ? scene : scene.getNodeById(track.property!.nodeId);
		if (!node) {
			return;
		}

		const p = track.property!;

		const animation = new Animation(p.propertyPath, p.propertyPath, this.framesPerSecond, p.animationType, Animation.ANIMATIONLOOPMODE_CYCLE, false);
		animation.setKeys(p.keys);

		group.addTargetedAnimation(animation, node);
	}

	/**
	 * Generates the given property track.
	 */
	private _generatePropertyGroupTrack(scene: Scene, group: AnimationGroup, track: ICinematicTrack): void {
		if (!track.propertyGroup!.keys.length) {
			return;
		}

		track.propertyGroup!.nodeIds.forEach((n) => {
			const node = n === "__editor__scene__" ? scene : scene.getNodeById(n);
			if (!node) {
				return;
			}
	
			const p = track.propertyGroup!;
	
			const animation = new Animation(p.propertyPath, p.propertyPath, this.framesPerSecond, p.animationType, Animation.ANIMATIONLOOPMODE_CYCLE, false);
			animation.setKeys(p.keys);
	
			group.addTargetedAnimation(animation, node);
		});
	}

	/**
	 * Generates the given animation group track.
	 */
	private _generateAnimationGroupTrack(scene: Scene, group: AnimationGroup, track: ICinematicTrack): void {
		const trackGroup = scene.getAnimationGroupByName(track.animationGroup!.name);
		if (!trackGroup) {
			return;
		}

		track.animationGroup!.slots.forEach((s) => {
			trackGroup.targetedAnimations.forEach((ta) => {
				let animation: Nullable<Animation> = null;

				defer: {
					const existingTargetedAnimations = group.targetedAnimations.filter((ta2) => ta2.target === ta.target);
					if (existingTargetedAnimations.length) {
						const existingTargetedAnimationsPair = existingTargetedAnimations.find((et) => et.animation.targetProperty === ta.animation.targetProperty);
						if (existingTargetedAnimationsPair) {
							animation = existingTargetedAnimationsPair.animation;
							break defer;
						}
					}

					animation = ta.animation.clone();
					animation.framePerSecond = this.framesPerSecond;
					animation.setKeys([]);
				}

				const keys = animation.getKeys();
				const sourceKeys = ta.animation.getKeys();

				const normalizedFps = (this.framesPerSecond / ta.animation.framePerSecond);

				sourceKeys.forEach((k) => {
					const frame = s.position + k.frame * normalizedFps;
					keys.push({ ...this._cloneKey(ta.animation.dataType, k), frame });
				});

				animation.setKeys(keys);

				group.addTargetedAnimation(animation, ta.target);
			});
		});
	}

	/**
	 * Clones the given key.
	 */
	private _cloneKey(dataType: number, key: IAnimationKey): IAnimationKey {
		let value: any;
		switch (dataType) {
			case Animation.ANIMATIONTYPE_FLOAT: value = key.value; break;
			default: value = key.value.clone(); break;
		}

		return {
			value,
			frame: key.frame,
			interpolation: key.interpolation,
			inTangent: dataType === Animation.ANIMATIONTYPE_FLOAT ? key.inTangent : key.inTangent?.clone(),
			outTangent: dataType === Animation.ANIMATIONTYPE_FLOAT ? key.outTangent : key.outTangent?.clone(),
		};
	}

	/**
	 * Serializes the cinematic.
	 */
	public serialize(): ICinematic {
		const tracks: ICinematicTrack[] = [];

		this.tracks.forEach((t) => {
			tracks.push(this._serializeTrack(t));
		});

		return {
			tracks,
			name: this.name,
			framesPerSecond: this.framesPerSecond,
			embedInSceneFile: this.embedInSceneFile,
			camera: {
				cameraId: this.camera.cameraId,
				fov: this._serializeTrack(this.camera.fov),
				target: this._serializeTrack(this.camera.target),
				position: this._serializeTrack(this.camera.position),
				focusDistance: this._serializeTrack(this.camera.focusDistance),
				fStop: this._serializeTrack(this.camera.fStop),
				focalLength: this._serializeTrack(this.camera.focalLength),
			},
		};
	}

	/**
	 * Serializes the given track.
	 */
	private _serializeTrack(sourceTrack: ICinematicTrack): ICinematicTrack {
		const track: ICinematicTrack = {
			type: sourceTrack.type,
			animationGroup: sourceTrack.animationGroup,
		};

		if (sourceTrack.group) {
			track.group = {
				name: sourceTrack.group.name,
				tracks: sourceTrack.group.tracks.map((t) => this._serializeTrack(t)),
			};

			return track;
		}

		if (sourceTrack.property || sourceTrack.propertyGroup) {
			const property = sourceTrack.property ? "property" : "propertyGroup";

			track[property] = {
				keys: [],
				nodeId: undefined!,
				nodeIds: undefined!,
				propertyPath: sourceTrack[property]!.propertyPath,
				animationType: sourceTrack[property]!.animationType,
			};

			if (sourceTrack.property) {
				track.property!.nodeId = sourceTrack.property.nodeId;
			} else if (sourceTrack.propertyGroup) {
				track.propertyGroup!.nodeIds = sourceTrack.propertyGroup.nodeIds;
			}

			sourceTrack[property]!.keys.forEach((k) => {
				let value: any;
				switch (sourceTrack[property]!.animationType) {
					case Animation.ANIMATIONTYPE_FLOAT: value = k.value; break;
					default: value = k.value.asArray(); break;
				}

				track[property]!.keys.push({
					value,
					frame: k.frame,
					lockedTangent: k.lockedTangent,
					interpolation: k.interpolation,
					inTangent: sourceTrack[property]!.animationType === Animation.ANIMATIONTYPE_FLOAT ? k.inTangent : k.inTangent?.asArray(),
					outTangent: sourceTrack[property]!.animationType === Animation.ANIMATIONTYPE_FLOAT ? k.outTangent : k.outTangent?.asArray(),
				});
			});
		}

		return track;
	}

	/**
	 * Parses the cinematic according the given parsed data.
	 * @param parsedData defines the reference to object as JSON representation of cinematic.
	 */
	public static Parse(parsedData: ICinematic): Cinematic {
		const cinematic = new Cinematic();

		// TODO: remove this
		parsedData.camera.focusDistance ??= cinematic.camera.focusDistance;
		parsedData.camera.fStop ??= cinematic.camera.fStop;
		parsedData.camera.focalLength ??= cinematic.camera.focalLength;

		cinematic.name = parsedData.name;
		cinematic.tracks = parsedData.tracks.map((t) => this._ParseTrack(t));

		cinematic.camera = {
			cameraId: parsedData.camera.cameraId,
			fov: this._ParseTrack(parsedData.camera.fov),
			target: this._ParseTrack(parsedData.camera.target),
			position: this._ParseTrack(parsedData.camera.position),
			focusDistance: this._ParseTrack(parsedData.camera.focusDistance),
			fStop: this._ParseTrack(parsedData.camera.fStop),
			focalLength: this._ParseTrack(parsedData.camera.focalLength),
		};

		cinematic.framesPerSecond = parsedData.framesPerSecond;
		cinematic.embedInSceneFile = parsedData.embedInSceneFile ?? true;

		return cinematic;
	}

	/**
	 * Parses the given track and returns its refererence.
	 */
	private static _ParseTrack(t: ICinematicTrack): ICinematicTrack {
		const track: ICinematicTrack = {
			type: t.type,
			animationGroup: t.animationGroup,
		};

		if (t.group) {
			track.group = {
				name: t.group.name,
				tracks: t.group.tracks.map((t) => this._ParseTrack(t)),
			};

			return track;
		}

		if (t.property || t.propertyGroup) {
			const property = t.property ? "property" : "propertyGroup";

			track[property] = {
				keys: [],
				nodeId: undefined!,
				nodeIds: undefined!,
				propertyPath: t[property]!.propertyPath,
				animationType: t[property]!.animationType,
			};

			if (t.property) {
				track.property!.nodeId = t.property.nodeId;
			} else if (t.propertyGroup) {
				track.propertyGroup!.nodeIds = t.propertyGroup.nodeIds;
			}

			t[property]!.keys.forEach((k) => {
				let value: any;
				switch (t[property]!.animationType) {
					case Animation.ANIMATIONTYPE_FLOAT: value = k.value; break;
					case Animation.ANIMATIONTYPE_COLOR3: value = Color3.FromArray(k.value); break;
					case Animation.ANIMATIONTYPE_COLOR4: value = Color4.FromArray(k.value); break;
					case Animation.ANIMATIONTYPE_VECTOR2: value = Vector2.FromArray(k.value); break;
					case Animation.ANIMATIONTYPE_VECTOR3: value = Vector3.FromArray(k.value); break;
					case Animation.ANIMATIONTYPE_QUATERNION: value = Quaternion.FromArray(k.value); break;
					case Animation.ANIMATIONTYPE_MATRIX: value = Matrix.FromArray(k.value); break;
				}

				const key: IAnimationKey = {
					value,
					frame: k.frame,
					interpolation: k.interpolation,
					lockedTangent: k.lockedTangent,
					inTangent: this._ParseTangent(t[property]!.animationType, k.inTangent),
					outTangent: this._ParseTangent(t[property]!.animationType, k.outTangent),
				};

				track[property]!.keys.push(key);
			});
		}

		return track;
	}

	private static _ParseTangent(dataType: number, value: number | number[]): any {
		if (!value) {
			return value;
		}

		switch (dataType) {
			case Animation.ANIMATIONTYPE_FLOAT: return value;
			case Animation.ANIMATIONTYPE_COLOR3: return Color3.FromArray(value as number[]);
			case Animation.ANIMATIONTYPE_COLOR4: return Color4.FromArray(value as number[]);
			case Animation.ANIMATIONTYPE_VECTOR2: return Vector2.FromArray(value as number[]);
			case Animation.ANIMATIONTYPE_VECTOR3: return Vector3.FromArray(value as number[]);
			case Animation.ANIMATIONTYPE_QUATERNION: return Quaternion.FromArray(value as number[]);
			case Animation.ANIMATIONTYPE_MATRIX: return Matrix.FromArray(value as number[]);
		}
	}

	/**
	 * Defines the name of the cinematic.
	 */
	public name: string = "my-cinematic";
	/**
	 * Defines the number of frames computed per second.
	 */
	public framesPerSecond: number = 24;
	/**
	 * Defines wether or not the cinematic is embedded in the file scene file output.
	 */
	public embedInSceneFile: boolean = true;

	/**
	 * Defines the reference to the camera's configuration for the cinematic.
	 */
	public camera: ICinematicCamera = {
		fov: {
			type: CinematicTrackType.Property,
			property: {
				nodeId: "None",
				keys: [],
				propertyPath: "fov",
				animationType: Animation.ANIMATIONTYPE_FLOAT,
			},
		},
		position: {
			type: CinematicTrackType.Property,
			property: {
				keys: [],
				nodeId: "None",
				propertyPath: "position",
				animationType: Animation.ANIMATIONTYPE_VECTOR3,
			},
		},
		target: {
			type: CinematicTrackType.Property,
			property: {
				keys: [],
				nodeId: "None",
				propertyPath: "target",
				animationType: Animation.ANIMATIONTYPE_VECTOR3,
			},
		},
		focusDistance: {
			type: CinematicTrackType.Property,
			property: {
				keys: [],
				nodeId: "__editor__scene__",
				animationType: Animation.ANIMATIONTYPE_FLOAT,
				propertyPath: "_postProcessRenderPipelineManager._renderPipelines.default.depthOfField.focusDistance",
			},
		},
		fStop: {
			type: CinematicTrackType.Property,
			property: {
				keys: [],
				nodeId: "__editor__scene__",
				animationType: Animation.ANIMATIONTYPE_FLOAT,
				propertyPath: "_postProcessRenderPipelineManager._renderPipelines.default.depthOfField.fStop",
			},
		},
		focalLength: {
			type: CinematicTrackType.Property,
			property: {
				keys: [],
				nodeId: "__editor__scene__",
				animationType: Animation.ANIMATIONTYPE_FLOAT,
				propertyPath: "_postProcessRenderPipelineManager._renderPipelines.default.depthOfField.focalLength",
			},
		},
		cameraId: "None",
	};

	/**
	 * Defines the list of all cinematic tracks.
	 */
	public tracks: ICinematicTrack[] = [/*{
		type: CinematicTrackType.AnimationGroup,
		animationGroup: {
			name: "idle",
			slots: [
				{ position: 0, start: 0, end: 1.95 },
			],
		},
	}, {
		type: CinematicTrackType.AnimationGroup,
		animationGroup: {
			name: "walking",
			slots: [
				{ position: 48, start: 0, end: 0.95 },
			],
		},
	}, {
		type: CinematicTrackType.AnimationGroup,
		animationGroup: {
			name: "left turn",
			slots: [
				{ position: 72, start: 0, end: 1.0333333333333334 },
			],
		},
	}*/];
};
