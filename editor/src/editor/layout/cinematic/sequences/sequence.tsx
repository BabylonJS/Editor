import { ReactNode } from "react";

import { IoLayersOutline, IoTimeOutline } from "react-icons/io5";

import { ICinematicSequence, getCinematicAnimationGroupFramesCount, isCinematicKeyCut } from "babylonjs-editor-tools";

import { ICinematicSequenceLayout, formatCinematicTime } from "./layout";

export interface ICinematicEditorSequenceProps {
	layout: ICinematicSequenceLayout;
	/**
	 * Defines the position of the sequence in the cinematic, from 1.
	 */
	number: number;
	framesPerSecond: number;

	selected: boolean;
	dragged: boolean;
}

/**
 * Shadows of a sequence: the glow uses the purple of Babylon.js. Each state sets its shadow with a single class: two
 * shadow classes on the same element would override each other.
 */
const sequenceShadows = {
	idle: "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
	hover: "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_-2px_rgba(147,121,230,0.6)]",
	selected: "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_14px_-5px_rgba(147,121,230,0.6)]",
	dragged: "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_32px_-12px_rgba(0,0,0,0.75),0_0_24px_-3px_rgba(147,121,230,0.6)]",
};

/**
 * Draws a sequence in the list of the sequences of a cinematic, like a shot: its number, its name, when it plays, its
 * number of tracks and a preview of its keys, sounds and animation groups. The hovered sequence glows a little.
 */
export function CinematicEditorSequence(props: ICinematicEditorSequenceProps): ReactNode {
	const { sequence, startFrame, framesCount } = props.layout;
	const tracksCount = sequence.tracks.length;

	const highlighted = props.selected || props.dragged;
	const shadow = props.dragged ? sequenceShadows.dragged : props.selected ? sequenceShadows.selected : sequenceShadows.idle;

	return (
		<div
			className={`
				group relative flex flex-col w-full h-full overflow-hidden rounded-xl border
				bg-gradient-to-b from-secondary to-accent
				${tracksCount ? "" : "border-dashed"}
				${highlighted ? "border-bjs-purple/70" : "border-foreground/10 hover:border-bjs-purple/50"}
				${shadow} ${props.dragged ? "scale-[1.02]" : sequenceShadows.hover}
				transition-[border-color,box-shadow,transform] duration-200 ease-out
			`}
		>
			<div
				className={`
					absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-bjs-purple via-bjs-purple/70 to-bjs-orange/80
					${highlighted ? "opacity-100" : "opacity-25 group-hover:opacity-90"}
					transition-opacity duration-200 ease-out
				`}
			/>

			<div className="flex items-center gap-2 px-3 pt-3 min-w-0">
				<div
					className={`
						flex justify-center items-center shrink-0 min-w-5 h-5 px-1 rounded-md text-[11px] font-semibold tabular-nums
						${highlighted ? "bg-bjs-purple/30 text-foreground" : "bg-foreground/10 text-muted-foreground group-hover:text-foreground"}
						transition-colors duration-200 ease-out
					`}
				>
					{props.number}
				</div>

				<div className="font-semibold tracking-tight truncate">{sequence.name}</div>
			</div>

			<div className="flex flex-col gap-1 px-3 pt-2 text-xs text-muted-foreground">
				<div className="flex items-center gap-1.5 whitespace-nowrap">
					<IoTimeOutline className="shrink-0 w-3.5 h-3.5" />
					<span className="truncate tabular-nums">
						{formatCinematicTime(startFrame, props.framesPerSecond)} → {formatCinematicTime(startFrame + framesCount, props.framesPerSecond)}
					</span>
				</div>

				<div className="flex items-center gap-1.5 whitespace-nowrap">
					<IoLayersOutline className="shrink-0 w-3.5 h-3.5" />
					<span className="truncate">{tracksCount ? `${tracksCount} track${tracksCount > 1 ? "s" : ""}` : "Empty, double-click to edit"}</span>
				</div>
			</div>

			<div className="flex-1" />

			<CinematicEditorSequencePreview sequence={sequence} framesCount={framesCount} />
		</div>
	);
}

interface ICinematicEditorSequencePreviewProps {
	sequence: ICinematicSequence;
	framesCount: number;
}

/**
 * Draws where the sequence has keys (diamonds, cuts in orange like in the timelines), sounds (green bars, above) and
 * animation groups (bars, below) so sequences can be recognized at a glance.
 */
function CinematicEditorSequencePreview(props: ICinematicEditorSequencePreviewProps): ReactNode {
	if (!props.framesCount) {
		return <div className="h-4 mb-2.5" />;
	}

	const getPosition = (frame: number): string => `${(frame / props.framesCount) * 100}%`;

	const ranges: ReactNode[] = [];
	const keys = new Map<number, "key" | "cut">();

	const addKey = (frame: number, type: "key" | "cut"): void => {
		frame = Math.round(frame);
		if (keys.get(frame) !== "cut") {
			keys.set(frame, type);
		}
	};

	props.sequence.tracks.forEach((track) => {
		[track.keyFrameAnimations, track.animationGroupWeight, track.soundVolume].forEach((trackKeys) => {
			if (Array.isArray(trackKeys)) {
				trackKeys.forEach((key) => (isCinematicKeyCut(key) ? addKey(key.key1.frame, "cut") : addKey(key.frame, "key")));
			}
		});

		track.keyFrameEvents?.forEach((event) => addKey(event.frame, "key"));

		track.sounds?.forEach((sound) => {
			ranges.push(
				<div
					key={ranges.length}
					className="absolute top-[3px] h-[3px] rounded-full bg-green-500/60"
					style={{ left: getPosition(sound.frame), width: getPosition(sound.endFrame - sound.startFrame) }}
				/>
			);
		});

		track.animationGroups?.forEach((animationGroup) => {
			ranges.push(
				<div
					key={ranges.length}
					className="absolute bottom-[3px] h-[3px] rounded-full bg-foreground/30"
					style={{ left: getPosition(animationGroup.frame), width: getPosition(getCinematicAnimationGroupFramesCount(animationGroup)) }}
				/>
			);
		});
	});

	return (
		<div className="relative h-4 mx-3 mb-2.5">
			<div className="absolute inset-x-0 top-1/2 h-px bg-foreground/10" />

			{ranges}

			{Array.from(keys).map(([frame, type]) => (
				<div
					key={frame}
					style={{ left: getPosition(frame) }}
					className={`
						absolute top-1/2 w-[7px] h-[7px] -translate-x-1/2 -translate-y-1/2 rotate-45
						${type === "cut" ? "border border-orange-500/90 bg-secondary" : "bg-foreground/50 group-hover:bg-foreground/75"}
						transition-colors duration-200 ease-out
					`}
				/>
			))}
		</div>
	);
}
