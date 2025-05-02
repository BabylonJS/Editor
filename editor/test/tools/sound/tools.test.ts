import { getSoundById } from "../../../src/tools/sound/tools";

describe("tools/sound/tools", () => {
    describe("getSoundById", () => {
        it("should return null if no soundtracks are present", () => {
            const scene = { soundTracks: [] };
            const result = getSoundById("testId", scene as any);
            expect(result).toBeNull();
        });

        it("should return null if no sound with the given id is found", () => {
            const scene = {
                soundTracks: [{
                    soundCollection: [
                        { id: "otherId" }
                    ],
                }],
            };
            const result = getSoundById("testId", scene as any);
            expect(result).toBeNull();
        });

        it("should return the sound if found", () => {
            const expectedSound = { id: "testId" };
            const scene = {
                soundTracks: [
                    { soundCollection: [expectedSound] },
                ],
            };
            const result = getSoundById("testId", scene as any);
            expect(result).toEqual(expectedSound);
        });
    });
});
