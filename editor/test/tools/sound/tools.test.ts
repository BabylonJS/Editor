jest.mock("babylonjs", () => ({
    Sound: {
        Parse: jest.fn().mockImplementation((serializationObject) => ({
            name: serializationObject.name,
        })),
    },
    Observable: class {

    },
}));

import { projectConfiguration } from "../../../src/project/configuration";
import { getSoundById, reloadSound } from "../../../src/tools/sound/tools";

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

    describe("reloadSound", () => {
        it("should do nothing when the sound has no url", () => {
            projectConfiguration.path = "";

            const sound = {} as any;
            const editor = {} as any;

            const reloadedSound = reloadSound(editor, sound);
            expect(reloadedSound).toBeNull();
        });

        it("should dispose the old sound, reload the same one and return the new instance", () => {
            projectConfiguration.path = "path/to/project";

            const editor = {
                layout: {
                    preview: {
                        scene: {

                        },
                    },
                    graph: {
                        refresh: jest.fn(),
                    },
                },
            } as any;

            const sound = {
                _url: "path/to/sound.mp3",
                name: "Test Sound",
                id: "testSoundId",
                uniqueId: "uniqueTestSoundId",
                dispose: jest.fn(),
                serialize: jest.fn().mockImplementation(() => ({
                    name: "Test Sound",
                    url: "path/to/sound.mp3",
                })),
            } as any;

            const reloadedSound = reloadSound(editor, sound);

            expect(reloadSound).not.toBe(sound);

            expect(sound.dispose).toHaveBeenCalled();

            expect(reloadedSound!.name).toBe(sound.name);
            expect(reloadedSound!["_url"]).toBe(sound._url);
            expect(reloadedSound!.id).toBe(sound.id);
            expect(reloadedSound!.uniqueId).toBe(sound.uniqueId);

            expect(editor.layout.graph.refresh).toHaveBeenCalled();
        });
    });
});
