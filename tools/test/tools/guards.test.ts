import { isMesh, isGroundMesh, isTexture } from "../../src/tools/guards";

describe("tools/guards", () => {
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
