export const tsClassDecoratorsExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";

import {
    nodeFromScene,
    nodeFromDescendants,
    particleSystemFromScene,
    soundFromScene,
    SoundNode,
} from "babylonjs-editor-tools";

export default class MyScriptComponent {
    @nodeFromScene("ground")
    private _ground: Mesh;

    @nodeFromDescendants("box")
    private _box: Mesh;

    @particleSystemFromScene("particles")
    private _particleSystem: ParticleSystem;

    @soundFromScene("running")
    private _mySound: SoundNode;

    public constructor(public object: TransformNode) {
        // 🚫 decorators were not processed, the sound is NOT available.
        this._mySound.play();
    }

    /**
     * Called on the script is being started.
     */
    public onStart(): void {
        // ✅ decorators were processed, the sound is available.
        this._mySound.play();
    }
}
`;
