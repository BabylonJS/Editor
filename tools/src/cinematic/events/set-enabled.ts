import { Node } from "@babylonjs/core/node";

export type SetEnabledEventType = {
    value: boolean;
    node: Node;
};

export function handleSetEnabledEvent(config: SetEnabledEventType) {
	config.node?.setEnabled(config.value);
}
