import { loadJsonFile } from "../../../tools/request";

export async function preloadCommonScriptAsset(key: string, rootUrl: string) {
	return loadJsonFile<any>(`${rootUrl}${key}`);
}
