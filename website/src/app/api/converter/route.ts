import { randomUUID } from "crypto";
import { extname, join } from "path";
import { access, mkdir, writeFile } from "fs/promises";

import { NextRequest } from "next/server";

import { convertToGlbUsingAssimp } from "./assimp";
import { convertBlender2GltfUsingBlender, convertFbx2GltfUsingBlender } from "./blender";

export async function POST(request: NextRequest) {
	const form = await request.formData();
	const file = form.get("file") as File;

	const tempDir = join(process.cwd(), "converter_temp");

	try {
		await access(tempDir);
	} catch (e) {
		await mkdir(tempDir);
	}

	const id = randomUUID();
	const filename = `${id}_${file.name}`;

	await writeFile(join(tempDir, filename), Buffer.from(await file.arrayBuffer()));

	const extension = extname(file.name).toLowerCase();

	let buffer: Buffer | null = null;

	switch (extension) {
	case ".fbx":
		buffer = await convertFbx2GltfUsingBlender(filename);
		break;

	case ".blend":
		buffer = await convertBlender2GltfUsingBlender(filename);
		break;

	case ".x":
	case ".stl":
	case ".3ds":
	case ".obj":
		buffer = await convertToGlbUsingAssimp(filename);
		break;
	}

	if (!buffer) {
		return new Response("Failed to convert file.", { status: 400 });
	}

	return new Response(buffer, { status: 200 });
}
