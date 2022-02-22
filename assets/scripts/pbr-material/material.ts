import {
	PBRMaterial, AbstractMesh, SubMesh, PBRMaterialDefines, Effect, Scene, Tools, Matrix,
	Mesh, RegisterClass, SerializationHelper,
} from "@babylonjs/core";

import { ICustomShaderNameResolveOptions } from "@babylonjs/core/Materials/material";

import vertexShaderContent from "./{__shader_name__}.vertex.fx";
import pixelShaderContent from "./{__shader_name__}.fragment.fx";

class /*{__shader_class_name__}*/AMaterialDefines extends PBRMaterialDefines {
	public COMPUTE_WAVES = false;
}

export class /*{__shader_class_name__}*/APBRMaterial extends PBRMaterial {
	private _storeId: string;

	/**
	 * Creates a PBR-based material instance.
	 * @param name defines the name of the material.
	 * @param scene defines the scene to reference.
	 */
	public constructor(name: string, scene: Scene) {
		super(name, scene);

		this._storeId = Tools.RandomId();

		Effect.ShadersStore[`${this._storeId}VertexShader`] = vertexShaderContent;
		Effect.ShadersStore[`${this._storeId}PixelShader`] = pixelShaderContent;

		this.customShaderNameResolve = (shaderName, uniforms, uniformBuffers, samplers, defines, attributes, options) => {
			return this._customShaderNameResolve(shaderName, uniforms, uniformBuffers, samplers, defines as /*{__shader_class_name__}*/AMaterialDefines, attributes, options);
		};
	}

	/**
	 * Specifies that the submesh is ready to be used.
	 * @param mesh - BJS mesh.
	 * @param subMesh - A submesh of the BJS mesh.  Used to check if it is ready.
	 * @param useInstances - Specifies that instances should be used.
	 * @returns - boolean indicating that the submesh is ready or not.
	 */
	public isReadyForSubMesh(mesh: AbstractMesh, subMesh: SubMesh, useInstances?: boolean): boolean {
		/* Check textures etc. here */

		return super.isReadyForSubMesh(mesh, subMesh, useInstances);
	}

	/**
	 * Binds the submesh data.
	 * @param world - The world matrix.
	 * @param mesh - The BJS mesh.
	 * @param subMesh - A submesh of the BJS mesh.
	 */
	public bindForSubMesh(world: Matrix, mesh: Mesh, subMesh: SubMesh): void {
		const defines = </*{__shader_class_name__}*/AMaterialDefines>subMesh.materialDefines;
		if (!defines) {
			return;
		}

		const effect = subMesh.effect;
		if (!effect) {
			return;
		}

		/* Set uniforms here */

		super.bindForSubMesh(world, mesh, subMesh);
	}

	/**
	 * Custom callback helping to override the default shader used in the material.
	 */
	private _customShaderNameResolve(shaderName: string, uniforms: string[], uniformBuffers: string[], samplers: string[], defines: /*{__shader_class_name__}*/AMaterialDefines, attributes?: string[], options?: ICustomShaderNameResolveOptions): string {
		return this._storeId;
	}

	/**
	 * Returns the name of this material class.
	 */
	public getClassName(): string {
		return "/*{__shader_class_name__}*/APBRMaterial";
	}

	/**
	 * Serializes this PBR-based Material.
	 * @returns - An object with the serialized material.
	 */
	public serialize(): any {
		var serializationObject = SerializationHelper.Serialize(this, super.serialize());
		serializationObject.customType = "BABYLON./*{__shader_class_name__}*/APBRMaterial";

		return serializationObject;
	}

	/**
	 * Parses a PBR Material from a serialized object.
	 * @param source - Serialized object.
	 * @param scene - BJS scene instance.
	 * @param rootUrl - url for the scene object
	 */
	public static Parse(source: any, scene: Scene, rootUrl: string): PBRMaterial {
		const material = SerializationHelper.Parse(() => new /*{__shader_class_name__}*/APBRMaterial(source.name, scene), source, scene, rootUrl);
		if (source.clearCoat) {
			material.clearCoat.parse(source.clearCoat, scene, rootUrl);
		}
		if (source.anisotropy) {
			material.anisotropy.parse(source.anisotropy, scene, rootUrl);
		}
		if (source.brdf) {
			material.brdf.parse(source.brdf, scene, rootUrl);
		}
		if (source.sheen) {
			material.sheen.parse(source.sheen, scene, rootUrl);
		}
		if (source.subSurface) {
			material.subSurface.parse(source.subSurface, scene, rootUrl);
		}
		return material;
	}
}

/**
 * Register the material in the BabylonJS registered types in order to be parsed.
 */
RegisterClass("BABYLON./*{__shader_class_name__}*/APBRMaterial", /*{__shader_class_name__}*/APBRMaterial);

/**
 * Export the class by default.
 */
export default /*{__shader_class_name__}*/APBRMaterial;

/**
 * Defines the configuration of the material.
 */
export const materialConfiguration = {
	vertexShaderContent: "./{__shader_name__}.vertex.fx",
	pixelShaderContent: "./{__shader_name__}.fragment.fx",
}
