import { Mesh, Texture, CubeTexture, ColorGradingTexture, CreateGroundVertexData, Vector3 } from "babylonjs";

/**
 * Configuration interface for height map operations.
 */
export interface IHeightMapConfig {
	/** Minimum height value for the height map */
	minHeight: number;
	/** Maximum height value for the height map */
	maxHeight: number;
	/** Number of subdivisions for the ground mesh */
	subdivisions: number;
	/** Width of the ground mesh */
	width: number;
	/** Height of the ground mesh */
	height: number;
}

/**
 * Result interface for texture pixel data operations.
 */
export interface ITexturePixelResult {
	/** Whether the operation was successful */
	success: boolean;
	/** Error message if the operation failed */
	error?: string;
	/** Image data if the operation was successful */
	imageData?: ImageData;
	/** Canvas element used for processing */
	canvas?: HTMLCanvasElement;
}

/**
 * Height map utility class for processing and applying height maps to ground meshes.
 * This class handles all the complex logic for reading texture data and modifying mesh geometry.
 */
export class HeightMapUtils {
	// Constants for validation and safety
	private static readonly _maxSubdivisions = 1000;
	private static readonly _maxTextureDimension = 4096;
	private static readonly _minTextureDimension = 16;
	private static readonly _maxHeightRange = 1000;

	// Default values for ground metadata
	private static readonly _defaultWidth = 1024;
	private static readonly _defaultHeight = 1024;
	private static readonly _defaultSubdivisions = 32;
	private static readonly _defaultMinHeight = 0;
	private static readonly _defaultMaxHeight = 10;

	/**
	 * Gets the default values for ground metadata.
	 * @returns Object containing default values
	 */
	public static getDefaultValues() {
		return {
			width: HeightMapUtils._defaultWidth,
			height: HeightMapUtils._defaultHeight,
			subdivisions: HeightMapUtils._defaultSubdivisions,
			minHeight: HeightMapUtils._defaultMinHeight,
			maxHeight: HeightMapUtils._defaultMaxHeight,
		};
	}

	/**
	 * Initializes and validates ground metadata with sensible defaults.
	 * @param metadata Existing metadata object
	 * @returns Validated and initialized metadata
	 */
	public static initializeGroundMetadata(metadata: any): any {
		const initialized = { ...metadata };

		// Initialize default values if they don't exist
		if (initialized.width === undefined) {
			initialized.width = HeightMapUtils._defaultWidth;
		}
		if (initialized.height === undefined) {
			initialized.height = HeightMapUtils._defaultHeight;
		}
		if (initialized.subdivisions === undefined) {
			initialized.subdivisions = HeightMapUtils._defaultSubdivisions;
		}
		if (initialized.minHeight === undefined) {
			initialized.minHeight = HeightMapUtils._defaultMinHeight;
		}
		if (initialized.maxHeight === undefined) {
			initialized.maxHeight = HeightMapUtils._defaultMaxHeight;
		}
		if (initialized.useHeightMap === undefined) {
			initialized.useHeightMap = false;
		}
		if (initialized.heightMapTexture === undefined) {
			initialized.heightMapTexture = null;
		}

		// Validate and clamp subdivisions to safe range
		initialized.subdivisions = Math.max(1, Math.min(HeightMapUtils._maxSubdivisions, initialized.subdivisions));

		return initialized;
	}

	/**
	 * Validates and sanitizes height map metadata values.
	 * @param metadata Metadata object to validate
	 * @returns Validation result with sanitized metadata
	 */
	public static validateHeightMapMetadata(metadata: any): { valid: boolean; error?: string; sanitized?: any } {
		const sanitized = { ...metadata };

		// Validate numeric properties
		const numericFields = ["width", "height", "subdivisions", "minHeight", "maxHeight"];
		for (const field of numericFields) {
			const value = Number(sanitized[field]);
			if (isNaN(value) || !isFinite(value)) {
				return {
					valid: false,
					error: `Invalid value for ${field}: ${sanitized[field]}`,
				};
			}
			sanitized[field] = value;
		}

		// Validate subdivisions range
		if (sanitized.subdivisions < 1 || sanitized.subdivisions > HeightMapUtils._maxSubdivisions) {
			sanitized.subdivisions = Math.max(1, Math.min(HeightMapUtils._maxSubdivisions, sanitized.subdivisions));
		}

		// Validate height range
		if (sanitized.minHeight >= sanitized.maxHeight) {
			return {
				valid: false,
				error: "Min height must be less than max height",
			};
		}

		// Validate reasonable ranges
		const heightRange = sanitized.maxHeight - sanitized.minHeight;
		if (heightRange > HeightMapUtils._maxHeightRange) {
			console.warn(`Height range (${heightRange}) is very large and may cause visual issues`);
		}

		return { valid: true, sanitized };
	}

	/**
	 * Handles height map texture changes and initializes related metadata.
	 * @param texture New height map texture
	 * @param metadata Existing metadata object
	 * @returns Updated metadata with proper initialization
	 */
	public static handleHeightMapTextureChanged(texture: Texture | CubeTexture | ColorGradingTexture | null, metadata: any): { metadata: any; shouldApplyHeightMap: boolean } {
		const updated = { ...metadata };

		if (texture && texture instanceof Texture) {
			// Initialize all metadata values with valid numbers
			updated.minHeight = Number(metadata.minHeight) || HeightMapUtils._defaultMinHeight;
			updated.maxHeight = Number(metadata.maxHeight) || HeightMapUtils._defaultMaxHeight;
			updated.useHeightMap = false; // Start with height map disabled - user must enable manually
			updated.width = Number(metadata.width) || HeightMapUtils._defaultWidth;
			updated.height = Number(metadata.height) || HeightMapUtils._defaultHeight;
			updated.subdivisions = Number(metadata.subdivisions) || HeightMapUtils._defaultSubdivisions;
			updated.heightMapTexture = texture;

			return { metadata: updated, shouldApplyHeightMap: false }; // Don't auto-apply initially, but user can enable later
		}
		// Clear height map
		updated.heightMapTexture = null;
		updated.useHeightMap = false;

		return { metadata: updated, shouldApplyHeightMap: false };
	}

