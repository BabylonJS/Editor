import { getBase64SceneScreenshot, getBufferSceneScreenshot } from "../../../src/tools/scene/screenshot";

describe("tools/scene/screenshot", () => {
    describe("getBase64SceneScreenshot", () => {
        it("should return a base64 string", async () => {
            const mockScene = {
                onAfterRenderObservable: {
                    addOnce: jest.fn((callback: () => void) => {
                        callback();
                    }),
                },
                getEngine: () => ({
                    getRenderingCanvas: () => ({
                        toDataURL: () => "data:image/png;base64,base64string",
                    }),
                }),
            };

            const result = await getBase64SceneScreenshot(mockScene as any);
            expect(mockScene.onAfterRenderObservable.addOnce).toHaveBeenCalledTimes(1);
            expect(result).toBe("data:image/png;base64,base64string");
        });
    });

    describe("getBufferSceneScreenshot", () => {
        it("should return a buffer from base64 string", async () => {
            const mockScene = {
                onAfterRenderObservable: {
                    addOnce: jest.fn((callback: () => void) => {
                        callback();
                    }),
                },
                getEngine: () => ({
                    getRenderingCanvas: () => ({
                        toDataURL: () => "data:image/png;base64,base64string",
                    }),
                }),
            };

            const result = await getBufferSceneScreenshot(mockScene as any);
            expect(mockScene.onAfterRenderObservable.addOnce).toHaveBeenCalledTimes(1);
            expect(result).toEqual(Buffer.from("base64string", "base64"));
        });

        it("should return null if base64 is undefined", async () => {
            const mockScene = {
                onAfterRenderObservable: {
                    addOnce: jest.fn((callback: () => void) => {
                        callback();
                    }),
                },
                getEngine: () => ({
                    getRenderingCanvas: () => ({
                        toDataURL: () => undefined,
                    }),
                }),
            };

            const result = await getBufferSceneScreenshot(mockScene as any);
            expect(mockScene.onAfterRenderObservable.addOnce).toHaveBeenCalledTimes(1);
            expect(result).toBeNull();
        });
    });
});
