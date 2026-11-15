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

import { SoundNode, spatialSoundsUpdateOptions } from "../tools/sound";

let registered = false;
let registeredUpdateObserver: Observer<Scene> | null = null;

const soundInstances: SoundNode[] = [];
const cachedSoundBuffers: Map<string, Promise<StaticSoundBuffer | null>> = new Map();

// The sound nodes the per-frame spatial update looks at: the ones started through their node (`play`, `resume`) and
// not seen stopped since. Walking every loaded sound node instead - a scene with a few dozen characters has hundreds
// of them, nearly all silent - was most of the update's time.
const playingSoundInstances: Set<SoundNode> = new Set();

// How many frames apart every loaded sound node is looked at for one that plays without having been started through
// its node (its sound played directly): those are followed too, from then on.
const playingSoundsCollectInterval = 15;

/**
 * Adds the sound nodes playing that were not started through their node to the ones the per-frame update follows.
 */
function collectPlayingSoundInstances() {
	for (let i = 0, count = soundInstances.length; i < count; ++i) {
		const instance = soundInstances[i];
		if (instance.isPlaying()) {
			playingSoundInstances.add(instance);
		}
	}
}

/**
 * Moves a sound that follows its node to where its node is, as it is started: until the per-frame update gets to it,
 * on the next frame - or a few frames later for a far one, see `setSpatialSoundsUpdateOptions` - it would be heard
 * from wherever it was last placed, which for a sound played now and then is where it was played the last time.
 */
function placeSoundOnStart(instance: SoundNode, sound: StaticSound) {
	if (sound._isSpatial && instance.autoUpdateSpatial && instance.isEnabled(false) && !instance.isPlaying()) {
		sound.spatial.update();
	}
}

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

	let frame = 0;

	registeredUpdateObserver = scene.onBeforeRenderObservable.add(() => {
		const listener = _GetAudioEngine(null).listener.attachedNode;
		if (!listener) {
			return;
		}

		if (++frame % playingSoundsCollectInterval === 0) {
			collectPlayingSoundInstances();
		}

		if (!playingSoundInstances.size || !scene.activeCamera) {
			return;
		}

		listener.getWorldMatrix().getTranslationToRef(listenerPosition);

		const farDistance = spatialSoundsUpdateOptions.farDistance;
		const farUpdateInterval = spatialSoundsUpdateOptions.farUpdateInterval;

		for (const instance of playingSoundInstances) {
			if (!instance.isPlaying()) {
				// Kept while it waits to start (played with a wait time): nothing else would bring it back.
				if (instance.sound?.state !== SoundState.Starting) {
					playingSoundInstances.delete(instance);
				}
				continue;
			}

			if (!instance.isEnabled(false) || !instance.autoUpdateSpatial || !instance.sound?._isSpatial) {
				continue;
			}

			const distance = Vector3.Distance(listenerPosition, instance.getAbsolutePosition());
			if (distance > instance.sound.spatial.maxDistance) {
				continue;
			}

			// Spread over the frames by node, so the far sounds are not all moved on the same one.
			if (farDistance > 0 && distance > farDistance && (frame + instance.uniqueId) % farUpdateInterval !== 0) {
				continue;
			}

			instance.sound.spatial.update();
		}
	});
}

/**
 * Takes the node back out of `soundInstances` once its sound is disposed.
 *
 * Registered against the sound, so it can only be done once the sound exists - which for a node configured from
 * a source (`configureSourceNodeFrom`) is after an await, long after `registerSoundNodeEvents` has run. Doing it
 * there against an `instance.sound` that was still undefined registered nothing at all, and every instantiated
 * sound node stayed in `soundInstances` for the lifetime of the page: it kept the node, and through it the whole
 * scene it belonged to, alive - and the per-frame spatial update walked a list that only ever grew.
 */
function registerSoundInstanceCleanup(instance: SoundNode, sound: StaticSound) {
	sound.onDisposeObservable.addOnce(() => {
		const index = soundInstances.indexOf(instance);
		if (index !== -1) {
			soundInstances.splice(index, 1);
		}

		playingSoundInstances.delete(instance);
	});
}

function registerSoundNodeEvents(instance: SoundNode) {
	if (instance.sound) {
		registerSoundInstanceCleanup(instance, instance.sound);
	}

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
			spatialEnabled: source.sound._isSpatial,
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
			registerSoundInstanceCleanup(target, sound);
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
	instance.resume = () => {
		placeSoundOnStart(instance, sound);
		sound.resume();
		playingSoundInstances.add(instance);
	};
	instance.stop = (options) => sound.stop(options);
	instance.play = (options) => {
		placeSoundOnStart(instance, sound);
		sound.play(options);
		playingSoundInstances.add(instance);
	};

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
		parsedData.transformNodes?.forEach((transformNode) => {
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
