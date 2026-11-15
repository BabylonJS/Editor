import { Camera, SceneNode } from "@babylonjs/lite";

import { setNodeEnabled } from "../../tools/node";

export type SetEnabledEventType = {
	value: boolean;
	node: SceneNode | Camera | null;
};

export function handleSetEnabledEvent(config: SetEnabledEventType) {
	if (config.node) {
		setNodeEnabled(config.node, config.value);
	}
}
