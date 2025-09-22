jest.mock("fs-extra", () => ({
	ensureDir: jest.fn(),
}));

import { ensureDir } from "fs-extra";

import { ensureTemporaryDirectoryExists } from "../../src/tools/project";

describe("tools/project", () => {
	describe("ensureTemporaryDirectoryExists", () => {
		test("should create the temporary directory", async () => {
			ensureTemporaryDirectoryExists("/path/to/project.babylonjseditor");
			expect(ensureDir).toHaveBeenCalledTimes(1);
			expect(ensureDir).toHaveBeenCalledWith("/path/to/.bjseditor");
		});
	});
});
