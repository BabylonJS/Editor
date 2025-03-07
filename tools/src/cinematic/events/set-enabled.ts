import { Scene } from "@babylonjs/core/scene";

export type SetEnabledEventType = {
    value: boolean;
    node: string;
};

export function handleSetEnabledEvent(scene: Scene, config: SetEnabledEventType) {
    const node = scene.getNodeById(config.node);
    node?.setEnabled(config.value);
}
