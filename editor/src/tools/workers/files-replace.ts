addEventListener("message", async (event) => {
	const entries = event.data.entries;
	const allFiles = event.data.allFiles;

	const { readFile, writeFile } = require("fs-extra");

	await Promise.all(
		allFiles.map(async (file: string) => {
			try {
				let data = await readFile(file, "utf-8");

				for (const [originalRelativePath, cache] of entries) {
					const regex = new RegExp(originalRelativePath, "g");
					data = data.replace(regex, cache.newRelativePath);
				}

				await writeFile(file, data, "utf-8");
			} catch (e) {
				// Catch silently.
			}
		})
	);

	postMessage(true);
});
