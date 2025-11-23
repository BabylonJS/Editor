import { describe, expect, test } from "vitest";

import {
	ensureNodeMetadata,
	isNodeLocked,
	setNodeLocked,
	isNodeSerializable,
	setNodeSerializable,
	isNodeVisibleInGraph,
	setNodeVisibleInGraph,
} from "../../../src/tools/node/metadata";

describe("tools/node/metadata", () => {
	describe("ensureNodeMetadata", () => {
		test("should create metadata if they don't exist", () => {
			const node = {} as any;
			ensureNodeMetadata(node);
			expect(node.metadata).toBeDefined();
		});

		test("should keep existing metadata", () => {
			const node = { metadata: { isLocked: true } } as any;
			const metadata = ensureNodeMetadata(node);
			expect(metadata).toBe(node.metadata);
		});
	});

	describe("isNodeLocked", () => {
		test("should return false when not defined", () => {
			const node = {} as any;
			expect(isNodeLocked(node)).toBe(false);
		});

		test("should return value", () => {
			const node = { metadata: { isLocked: true } } as any;
			expect(isNodeLocked(node)).toBe(true);
		});
	});

	describe("setNodeLocked", () => {
		test("should set isLocked to true", () => {
			const node = {} as any;
			setNodeLocked(node, true);
			expect(isNodeLocked(node)).toBe(true);
			expect(node.metadata.isLocked).toBe(true);
		});

		test("should set isLocked to false", () => {
			const node = { metadata: { isLocked: true } } as any;
			setNodeLocked(node, false);
			expect(isNodeLocked(node)).toBe(false);
			expect(node.metadata.isLocked).toBe(false);
		});
	});

	describe("isNodeSerializable", () => {
		test("should return true when not defined", () => {
			const node = {} as any;
			expect(isNodeSerializable(node)).toBe(true);
		});

		test("should return true when doNotSerialize is false", () => {
			const node = { metadata: { doNotSerialize: false } } as any;
			expect(isNodeSerializable(node)).toBe(true);
		});

		test("should return false when doNotSerialize is true", () => {
			const node = { metadata: { doNotSerialize: true } } as any;
			expect(isNodeSerializable(node)).toBe(false);
		});
	});

	describe("setNodeSerializable", () => {
		test("should set doNotSerialize to false", () => {
			const node = {} as any;
			setNodeSerializable(node, true);
			expect(isNodeSerializable(node)).toBe(true);
			expect(node.metadata.doNotSerialize).toBe(false);
		});

		test("should set doNotSerialize to true", () => {
			const node = { metadata: { doNotSerialize: false } } as any;
			setNodeSerializable(node, false);
			expect(isNodeSerializable(node)).toBe(false);
			expect(node.metadata.doNotSerialize).toBe(true);
		});
	});

	describe("isNodeVisibleInGraph", () => {
		test("should return true when not defined", () => {
			const node = {} as any;
			expect(isNodeVisibleInGraph(node)).toBe(true);
		});

		test("should return true when notVisibleInGraph is false", () => {
			const node = { metadata: { notVisibleInGraph: false } } as any;
			expect(isNodeVisibleInGraph(node)).toBe(true);
		});

		test("should return false when notVisibleInGraph is true", () => {
			const node = { metadata: { notVisibleInGraph: true } } as any;
			expect(isNodeVisibleInGraph(node)).toBe(false);
		});
	});

	describe("setNodeVisibleInGraph", () => {
		test("should set notVisibleInGraph to false", () => {
			const node = {} as any;
			setNodeVisibleInGraph(node, true);
			expect(isNodeVisibleInGraph(node)).toBe(true);
			expect(node.metadata.notVisibleInGraph).toBe(false);
		});

		test("should set notVisibleInGraph to true", () => {
			const node = {} as any;
			setNodeVisibleInGraph(node, false);
			expect(isNodeVisibleInGraph(node)).toBe(false);
			expect(node.metadata.notVisibleInGraph).toBe(true);
		});
	});
});
