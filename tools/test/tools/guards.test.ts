import {
    isAbstractMesh, isMesh, isGroundMesh, isInstancedMesh,
    isBone, isTransformNode,
    isCamera, isFreeCamera, isArcRotateCamera,
    isPointLight, isDirectionalLight, isSpotLight, isHemisphericLight,
    isTexture,
} from "../../src/tools/guards";

describe("tools/guards", () => {
    describe("isAbstractMesh", () => {
        test("should return a boolean indicated if the passed object is a mesh or not", () => {
            expect(
                isAbstractMesh({ getClassName: () => "Mesh" })
            ).toBeTruthy();

            expect(
                isAbstractMesh({ getClassName: () => "LineMesh" })
            ).toBeTruthy();

            expect(
                isAbstractMesh({ getClassName: () => "GroundMesh" })
            ).toBeTruthy();

            expect(
                isAbstractMesh({ getClassName: () => "InstancedMesh" })
            ).toBeTruthy();

            expect(
                isAbstractMesh({ getClassName: () => "UnknownClass" })
            ).toBeFalsy();
        });
    });

    describe("isMesh", () => {
        test("should return a boolean indicated if the passed object is a mesh or not", () => {
            expect(
                isMesh({ getClassName: () => "Mesh" })
            ).toBeTruthy();

            expect(
                isMesh({ getClassName: () => "GroundMesh" })
            ).toBeTruthy();

            expect(
                isMesh({ getClassName: () => "AbstractMesh" })
            ).toBeFalsy();

            expect(
                isMesh({ getClassName: () => "InstancedMesh" })
            ).toBeFalsy();
        });
    });

    describe("isGroundMesh", () => {
        test("should return a boolean indicated if the passed object is a ground mesh or not", () => {
            expect(
                isGroundMesh({ getClassName: () => "Mesh" })
            ).toBeFalsy();

            expect(
                isGroundMesh({ getClassName: () => "GroundMesh" })
            ).toBeTruthy();

            expect(
                isGroundMesh({ getClassName: () => "AbstractMesh" })
            ).toBeFalsy();

            expect(
                isGroundMesh({ getClassName: () => "InstancedMesh" })
            ).toBeFalsy();
        });
    });

    describe("isInstancedMesh", () => {
        test("should return a boolean indicated if the passed object is a instanced mesh or not", () => {
            expect(
                isInstancedMesh({ getClassName: () => "InstancedMesh" })
            ).toBeTruthy();
        });
    });

    describe("isBone", () => {
        test("should return a boolean indicated if the passed object is a instanced mesh or not", () => {
            expect(
                isBone({ getClassName: () => "Bone" })
            ).toBeTruthy();
        });
    });

    describe("isTransformNode", () => {
        test("should return a boolean indicated if the passed object is a transform node or not", () => {
            expect(
                isTransformNode({ getClassName: () => "TransformNode" })
            ).toBeTruthy();

            expect(
                isTransformNode({ getClassName: () => "AbstractMesh" })
            ).toBeFalsy();
        });
    });

    describe("isCamera", () => {
        test("should return a boolean indicated if the passed object is a camera or not", () => {
            expect(
                isCamera({ getClassName: () => "Camera" })
            ).toBeTruthy();
            expect(
                isCamera({ getClassName: () => "FreeCamera" })
            ).toBeTruthy();
            expect(
                isCamera({ getClassName: () => "TargetCamera" })
            ).toBeTruthy();
            expect(
                isCamera({ getClassName: () => "EditorCamera" })
            ).toBeTruthy();
            expect(
                isCamera({ getClassName: () => "ArcRotateCamera" })
            ).toBeTruthy();
            expect(
                isCamera({ getClassName: () => "UniversalCamera" })
            ).toBeTruthy();

            expect(
                isCamera({ getClassName: () => "Mesh" })
            ).toBeFalsy();
        });
    });

    describe("isFreeCamera", () => {
        test("should return a boolean indicated if the passed object is a free camera or not", () => {
            expect(
                isFreeCamera({ getClassName: () => "FreeCamera" })
            ).toBeTruthy();
            expect(
                isFreeCamera({ getClassName: () => "UniversalCamera" })
            ).toBeTruthy();

            expect(
                isFreeCamera({ getClassName: () => "TargetCamera" })
            ).toBeFalsy();
        });
    });

    describe("isArcRotateCamera", () => {
        test("should return a boolean indicated if the passed object is a arc rotate camera or not", () => {
            expect(
                isArcRotateCamera({ getClassName: () => "ArcRotateCamera" })
            ).toBeTruthy();
        });
    });

    describe("isPointLight", () => {
        test("should return a boolean indicated if the passed object is a point light or not", () => {
            expect(
                isPointLight({ getClassName: () => "PointLight" })
            ).toBeTruthy();
        });
    });

    describe("isDirectionalLight", () => {
        test("should return a boolean indicated if the passed object is a directional light or not", () => {
            expect(
                isDirectionalLight({ getClassName: () => "DirectionalLight" })
            ).toBeTruthy();
        });
    });

    describe("isSpotLight", () => {
        test("should return a boolean indicated if the passed object is a spot light or not", () => {
            expect(
                isSpotLight({ getClassName: () => "SpotLight" })
            ).toBeTruthy();
        });
    });

    describe("isHemisphericLight", () => {
        test("should return a boolean indicated if the passed object is a hemispheric light or not", () => {
            expect(
                isHemisphericLight({ getClassName: () => "HemisphericLight" })
            ).toBeTruthy();
        });
    });

    describe("isTexture", () => {
        test("should return a boolean indicated if the passed object is a texture or not", () => {
            expect(
                isTexture({ getClassName: () => "BaseTexture" })
            ).toBeFalsy();

            expect(
                isTexture({ getClassName: () => "Texture" })
            ).toBeTruthy();

            expect(
                isTexture({ getClassName: () => "CubeTexture" })
            ).toBeFalsy();

            expect(
                isTexture({ getClassName: () => "HDRCubeTexture" })
            ).toBeFalsy();
        });
    });
});
