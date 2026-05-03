import { describe, expect, test } from "vitest";

import { getSoundById } from "../../src/tools/sound";

describe("tools/vector", () => {
	const soundData = {
		id: "soundId",
	};

	const scene = {
		soundTracks: [],
		mainSoundTrack: {
			soundCollection: [soundData],
		},
	} as any;

	describe("getSoundById", () => {
		test("should return the node identified by the given id", () => {
			expect(getSoundById("soundId", scene)).toBe(soundData);
		});

		test("should return null if the sound is not found", () => {
			expect(getSoundById("unknown", scene)).toBeNull();
		});
	});
});
