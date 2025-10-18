export async function computeSpritePreviewImagesFromDimensions(imagePath: string, cellWidth: number, cellHeight: number) {
	const image = new Image();
	await new Promise<void>((resolve, reject) => {
		image.addEventListener("load", () => resolve());
		image.addEventListener("error", (err) => reject(err));
		image.src = imagePath;
	});

	const canvas = document.createElement("canvas");

	const cols = Math.floor(image.width / cellWidth);
	const rows = Math.floor(image.height / cellHeight);

	const previews: string[] = [];

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const context = canvas.getContext("2d");
			if (!context) {
				continue;
			}

			canvas.width = cellWidth;
			canvas.height = cellHeight;

			context.fillStyle = "rgba(0,0,0,0)";
			context?.clearRect(0, 0, cellWidth, cellHeight);
			context.drawImage(image, col * cellWidth, row * cellHeight, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);

			const data = context.getImageData(0, 0, cellWidth, cellHeight).data;
			let isEmpty = true;
			for (let i = 3; i < data.length; i += 4) {
				if (data[i] !== 0) {
					isEmpty = false;
					break;
				}
			}

			if (!isEmpty) {
				previews.push(canvas.toDataURL("image/png"));
			}
		}
	}

	return previews;
}
