import { describe, expect, test, vi } from "vitest";

vi.mock("fs-extra", () => ({
	ensureDir: vi.fn(),
}));

import { getProjectAssetsRootUrl, projectConfiguration } from "../../src/project/configuration";

describe("project/configuration", () => {
	describe("getProjectAssetsRootUrl", () => {
		test("should return null when no project loaded", async () => {
			projectConfiguration.path = null;
			expect(getProjectAssetsRootUrl()).toBeNull();
		});

		test("should return rootUrl ending with a slash", () => {
			projectConfiguration.path = "C:/path/to/project.babylonjseditor";
			expect(getProjectAssetsRootUrl()).toBe("C:/path/to/");
		});
	});
});
