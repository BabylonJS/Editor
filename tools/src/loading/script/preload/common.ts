export async function preloadCommonScriptAsset(key: string, rootUrl: string) {
	const response = await fetch(`${rootUrl}${key}`);
	const data = await response.json();

	return data;
}
