import { NullEngine, Scene, Mesh, CreateGroundVertexData, Texture, StandardMaterial } from "babylonjs";
import { HeightMapUtils, IHeightMapConfig } from "../../../src/tools/mesh/height-map";

describe("tools/mesh/height-map", () => {
	let engine: NullEngine;
	let scene: Scene;
	let mesh: Mesh;

	beforeEach(() => {
		engine = new NullEngine();
		scene = new Scene(engine);
		mesh = new Mesh("testMesh", scene);
		
		// Create ground geometry properly
		const groundData = CreateGroundVertexData({
			width: 10,
			height: 10,
			subdivisions: 4
		});
		if (groundData.positions) {
			mesh.setVerticesData("position", groundData.positions, false);
		}
		if (groundData.indices) {
			mesh.setIndices(groundData.indices);
		}
		if (groundData.normals) {
			mesh.setVerticesData("normal", groundData.normals, false);
		}
		if (groundData.uvs) {
			mesh.setVerticesData("uv", groundData.uvs, false);
		}
	});

	afterEach(() => {
		scene.dispose();
		engine.dispose();
	});

	describe("getDefaultValues", () => {
		test("should return correct default values", () => {
			const defaults = HeightMapUtils.getDefaultValues();
			
			expect(defaults.width).toBe(1024);
			expect(defaults.height).toBe(1024);
			expect(defaults.subdivisions).toBe(32);
			expect(defaults.minHeight).toBe(0);
			expect(defaults.maxHeight).toBe(10);
		});
	});

	describe("initializeGroundMetadata", () => {
		test("should initialize empty metadata with defaults", () => {
			const metadata = {};
			const result = HeightMapUtils.initializeGroundMetadata(metadata);
			
			expect(result.width).toBe(1024);
			expect(result.height).toBe(1024);
			expect(result.subdivisions).toBe(32);
			expect(result.minHeight).toBe(0);
			expect(result.maxHeight).toBe(10);
			expect(result.useHeightMap).toBe(false);
			expect(result.heightMapTexture).toBe(null);
		});

		test("should preserve existing values", () => {
			const metadata = {
				width: 500,
				height: 300,
				subdivisions: 16,
				minHeight: -5,
				maxHeight: 15,
				useHeightMap: true,
				heightMapTexture: "test"
			};
			const result = HeightMapUtils.initializeGroundMetadata(metadata);
			
			expect(result.width).toBe(500);
			expect(result.height).toBe(300);
			expect(result.subdivisions).toBe(16);
			expect(result.minHeight).toBe(-5);
			expect(result.maxHeight).toBe(15);
			expect(result.useHeightMap).toBe(true);
			expect(result.heightMapTexture).toBe("test");
		});

		test("should clamp subdivisions to safe range", () => {
			const metadata = { subdivisions: 2000 };
			const result = HeightMapUtils.initializeGroundMetadata(metadata);
			
			expect(result.subdivisions).toBe(1000); // Max allowed
		});

		test("should handle negative subdivisions", () => {
			const metadata = { subdivisions: -5 };
			const result = HeightMapUtils.initializeGroundMetadata(metadata);
			
			expect(result.subdivisions).toBe(1); // Min allowed
		});
	});

	describe("validateHeightMapMetadata", () => {
		test("should validate correct metadata", () => {
			const metadata = {
				width: 100,
				height: 100,
				subdivisions: 32,
				minHeight: 0,
				maxHeight: 10,
				useHeightMap: false
			};
			
			const result = HeightMapUtils.validateHeightMapMetadata(metadata);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		test("should detect invalid width", () => {
			const metadata = { width: -100 };
			
			const result = HeightMapUtils.validateHeightMapMetadata(metadata);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("width");
		});

		test("should detect invalid height", () => {
			const metadata = { height: 0 };
			
			const result = HeightMapUtils.validateHeightMapMetadata(metadata);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("height");
		});

		test("should detect invalid subdivisions", () => {
			const metadata = { subdivisions: 2000 };
			
			const result = HeightMapUtils.validateHeightMapMetadata(metadata);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("subdivisions");
		});

		test("should detect invalid height range", () => {
			const metadata = { minHeight: 10, maxHeight: 5 };
			
			const result = HeightMapUtils.validateHeightMapMetadata(metadata);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("height range");
		});

		test("should provide sanitized metadata", () => {
			const metadata = { width: -100, height: 0, subdivisions: 2000 };
			
			const result = HeightMapUtils.validateHeightMapMetadata(metadata);
			expect(result.valid).toBe(false);
			expect(result.sanitized).toBeDefined();
			expect(result.sanitized.width).toBe(1024); // Default
			expect(result.sanitized.height).toBe(1024); // Default
			expect(result.sanitized.subdivisions).toBe(1000); // Clamped
		});
	});

	describe("handleHeightMapTextureChanged", () => {
		test("should handle texture assignment", () => {
			const texture = new Texture("test", scene);
			const metadata = { useHeightMap: false };
			
			const result = HeightMapUtils.handleHeightMapTextureChanged(texture, metadata);
			
			expect(result.metadata.heightMapTexture).toBe(texture);
			expect(result.metadata.useHeightMap).toBe(false); // Should start disabled
			expect(result.shouldApplyHeightMap).toBe(false); // Should not auto-apply
		});

		test("should handle texture removal", () => {
			const metadata = { 
				useHeightMap: true, 
				heightMapTexture: "oldTexture" 
			};
			
			const result = HeightMapUtils.handleHeightMapTextureChanged(null, metadata);
			
			expect(result.metadata.heightMapTexture).toBe(null);
			expect(result.metadata.useHeightMap).toBe(false);
			expect(result.shouldApplyHeightMap).toBe(false);
		});
	});



	describe("regenerateGroundGeometry", () => {
		test("should regenerate geometry successfully", () => {
			const config: IHeightMapConfig = {
				width: 20,
				height: 20,
				subdivisions: 8,
				minHeight: 0,
				maxHeight: 5
			};
			
			const result = HeightMapUtils.regenerateGroundGeometry(mesh, config);
			expect(result).toBe(true);
			
			// Check that geometry was updated
			const positions = mesh.getVerticesData("position");
			expect(positions).toBeDefined();
			expect(positions!.length).toBeGreaterThan(0);
		});

		test("should handle invalid config", () => {
			const invalidConfig = {
				width: -10,
				height: 20,
				subdivisions: 8,
				minHeight: 0,
				maxHeight: 5
			} as IHeightMapConfig;
			
			const result = HeightMapUtils.regenerateGroundGeometry(mesh, invalidConfig);
			expect(result).toBe(false);
		});
	});

	describe("forceMaterialCompilation", () => {
		test("should compile material successfully", () => {
			const material = new StandardMaterial("test", scene);
			mesh.material = material;
			
			const result = HeightMapUtils.forceMaterialCompilation(mesh);
			expect(result).toBe(true);
		});

		test("should handle mesh without material", () => {
			mesh.material = null;
			
			const result = HeightMapUtils.forceMaterialCompilation(mesh);
			expect(result).toBe(false);
		});
	});

	describe("preserveMaterialDuringOperation", () => {
		test("should preserve material during operation", () => {
			const material = new StandardMaterial("test", scene);
			mesh.material = material;
			
			const result = HeightMapUtils.preserveMaterialDuringOperation(mesh, () => {
				// Simulate operation that might affect material
				return "operation result";
			});
			
			expect(result).toBe("operation result");
			expect(mesh.material).toBe(material);
		});

		test("should restore material if lost during operation", () => {
			const material = new StandardMaterial("test", scene);
			mesh.material = material;
			
			const result = HeightMapUtils.preserveMaterialDuringOperation(mesh, () => {
				// Simulate operation that removes material
				mesh.material = null;
				return "operation result";
			});
			
			expect(result).toBe("operation result");
			expect(mesh.material).toBe(material);
		});
	});

	describe("validateMeshMaterial", () => {
		test("should validate mesh with material", () => {
			const material = new StandardMaterial("test", scene);
			mesh.material = material;
			
			const result = HeightMapUtils.validateMeshMaterial(mesh);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		test("should detect mesh without material", () => {
			mesh.material = null;
			
			const result = HeightMapUtils.validateMeshMaterial(mesh);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("No material assigned");
		});

		test("should detect invalid material", () => {
			mesh.material = {} as any;
			
			const result = HeightMapUtils.validateMeshMaterial(mesh);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid material");
		});
	});

	describe("safelyApplyMaterial", () => {
		test("should apply valid material successfully", () => {
			const material = new StandardMaterial("test", scene);
			
			const result = HeightMapUtils.safelyApplyMaterial(mesh, material);
			expect(result).toBe(true);
			expect(mesh.material).toBe(material);
		});

		test("should handle null material", () => {
			const result = HeightMapUtils.safelyApplyMaterial(mesh, null);
			expect(result).toBe(false);
		});

		test("should handle material without getClassName", () => {
			const invalidMaterial = {} as any;
			
			const result = HeightMapUtils.safelyApplyMaterial(mesh, invalidMaterial);
			expect(result).toBe(false);
		});
	});

	describe("toggleHeightMap", () => {
		test("should enable height map", async () => {
			const metadata = { useHeightMap: false };
			
			await HeightMapUtils.toggleHeightMap(mesh, metadata, true);
			
			expect(metadata.useHeightMap).toBe(true);
		});

		test("should disable height map", async () => {
			const metadata = { useHeightMap: true };
			
			await HeightMapUtils.toggleHeightMap(mesh, metadata, false);
			
			expect(metadata.useHeightMap).toBe(false);
		});
	});

	describe("createMetadataProxy", () => {
		test("should create proxy that intercepts property changes", () => {
			const metadata = { width: 100, height: 100 };
			let onChangeCalled = false;
			
			const proxy = HeightMapUtils.createMetadataProxy<typeof metadata>(metadata, () => {
				onChangeCalled = true;
			});
			
			proxy.width = 200;
			expect(metadata.width).toBe(200);
			expect(onChangeCalled).toBe(true);
		});

		test("should handle numeric property validation", () => {
			const metadata = { minHeight: 0, maxHeight: 10 };
			const proxy = HeightMapUtils.createMetadataProxy<typeof metadata>(metadata, () => {});
			
			proxy.minHeight = "5" as any;
			expect(metadata.minHeight).toBe(5);
			
			proxy.maxHeight = "invalid" as any;
			expect(metadata.maxHeight).toBe(10); // Should not change
		});

		test("should handle boolean property validation", () => {
			const metadata = { useHeightMap: false };
			const proxy = HeightMapUtils.createMetadataProxy<typeof metadata>(metadata, () => {});
			
			proxy.useHeightMap = "true" as any;
			expect(metadata.useHeightMap).toBe(true);
		});
	});



	describe("fallbackToFlatGround", () => {
		test("should create flat ground successfully", async () => {
			const metadata = { useHeightMap: true };
			
			await HeightMapUtils.fallbackToFlatGround(mesh, metadata);
			
			expect(metadata.useHeightMap).toBe(false);
		});
	});

	describe("handleHeightMapTextureChange", () => {
		test("should handle texture change with validation", () => {
			const texture = new Texture("test", scene);
			jest.spyOn(texture, 'isReady').mockReturnValue(true);
			jest.spyOn(texture, 'getSize').mockReturnValue({ width: 256, height: 256 });
			
			const metadata = { subdivisions: 64 };
			
			const result = HeightMapUtils.handleHeightMapTextureChange(texture, metadata);
			
			expect(result.metadata.heightMapTexture).toBe(texture);
			expect(result.metadata.useHeightMap).toBe(false); // Should start disabled
			expect(result.shouldApplyHeightMap).toBe(false); // Should not auto-apply
			expect(result.validationErrors).toBeUndefined();
		});

		test("should handle texture removal", () => {
			const metadata = { 
				heightMapTexture: "oldTexture", 
				useHeightMap: true 
			};
			
			const result = HeightMapUtils.handleHeightMapTextureChange(null, metadata);
			
			expect(result.metadata.heightMapTexture).toBe(null);
			expect(result.metadata.useHeightMap).toBe(false);
			expect(result.shouldApplyHeightMap).toBe(false);
		});

		test("should validate subdivisions", () => {
			const texture = new Texture("test", scene);
			jest.spyOn(texture, 'isReady').mockReturnValue(true);
			jest.spyOn(texture, 'getSize').mockReturnValue({ width: 256, height: 256 });
			
			const metadata = { subdivisions: 2000 }; // Too high
			
			const result = HeightMapUtils.handleHeightMapTextureChange(texture, metadata);
			
			expect(result.metadata.subdivisions).toBe(1000); // Clamped
			expect(result.metadata.useHeightMap).toBe(false); // Should start disabled
			expect(result.shouldApplyHeightMap).toBe(false); // Should not auto-apply
		});
	});

	describe("toggleHeightMapWithStateManagement", () => {
		test("should toggle height map on successfully", async () => {
			const metadata = { useHeightMap: false };
			
			const result = await HeightMapUtils.toggleHeightMapWithStateManagement(
				mesh, metadata, true
			);
			
			expect(result.success).toBe(true);
			expect(metadata.useHeightMap).toBe(true);
		});

		test("should toggle height map off successfully", async () => {
			const metadata = { useHeightMap: true };
			
			const result = await HeightMapUtils.toggleHeightMapWithStateManagement(
				mesh, metadata, false
			);
			
			expect(result.success).toBe(true);
			expect(metadata.useHeightMap).toBe(false);
		});
	});

	describe("forceRefreshHeightMap / clearHeightMapState / revertToFlatGround", () => {
		test("forceRefreshHeightMap should fail when disabled or no texture", async () => {
			const metadata = { useHeightMap: false, heightMapTexture: null };
			const result = await HeightMapUtils.forceRefreshHeightMap(
				mesh,
				metadata
			);
			expect(result.success).toBe(false);
		});

		test("forceRefreshHeightMap should succeed with valid texture and enabled flag", async () => {
			const texture = new Texture("test", scene);
			jest.spyOn(texture, 'isReady').mockReturnValue(true);
			jest.spyOn(texture, 'getSize').mockReturnValue({ width: 256, height: 256 });
			const metadata = {
				useHeightMap: true,
				heightMapTexture: texture,
				width: 10,
				height: 10,
				subdivisions: 4,
				minHeight: 0,
				maxHeight: 1,
			};

			const result = await HeightMapUtils.forceRefreshHeightMap(
				mesh,
				metadata
			);
			expect(result.success).toBe(true);
		});

		test("clearHeightMapState should regenerate geometry without throwing", () => {
			const metadata = { width: 10, height: 10, subdivisions: 4, minHeight: 0, maxHeight: 1 };
			expect(() => {
				HeightMapUtils.clearHeightMapState(mesh, metadata);
			}).not.toThrow();
			const positions = mesh.getVerticesData("position");
			expect(positions).toBeDefined();
		});

		test("revertToFlatGround should disable height map", async () => {
			const metadata = { useHeightMap: true } as any;
			const result = await HeightMapUtils.revertToFlatGround(mesh, metadata);
			expect(result.success).toBe(true);
			expect(metadata.useHeightMap).toBe(false);
		});
	});

	describe("createValidatedConfig", () => {
		test("should create valid config from metadata", () => {
			const metadata = {
				width: 100,
				height: 100,
				subdivisions: 32,
				minHeight: 0,
				maxHeight: 10
			};
			
			const config = HeightMapUtils.createValidatedConfig(metadata);
			
			expect(config.width).toBe(100);
			expect(config.height).toBe(100);
			expect(config.subdivisions).toBe(32);
			expect(config.minHeight).toBe(0);
			expect(config.maxHeight).toBe(10);
		});

		test("should use defaults for missing values", () => {
			const metadata = {};
			
			const config = HeightMapUtils.createValidatedConfig(metadata);
			
			expect(config.width).toBe(1024);
			expect(config.height).toBe(1024);
			expect(config.subdivisions).toBe(32);
			expect(config.minHeight).toBe(0);
			expect(config.maxHeight).toBe(10);
		});
	});

	describe("prepareGroundForInspector", () => {
		test("should prepare ground metadata for inspector", () => {
			const metadata = { width: 100 };
			
			const result = HeightMapUtils.prepareGroundForInspector(mesh, metadata);
			
			expect(result.width).toBe(100);
			expect(result.height).toBe(1024); // Default
			expect(result.subdivisions).toBe(32); // Default
			expect(result.useHeightMap).toBe(false);
		});

		test("should initialize empty metadata", () => {
			const result = HeightMapUtils.prepareGroundForInspector(mesh, {});
			
			expect(result.width).toBe(1024);
			expect(result.height).toBe(1024);
			expect(result.subdivisions).toBe(32);
			expect(result.minHeight).toBe(0);
			expect(result.maxHeight).toBe(10);
		});
	});

	describe("handleGroundPropertyChange", () => {
		test("should handle width property change", () => {
			const metadata = { width: 100, height: 100, subdivisions: 32 };
			
			const result = HeightMapUtils.handleGroundPropertyChange(
				mesh, metadata, "width", 200
			);
			
			expect(result).toBe(true);
			expect(metadata.width).toBe(200);
		});

		test("should handle height property change", () => {
			const metadata = { width: 100, height: 100, subdivisions: 32 };
			
			const result = HeightMapUtils.handleGroundPropertyChange(
				mesh, metadata, "height", 300
			);
			
			expect(result).toBe(true);
			expect(metadata.height).toBe(300);
		});

		test("should handle subdivisions property change", () => {
			const metadata = { width: 100, height: 100, subdivisions: 32 };
			
			const result = HeightMapUtils.handleGroundPropertyChange(
				mesh, metadata, "subdivisions", 64
			);
			
			expect(result).toBe(true);
			expect(metadata.subdivisions).toBe(64);
		});

		test("should handle invalid property", () => {
			const metadata = { width: 100 };
			
			const result = HeightMapUtils.handleGroundPropertyChange(
				mesh, metadata, "invalidProperty", "value"
			);
			
			expect(result).toBe(false);
		});
	});



	describe("validateConfig", () => {
		test("should return valid for correct configuration", () => {
			const config: IHeightMapConfig = {
				minHeight: 0,
				maxHeight: 10,
				subdivisions: 32,
				width: 100,
				height: 100
			};

			const result = HeightMapUtils.validateConfig(config);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		test("should return invalid for subdivisions too low", () => {
			const config: IHeightMapConfig = {
				minHeight: 0,
				maxHeight: 10,
				subdivisions: 0,
				width: 100,
				height: 100
			};

			const result = HeightMapUtils.validateConfig(config);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Subdivisions must be between 1 and");
		});

		test("should return invalid for subdivisions too high", () => {
			const config: IHeightMapConfig = {
				minHeight: 0,
				maxHeight: 10,
				subdivisions: 2000,
				width: 100,
				height: 100
			};

			const result = HeightMapUtils.validateConfig(config);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Subdivisions must be between 1 and");
		});

		test("should return invalid when minHeight >= maxHeight", () => {
			const config: IHeightMapConfig = {
				minHeight: 10,
				maxHeight: 5,
				subdivisions: 32,
				width: 100,
				height: 100
			};

			const result = HeightMapUtils.validateConfig(config);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Min height must be less than max height");
		});

		test("should return invalid when minHeight equals maxHeight", () => {
			const config: IHeightMapConfig = {
				minHeight: 10,
				maxHeight: 10,
				subdivisions: 32,
				width: 100,
				height: 100
			};

			const result = HeightMapUtils.validateConfig(config);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Min height must be less than max height");
		});

		test("should return invalid for NaN values", () => {
			const config: IHeightMapConfig = {
				minHeight: NaN,
				maxHeight: 10,
				subdivisions: 32,
				width: 100,
				height: 100
			};

			const result = HeightMapUtils.validateConfig(config);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid value for minHeight");
		});

		test("should return invalid for infinite values", () => {
			const config: IHeightMapConfig = {
				minHeight: 0,
				maxHeight: Infinity,
				subdivisions: 32,
				width: 100,
				height: 100
			};

			const result = HeightMapUtils.validateConfig(config);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid value for maxHeight");
		});
	});

	describe("validateTexture", () => {
		test("should return invalid for non-Texture objects", () => {
			const fakeTexture = {} as any;
			
			const result = HeightMapUtils.validateTexture(fakeTexture);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Unsupported texture type");
		});

		test("should return invalid for texture that is not ready", () => {
			// Create a mock texture that is not ready
			const texture = new Texture("test", scene);
			jest.spyOn(texture, 'isReady').mockReturnValue(false);

			const result = HeightMapUtils.validateTexture(texture);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Texture is not ready");
		});

		test("should return invalid for texture with invalid size", () => {
			const texture = new Texture("test", scene);
			jest.spyOn(texture, 'isReady').mockReturnValue(true);
			jest.spyOn(texture, 'getSize').mockReturnValue(null as any);

			const result = HeightMapUtils.validateTexture(texture);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid texture size");
		});

		test("should return valid for proper texture", () => {
			const texture = new Texture("test", scene);
			jest.spyOn(texture, 'isReady').mockReturnValue(true);
			jest.spyOn(texture, 'getSize').mockReturnValue({ width: 256, height: 256 });

			const result = HeightMapUtils.validateTexture(texture);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		test("should warn for large texture dimensions", () => {
			const texture = new Texture("test", scene);
			jest.spyOn(texture, 'isReady').mockReturnValue(true);
			jest.spyOn(texture, 'getSize').mockReturnValue({ width: 8192, height: 8192 });
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			const result = HeightMapUtils.validateTexture(texture);
			expect(result.valid).toBe(true);
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("large and may cause performance issues"));
			
			consoleSpy.mockRestore();
		});

		test("should warn for small texture dimensions", () => {
			const texture = new Texture("test", scene);
			jest.spyOn(texture, 'isReady').mockReturnValue(true);
			jest.spyOn(texture, 'getSize').mockReturnValue({ width: 8, height: 8 });
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			const result = HeightMapUtils.validateTexture(texture);
			expect(result.valid).toBe(true);
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("very small and may not provide good height map detail"));
			
			consoleSpy.mockRestore();
		});
	});

	describe("calculateHeightMappedPositions", () => {
		let mockCanvas: any;
		let mockImageData: any;

		beforeEach(() => {
			// Create mock canvas object
			mockCanvas = {
				width: 4,
				height: 4
			};

			// Create mock image data (4x4 grayscale)
			const data = new Uint8ClampedArray(64); // 4*4*4 RGBA values
			for (let i = 0; i < 16; i++) {
				const baseIndex = i * 4;
				const gray = i * 16; // Gradient from 0 to 240
				data[baseIndex] = gray;     // R
				data[baseIndex + 1] = gray; // G
				data[baseIndex + 2] = gray; // B
				data[baseIndex + 3] = 255;  // A
			}
			mockImageData = { data, width: 4, height: 4 };
		});

		test("should calculate height mapped positions correctly", () => {
			// Simple 2x2 ground (4 vertices)
			const positions = new Float32Array([
				-1, 0, -1,  // Bottom-left
				1, 0, -1,   // Bottom-right
				-1, 0, 1,   // Top-left
				1, 0, 1     // Top-right
			]);

			const config: IHeightMapConfig = {
				minHeight: 0,
				maxHeight: 10,
				subdivisions: 1,
				width: 2,
				height: 2
			};

			const result = HeightMapUtils.calculateHeightMappedPositions(
				positions,
				mockImageData,
				mockCanvas,
				config
			);

			expect(result.length).toBe(positions.length);
			
			// Check that X and Z coordinates are preserved
			for (let i = 0; i < result.length; i += 3) {
				expect(result[i]).toBe(positions[i]); // X
				expect(result[i + 2]).toBe(positions[i + 2]); // Z
			}

			// Check that Y coordinates have been modified (should not all be 0)
			const yValues: number[] = [];
			for (let i = 1; i < result.length; i += 3) {
				yValues.push(result[i]);
			}
			expect(yValues.some(y => y !== 0)).toBe(true);
		});

		test("should handle invalid image data length", () => {
			const positions = new Float32Array([0, 0, 0]);
			const config: IHeightMapConfig = {
				minHeight: 0,
				maxHeight: 10,
				subdivisions: 1,
				width: 1,
				height: 1
			};

			// Create invalid image data (not multiple of 4)
			const invalidData = new Uint8ClampedArray(15); // Not divisible by 4
			const invalidImageData = { data: invalidData, width: 4, height: 4 };

			expect(() => {
				HeightMapUtils.calculateHeightMappedPositions(
					positions,
					invalidImageData as any,
					mockCanvas,
					config
				);
			}).toThrow("Image data length is not a multiple of 4");
		});

		test("should handle positions array not divisible by 3", () => {
			const positions = new Float32Array([0, 0]); // Not divisible by 3
			const config: IHeightMapConfig = {
				minHeight: 0,
				maxHeight: 10,
				subdivisions: 1,
				width: 1,
				height: 1
			};

			expect(() => {
				HeightMapUtils.calculateHeightMappedPositions(
					positions,
					mockImageData,
					mockCanvas,
					config
				);
			}).toThrow("Invalid positions array length");
		});

		test("should handle mesh with no area", () => {
			// All vertices have the same X coordinate (no width)
			const positions = new Float32Array([
				0, 0, -1,
				0, 0, 1
			]);
			const config: IHeightMapConfig = {
				minHeight: 0,
				maxHeight: 10,
				subdivisions: 1,
				width: 1,
				height: 1
			};

			expect(() => {
				HeightMapUtils.calculateHeightMappedPositions(
					positions,
					mockImageData,
					mockCanvas,
					config
				);
			}).toThrow("Invalid mesh bounds - mesh has no area");
		});

		test("should clamp UV coordinates to valid range", () => {
			// Vertices that would generate UV coordinates outside [0,1]
			const positions = new Float32Array([
				-5, 0, -5,  // Would generate negative UV
				5, 0, 5     // Would generate UV > 1
			]);

			const config: IHeightMapConfig = {
				minHeight: 0,
				maxHeight: 10,
				subdivisions: 1,
				width: 1,
				height: 1
			};

			// Should not throw an error due to UV clamping
			const result = HeightMapUtils.calculateHeightMappedPositions(
				positions,
				mockImageData,
				mockCanvas,
				config
			);

			expect(result.length).toBe(positions.length);
		});

		test("should handle NaN height values gracefully", () => {
			const positions = new Float32Array([
				-1, 0, -1,  // Valid position with different X and Z
				1, 0, 1     // Another valid position
			]);
			const config: IHeightMapConfig = {
				minHeight: 0,
				maxHeight: 10,
				subdivisions: 1,
				width: 1,
				height: 1
			};

			// Create image data with correct size (4x4 = 64 bytes)
			const data = new Uint8ClampedArray(64);
			data[0] = 256; // This would cause issues when normalized
			data[1] = 0;
			data[2] = 0;
			data[3] = 255;
			const nanImageData = { data, width: 4, height: 4 };

			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			const result = HeightMapUtils.calculateHeightMappedPositions(
				positions,
				nanImageData as any,
				mockCanvas,
				config
			);

			expect(result.length).toBe(positions.length);
			// Should use original positions as fallback for invalid height values
			expect(result[0]).toBe(positions[0]); // X unchanged
			expect(result[2]).toBe(positions[2]); // Z unchanged
			expect(result[3]).toBe(positions[3]); // X unchanged
			expect(result[5]).toBe(positions[5]); // Z unchanged

			consoleSpy.mockRestore();
		});
	});

	describe("applyHeightMapToMesh", () => {
		test("should throw error for invalid configuration", async () => {
			const texture = new Texture("test", scene);
			const config: IHeightMapConfig = {
				minHeight: 10,
				maxHeight: 5, // Invalid: min >= max
				subdivisions: 32,
				width: 100,
				height: 100
			};

			await expect(HeightMapUtils.applyHeightMapToMesh(mesh, texture, config))
				.rejects.toThrow("Min height must be less than max height");
		});

		test("should throw error for invalid texture", async () => {
			const texture = new Texture("test", scene);
			jest.spyOn(texture, 'isReady').mockReturnValue(false);

			const config: IHeightMapConfig = {
				minHeight: 0,
				maxHeight: 10,
				subdivisions: 32,
				width: 100,
				height: 100
			};

			await expect(HeightMapUtils.applyHeightMapToMesh(mesh, texture, config))
				.rejects.toThrow("Texture is not ready");
		});

		test("should throw error for mesh without geometry", async () => {
			const meshWithoutGeometry = new Mesh("testMesh", scene);
			const texture = new Texture("test", scene);
			jest.spyOn(texture, 'isReady').mockReturnValue(true);
			jest.spyOn(texture, 'getSize').mockReturnValue({ width: 256, height: 256 });

			const config: IHeightMapConfig = {
				minHeight: 0,
				maxHeight: 10,
				subdivisions: 32,
				width: 100,
				height: 100
			};

			await expect(HeightMapUtils.applyHeightMapToMesh(meshWithoutGeometry, texture, config))
				.rejects.toThrow("No geometry found on mesh");
		});
	});

	describe("getTexturePixelData", () => {
		test("should return error for unsupported texture type", async () => {
			const fakeTexture = {} as any;
			const textureSize = { width: 256, height: 256 };

			const result = await HeightMapUtils.getTexturePixelData(fakeTexture, textureSize);
			
			expect(result.success).toBe(false);
			expect(result.error).toContain("Unsupported texture type");
		});
	});
});
