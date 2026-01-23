import { glob } from "glob";

export async function normalizedGlob(...args: Parameters<typeof glob>) {
	const result = await glob(...args);

	result.forEach((_: unknown, index: number) => {
		result[index] = result[index].toString().replace(/\\/g, "/");
	});

	return result as string[];
}
