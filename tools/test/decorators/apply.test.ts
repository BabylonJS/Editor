jest.mock("@babylonjs/gui/2D/advancedDynamicTexture", () => ({
    AdvancedDynamicTexture: class {
        static CreateFullscreenUI = jest.fn().mockImplementation((name) => ({
            name,
            parseSerializedObject: jest.fn(),
        }));
    }
}));

jest.mock("@babylonjs/core/Maths/math.vector", () => ({
    Vector2: class {
        x: number;
        y: number;

        constructor(x?: number, y?: number) {
            this.x = x ?? 0;
            this.y = y ?? 0;
        }

        static Zero() {
            return new this();
        }

        static FromArray(array: number[]) {
            return new this(array[0]!, array[1]!);
        }
    },

    Vector3: class {
        x: number;
        y: number;
        z: number;

        constructor(x?: number, y?: number, z?: number) {
            this.x = x ?? 0;
            this.y = y ?? 0;
            this.z = z ?? 0;
        }

        static Zero() {
            return new this();
        }

        static FromArray(array: number[]) {
            return new this(array[0]!, array[1]!, array[2]!);
        }
    },
}));

jest.mock("@babylonjs/core/Maths/math.color", () => ({
    Color3: class {
        r: number;
        g: number;
        b: number;

        constructor(r?: number, g?: number, b?: number) {
            this.r = r ?? 0;
            this.g = g ?? 0;
            this.b = b ?? 0;
        }

        static FromArray(array: number[]) {
            return new this(array[0]!, array[1]!, array[2]!);
        }
    },
    Color4: class {
        r: number;
        g: number;
        b: number;
        a: number;

        constructor(r?: number, g?: number, b?: number, a?: number) {
            this.r = r ?? 0;
            this.g = g ?? 0;
            this.b = b ?? 0;
            this.a = a ?? 1;
        }

        static FromArray(array: number[]) {
            return new this(array[0]!, array[1]!, array[2]!, array[3]!);
        }
    },
}));

jest.mock("@babylonjs/core/Materials/Textures/texture", () => ({
    Texture: class {
        name: string;

        constructor(name: string) {
            this.name = name;
        }

        static Parse(data: any) {
            return new this(data.name);
        }
    },
}));

import { Node } from "@babylonjs/core/node";
import { Scene } from "@babylonjs/core/scene";
import { Sound } from "@babylonjs/core/Audio/sound";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";

import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";

import { guiFromAsset } from "../../src/decorators/gui";
import { soundFromScene } from "../../src/decorators/sound";
import { applyDecorators } from "../../src/decorators/apply";
import { particleSystemFromScene } from "../../src/decorators/particle-systems";
import { animationGroupFromScene, nodeFromDescendants, nodeFromScene } from "../../src/decorators/scene";
import { visibleAsBoolean, visibleAsColor3, visibleAsColor4, visibleAsEntity, visibleAsKeyMap, visibleAsNumber, visibleAsTexture, visibleAsVector2, visibleAsVector3 } from "../../src/decorators/inspector";

