import {
	AudioEngine,
	cloneTransformNode,
	createAudioEngineAsync,
	createSoundAsync,
	createSoundBufferAsync,
	disposeSound,
	enableSpatial,
	pauseSound,
	playSound,
	resumeSound,
	SceneContext,
	SceneNode,
	setSoundVolume,
	setSpatialListener,
	setSpatialPosition,
	SoundBuffer,
	SoundState,
	SpatialTarget,
	StaticSound,
	stopSound,
	updateSpatialAudio,
} from "@babylonjs/lite";

import { loadFile } from "../tools/request";
import { setClassName } from "../tools/guards";
import { Observable, Observer } from "../tools/observable";
import { getNodeScene, getSceneData, registerSceneNode } from "../tools/scene";
import { SoundNode, spatialSoundsUpdateOptions } from "../tools/sound";
import { getOnDisposeObservable, isNodeEnabled } from "../tools/node";
import { distanceVec3, getAbsolutePosition } from "../tools/maths";

/**
 * Defines the options of the spatial part of a sound, kept by the tools as Babylon Lite sounds don't expose them.
 */
interface _ISpatialOptions {
	isSpatial: boolean;
	maxDistance: number;
	panningModel?: PanningModelType;
	distanceModel?: DistanceModelType;
}

interface _ISoundState {
	volume: number;
	playbackRate: number;
	spatial: _ISpatialOptions;
}

let audioEngine: AudioEngine | null = null;
let audioEnginePromise: Promise<AudioEngine> | null = null;

let listenerTarget: SpatialTarget | null = null;

const soundsStates = new WeakMap<StaticSound, _ISoundState>();

const soundInstances: SoundNode[] = [];
const cachedSoundBuffers: Map<string, Promise<SoundBuffer | null>> = new Map();

// The sound nodes the per-frame spatial update looks at: the ones started through their node (`play`, `resume`) and
// not seen stopped since. Walking every loaded sound node instead - a scene with a few dozen characters has hundreds
// of them, nearly all silent - was most of the update's time.
const playingSoundInstances: Set<SoundNode> = new Set();

// How many frames apart every loaded sound node is looked at for one that plays without having been started through
// its node (its sound played directly): those are followed too, from then on.
const playingSoundsCollectInterval = 15;

const registeredUpdateObservers = new WeakMap<SceneContext, Observer<SceneContext>>();

/**
 * Sets the audio engine used to create the sounds of the editor scenes. By default, an audio engine is created the
 * first time a scene containing sounds is loaded.
 * @param engine defines the reference to the audio engine to use.
 */
export function setAudioEngine(engine: AudioEngine): void {
	audioEngine = engine;
	audioEnginePromise = Promise.resolve(engine);
}

/**
 * Returns the audio engine used to create the sounds of the editor scenes, creating it if needed.
 */
export function getAudioEngine(): Promise<AudioEngine> {
	audioEnginePromise ??= createAudioEngineAsync().then((engine) => {
		audioEngine = engine;
		return engine;
	});

	return audioEnginePromise;
}

/**
 * Attaches the spatial audio listener (the "ears") to the given target, typically the active camera. As with the
 * Babylon.js version of the tools, the spatial sounds that follow their node are moved each frame only once the
 * listener is attached.
 * @param target defines the target the listener follows (a node or a camera), or null to detach the listener.
 */
export async function attachAudioListener(target: SpatialTarget | null): Promise<void> {
	const engine = await getAudioEngine();

	listenerTarget = target;
	setSpatialListener(engine, target ? { attachedTo: target } : {});
}

function getSoundState(sound: StaticSound): _ISoundState {
	let state = soundsStates.get(sound);
	if (!state) {
		state = {
			volume: 1,
			playbackRate: 1,
			spatial: { isSpatial: false, maxDistance: 10000 },
		};
		soundsStates.set(sound, state);
	}

	return state;
}

/**
 * Returns wether or not the given sound is spatialized.
 * @param sound defines the reference to the sound.
 */
export function isSoundSpatial(sound: StaticSound): boolean {
	return getSoundState(sound).spatial.isSpatial;
}

function updateSpatialPosition(instance: SoundNode, sound: StaticSound): void {
	setSpatialPosition(sound, getAbsolutePosition(instance));
}

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
	if (isSoundSpatial(sound) && instance.autoUpdateSpatial && isNodeEnabled(instance, false) && !instance.isPlaying()) {
		updateSpatialPosition(instance, sound);
	}
}

