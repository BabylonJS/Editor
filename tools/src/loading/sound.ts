import { Node } from "@babylonjs/core/node";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Database } from "@babylonjs/core/Offline/database";
import { SoundState } from "@babylonjs/core/AudioV2/soundState";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { Observable, Observer } from "@babylonjs/core/Misc/observable";
import { _WebAudioEngine } from "@babylonjs/core/AudioV2/webAudio/webAudioEngine";
import { AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";
import { _WebAudioStaticSound } from "@babylonjs/core/AudioV2/webAudio/webAudioStaticSound";
import { StaticSoundBuffer } from "@babylonjs/core/AudioV2/abstractAudio/staticSoundBuffer";
import { IStaticSoundOptions, StaticSound } from "@babylonjs/core/AudioV2/abstractAudio/staticSound";
import { _GetAudioEngine, CreateSoundAsync, CreateSoundBufferAsync } from "@babylonjs/core/AudioV2/abstractAudio/audioEngineV2";

import { SoundNode } from "../tools/sound";

let registered = false;
let registeredUpdateObserver: Observer<Scene> | null = null;

const soundInstances: SoundNode[] = [];
const cachedSoundBuffers: Map<string, Promise<StaticSoundBuffer | null>> = new Map();

function createSoundInstance(name: string, options: Partial<IStaticSoundOptions>) {
	const audioEngine = _GetAudioEngine(null) as _WebAudioEngine;
	return new _WebAudioStaticSound(name, audioEngine, options);
}

function registerUpdateSoundsObserver(scene: Scene) {
	registeredUpdateObserver?.remove();

	if (!soundInstances.length) {
		return;
	}

	const listenerPosition = Vector3.Zero();

	registeredUpdateObserver = scene.onBeforeRenderObservable.add(() => {
		const listener = _GetAudioEngine(null).listener.attachedNode;
		if (!listener) {
			return;
		}

		listener.getWorldMatrix().getTranslationToRef(listenerPosition);

		soundInstances.forEach((instance) => {
			if (instance.isEnabled(false) && instance.autoUpdateSpatial && instance.sound?._isSpatial && instance.isPlaying() && scene.activeCamera) {
				const distance = Vector3.Distance(listenerPosition, instance.getAbsolutePosition());
				if (distance <= instance.sound!.spatial.maxDistance) {
					instance.sound.spatial.update();
				}
			}
		});
	});
}

function registerSoundNodeEvents(instance: SoundNode) {
	instance.sound?.onDisposeObservable.addOnce(() => {
		const index = soundInstances.indexOf(instance);
		if (index !== -1) {
			soundInstances.splice(index, 1);
		}
	});

	instance.onDisposeObservable.addOnce(() => {
		instance.sound?.dispose();
	});
}

function loadSoundBuffer(scene: Scene, soundAbsolutePath: string) {
	return new Promise<StaticSoundBuffer | null>(async (resolve, reject) => {
		if (!scene.offlineProvider || !Database.IDBStorageEnabled) {
			return CreateSoundBufferAsync(soundAbsolutePath)
				.then((buffer) => resolve(buffer))
				.catch((e) => reject(e));
		}

		scene.offlineProvider.loadFile(
			soundAbsolutePath,
			(data: ArrayBuffer) => {
				CreateSoundBufferAsync(data)
					.then((buffer) => resolve(buffer))
					.catch((e) => reject(e));
			},
			undefined,
			() => {
				reject(null);
			},
			true
		);
	});
}

export function configureSourceNodeFrom(source: SoundNode, target: SoundNode) {
	if (!source.soundRelativePath || !source.sound) {
		return;
	}

	target.onSoundLoadedObservable = new Observable<SoundNode>();

	const sound = createSoundInstance(source.soundRelativePath, {
		spatialAutoUpdate: false,
	});

	sound
		._initAsync(source.sound.buffer, {
			spatialAutoUpdate: true,
		})
		.then(() => {
			sound.volume = source.volume;
			sound._isSpatial = source.sound!._isSpatial;

			if (sound._isSpatial) {
				sound.spatial.attach(target);
				sound.spatial.maxDistance = source.sound!.spatial.maxDistance;
				sound.spatial.panningModel = source.sound!.spatial.panningModel;
				sound.spatial.distanceModel = source.sound!.spatial.distanceModel;
			}

			target.sound = sound;
			target.soundRelativePath = source.soundRelativePath;
			target.autoUpdateSpatial = source.autoUpdateSpatial;

			soundInstances.push(target);
			registerUpdateSoundsObserver(target.getScene());

			target.onSoundLoadedObservable.notifyObservers(target);
		});

	registerSoundNodeEvents(target);
	configureSoundNodePrototype(target, sound);
}

export function configureSoundNodePrototype(instance: SoundNode, sound: StaticSound) {
	Object.defineProperty(instance, "volume", {
		get: () => {
			return sound.volume;
		},
		set: (volume) => {
			sound.volume = volume;
		},
	});

	Object.defineProperty(instance, "playbackRate", {
		get: () => {
			return sound.playbackRate;
		},
		set: (playbackRate) => {
			sound.playbackRate = playbackRate;
		},
	});

	instance.isPaused = () => sound.state === SoundState.Paused;
	instance.isPlaying = () => sound.state === SoundState.Started;
	instance.isStopped = () => sound.state === SoundState.Stopped;

	instance.pause = () => sound.pause();
	instance.resume = () => sound.resume();
	instance.stop = (options) => sound.stop(options);
	instance.play = (options) => sound.play(options);

	instance.setVolume = (volume, options) => sound.setVolume(volume, options);

	instance.getClassName = () => "SoundNode";

	instance.setSoundSpatial = (spatial: boolean) => {
		return new Promise<void>((resolve) => {
			sound._isSpatial = spatial;
			setTimeout(() => {
				if (spatial) {
					sound.spatial.attach(instance);
				}
				resolve();
			});
		});
	};

	instance.cloneAsync = async (name: string, newParent: Node | null, doNotCloneChildren?: boolean) => {
		return new Promise<SoundNode>((resolve) => {
			const clone = instance.clone(name, newParent, doNotCloneChildren) as SoundNode;
			configureSourceNodeFrom(instance, clone);

			clone.onSoundLoadedObservable.addOnce(() => {
				setTimeout(() => resolve(clone));
			});
		});
	};
}

export function registerAudioParser() {
	if (registered) {
		return;
	}

	registered = true;

	AddParser("SoundNode", (parsedData: any, scene: Scene, container: AssetContainer, rootUrl: string) => {
		parsedData.transformNodes?.forEach((transformNode: any) => {
			if (!transformNode.isSoundNode) {
				return;
			}

			const instance = container.transformNodes?.find((t) => t.id === transformNode.id) as SoundNode;
			if (!instance) {
				return;
			}

			if (transformNode.soundRelativePath) {
				const soundAbsolutePath = `${rootUrl}${transformNode.soundRelativePath}`;

				scene.addPendingData(soundAbsolutePath);

				if (!cachedSoundBuffers.has(soundAbsolutePath)) {
					cachedSoundBuffers.set(soundAbsolutePath, loadSoundBuffer(scene, soundAbsolutePath));
				}

				const promise = cachedSoundBuffers.get(soundAbsolutePath)!;

				promise.then((buffer) => {
					CreateSoundAsync(transformNode.soundRelativePath, buffer!, {
						spatialAutoUpdate: false,
					}).then((sound) => {
						scene.removePendingData(soundAbsolutePath);

						if (instance.isDisposed()) {
							return sound.dispose();
						}

						sound.volume = transformNode.volume;
						sound._isSpatial = transformNode.isSpatial;

						if (transformNode.isSpatial) {
							sound.spatial.attach(instance);
							sound.spatial.maxDistance = transformNode.maxDistance;
							sound.spatial.panningModel = transformNode.panningModel;
							sound.spatial.distanceModel = transformNode.distanceModel;
						}

						instance.sound = sound;
						instance.soundRelativePath = transformNode.soundRelativePath;
						instance.autoUpdateSpatial = transformNode.autoUpdateSpatial;

						soundInstances.push(instance);

						registerSoundNodeEvents(instance);
						configureSoundNodePrototype(instance, sound);
						registerUpdateSoundsObserver(scene);
					});
				});
			}
		});
	});
}