	/**
	 * Validates height map configuration parameters.
	 * @param config Height map configuration
	 * @returns Validation result with error message if invalid
	 */
	public static validateConfig(config: IHeightMapConfig): { valid: boolean; error?: string } {
		// Validate subdivisions
		if (config.subdivisions < 1 || config.subdivisions > HeightMapUtils._maxSubdivisions) {
			return {
				valid: false,
				error: `Subdivisions must be between 1 and ${HeightMapUtils._maxSubdivisions}`,
			};
		}

		// Validate height range
		if (config.minHeight >= config.maxHeight) {
			return {
				valid: false,
				error: "Min height must be less than max height",
			};
		}

		// Validate numeric values
		const numericFields = ["minHeight", "maxHeight", "width", "height", "subdivisions"];
		for (const field of numericFields) {
			const value = config[field as keyof IHeightMapConfig];
			if (isNaN(value) || !isFinite(value)) {
				return {
					valid: false,
					error: `Invalid value for ${field}: ${value}`,
				};
			}
		}

		// Validate reasonable ranges
		const heightRange = config.maxHeight - config.minHeight;
		if (heightRange > HeightMapUtils._maxHeightRange) {
			console.warn(`Height range (${heightRange}) is very large and may cause visual issues`);
		}

		if (Math.abs(config.minHeight) > HeightMapUtils._maxHeightRange || Math.abs(config.maxHeight) > HeightMapUtils._maxHeightRange) {
			console.warn(`Height values (${config.minHeight}, ${config.maxHeight}) are very large and may cause visual issues`);
		}

		return { valid: true };
	}

	/**
	 * Validates texture for height map usage.
	 * @param texture Texture to validate
	 * @returns Validation result with error message if invalid
	 */
	public static validateTexture(texture: Texture | CubeTexture | ColorGradingTexture): { valid: boolean; error?: string } {
		if (!(texture instanceof Texture)) {
			return {
				valid: false,
				error: `Unsupported texture type for height map: ${texture.constructor.name}`,
			};
		}

		if (!texture.isReady()) {
			return {
				valid: false,
				error: "Texture is not ready",
			};
		}

		const textureSize = texture.getSize();
		if (!textureSize || !textureSize.width || !textureSize.height) {
			return {
				valid: false,
				error: "Invalid texture size",
			};
		}

		// Check texture dimensions
		if (textureSize.width > HeightMapUtils._maxTextureDimension || textureSize.height > HeightMapUtils._maxTextureDimension) {
			console.warn(`Texture dimensions (${textureSize.width}x${textureSize.height}) are large and may cause performance issues`);
		}

		if (textureSize.width < HeightMapUtils._minTextureDimension || textureSize.height < HeightMapUtils._minTextureDimension) {
			console.warn(`Texture dimensions (${textureSize.width}x${textureSize.height}) are very small and may not provide good height map detail`);
		}

		return { valid: true };
	}

	/**
	 * Applies a height map to a ground mesh.
	 * @param mesh The ground mesh to modify
	 * @param texture The height map texture
	 * @param config Height map configuration
	 * @returns Promise that resolves when the height map is applied
	 */
	public static async applyHeightMapToMesh(mesh: Mesh, texture: Texture | CubeTexture | ColorGradingTexture, config: IHeightMapConfig): Promise<void> {
		// Validate configuration
		const configValidation = HeightMapUtils.validateConfig(config);
		if (!configValidation.valid) {
			throw new Error(configValidation.error);
		}

		// Validate texture
		const textureValidation = HeightMapUtils.validateTexture(texture);
		if (!textureValidation.valid) {
			throw new Error(textureValidation.error);
		}

		// Ensure geometry exists
		const geometry = mesh.geometry;
		if (!geometry) {
			throw new Error("No geometry found on mesh");
		}

		// Get texture size
		const textureSize = texture.getSize();

		// Get current vertex positions
		const positions = geometry.getVerticesData("position") as Float32Array;
		if (!positions) {
			throw new Error("No position data found in geometry");
		}

		// Validate positions array
		if (positions.length % 3 !== 0) {
			throw new Error("Position data length is not a multiple of 3 (x,y,z per vertex expected)");
		}

		// Check if geometry needs regeneration
		const actualVertexCount = positions.length / 3;
		const actualSubdivisions = Math.round(Math.sqrt(actualVertexCount) - 1);

		if (actualSubdivisions !== config.subdivisions) {
			const originalMaterial = mesh.material;

			// Regenerate geometry
			geometry.setAllVerticesData(
				CreateGroundVertexData({
					width: config.width,
					height: config.height,
					subdivisions: config.subdivisions,
				}),
				false
			);

			// Preserve material
			if (originalMaterial) {
				mesh.material = originalMaterial;
			}
		}

		// Get updated positions after potential regeneration
		const updatedPositions = geometry.getVerticesData("position") as Float32Array;
		if (!updatedPositions) {
			throw new Error("No position data found after geometry regeneration");
		}

		// Get texture pixel data and apply height map
		const pixelResult = await HeightMapUtils.getTexturePixelData(texture, textureSize);
		if (!pixelResult.success) {
			throw new Error(pixelResult.error);
		}

		const newPositions = HeightMapUtils.calculateHeightMappedPositions(updatedPositions, pixelResult.imageData!, pixelResult.canvas!, config);

		// Use the safety method to ensure material is preserved during vertex data changes
		HeightMapUtils.preserveMaterialDuringOperation(mesh, () => {
			geometry.setVerticesData("position", newPositions, false);
		});

		// Force the mesh to update its bounding box and other properties
		mesh.computeWorldMatrix(true);
		
		// Force the geometry to update its bounding info
		geometry.boundingBias = geometry.boundingBias || new Vector3(0, 0, 0);
		geometry.boundingBias = geometry.boundingBias.scale(1.001); // Force bounding box recalculation
		
		// Force material compilation to ensure it works with new geometry
		if (mesh.material) {
			setTimeout(() => {
				HeightMapUtils.forceMaterialCompilation(mesh);
			}, 0);
		}
	}

	/**
	 * Gets pixel data from a texture using multiple fallback methods.
	 * @param texture Texture to read pixel data from
	 * @param textureSize Size of the texture
	 * @returns Promise that resolves with pixel data result
	 */
	public static async getTexturePixelData(texture: Texture | CubeTexture | ColorGradingTexture, textureSize: { width: number; height: number }): Promise<ITexturePixelResult> {
		if (!(texture instanceof Texture)) {
			return {
				success: false,
				error: `Unsupported texture type: ${texture.constructor.name}`,
			};
		}

		// Try readPixels method first (modern approach)
		const readPixelsMethod = (texture as any).readPixels;
		if (readPixelsMethod && typeof readPixelsMethod === "function") {
			try {
				const pixels = await readPixelsMethod.call(texture);
				if (pixels) {
					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d");
					if (!ctx) {
						return { success: false, error: "Failed to create canvas context" };
					}

					canvas.width = textureSize.width;
					canvas.height = textureSize.height;

					const uint8Array = new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength);
					const imageData = new ImageData(uint8Array, canvas.width, canvas.height);
					ctx.putImageData(imageData, 0, 0);

					return {
						success: true,
						imageData,
						canvas,
					};
				}
			} catch (error) {
				console.warn("Failed to read pixels from texture:", error);
			}
		}

