import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

import { nearestPowerOfTwo } from "../../src/project/export/ktx2";

// Paths ending in ktx / ktx.exe answer from this set, everything else from the real file system.
const existingKtxFiles = vi.hoisted(() => new Set<string>());

vi.mock("fs", async (importOriginal) => {
	const fs = await importOriginal<typeof import("fs")>();
	const existsSync = (path: string) => (/ktx(\.exe)?$/i.test(String(path)) ? existingKtxFiles.has(String(path)) : fs.existsSync(path));
	return { ...fs, existsSync, default: { ...fs, existsSync } };
});

describe("project/export/ktx2", () => {
	describe("findKtxCliCommand", () => {
		const platform = process.platform;
		const path = process.env.PATH;

		beforeEach(() => {
			vi.resetModules();
			existingKtxFiles.clear();

			Object.defineProperty(process, "platform", { value: "win32" });
			process.env.PATH = "C:/Tools";
		});

		afterEach(() => {
			Object.defineProperty(process, "platform", { value: platform });
			process.env.PATH = path;
		});

		// A fresh import per test, so the command remembered by the module does not leak between tests.
		const load = () => import("../../src/project/export/ktx2");

		test("uses plain ktx when the PATH has it", async () => {
			existingKtxFiles.add("C:/Tools/ktx.exe");
			const ktx2 = await load();

			expect(ktx2.findKtxCliCommand()).toBe("ktx");
			expect(ktx2.getKtx2CompressionErrorMessage("a.ktx2")).toBe(`Failed to compress image "a.ktx2"`);
		});

		test("falls back to the quoted path of a standard install", async () => {
			existingKtxFiles.add("C:/Program Files/KTX-Software/bin/ktx.exe");
			const ktx2 = await load();

			expect(ktx2.getKtxCliCommand()).toBe(`"C:/Program Files/KTX-Software/bin/ktx.exe"`);
		});

		test("says the CLI is missing, and still lets the shell try plain ktx", async () => {
			const ktx2 = await load();

			expect(ktx2.findKtxCliCommand()).toBeNull();
			expect(ktx2.getKtxCliCommand()).toBe("ktx");
			expect(ktx2.getKtx2CompressionErrorMessage("a.ktx2")).toContain("KTX-Software CLI not found");
		});

		test("finds a CLI installed while the editor is open, without a restart", async () => {
			const ktx2 = await load();
			expect(ktx2.findKtxCliCommand()).toBeNull();

			existingKtxFiles.add("C:/Program Files/KTX-Software/bin/ktx.exe");

			expect(ktx2.getKtxCliCommand()).toBe(`"C:/Program Files/KTX-Software/bin/ktx.exe"`);
		});
	});

	describe("nearestPowerOfTwo", () => {
		test("keeps a power of two as it is", () => {
			for (const size of [4, 256, 1024, 4096]) {
				expect(nearestPowerOfTwo(size)).toBe(size);
			}
		});

		test("rounds the sizes the tavern scene failed on to the nearest power of two", () => {
			expect(nearestPowerOfTwo(9216)).toBe(8192);
			expect(nearestPowerOfTwo(1618)).toBe(2048);
			expect(nearestPowerOfTwo(519)).toBe(512);
			expect(nearestPowerOfTwo(349)).toBe(256);
			expect(nearestPowerOfTwo(300)).toBe(256);
			expect(nearestPowerOfTwo(134)).toBe(128);
		});

		test("never goes under one 4x4 block", () => {
			expect(nearestPowerOfTwo(1)).toBe(4);
			expect(nearestPowerOfTwo(3)).toBe(4);
		});

		test("always yields a multiple of four", () => {
			for (let size = 1; size <= 5000; size += 7) {
				expect(nearestPowerOfTwo(size) % 4).toBe(0);
			}
		});
	});
});
