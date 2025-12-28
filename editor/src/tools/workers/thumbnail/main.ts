const meshPreview = require("./mesh");
const materialPreview = require("./material");

addEventListener("message", async (event) => {
	const type = event.data.type;
	switch (type) {
		case "material":
			let materialThumbnail: string;
			try {
				materialThumbnail = await materialPreview.getPreview(event.data.absolutePath, event.data.rootUrl, event.data.serializedEnvironmentTexture);
			} catch (e) {
				materialThumbnail = "";
			}

			return postMessage({
				id: event.data.id,
				preview: materialThumbnail,
			});

		case "mesh":
			let meshThumbnail: string;
			try {
				meshThumbnail = await meshPreview.getPreview(
					event.data.absolutePath,
					event.data.rootUrl,
					event.data.appPath,
					event.data.serializedEnvironmentTexture,
					event.data.serializedOverrideMaterial
				);
			} catch (e) {
				meshThumbnail = "";
			}

			return postMessage({
				id: event.data.id,
				preview: meshThumbnail,
			});
	}
});
