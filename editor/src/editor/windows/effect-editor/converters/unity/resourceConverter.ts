import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { IMaterial, IGeometry } from "babylonjs-editor-tools/src/effect/types";
import * as yaml from "js-yaml";

/**
 * Convert Unity model buffer to IGeometry using Babylon.js loaders
 */
export async function convertUnityModel(guid: string, buffer: Buffer, extension: string, scene: Scene): Promise<IGeometry | null> {
	try {
		// Determine MIME type based on extension
		let mimeType = "application/octet-stream";
		if (extension === "obj") {
			mimeType = "text/plain";
		} else if (extension === "fbx") {
			mimeType = "application/octet-stream";
		}

		// Create data URL from buffer
		const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

		// Import mesh using Babylon.js SceneLoader
		const result = await SceneLoader.ImportMeshAsync("", dataUrl, "", scene);

		if (!result || !result.meshes || result.meshes.length === 0) {
			return null;
		}

		// Find the first mesh
		const mesh = result.meshes.find((m) => m instanceof Mesh) as Mesh | undefined;
		if (!mesh || !mesh.geometry) {
			return null;
		}

		// Extract vertex data
		const vertexData = VertexData.ExtractFromMesh(mesh);
		if (!vertexData) {
			return null;
		}

		// Convert to IGeometry format
		const geometry: IGeometry = {
			uuid: guid,
			type: "BufferGeometry",
			data: {
				attributes: {},
			},
		};

		// Convert positions
		if (vertexData.positions) {
			geometry.data!.attributes.position = {
				array: Array.from(vertexData.positions),
				itemSize: 3,
			};
		}

		// Convert normals
		if (vertexData.normals) {
			geometry.data!.attributes.normal = {
				array: Array.from(vertexData.normals),
				itemSize: 3,
			};
		}

		// Convert UVs
		if (vertexData.uvs) {
			geometry.data!.attributes.uv = {
				array: Array.from(vertexData.uvs),
				itemSize: 2,
			};
		}

		// Convert indices
		if (vertexData.indices) {
			geometry.data!.index = {
				array: Array.from(vertexData.indices),
			};
		}

		// Cleanup: dispose imported meshes
		for (const m of result.meshes) {
			m.dispose();
		}

		return geometry;
	} catch (error) {
		console.warn(`Failed to convert Unity model ${guid}:`, error);
		return null;
	}
}

/**
 * Convert Unity Material YAML to IMaterial
 */
export function convertUnityMaterial(guid: string, yamlContent: string, dependencies: any): IMaterial | null {
	try {
		// Parse Unity material YAML
		const parsed = yaml.load(yamlContent) as any;
		if (!parsed || !parsed.Material) {
			return null;
		}

		const unityMat = parsed.Material;
		const material: IMaterial = {
			uuid: guid,
		};

		// Extract color
		if (unityMat.m_SavedProperties?.m_Colors) {
			const colorProps = unityMat.m_SavedProperties.m_Colors;
			for (const colorProp of colorProps) {
				if (colorProp._Color) {
					const r = parseFloat(colorProp._Color.r || "1");
					const g = parseFloat(colorProp._Color.g || "1");
					const b = parseFloat(colorProp._Color.b || "1");
					material.color = new Color3(r, g, b);
					break;
				}
			}
		}

		// Extract texture (MainTex)
		if (unityMat.m_SavedProperties?.m_TexEnvs) {
			for (const texEnv of unityMat.m_SavedProperties.m_TexEnvs) {
				if (texEnv._MainTex && texEnv._MainTex.m_Texture) {
					const texRef = texEnv._MainTex.m_Texture;
					const textureGuid = texRef.guid || texRef.fileID;
					if (textureGuid && dependencies.textures?.has(textureGuid)) {
						material.map = textureGuid; // Reference to texture UUID
					}
					break;
				}
			}
		}

		// Extract transparency
		if (unityMat.stringTagMap?.RenderType === "Transparent") {
			material.transparent = true;
		}

		// Extract opacity
		if (unityMat.m_SavedProperties?.m_Colors) {
			for (const colorProp of unityMat.m_SavedProperties.m_Colors) {
				if (colorProp._Color && colorProp._Color.a !== undefined) {
					material.opacity = parseFloat(colorProp._Color.a || "1");
					break;
				}
			}
		}

		// Extract blending mode from shader
		const shaderFileID = unityMat.m_Shader?.fileID;
		if (shaderFileID) {
			// Unity shader IDs: 200 = Standard, 203 = Unlit, etc.
			// For now, use default blending
			material.blending = 0; // Normal blending
		}

		return material;
	} catch (error) {
		console.warn(`Failed to parse Unity material ${guid}:`, error);
		return null;
	}
}
