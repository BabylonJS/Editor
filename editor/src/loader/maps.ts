/**
 * Maps for converting from the external format to the Babylon.js format.
 */
export const materialPropertyMap: Record<string, string> = {
	"$raw.DiffuseColor|file": "albedoTexture",
	"$raw.SpecularColor|file": "reflectivityTexture",
	"$raw.AmbientColor|file": "ambientTexture",
	"$raw.Bump|file": "bumpTexture",
};
