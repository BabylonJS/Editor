import { Scene } from "@babylonjs/core/scene";
import { SoundState } from "@babylonjs/core/AudioV2/soundState";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { StaticSound } from "@babylonjs/core/AudioV2/abstractAudio/staticSound";
import { AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";
import { StaticSoundBuffer } from "@babylonjs/core/AudioV2/abstractAudio/staticSoundBuffer";
import { CreateSoundAsync, CreateSoundBufferAsync } from "@babylonjs/core/AudioV2/abstractAudio/audioEngineV2";

import { SoundNode } from "../tools/sound";

let registered = false;

const cachedSoundBuffers: Map<string, Promise<StaticSoundBuffer | null>> = new Map();

export function configureSourceNodeFrom(source: SoundNode, target: SoundNode) {
	if (!source.soundRelativePath || !source.sound) {
		return;
	}

	CreateSoundAsync(source.soundRelativePath, source.sound.buffer, {
		spatialAutoUpdate: true,
	}).then((sound) => {
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

		configureSoundNodePrototype(target, sound);
	});
}

export function configureSoundNodePrototype(instance: SoundNode, sound: StaticSound) {
	instance.isPlaying = () => {
		return sound.state === SoundState.Started;
	};

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

	instance.setVolume = (volume, options) => {
		return sound.setVolume(volume, options);
	};

	instance.stop = (options) => {
		return sound.stop(options);
	};

	instance.play = (options) => {
		return sound.play(options);
	};

	instance.pause = () => {
		return sound.pause();
	};

	instance.resume = () => {
		return sound.resume();
	};

	instance.attachTo = (node, useBoundingBox, attachmentType) => {
		return sound.spatial.attach(node, useBoundingBox, attachmentType);
	};
}

export function registerAudioParser() {
	if (registered) {
		return;
	}

	registered = true;

	AddParser("AudioEditorPlugin", (parsedData: any, scene: Scene, container: AssetContainer, _rootUrl: string) => {
		parsedData.sounds?.forEach((sound) => {
			const instance = container.sounds?.find((s) => s.name === sound.name);
			if (instance) {
				instance.id = sound.id;
				instance.uniqueId = sound.uniqueId;

				scene.onBeforeRenderObservable.addOnce(() => {
					// Backward compatibility, check if "spatialSound" is not getter only
					try {
						instance.spatialSound = sound.spatialSound;
					} catch (e) {
						// Catch silently.
					}
				});
			}
		});
	});

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
					cachedSoundBuffers.set(soundAbsolutePath, CreateSoundBufferAsync(soundAbsolutePath));
				}

				const promise = cachedSoundBuffers.get(soundAbsolutePath)!;

				promise.then((buffer) => {
					CreateSoundAsync(transformNode.soundRelativePath, buffer!, {
						spatialAutoUpdate: true,
					}).then((sound) => {
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

						configureSoundNodePrototype(instance, sound);

						scene.removePendingData(soundAbsolutePath);
					});
				});
			}
		});
	});
}
