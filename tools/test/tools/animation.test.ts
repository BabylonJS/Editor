jest.mock("@babylonjs/core/Animations/animation", () => ({
    Animation: {
        ANIMATIONTYPE_FLOAT: 0,
        ANIMATIONTYPE_VECTOR2: 1,
        ANIMATIONTYPE_VECTOR3: 2,
        ANIMATIONTYPE_QUATERNION: 3,
        ANIMATIONTYPE_COLOR3: 4,
        ANIMATIONTYPE_COLOR4: 5,
        ANIMATIONTYPE_SIZE: 6,
        ANIMATIONTYPE_MATRIX: 7,
    },
}));

jest.mock("@babylonjs/core/Maths/math.vector", () => ({
    Vector2: class {
        getClassName() { return "Vector2"; }
    },
    Vector3: class {
        getClassName() { return "Vector3"; }
    },
    Quaternion: class {
        getClassName() { return "Quaternion"; }
    },
    Matrix: class {
        getClassName() { return "Matrix"; }
    },
}));

jest.mock("@babylonjs/core/Maths/math.color", () => ({
    Color3: class {
        getClassName() { return "Color3"; }
    },
    Color4: class {
        getClassName() { return "Color4"; }
    },
}));

jest.mock("@babylonjs/core/Maths/math.size", () => ({
    Size: class {
        getClassName() { return "Size"; }
    },
}));

import { Size } from "@babylonjs/core/Maths/math.size";
import { Animation } from "@babylonjs/core/Animations/animation";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector2, Vector3, Quaternion, Matrix } from "@babylonjs/core/Maths/math.vector";

import { getAnimationTypeForObject } from "../../src/tools/animation";

describe("tools/animation", () => {
    describe("getAnimationTypeForObject", () => {
        test("should return the type of animation according to the type of the given property", () => {
            expect(getAnimationTypeForObject(1)).toBe(Animation.ANIMATIONTYPE_FLOAT);

            expect(getAnimationTypeForObject(new Vector2())).toBe(Animation.ANIMATIONTYPE_VECTOR2);
            expect(getAnimationTypeForObject(new Vector3())).toBe(Animation.ANIMATIONTYPE_VECTOR3);

            expect(getAnimationTypeForObject(new Quaternion())).toBe(Animation.ANIMATIONTYPE_QUATERNION);

            expect(getAnimationTypeForObject(new Color3())).toBe(Animation.ANIMATIONTYPE_COLOR3);
            expect(getAnimationTypeForObject(new Color4())).toBe(Animation.ANIMATIONTYPE_COLOR4);

            expect(getAnimationTypeForObject(new Size(8, 8))).toBe(Animation.ANIMATIONTYPE_SIZE);

            expect(getAnimationTypeForObject(new Matrix())).toBe(Animation.ANIMATIONTYPE_MATRIX);
        });

        test("should return null for unsupported types", () => {
            expect(getAnimationTypeForObject("some string")).toBe(null);
            expect(getAnimationTypeForObject({})).toBe(null);
            expect(getAnimationTypeForObject(Vector2)).toBe(null);

            expect(getAnimationTypeForObject(null)).toBe(null);
            expect(getAnimationTypeForObject(undefined)).toBe(null);
            expect(getAnimationTypeForObject(NaN)).toBe(null);
        });
    });
});