function registerUpdateSoundsObserver(scene: SceneContext) {
	registeredUpdateObservers.get(scene)?.remove();

	if (!soundInstances.length) {
		return;
	}

	let frame = 0;

	const observer = getSceneData(scene).onBeforeRenderObservable.add(() => {
		if (!listenerTarget || !audioEngine) {
			return;
		}

		updateSpatialAudio(audioEngine);

		if (++frame % playingSoundsCollectInterval === 0) {
			collectPlayingSoundInstances();
		}

		if (!playingSoundInstances.size || !scene.camera) {
			return;
		}

		const listenerPosition = getAbsolutePosition(listenerTarget);

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

			const sound = instance.sound;
			if (!sound || !isNodeEnabled(instance, false) || !instance.autoUpdateSpatial || !isSoundSpatial(sound)) {
				continue;
			}

			const distance = distanceVec3(listenerPosition, getAbsolutePosition(instance));
			if (distance > getSoundState(sound).spatial.maxDistance) {
				continue;
			}

			// Spread over the frames by node, so the far sounds are not all moved on the same one.
			if (farDistance > 0 && distance > farDistance && (frame + (instance.uniqueId ?? 0)) % farUpdateInterval !== 0) {
				continue;
			}

			updateSpatialPosition(instance, sound);
		}
	});

	registeredUpdateObservers.set(scene, observer);
}

/**
 * Takes the node back out of `soundInstances` once its sound is disposed.
 */