describe("decorators/apply", () => {
    class EmptyTarget { }

    class Target {
        @soundFromScene("test")
        public soundProperty: Sound = null!;

        @nodeFromScene("test")
        public nodeProperty: any = null!;

        @nodeFromDescendants("test")
        public nodeDescendantsProperty: any = null!;

        @animationGroupFromScene("test")
        public animationGroupProperty: any = null!;

        @particleSystemFromScene("test")
        public particleSystemProperty: any = null!;

        @visibleAsBoolean("test")
        public booleanProperty: boolean = false;
        @visibleAsNumber("test")
        public numberProperty: number = 0;
        @visibleAsVector2("test")
        public vector2Property: Vector2 = Vector2.Zero();
        @visibleAsVector3("test")
        public vector3Property: Vector3 = Vector3.Zero();

        @visibleAsColor3("test")
        public color3Property: Color3 = new Color3();
        @visibleAsColor4("test")
        public color4Property: Color4 = new Color4();

        @visibleAsEntity("node", "test")
        public nodeEntityProperty: Node = null!;
        @visibleAsEntity("sound", "test")
        public soundEntityProperty: Sound = null!;
        @visibleAsEntity("animationGroup", "test")
        public animationGroupEntityProperty: any = null!;
        @visibleAsEntity("particleSystem", "test")
        public particleSystemEntityProperty: any = null!;

        @visibleAsTexture("test")
        public textureProperty: Texture = null!;

        @guiFromAsset("path/file.gui")
        public gui: AdvancedDynamicTexture = null!;

        @visibleAsKeyMap("test")
        public keymapProperty: number = 0;
    }

    const soundObject = {};
    const nodeObject = {};
    const nodeDescendantsObject = {};
    const animationGroupObject = {};
    const particleSystemObject = {
        name: "test",
        id: "particleSystemId",
    };

    const nodeEntityObject = {};
    const soundEntityObject = {
        id: "soundId",
    };

    const scene = {
        getSoundByName: jest.fn().mockImplementation(() => soundObject),
        getNodeByName: jest.fn().mockImplementation(() => nodeObject),
        getAnimationGroupByName: jest.fn().mockImplementation(() => animationGroupObject),
        particleSystems: [particleSystemObject],
        getNodeById: jest.fn().mockImplementation(() => nodeEntityObject),
        soundTracks: [],
        mainSoundTrack: {
            soundCollection: [soundEntityObject],
        },
    } as unknown as Scene;

    const object = {
        getDescendants: jest.fn().mockImplementation(() => [nodeDescendantsObject]),
        metadata: {
            scripts: [
                {
                    key: "test",
                    enabled: true,
                    values: {
                        "booleanProperty": {
                            value: true,
                        },
                        "numberProperty": {
                            value: 1,
                        },
                        "vector2Property": {
                            value: [10, 20],
                        },
                        "vector3Property": {
                            value: [10, 20, 30],
                        },
                        "color3Property": {
                            value: [0.1, 0.2, 0.3],
                        },
                        "color4Property": {
                            value: [0.1, 0.2, 0.3, 0.4],
                        },
                        "nodeEntityProperty": {
                            value: "nodeId",
                        },
                        "soundEntityProperty": {
                            value: "soundId",
                        },
                        "animationGroupEntityProperty": {
                            value: "animationGroupName",
                        },
                        "particleSystemEntityProperty": {
                            value: "particleSystemId",
                        },
                        "textureProperty": {
                            value: {
                                name: "testTexture",
                            },
                        },
                        "keymapProperty": {
                            value: 42,
                        },
                    }
                }
            ],
        }
    } as unknown as Node;

    const mockedGuiResult = {
        name: "testGui",
    };
    globalThis.fetch = jest.fn().mockImplementation(() => Promise.resolve({
        json: () => Promise.resolve(mockedGuiResult),
    }));

    describe("applyDecorators", () => {
        test("should do nothing when no decorated properties in target", () => {
            const target = new EmptyTarget();
            applyDecorators(scene, object, {}, target, "");

            expect(scene.getSoundByName).not.toHaveBeenCalled();
        });

        test("should retrieve all necessary decorators", () => {
            const target = new Target();

            expect(target.booleanProperty).toBe(false);
            expect(target.numberProperty).toBe(0);

            applyDecorators(scene, object, object.metadata.scripts[0], target, "");

            expect(scene.getSoundByName).toHaveBeenCalledWith("test");
            expect(target.soundProperty).toBe(soundObject);

            expect(scene.getNodeByName).toHaveBeenCalledWith("test");
            expect(target.nodeProperty).toBe(nodeObject);

            expect(object.getDescendants).toHaveBeenCalled();
            expect(target.nodeDescendantsProperty).toBe(nodeDescendantsObject);

            expect(scene.getAnimationGroupByName).toHaveBeenCalledWith("test");
            expect(target.animationGroupProperty).toBe(animationGroupObject);

            expect(target.particleSystemProperty).toBe(particleSystemObject);

            expect(target.booleanProperty).toBe(true);
            expect(target.numberProperty).toBe(1);

            expect(target.vector2Property.x).toBe(10);
            expect(target.vector2Property.y).toBe(20);

            expect(target.vector3Property.x).toBe(10);
            expect(target.vector3Property.y).toBe(20);
            expect(target.vector3Property.z).toBe(30);

            expect(target.color3Property.r).toBe(0.1);
            expect(target.color3Property.g).toBe(0.2);
            expect(target.color3Property.b).toBe(0.3);

            expect(target.color4Property.r).toBe(0.1);
            expect(target.color4Property.g).toBe(0.2);
            expect(target.color4Property.b).toBe(0.3);
            expect(target.color4Property.a).toBe(0.4);

            expect(target.nodeEntityProperty).toBe(nodeEntityObject);
            expect(target.soundEntityProperty).toBe(soundEntityObject);
            expect(target.animationGroupEntityProperty).toBe(animationGroupObject);
            expect(target.particleSystemEntityProperty).toBe(particleSystemObject);

            expect(target.textureProperty?.name).toBe("testTexture");

            expect(target.keymapProperty).toBe(42);

            setTimeout(() => {
                expect(target.gui.name).toBe(mockedGuiResult.name);
            }, 0);
        });
    });
});
