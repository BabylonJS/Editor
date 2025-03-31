jest.mock("@babylonjs/gui/2D/advancedDynamicTexture", () => ({

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

import { Node } from "@babylonjs/core/node";
import { Scene } from "@babylonjs/core/scene";
import { Sound } from "@babylonjs/core/Audio/sound";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";

import { soundFromScene } from "../../src/decorators/sound";
import { applyDecorators } from "../../src/decorators/apply";
import { visibleAsBoolean, visibleAsNumber, visibleAsVector2, visibleAsVector3 } from "../../src/decorators/inspector";
import { particleSystemFromScene } from "../../src/decorators/particle-systems";
import { animationGroupFromScene, nodeFromDescendants, nodeFromScene } from "../../src/decorators/scene";

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
    }

    const soundObject = {};
    const nodeObject = {};
    const nodeDescendantsObject = {};
    const animationGroupObject = {};
    const particleSystemObject = {
        name: "test",
    };

    const scene = {
        getSoundByName: jest.fn().mockImplementation(() => soundObject),
        getNodeByName: jest.fn().mockImplementation(() => nodeObject),
        getAnimationGroupByName: jest.fn().mockImplementation(() => animationGroupObject),
        particleSystems: [particleSystemObject],
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
                    }
                }
            ],
        }
    } as unknown as Node;

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
        });
    });
});
