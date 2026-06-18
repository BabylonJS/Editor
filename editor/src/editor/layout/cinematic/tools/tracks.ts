import { ICinematicTrack } from "babylonjs-editor-tools";

export function isTrackInFilter(track: ICinematicTrack, filter: string): boolean {
	if (!filter) {
		return true;
	}

	const lowerFilter = filter.toLowerCase();

	let matchesEvent = false;
	if (track.keyFrameEvents && "events".includes(lowerFilter)) {
		matchesEvent = true;
	}

	let matchesNode = false;
	if (track.node?.name) {
		matchesNode = track.node.name.toLowerCase().includes(lowerFilter);
	}

	let matchesProperty = false;
	if (track.propertyPath) {
		matchesProperty = track.propertyPath.toLowerCase().includes(lowerFilter);
	}

	let matchesAnimationGroup = false;
	if (track.animationGroup?.name) {
		matchesAnimationGroup = track.animationGroup.name.toLowerCase().includes(lowerFilter);
	}

	let matchesSound = false;
	if (track.sound?._url) {
		matchesSound = track.sound._url.toLowerCase().includes(lowerFilter);
	}

	return matchesNode || matchesProperty || matchesAnimationGroup || matchesSound || matchesEvent;
}
