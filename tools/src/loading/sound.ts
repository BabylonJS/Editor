import { Scene } from "@babylonjs/core/scene";
import { SoundState } from "@babylonjs/core/AudioV2/soundState";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { _WebAudioEngine } from "@babylonjs/core/AudioV2/webAudio/webAudioEngine";
import { AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";
import { _WebAudioStaticSound } from "@babylonjs/core/AudioV2/webAudio/webAudioStaticSound";
import { StaticSoundBuffer } from "@babylonjs/core/AudioV2/abstractAudio/staticSoundBuffer";
import { IStaticSoundOptions, StaticSound } from "@babylonjs/core/AudioV2/abstractAudio/staticSound";
import { _GetAudioEngine, CreateSoundAsync, CreateSoundBufferAsync } from "@babylonjs/core/AudioV2/abstractAudio/audioEngineV2";

import { SoundNode } from "../tools/sound";

let registered = false;

const cachedSoundBuffers: Map<string, Promise<StaticSoundBuffer | null>> = new Map();

function createSoundInstance(name: string, options: Partial<IStaticSoundOptions>) {
	const audioEngine = _GetAudioEngine(null) as _WebAudioEngine;
	return new _WebAudioStaticSound(name, audioEngine, options);
}

export function configureSourceNodeFrom(source: SoundNode, target: SoundNode) {
	if (!source.soundRelativePath || !source.sound) {
		return;
	}

	const sound = createSoundInstance(source.soundRelativePath, {
		spatialAutoUpdate: true,
	});

	sound
		._initAsync(source.sound.buffer!, {
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
			target.isSoundNode = true;
			target.soundRelativePath = source.soundRelativePath;
		});

	target.onDisposeObservable.addOnce(() => {
		sound.dispose();
	});

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

	instance.attachTo = (node, useBoundingBox, attachmentType) => sound.spatial.attach(node, useBoundingBox, attachmentType);
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
					const promise = new Promise<StaticSoundBuffer | null>(async (resolve, reject) => {
						if (!scene.offlineProvider) {
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

					cachedSoundBuffers.set(soundAbsolutePath, promise);
				}

				const promise = cachedSoundBuffers.get(soundAbsolutePath)!;

				promise.then((buffer) => {
					CreateSoundAsync(transformNode.soundRelativePath, buffer!, {
						spatialAutoUpdate: true,
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
						instance.isSoundNode = true;
						instance.soundRelativePath = transformNode.soundRelativePath;

						instance.onDisposeObservable.addOnce(() => {
							sound.dispose();
						});

						configureSoundNodePrototype(instance, sound);
					});
				});
			}
		});
	});
}
