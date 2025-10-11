import { waitNextAnimationFrame } from "../tools";

export async function computeSpritePreviewImages(data: any, imagePath: string) {
	const image = new Image();
	await new Promise<void>((resolve, reject) => {
		image.addEventListener("load", () => resolve());
		image.addEventListener("error", (err) => reject(err));
		image.src = imagePath;
	});

	const canvas = document.createElement("canvas");
	for (const f of data.frames) {
		if (f._preview) {
			continue;
		}

		canvas.width = f.frame.w;
		canvas.height = f.frame.h;

		const context = canvas.getContext("2d");
		if (!context) {
			return;
		}

		context.fillStyle = "rgba(0,0,0,0)";
		context?.clearRect(0, 0, f.frame.w, f.frame.h);
		context.drawImage(image, f.frame.x, f.frame.y, f.frame.w, f.frame.h, 0, 0, f.frame.w, f.frame.h);

		f._preview = canvas.toDataURL("image/png");

		await waitNextAnimationFrame();
	}
}