function registerSoundInstanceCleanup(instance: SoundNode, sound: StaticSound) {
	getOnDisposeObservable(sound).addOnce(() => {
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

	getOnDisposeObservable(instance).addOnce(() => {
		const sound = instance.sound;
		if (sound) {
			disposeSound(sound);
			getOnDisposeObservable(sound).notifyObservers(sound);
		}
	});
}

function loadSoundBuffer(soundAbsolutePath: string): Promise<SoundBuffer | null> {
	return (async () => {
		const engine = await getAudioEngine();
		const data = await loadFile(soundAbsolutePath, "arraybuffer");
		return createSoundBufferAsync(engine, data);
	})();
}

async function createSound(name: string, buffer: SoundBuffer, volume: number, spatial: _ISpatialOptions): Promise<StaticSound> {
	const engine = await getAudioEngine();
	const sound = await createSoundAsync(engine, buffer, { volume });

	const state = getSoundState(sound);
	state.volume = volume;
	state.spatial = { ...spatial };

	void name;

	if (spatial.isSpatial) {
		enableSpatial(sound, {
			maxDistance: spatial.maxDistance,
			panningModel: spatial.panningModel,
			distanceModel: spatial.distanceModel,
		});
	}

	return sound;
}

export function configureSourceNodeFrom(source: SoundNode, target: SoundNode) {
	const sourceSound = source.sound;
	if (!source.soundRelativePath || !sourceSound) {
		return;
	}

	target.onSoundLoadedObservable = new Observable<SoundNode>();

	const sourceState = getSoundState(sourceSound);

	createSound(source.soundRelativePath, sourceSound.buffer, source.volume, sourceState.spatial).then((sound) => {
		target.sound = sound;
		target.soundRelativePath = source.soundRelativePath;
		target.autoUpdateSpatial = source.autoUpdateSpatial;

		configureSoundNodePrototype(target, sound);
		registerSoundNodeEvents(target);

		soundInstances.push(target);

		const scene = getNodeScene(source);
		if (scene) {
			registerSceneNode(scene, target, "transformNode");
			registerUpdateSoundsObserver(scene);
		}

		target.onSoundLoadedObservable.notifyObservers(target);
	});
}

export function configureSoundNodePrototype(instance: SoundNode, sound: StaticSound) {
	const state = getSoundState(sound);

	Object.defineProperty(instance, "volume", {
		configurable: true,
		get: () => {
			return state.volume;
		},
		set: (volume) => {
			state.volume = volume;
			setSoundVolume(sound, volume);
		},
	});

	Object.defineProperty(instance, "playbackRate", {
		configurable: true,
		get: () => {
			return state.playbackRate;
		},
		set: (playbackRate) => {
			// Babylon Lite sounds take their playback rate when they are played.
			state.playbackRate = playbackRate;
		},
	});

	instance.isPaused = () => sound.state === SoundState.Paused;
	instance.isPlaying = () => sound.state === SoundState.Started;
	instance.isStopped = () => sound.state === SoundState.Stopped;

	instance.pause = () => pauseSound(sound);
	instance.resume = () => {
		placeSoundOnStart(instance, sound);
		resumeSound(sound);
		playingSoundInstances.add(instance);
	};
	instance.stop = (options) => stopSound(sound, options);
	instance.play = (options) => {
		placeSoundOnStart(instance, sound);
		playSound(sound, {
			playbackRate: state.playbackRate,
			...options,
		});
		playingSoundInstances.add(instance);
	};

	instance.setVolume = (volume, options) => {
		state.volume = volume;
		setSoundVolume(sound, volume, options ?? undefined);
	};

	instance.getClassName = () => "SoundNode";

	instance.setSoundSpatial = (spatial: boolean) => {
		return new Promise<void>((resolve) => {
			state.spatial.isSpatial = spatial;
			setTimeout(() => {
				if (spatial) {
					enableSpatial(sound, {
						maxDistance: state.spatial.maxDistance,
						panningModel: state.spatial.panningModel,
						distanceModel: state.spatial.distanceModel,
					});
					updateSpatialPosition(instance, sound);
				}
				resolve();
			});
		});
	};

	instance.cloneAsync = async (name: string, newParent?: SceneNode | null, doNotCloneChildren?: boolean) => {
		return new Promise<SoundNode>((resolve) => {
			const clone = cloneTransformNode(instance) as SoundNode;
			clone.name = name;
			clone.metadata = instance.metadata ? JSON.parse(JSON.stringify(instance.metadata)) : {};

			if (doNotCloneChildren) {
				clone.children.splice(0, clone.children.length);
			}

			if (newParent) {
				clone.parent = newParent;
				newParent.children.push(clone);
			}

			setClassName(clone, "SoundNode");
			configureSourceNodeFrom(instance, clone);

			clone.onSoundLoadedObservable.addOnce(() => {
				setTimeout(() => resolve(clone));
			});
		});
	};
}

/**
 * Parses the sound of the given serialized sound node (a transform node with `isSoundNode` saved by the editor) and
 * configures the given node as a sound node.
 * @param scene defines the reference to the scene the sound node belongs to.
 * @param rootUrl defines the root url of the scene.
 * @param instance defines the reference to the node created for the serialized sound node.
 * @param data defines the serialized sound node.
 */
export async function parseSoundNode(scene: SceneContext, rootUrl: string, instance: SoundNode, data: any): Promise<void> {
	setClassName(instance, "SoundNode");

	instance.onSoundLoadedObservable = new Observable<SoundNode>();
	instance.autoUpdateSpatial = data.autoUpdateSpatial ?? false;
	instance.getClassName = () => "SoundNode";

	if (!data.soundRelativePath) {
		return;
	}

	const soundAbsolutePath = `${rootUrl}${data.soundRelativePath}`;

	if (!cachedSoundBuffers.has(soundAbsolutePath)) {
		cachedSoundBuffers.set(
			soundAbsolutePath,
			loadSoundBuffer(soundAbsolutePath).catch((e) => {
				console.error(`Failed to load sound "${soundAbsolutePath}".`, e);
				return null;
			})
		);
	}

	const buffer = await cachedSoundBuffers.get(soundAbsolutePath)!;
	if (!buffer) {
		return;
	}

	const sound = await createSound(data.soundRelativePath, buffer, data.volume ?? 1, {
		isSpatial: data.isSpatial ?? false,
		maxDistance: data.maxDistance ?? 10000,
		panningModel: data.panningModel,
		distanceModel: data.distanceModel,
	});

	instance.sound = sound;
	instance.soundRelativePath = data.soundRelativePath;

	if (data.isSpatial) {
		updateSpatialPosition(instance, sound);
	}

	soundInstances.push(instance);

	registerSoundNodeEvents(instance);
	configureSoundNodePrototype(instance, sound);
	registerUpdateSoundsObserver(scene);

	instance.onSoundLoadedObservable.notifyObservers(instance);
}
