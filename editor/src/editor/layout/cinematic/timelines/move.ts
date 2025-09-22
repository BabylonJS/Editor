import { CinematicKeyType, isCinematicKeyCut } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { waitNextAnimationFrame } from "../../../../tools/tools";

import { CinematicEditor } from "../editor";

import { getKeyFrame } from "./tools";
import { ICinematicTrackerKey } from "./tracker";

export interface ICinematicKeyConfigurationToMove {
	startPosition: number;
	key: CinematicKeyType | ICinematicTrackerKey;
}

export interface IConfigureDivEventsOptions {
	div: HTMLDivElement;
	cinematicEditor: CinematicEditor;
	cinematicKey: CinematicKeyType | ICinematicTrackerKey;

	onMoveStart?: () => void;
	onMove?: () => void;
	onMoveEnd?: () => void;
	onClicked?: () => void;
}

export function configureDivEvents(options: IConfigureDivEventsOptions) {
	options.div.addEventListener("mousedown", (ev) => {
		ev.stopPropagation();

		if (ev.button !== 0) {
			return;
		}

		let mouseUpListener: (event: globalThis.MouseEvent) => void;
		let mouseMoveListener: (event: globalThis.MouseEvent) => void;

		if (options.cinematicKey.type !== "group" && options.cinematicKey.type !== "sound" && options.cinematicKey.type !== "tracker" && getKeyFrame(options.cinematicKey) === 0) {
			return document.body.addEventListener(
				"mouseup",
				(mouseUpListener = (ev) => {
					ev.stopPropagation();

					document.body.removeEventListener("mouseup", mouseUpListener);

					waitNextAnimationFrame().then(() => {
						options.onClicked?.();
					});
				})
			);
		}

		options.onMoveStart?.();

		document.body.style.cursor = "ew-resize";

		let moving = false;
		let clientX: number | null = null;

		const startPosition = getKeyFrame(options.cinematicKey);
		const animationsKeyConfigurationsToMove: ICinematicKeyConfigurationToMove[][] = [];

		if (ev.shiftKey) {
			options.cinematicEditor.cinematic.tracks.forEach((track) => {
				const result: ICinematicKeyConfigurationToMove[] = [];

				track.animationGroups?.forEach((animationGroup) => {
					if (animationGroup.frame >= startPosition) {
						result.push({
							key: animationGroup,
							startPosition: animationGroup.frame,
						});
					}
				});

				track.sounds?.forEach((sound) => {
					if (sound.frame >= startPosition) {
						result.push({
							key: sound,
							startPosition: sound.frame,
						});
					}
				});

				track.keyFrameAnimations?.forEach((key) => {
					const frame = isCinematicKeyCut(key) ? key.key1.frame : key.frame;
					if (frame >= startPosition) {
						result.push({
							key,
							startPosition: isCinematicKeyCut(key) ? key.key1.frame : key.frame,
						});
					}
				});

				animationsKeyConfigurationsToMove.push(result);
			});
		} else {
			animationsKeyConfigurationsToMove.push([
				{
					startPosition,
					key: options.cinematicKey,
				},
			]);
		}

		document.body.addEventListener(
			"mousemove",
			(mouseMoveListener = (ev) => {
				if (clientX === null) {
					clientX = ev.clientX;
				}

				const delta = clientX - ev.clientX;
				if (moving || Math.abs(delta) > 5 * devicePixelRatio) {
					moving = true;
				} else {
					return;
				}

				animationsKeyConfigurationsToMove.forEach((trackConfiguration) => {
					trackConfiguration.forEach((keyConfiguration) => {
						const frame = Math.round(Math.max(0, keyConfiguration.startPosition - delta / options.cinematicEditor.timelines.state.scale));

						if (isCinematicKeyCut(keyConfiguration.key)) {
							keyConfiguration.key.key1.frame = frame;
							keyConfiguration.key.key2.frame = frame;
						} else {
							keyConfiguration.key.frame = frame;
						}
					});
				});

				options.onMove?.();
			})
		);

		document.body.addEventListener(
			"mouseup",
			(mouseUpListener = (ev) => {
				ev.stopPropagation();

				document.body.style.cursor = "auto";

				document.body.removeEventListener("mouseup", mouseUpListener);
				document.body.removeEventListener("mousemove", mouseMoveListener);

				options.onMoveEnd?.();

				waitNextAnimationFrame().then(() => {
					options.onClicked?.();

					if (moving) {
						registerKeysMovedUndoRedo(options.cinematicEditor, animationsKeyConfigurationsToMove);
					}
				});
			})
		);
	});
}

export function registerKeysMovedUndoRedo(cinematicEditor: CinematicEditor, animationsKeyConfigurationsToMove: ICinematicKeyConfigurationToMove[][]) {
	const newKeyFrames = animationsKeyConfigurationsToMove.map((configuration) => {
		return configuration.map((key) => {
			if (isCinematicKeyCut(key.key)) {
				return key.key.key1.frame;
			}

			return key.key.frame;
		});
	});

	registerUndoRedo({
		executeRedo: true,
		undo: () => {
			animationsKeyConfigurationsToMove.forEach((trackConfiguration) => {
				trackConfiguration.forEach((keyConfiguration) => {
					if (isCinematicKeyCut(keyConfiguration.key)) {
						keyConfiguration.key.key1.frame = keyConfiguration.startPosition;
						keyConfiguration.key.key2.frame = keyConfiguration.startPosition;
					} else {
						keyConfiguration.key.frame = keyConfiguration.startPosition;
					}
				});
			});
		},
		redo: () => {
			animationsKeyConfigurationsToMove.forEach((trackConfigurations, configurationIndex) => {
				trackConfigurations.forEach((keyConfiguration, keyIndex) => {
					if (isCinematicKeyCut(keyConfiguration.key)) {
						keyConfiguration.key.key1.frame = newKeyFrames[configurationIndex][keyIndex];
						keyConfiguration.key.key2.frame = newKeyFrames[configurationIndex][keyIndex];
					} else {
						keyConfiguration.key.frame = newKeyFrames[configurationIndex][keyIndex];
					}
				});
			});
		},
		action: () => {
			cinematicEditor.cinematic.tracks.forEach((track) => {
				track.animationGroups?.sort((a, b) => a.frame - b.frame);
				track.keyFrameAnimations?.sort((a, b) => {
					const frameA = isCinematicKeyCut(a) ? a.key1.frame : a.frame;
					const frameB = isCinematicKeyCut(b) ? b.key1.frame : b.frame;

					return frameA - frameB;
				});
			});
		},
	});
}
