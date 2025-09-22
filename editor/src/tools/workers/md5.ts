const md5 = require("md5");
const { readFile } = require("fs-extra");

addEventListener("message", async (event) => {
	let content = event.data;

	if (typeof event.data === "string") {
		content = await readFile(event.data);
	}

	const hash = md5(content);

	postMessage(hash);
});
