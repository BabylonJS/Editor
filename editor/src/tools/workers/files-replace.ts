addEventListener("message", async (event) => {
	const entries = event.data.entries;
	const allFiles = event.data.allFiles;

	const { readFile, writeFile } = require("fs-extra");

	await Promise.all(
		allFiles.map(async (file: string) => {
			try {
				let data = await readFile(file, "utf-8");

				for (const [oldRelativePath, cache] of entries) {
					// Full relative path
					const regex = new RegExp(oldRelativePath, "g");
					data = data.replace(regex, cache.newRelativePath);

					// Special case for scripts where "src" is not part of the path
					if (oldRelativePath.startsWith("src/") && cache.newRelativePath.startsWith("src/")) {
						const srcRegex = new RegExp(oldRelativePath.replace("src/", ""), "g");
						data = data.replace(srcRegex, cache.newRelativePath.replace("src/", ""));
					}
				}

				await writeFile(file, data, "utf-8");
			} catch (e) {
				// Catch silently.
			}
		})
	);

	postMessage(true);
});