		// Fallback to image loading method
		return HeightMapUtils._getTexturePixelDataFallback(texture, textureSize);
	}

	/**
	 * Fallback method to get texture pixel data using image loading.
	 * @param texture Texture to read pixel data from
	 * @param textureSize Size of the texture
	 * @returns Promise that resolves with pixel data result
	 */
	private static async _getTexturePixelDataFallback(texture: Texture, textureSize: { width: number; height: number }): Promise<ITexturePixelResult> {
		return new Promise((resolve) => {
			const textureSource = new Image();
			textureSource.crossOrigin = "anonymous";

			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				resolve({ success: false, error: "Failed to create canvas context" });
				return;
			}

			canvas.width = textureSize.width;
			canvas.height = textureSize.height;

			textureSource.onerror = () => {
				resolve({
					success: false,
					error: `Failed to load texture image from URL: ${texture.url}`,
				});
			};

			textureSource.onload = () => {
				if (textureSource.naturalWidth === 0 || textureSource.naturalHeight === 0) {
					resolve({
						success: false,
						error: "Texture image has zero dimensions after load",
					});
					return;
				}

				try {
					ctx.drawImage(textureSource, 0, 0);
					const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

					resolve({
						success: true,
						imageData,
						canvas,
					});
				} catch (error) {
					resolve({
						success: false,
						error: `Failed to process texture image: ${error}`,
					});
				}
			};

			// Construct texture URL
			let textureUrl = texture.url || "";
			if (texture.name && !texture.name.startsWith("file://") && !texture.name.startsWith("http")) {
				textureUrl = texture.name;
			}

			textureSource.src = textureUrl;

			// Handle already loaded images
			if (textureSource.complete) {
				textureSource.onload?.(new Event("load"));
			}
		});
	}

	/**
	 * Calculates new vertex positions based on height map data.
	 * @param positions Original vertex positions
	 * @param imageData Height map image data
	 * @param canvas Canvas containing the height map
	 * @param config Height map configuration
	 * @returns New positions array with height map applied
	 */
	public static calculateHeightMappedPositions(positions: Float32Array, imageData: ImageData, canvas: HTMLCanvasElement, config: IHeightMapConfig): Float32Array {
		const data = imageData.data;

		// Validate image data
		if (!data || data.length === 0) {
			throw new Error("Image data is empty or invalid");
		}

		if (data.length % 4 !== 0) {
			throw new Error("Image data length is not a multiple of 4 (RGBA format expected)");
		}

		const expectedDataLength = canvas.width * canvas.height * 4;
		if (data.length !== expectedDataLength) {
			throw new Error(`Image data length mismatch: expected ${expectedDataLength}, got ${data.length}`);
		}

		// Validate positions array
		if (positions.length % 3 !== 0) {
			throw new Error(`Invalid positions array length: ${positions.length} (not divisible by 3)`);
		}

		// Create new positions array
		const newPositions = new Float32Array(positions.length);

		// Calculate mesh bounds
		let minX = Infinity,
			maxX = -Infinity;
		let minZ = Infinity,
			maxZ = -Infinity;

		for (let i = 0; i < positions.length; i += 3) {
			minX = Math.min(minX, positions[i]);
			maxX = Math.max(maxX, positions[i]);
			minZ = Math.min(minZ, positions[i + 2]);
			maxZ = Math.max(maxZ, positions[i + 2]);
		}

		// Validate bounds
		if (minX === maxX || minZ === maxZ) {
			throw new Error("Invalid mesh bounds - mesh has no area");
		}

		// Apply height map to each vertex
		for (let i = 0; i < positions.length; i += 3) {
			const x = positions[i];
			const z = positions[i + 2];

			// Calculate UV coordinates
			const u = (x - minX) / (maxX - minX);
			const v = (z - minZ) / (maxZ - minZ);

			// Clamp UV coordinates
			const clampedU = Math.max(0, Math.min(1, u));
			const clampedV = Math.max(0, Math.min(1, v));

			// Sample height from texture
			const pixelX = Math.floor(clampedU * (canvas.width - 1));
			const pixelY = Math.floor(clampedV * (canvas.height - 1));

			// Ensure pixel coordinates are within bounds
			const safePixelX = Math.max(0, Math.min(canvas.width - 1, pixelX));
			const safePixelY = Math.max(0, Math.min(canvas.height - 1, pixelY));

			const pixelIndex = (safePixelY * canvas.width + safePixelX) * 4;

			if (pixelIndex >= 0 && pixelIndex < data.length - 3) {
				// Get height value from red channel (grayscale)
				const heightValue = data[pixelIndex] / 255;

				// Validate height value
				if (isNaN(heightValue)) {
					console.warn(`Invalid height value at pixel (${safePixelX}, ${safePixelY}): ${data[pixelIndex]}`);
					// Use original position as fallback
					newPositions[i] = x;
					newPositions[i + 1] = positions[i + 1];
					newPositions[i + 2] = z;
					continue;
				}

				// Apply height range
				const finalHeight = config.minHeight + heightValue * (config.maxHeight - config.minHeight);

				// Validate final height
				if (isNaN(finalHeight)) {
					console.warn(`Invalid final height calculated: ${finalHeight} from heightValue: ${heightValue}`);
					// Use original position as fallback
					newPositions[i] = x;
					newPositions[i + 1] = positions[i + 1];
					newPositions[i + 2] = z;
					continue;
				}

				// Set new position
				newPositions[i] = x;
				newPositions[i + 1] = finalHeight;
				newPositions[i + 2] = z;
			} else {
				console.warn(`Pixel index out of bounds: ${pixelIndex}, data length: ${data.length}`);
				// Use original position as fallback
				newPositions[i] = x;
				newPositions[i + 1] = positions[i + 1];
				newPositions[i + 2] = z;
			}
		}

		// Final validation: check for invalid values
		for (let i = 0; i < newPositions.length; i++) {
			if (isNaN(newPositions[i]) || !isFinite(newPositions[i])) {
				throw new Error(`Invalid position value at index ${i}: ${newPositions[i]}`);
			}
		}

		return newPositions;
	}

	/**
	 * Creates a sample height map texture for testing purposes.
	 * @param size Size of the generated texture (width and height)
	 * @returns Promise that resolves with the created texture
	 */
	public static async createSampleHeightMapTexture(scene: any, size: number = 256): Promise<Texture> {
		return new Promise((resolve, reject) => {
			try {
				const canvas = document.createElement("canvas");
				canvas.width = size;
				canvas.height = size;
				const ctx = canvas.getContext("2d");

				if (!ctx) {
					reject(new Error("Failed to create canvas context"));
					return;
				}

				// Create a simple height map with noise-like patterns
				const imageData = ctx.createImageData(size, size);
				const data = imageData.data;

				for (let y = 0; y < size; y++) {
					for (let x = 0; x < size; x++) {
						const index = (y * size + x) * 4;

						// Create height variation using noise-like patterns
						const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5;
						const height = Math.floor(noise * 255);

						data[index] = height; // R
						data[index + 1] = height; // G
						data[index + 2] = height; // B
						data[index + 3] = 255; // A
					}
				}

				ctx.putImageData(imageData, 0, 0);

				// Convert canvas to blob and create texture
				canvas.toBlob((blob) => {
					if (!blob) {
						reject(new Error("Failed to create height map blob"));
						return;
					}

					const url = URL.createObjectURL(blob);
					const texture = new Texture(url, scene);
					texture.name = "SampleHeightMap";

					resolve(texture);
				}, "image/png");
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Regenerates ground geometry while preserving material.
	 * @param mesh Ground mesh to update
	 * @param config Geometry configuration
	 * @returns Whether geometry was regenerated
	 */
	public static regenerateGroundGeometry(mesh: Mesh, config: IHeightMapConfig): boolean {
		if (!mesh) {
			console.log("No mesh provided to regenerateGroundGeometry");
			return false;
		}
		
		const geometry = mesh.geometry;
		if (!geometry) {
			console.log(`No geometry found on mesh: ${mesh.name}, creating new geometry`);
			// Create new geometry if none exists
			const newGeometry = CreateGroundVertexData({
				width: config.width,
				height: config.height,
				subdivisions: config.subdivisions,
			});
			if (newGeometry.positions) mesh.setVerticesData("position", newGeometry.positions);
			if (newGeometry.normals) mesh.setVerticesData("normal", newGeometry.normals);
			if (newGeometry.uvs) mesh.setVerticesData("uv", newGeometry.uvs);
			if (newGeometry.indices) mesh.setIndices(newGeometry.indices);
			return true;
		}

		// Get current vertex positions to check if regeneration is needed
		const positions = geometry.getVerticesData("position") as Float32Array;
		if (!positions || positions.length === 0) {
			console.log(`No position data found in geometry for mesh: ${mesh.name}, creating new geometry`);
			// Create new geometry if position data is invalid
			const newGeometry = CreateGroundVertexData({
				width: config.width,
				height: config.height,
				subdivisions: config.subdivisions,
			});
			if (newGeometry.positions) mesh.setVerticesData("position", newGeometry.positions);
			if (newGeometry.normals) mesh.setVerticesData("normal", newGeometry.normals);
			if (newGeometry.uvs) mesh.setVerticesData("uv", newGeometry.uvs);
			if (newGeometry.indices) mesh.setIndices(newGeometry.indices);
			return true;
		}

		const actualVertexCount = positions.length / 3;
		const actualSubdivisions = Math.round(Math.sqrt(actualVertexCount) - 1);

		// Calculate current mesh bounds
		let currentMinX = Infinity, currentMaxX = -Infinity;
		let currentMinZ = Infinity, currentMaxZ = -Infinity;
		
		for (let i = 0; i < positions.length; i += 3) {
			currentMinX = Math.min(currentMinX, positions[i]);
			currentMaxX = Math.max(currentMaxX, positions[i]);
			currentMinZ = Math.min(currentMinZ, positions[i + 2]);
			currentMaxZ = Math.max(currentMaxZ, positions[i + 2]);
		}
		
		const currentWidth = currentMaxX - currentMinX;
		const currentHeight = currentMaxZ - currentMinZ;

		console.log(`Current mesh dimensions: width=${currentWidth}, height=${currentHeight}, subdivisions=${actualSubdivisions}`);
		console.log(`New config dimensions: width=${config.width}, height=${config.height}, subdivisions=${config.subdivisions}`);

		// Check if any geometry property has changed
		const needsRegeneration = actualSubdivisions !== config.subdivisions ||
			Math.abs(currentWidth - config.width) > 0.1 ||
			Math.abs(currentHeight - config.height) > 0.1;

		console.log(`Needs regeneration: ${needsRegeneration} (subdivisions: ${actualSubdivisions !== config.subdivisions}, width: ${Math.abs(currentWidth - config.width) > 0.1}, height: ${Math.abs(currentHeight - config.height) > 0.1})`);

		if (needsRegeneration) {
			console.log(`Regenerating ground geometry for mesh: ${mesh.name}, config:`, config);
			
			// Store the current height map texture and settings before regeneration
			const currentHeightMapTexture = mesh.metadata?.heightMapTexture;
			const currentHeightMapEnabled = mesh.metadata?.useHeightMap;
			
			// Use the safety method to ensure material is preserved during geometry regeneration
			HeightMapUtils.preserveMaterialDuringOperation(mesh, () => {
				geometry.setAllVerticesData(
					CreateGroundVertexData({
						width: config.width,
						height: config.height,
						subdivisions: config.subdivisions,
					}),
					false
				);
			});

			// Reapply height map if it was enabled before regeneration
			if (currentHeightMapEnabled && currentHeightMapTexture) {
				console.log(`Reapplying height map after geometry regeneration for mesh: ${mesh.name}`);
				setTimeout(async () => {
					try {
						await HeightMapUtils.applyHeightMapToMesh(mesh, currentHeightMapTexture, config);
						console.log(`Successfully reapplied height map after geometry regeneration for mesh: ${mesh.name}`);
					} catch (error) {
						console.error(`Failed to reapply height map after geometry regeneration for mesh: ${mesh.name}:`, error);
					}
				}, 0);
			}

			// Force material compilation to ensure it works with new geometry
			if (mesh.material) {
				setTimeout(() => {
					HeightMapUtils.forceMaterialCompilation(mesh);
				}, 0);
			}

			return true;
		}

		return false;
	}

	/**
	 * Forces material compilation for a mesh after geometry changes.
	 * @param mesh Mesh to compile material for
	 * @returns Whether compilation was successful
	 */
	public static forceMaterialCompilation(mesh: Mesh): boolean {
		const material = mesh.material;
		if (!material) {
			return false;
		}

		try {
			material.forceCompilation(mesh, undefined, {
				clipPlane: !!mesh.getScene().clipPlane,
				useInstances: mesh.hasInstances,
			});
			return true;
		} catch (compilationError) {
			console.error("Failed to force material compilation:", compilationError);
			return false;
		}
	}

	/**
	 * Ensures material is properly preserved during geometry operations.
	 * This is a safety method to prevent material loss during vertex data changes.
	 * @param mesh Mesh to protect
	 * @param operation Function that performs geometry operations
	 * @returns Whether the operation was successful
	 */
	public static preserveMaterialDuringOperation<T>(mesh: Mesh, operation: () => T): T {
		const originalMaterial = mesh.material;
		const result = operation();

		// Ensure material is still assigned after operation
		if (!mesh.material && originalMaterial) {
			console.warn("Material was lost during operation, reassigning...");
			mesh.material = originalMaterial;
		}

		return result;
	}

	/**
	 * Validates that a mesh has a valid material assigned.
	 * @param mesh Mesh to validate
	 * @returns Validation result with error message if invalid
	 */
	public static validateMeshMaterial(mesh: Mesh): { valid: boolean; error?: string } {
		if (!mesh.material) {
			return {
				valid: false,
				error: "Mesh has no material assigned",
			};
		}

		// Check if material has the required methods
		if (typeof mesh.material.getClassName !== "function") {
			return {
				valid: false,
				error: "Material is missing required methods (getClassName)",
			};
		}

		return { valid: true };
	}

	/**
	 * Safely applies a material to a mesh, ensuring it's properly bound.
	 * @param mesh Mesh to apply material to
	 * @param material Material to apply
	 * @returns Whether the operation was successful
	 */
	public static safelyApplyMaterial(mesh: Mesh, material: any): boolean {
		try {
			if (!material) {
				console.warn("Attempting to apply null/undefined material to mesh");
				return false;
			}

			// Validate material has required methods
			if (typeof material.getClassName !== "function") {
				console.error("Material is missing required methods (getClassName)");
				return false;
			}

			// Apply material
			mesh.material = material;

			// Force material compilation to ensure it works with current geometry
			setTimeout(() => {
				HeightMapUtils.forceMaterialCompilation(mesh);
			}, 0);

			console.log(`Material '${material.getClassName()}' successfully applied to mesh '${mesh.name}'`);
			return true;
		} catch (error) {
			console.error("Failed to safely apply material:", error);
			return false;
		}
	}

	/**
	 * Toggles height map on/off for a ground mesh.
	 * @param mesh Ground mesh to modify
	 * @param metadata Mesh metadata
	 * @param enable Whether to enable height map
	 * @returns Promise that resolves when toggle is complete
	 */
	public static async toggleHeightMap(mesh: Mesh, metadata: any, enable: boolean): Promise<void> {
		// Update the metadata first
		metadata.useHeightMap = enable;
		
		if (enable) {
			// Height map will be applied by the caller
			return;
		}

		console.log("Disabling height map - reverting to flat ground");

		// Use the safety method to ensure material is preserved during geometry reversion
		HeightMapUtils.preserveMaterialDuringOperation(mesh, () => {
			// Revert to flat ground
			mesh.geometry?.setAllVerticesData(
				CreateGroundVertexData({
					width: metadata.width,
					height: metadata.height,
					subdivisions: metadata.subdivisions >> 0,
				}),
				false
			);
		});

		// Force material compilation for the reverted geometry
		if (mesh.material) {
			setTimeout(() => {
				HeightMapUtils.forceMaterialCompilation(mesh);
			}, 0);
		}
	}

	/**
	 * Creates a proxy object for metadata with validation and change handling.
	 * @param metadata Metadata object to proxy
	 * @param onChange Callback for when metadata changes
	 * @param maxSubdivisions Maximum allowed subdivisions
	 * @returns Proxy object for metadata
	 */
	public static createMetadataProxy<T>(metadata: any, onChange: () => void, maxSubdivisions: number = HeightMapUtils._maxSubdivisions): T {
		return new Proxy(metadata, {
			get(target, prop) {
				return target[prop];
			},
			set(obj, prop, value) {
				// Ensure numeric properties are properly converted
				if (prop === "width" || prop === "height" || prop === "subdivisions") {
					const numValue = Number(value);
					if (!isNaN(numValue)) {
						// For subdivisions, clamp to safe range
						if (prop === "subdivisions") {
							obj[prop] = Math.max(1, Math.min(maxSubdivisions, numValue));
						} else {
							obj[prop] = numValue;
						}
					} else {
						console.warn(`Invalid value for ${String(prop)}:`, value);
						return false;
					}
				} else if (prop === "minHeight" || prop === "maxHeight") {
					const numValue = Number(value);
					if (!isNaN(numValue)) {
						obj[prop] = numValue;
					} else {
						console.warn(`Invalid value for ${String(prop)}:`, value);
						return false;
					}
				} else {
					obj[prop] = value;
				}
				onChange();
				return true;
			},
		});
	}

	/**
	 * Applies height map to a mesh with comprehensive error handling and fallback.
	 * This method handles the complete height map application process including texture validation,
	 * configuration sanitization, and fallback to flat ground if needed.
	 * @param mesh The mesh to apply height map to
	 * @param metadata Mesh metadata containing height map configuration
	 * @param maxSubdivisions Maximum allowed subdivisions for safety
	 * @returns Promise that resolves when height map is applied or fallback is complete
	 */
	public static async applyHeightMapWithFallback(
		mesh: Mesh,
		metadata: any,
		maxSubdivisions: number = HeightMapUtils._maxSubdivisions
	): Promise<{ success: boolean; error?: string; usedFallback: boolean }> {
		try {
			const texture = metadata.heightMapTexture;

			// Ensure texture is properly loaded
			if (!texture || !texture.isReady()) {
				if (texture && !texture.isReady()) {
					// Wait for texture to be ready
					await new Promise<void>((resolve) => {
						texture.onLoadObservable.addOnce(() => resolve());
					});
				} else {
					throw new Error("No height map texture available");
				}
			}

			// Sanitize and validate configuration
			const config: IHeightMapConfig = {
				minHeight: Number(metadata.minHeight) || HeightMapUtils._defaultMinHeight,
				maxHeight: Number(metadata.maxHeight) || HeightMapUtils._defaultMaxHeight,
				width: Number(metadata.width) || HeightMapUtils._defaultWidth,
				height: Number(metadata.height) || HeightMapUtils._defaultHeight,
				subdivisions: Math.max(1, Math.min(maxSubdivisions, Number(metadata.subdivisions) || HeightMapUtils._defaultSubdivisions)),
			};

			// Validate configuration
			const configValidation = HeightMapUtils.validateConfig(config);
			if (!configValidation.valid) {
				throw new Error(configValidation.error);
			}

			// Apply height map
			await HeightMapUtils.applyHeightMapToMesh(mesh, texture, config);

			return { success: true, usedFallback: false };
		} catch (error) {
			console.error("Failed to apply height map:", error);

			// Fallback to flat ground
			try {
				await HeightMapUtils.fallbackToFlatGround(mesh, metadata);
				return {
					success: false,
					error: error.message,
					usedFallback: true,
				};
			} catch (fallbackError) {
				console.error("Fallback to flat ground also failed:", fallbackError);
				return {
					success: false,
					error: `Height map failed: ${error.message}. Fallback also failed: ${fallbackError.message}`,
					usedFallback: false,
				};
			}
		}
	}

	/**
	 * Fallback method to create flat ground when height map fails.
	 * @param mesh Mesh to revert to flat ground
	 * @param metadata Mesh metadata
	 * @returns Promise that resolves when fallback is complete
	 */
	public static async fallbackToFlatGround(mesh: Mesh, metadata: any): Promise<void> {
		console.log("Falling back to flat ground due to height map failure");

		// Disable height map in metadata
		metadata.useHeightMap = false;

		// Create flat ground configuration
		const config: IHeightMapConfig = {
			width: Number(metadata.width) || HeightMapUtils._defaultWidth,
			height: Number(metadata.height) || HeightMapUtils._defaultHeight,
			subdivisions: Number(metadata.subdivisions) || HeightMapUtils._defaultSubdivisions,
			minHeight: 0,
			maxHeight: 0,
		};

		// Regenerate flat geometry
		HeightMapUtils.regenerateGroundGeometry(mesh, config);
	}

	/**
	 * Handles height map texture changes with comprehensive metadata management.
	 * This method centralizes all the logic for handling texture changes, including
	 * metadata initialization, validation, and preparation for height map application.
	 * @param texture New height map texture
	 * @param metadata Existing metadata object
	 * @param maxSubdivisions Maximum allowed subdivisions for safety
	 * @returns Complete result object with updated metadata and application instructions
	 */
	public static handleHeightMapTextureChange(
		texture: Texture | CubeTexture | ColorGradingTexture | null,
		metadata: any,
		maxSubdivisions: number = HeightMapUtils._maxSubdivisions
	): {
		metadata: any;
		shouldApplyHeightMap: boolean;
		validationErrors?: string[];
	} {
		const updated = { ...metadata };
		const validationErrors: string[] = [];

		if (texture && texture instanceof Texture) {
			console.log("Processing height map texture assignment...");
			
			// Validate texture dimensions and readiness
			const textureValidation = HeightMapUtils.validateTexture(texture);
			if (!textureValidation.valid) {
				validationErrors.push(textureValidation.error!);
			}

			// Initialize metadata with validated values
			updated.minHeight = Number(metadata.minHeight) || HeightMapUtils._defaultMinHeight;
			updated.maxHeight = Number(metadata.maxHeight) || HeightMapUtils._defaultMaxHeight;
			updated.useHeightMap = false; // Start with height map disabled - user must enable manually
			updated.width = Number(metadata.width) || HeightMapUtils._defaultWidth;
			updated.height = Number(metadata.height) || HeightMapUtils._defaultHeight;
			updated.subdivisions = Math.max(1, Math.min(maxSubdivisions, Number(metadata.subdivisions) || HeightMapUtils._defaultSubdivisions));
			updated.heightMapTexture = texture;
			
			console.log("Height map metadata initialized:", updated);
			console.log("Height map starts disabled - user must manually enable");

			return {
				metadata: updated,
				shouldApplyHeightMap: false, // Don't auto-apply initially, but user can enable later
				validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
			};
		}
		// Clear height map
		updated.heightMapTexture = null;
		updated.useHeightMap = false;
		
		console.log("Height map texture cleared, metadata updated:", updated);

		return {
			metadata: updated,
			shouldApplyHeightMap: false,
		};
	}

	/**
	 * Toggles height map on/off with proper state management and geometry handling.
	 * This method handles the complete toggle process including geometry reversion
	 * and material preservation.
	 * @param mesh Ground mesh to modify
	 * @param metadata Mesh metadata
	 * @param enable Whether to enable or disable height map
	 * @param maxSubdivisions Maximum allowed subdivisions for safety
	 * @returns Promise that resolves when toggle is complete
	 */
	public static async toggleHeightMapWithStateManagement(
		mesh: Mesh,
		metadata: any,
		enable: boolean,
		maxSubdivisions: number = HeightMapUtils._maxSubdivisions
	): Promise<{ success: boolean; error?: string }> {
		try {
			// Update the metadata first
			metadata.useHeightMap = enable;
			
			if (enable) {
				// When enabling, ensure the geometry is ready for height map application
				// but don't apply the height map here - let the caller handle that
				console.log("Enabling height map - preparing geometry");
				
				// Ensure we have valid geometry with the current settings
				const config = HeightMapUtils.createValidatedConfig(metadata, maxSubdivisions);
				HeightMapUtils.regenerateGroundGeometry(mesh, config);
				
				return { success: true };
			}

			console.log("Disabling height map - reverting to flat ground");

			// Use the safety method to ensure material is preserved during geometry reversion
			HeightMapUtils.preserveMaterialDuringOperation(mesh, () => {
				// Revert to flat ground
				mesh.geometry?.setAllVerticesData(
					CreateGroundVertexData({
						width: Number(metadata.width) || HeightMapUtils._defaultWidth,
						height: Number(metadata.height) || HeightMapUtils._defaultHeight,
						subdivisions: Math.max(1, Math.min(maxSubdivisions, Number(metadata.subdivisions) || HeightMapUtils._defaultSubdivisions)),
					}),
					false
				);
			});

			// Force the mesh to update its bounding box and other properties
			mesh.computeWorldMatrix(true);
			
			// Force the geometry to update its bounding info
			const geometry = mesh.geometry;
			if (geometry) {
				geometry.boundingBias = geometry.boundingBias || new Vector3(0, 0, 0);
				geometry.boundingBias = geometry.boundingBias.scale(1.001); // Force bounding box recalculation
			}

			// Force material compilation for the reverted geometry
			if (mesh.material) {
				setTimeout(() => {
					HeightMapUtils.forceMaterialCompilation(mesh);
				}, 0);
			}

			return { success: true };
		} catch (error) {
			console.error("Failed to toggle height map:", error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Creates a comprehensive configuration object from metadata with validation.
	 * @param metadata Mesh metadata
	 * @param maxSubdivisions Maximum allowed subdivisions for safety
	 * @returns Validated configuration object
	 */
	public static createValidatedConfig(metadata: any, maxSubdivisions: number = HeightMapUtils._maxSubdivisions): IHeightMapConfig {
		return {
			minHeight: Number(metadata.minHeight) || HeightMapUtils._defaultMinHeight,
			maxHeight: Number(metadata.maxHeight) || HeightMapUtils._defaultMaxHeight,
			width: Number(metadata.width) || HeightMapUtils._defaultWidth,
			height: Number(metadata.height) || HeightMapUtils._defaultHeight,
			subdivisions: Math.max(1, Math.min(maxSubdivisions, Number(metadata.subdivisions) || HeightMapUtils._defaultSubdivisions)),
		};
	}

	/**
	 * Prepares ground mesh for inspector component with complete metadata initialization.
	 * This method handles all the setup needed for the ground inspector component.
	 * @param mesh Ground mesh to prepare
	 * @param metadata Existing metadata object
	 * @param maxSubdivisions Maximum allowed subdivisions for safety
	 * @returns Prepared metadata object
	 */
	public static prepareGroundForInspector(mesh: Mesh, metadata: any, maxSubdivisions: number = HeightMapUtils._maxSubdivisions): any {
		// Initialize metadata if it doesn't exist
		if (!metadata) {
			metadata = {};
		}

		// Initialize ground metadata with defaults
		const preparedMetadata = HeightMapUtils.initializeGroundMetadata(metadata);

		// Validate and sanitize all values
		const validation = HeightMapUtils.validateHeightMapMetadata(preparedMetadata);
		if (!validation.valid) {
			console.warn("Ground metadata validation failed:", validation.error);
			// Use sanitized values if available, otherwise use defaults
			if (validation.sanitized) {
				Object.assign(preparedMetadata, validation.sanitized);
			}
		}

		// Only regenerate geometry if it doesn't exist or if dimensions have changed significantly
		// This prevents losing height map state during inspector updates
		const shouldRegenerate = !mesh.geometry || 
			Math.abs(mesh.geometry.getTotalVertices() - (preparedMetadata.subdivisions + 1) * (preparedMetadata.subdivisions + 1)) > 1;
		
		if (shouldRegenerate) {
			const config = HeightMapUtils.createValidatedConfig(preparedMetadata, maxSubdivisions);
			HeightMapUtils.regenerateGroundGeometry(mesh, config);
		}

		return preparedMetadata;
	}

	/**
	 * Handles ground property changes with proper validation and geometry updates.
	 * @param mesh Ground mesh to update
	 * @param metadata Mesh metadata
	 * @param property Property that changed
	 * @param value New value
	 * @param maxSubdivisions Maximum allowed subdivisions for safety
	 * @returns Whether the update was successful
	 */
	public static async handleGroundPropertyChange(mesh: Mesh, metadata: any, property: string, value: any, maxSubdivisions: number = HeightMapUtils._maxSubdivisions): Promise<boolean> {
		try {
			console.log(`HeightMapUtils.handleGroundPropertyChange called for property: ${property}, value: ${value}`);
			
			// Update metadata
			metadata[property] = value;

			// Create validated config
			const config = HeightMapUtils.createValidatedConfig(metadata, maxSubdivisions);
			console.log(`Created config:`, config);

			// Regenerate geometry if needed
			const wasRegenerated = HeightMapUtils.regenerateGroundGeometry(mesh, config);
			console.log(`Geometry regeneration result: ${wasRegenerated}`);

			// If height map is enabled, reapply it with new dimensions
			if (metadata.useHeightMap && metadata.heightMapTexture) {
				console.log(`Height map is enabled, reapplying with new dimensions`);
				try {
					await HeightMapUtils.applyHeightMapWithFallback(mesh, metadata, maxSubdivisions);
					console.log(`Successfully reapplied height map after property change: ${property}`);
				} catch (error) {
					console.error(`Failed to reapply height map after property change: ${property}:`, error);
					return false;
				}
			}

			return true;
		} catch (error) {
			console.error(`Failed to handle ground property change for ${property}:`, error);
			return false;
		}
	}

	/**
	 * Handles the complete height map application workflow for the inspector.
	 * This method orchestrates the entire process from texture validation to application.
	 * @param mesh Ground mesh to modify
	 * @param metadata Mesh metadata
	 * @param maxSubdivisions Maximum allowed subdivisions for safety
	 * @returns Promise that resolves with the result of the height map application
	 */
	public static async handleInspectorHeightMapApplication(
		mesh: Mesh,
		metadata: any,
		maxSubdivisions: number = HeightMapUtils._maxSubdivisions
	): Promise<{ success: boolean; error?: string; usedFallback: boolean; requiresUpdate: boolean }> {
		try {
			// Check if height map should be applied
			if (!metadata.useHeightMap || !metadata.heightMapTexture) {
				return { success: true, usedFallback: false, requiresUpdate: false };
			}

			// Apply height map with fallback
			const result = await HeightMapUtils.applyHeightMapWithFallback(mesh, metadata, maxSubdivisions);

			return {
				...result,
				requiresUpdate: true,
			};
		} catch (error) {
			console.error("Failed to handle inspector height map application:", error);
			return {
				success: false,
				error: error.message,
				usedFallback: false,
				requiresUpdate: true,
			};
		}
	}

	/**
	 * Handles height map texture changes in the inspector context.
	 * This method manages the complete workflow when a height map texture is changed.
	 * @param texture New height map texture
	 * @param metadata Mesh metadata
	 * @param maxSubdivisions Maximum allowed subdivisions for safety
	 * @param onUpdate Callback to trigger UI updates
	 * @returns Object containing the result of the texture change operation
	 */
	public static handleInspectorHeightMapTextureChanged(
		texture: Texture | CubeTexture | ColorGradingTexture | null,
		metadata: any,
		maxSubdivisions: number = HeightMapUtils._maxSubdivisions,
		onUpdate?: () => void
	): { metadata: any; shouldApplyHeightMap: boolean; validationErrors?: string[] } {
		// Use the existing comprehensive method
		const result = HeightMapUtils.handleHeightMapTextureChange(texture, metadata, maxSubdivisions);

		// Update metadata with sanitized values
		Object.assign(metadata, result.metadata);

		// Trigger UI update if callback provided
		if (onUpdate) {
			onUpdate();
		}

		// Note: Height map application is now handled immediately by the caller
		// This prevents timing issues and ensures immediate response
		if (result.shouldApplyHeightMap) {
			console.log("Height map should be applied immediately by caller");
		}

		// Log validation errors if any
		if (result.validationErrors && result.validationErrors.length > 0) {
			console.warn("Height map texture validation warnings:", result.validationErrors);
		}

		return result;
	}

	/**
	 * Toggles height map usage in the inspector context.
	 * This method manages the complete workflow when toggling height map on/off.
	 * @param mesh Ground mesh to modify
	 * @param metadata Mesh metadata
	 * @param enable Whether to enable or disable height map
	 * @param maxSubdivisions Maximum allowed subdivisions for safety
	 * @param onUpdate Callback to trigger UI updates
	 * @returns Promise that resolves when the toggle operation is complete
	 */
	public static async toggleInspectorHeightMap(
		mesh: Mesh,
		metadata: any,
		enable: boolean,
		maxSubdivisions: number = HeightMapUtils._maxSubdivisions,
		onUpdate?: () => void
	): Promise<{ success: boolean; error?: string }> {
		try {
			// Use the existing comprehensive method
			const result = await HeightMapUtils.toggleHeightMapWithStateManagement(mesh, metadata, enable, maxSubdivisions);

			// Trigger UI update if callback provided
			if (onUpdate) {
				onUpdate();
			}

			return result;
		} catch (error) {
			console.error("Failed to toggle inspector height map:", error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	/**
	 * Applies height map in the inspector context with comprehensive error handling.
	 * This method manages the complete workflow for applying height maps in the inspector.
	 * @param mesh Ground mesh to modify
	 * @param metadata Mesh metadata
	 * @param maxSubdivisions Maximum allowed subdivisions for safety
	 * @param onUpdate Callback to trigger UI updates
	 * @param onError Callback to handle errors
	 * @returns Promise that resolves when the height map application is complete
	 */
	public static async applyInspectorHeightMap(
		mesh: Mesh,
		metadata: any,
		maxSubdivisions: number = HeightMapUtils._maxSubdivisions,
		onUpdate?: () => void,
		onError?: (error: string) => void
	): Promise<{ success: boolean; error?: string; usedFallback: boolean; requiresUpdate: boolean }> {
		try {
			// Use the existing comprehensive method
			const result = await HeightMapUtils.handleInspectorHeightMapApplication(mesh, metadata, maxSubdivisions);

			// Handle success cases
			if (result.success || result.usedFallback) {
				if (result.requiresUpdate && onUpdate) {
					onUpdate();
				}
			} else if (onError) {
				onError(result.error || "Unknown error occurred");
			}

			return result;
		} catch (error) {
			console.error("Failed to apply inspector height map:", error);
			const errorMessage = error.message || "Unknown error occurred";

			if (onError) {
				onError(errorMessage);
			}

			return {
				success: false,
				error: errorMessage,
				usedFallback: false,
				requiresUpdate: true,
			};
		}
	}

	/**
	 * Checks if a height map is currently applied to the mesh by analyzing vertex positions.
	 * @param mesh Ground mesh to check
	 * @param metadata Mesh metadata
	 * @returns Whether a height map appears to be applied
	 */
	public static isHeightMapApplied(mesh: Mesh, metadata: any): boolean {
		if (!mesh.geometry || !metadata.useHeightMap || !metadata.heightMapTexture) {
			return false;
		}

		try {
			const positions = mesh.geometry.getVerticesData("position");
			if (!positions || positions.length === 0) {
				return false;
			}

			// Check if vertices have varying heights (indicating height map is applied)
			let minHeight = Infinity;
			let maxHeight = -Infinity;
			
			for (let i = 2; i < positions.length; i += 3) { // Y coordinate is at index 2
				const height = positions[i];
				minHeight = Math.min(minHeight, height);
				maxHeight = Math.max(maxHeight, height);
			}

			// If height variation is significant, height map is likely applied
			const heightVariation = maxHeight - minHeight;
			const expectedVariation = metadata.maxHeight - metadata.minHeight;
			
			// More lenient check - if there's any significant height variation, consider it applied
			// This accounts for cases where the height map might have subtle variations
			const isApplied = heightVariation > 0.001; // Reduced threshold for more sensitive detection
			
			console.log(`Height map check - variation: ${heightVariation.toFixed(4)}, expected: ${expectedVariation.toFixed(4)}, isApplied: ${isApplied}`);
			
			return isApplied;
		} catch (error) {
			console.warn("Error checking height map application:", error);
			return false;
		}
	}

	/**
	 * Reapplies height map to existing geometry without regeneration.
	 * This method is optimized for when only height range properties change.
	 * @param mesh Ground mesh to modify
	 * @param metadata Mesh metadata
	 * @param maxSubdivisions Maximum allowed subdivisions for safety
	 * @param onUpdate Callback to trigger UI updates
	 * @param onError Callback to handle errors
	 * @returns Promise that resolves when the height map reapplication is complete
	 */
	public static async reapplyHeightMapOnly(
		mesh: Mesh,
		metadata: any,
		maxSubdivisions: number = HeightMapUtils._maxSubdivisions,
		onUpdate?: () => void,
		onError?: (error: string) => void
	): Promise<{ success: boolean; error?: string; usedFallback: boolean; requiresUpdate: boolean }> {
		try {
			// Check if height map should be applied
			if (!metadata.useHeightMap || !metadata.heightMapTexture) {
				return { success: true, usedFallback: false, requiresUpdate: false };
			}

			console.log("Reapplying height map with new height range...");
			
			// Create validated config for height map application
			const config = HeightMapUtils.createValidatedConfig(metadata, maxSubdivisions);
			
			// Apply height map directly to existing geometry without regeneration
			await HeightMapUtils.applyHeightMapToMesh(mesh, metadata.heightMapTexture, config);

			// Force the mesh to update its bounding box and other properties
			mesh.computeWorldMatrix(true);
			
			// Force the geometry to update its bounding info
			const geometry = mesh.geometry;
			if (geometry) {
				geometry.boundingBias = geometry.boundingBias || new Vector3(0, 0, 0);
				geometry.boundingBias = geometry.boundingBias.scale(1.001); // Force bounding box recalculation
			}
			
			// Force material compilation to ensure it works with updated geometry
			if (mesh.material) {
				setTimeout(() => {
					HeightMapUtils.forceMaterialCompilation(mesh);
				}, 0);
			}

			// Trigger UI update if callback provided
			if (onUpdate) {
				onUpdate();
			}

			console.log("Height map reapplied successfully");
			return {
				success: true,
				usedFallback: false,
				requiresUpdate: true,
			};
		} catch (error) {
			console.error("Failed to reapply height map only:", error);
			const errorMessage = error.message || "Unknown error occurred";

			if (onError) {
				onError(errorMessage);
			}

			return {
				success: false,
				error: errorMessage,
				usedFallback: false,
				requiresUpdate: true,
			};
		}
	}
}
