export const tsClassDecoratorsExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Sound } from "@babylonjs/core/Audio/sound";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";

import {
    nodeFromScene,
    nodeFromDescendants,
    particleSystemFromScene,
    soundFromScene,
} from "babylonjs-editor-tools";

export default class MyScriptComponent {
    @nodeFromScene("ground")
    private _ground: Mesh;

    @nodeFromDescendants("box")
    private _box: Mesh;

    @particleSystemFromScene("particles")
    private _particleSystem: ParticleSystem;

    @soundFromScene("assets/sound.mp3")
    private _mySound: Sound;

    ...
}
`;
