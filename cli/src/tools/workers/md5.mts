import { workerData, parentPort } from "node:worker_threads";

import md5 from "md5";
import fs from "fs-extra";

let content = workerData;

if (typeof workerData === "string") {
	content = await fs.readFile(workerData);
}

const hash = md5(content);
parentPort?.postMessage(hash);
