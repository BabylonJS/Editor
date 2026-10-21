import { describe, expect, test } from "vitest";

import { addFileLoaderOverride, getLoadableUrl, loadFile, loadJsonFile } from "../../src/tools/request";

describe("tools/request", () => {
	test("should load the files from the overrides first", async () => {
		const remove = addFileLoaderOverride((url, responseType) => {
			if (url === "/scene/test.json" && responseType === "text") {
				return Promise.resolve(JSON.stringify({ value: 42 }));
			}

			return null;
		});

		await expect(loadJsonFile<any>("/scene/test.json")).resolves.toEqual({ value: 42 });
		await expect(loadFile("/scene/test.json", "text")).resolves.toBe('{"value":42}');

		remove();
	});

	test("should return the original url when no override provides the file", async () => {
		const remove = addFileLoaderOverride(() => null);
		await expect(getLoadableUrl("/scene/texture.png")).resolves.toBe("/scene/texture.png");
		remove();
	});
});
