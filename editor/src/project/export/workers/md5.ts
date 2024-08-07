const md5 = require("md5");
const { readFile } = require("fs-extra");

addEventListener("message", async (event) => {
    const content = await readFile(event.data);
    const hash = md5(content);

    postMessage(hash);
});
