import { basename } from "path/posix";
import { workerData, parentPort } from "worker_threads";

const assimpjs = require("assimpjs")();

const AssimpPostProcessFlags = {
	aiProcess_LimitBoneWeights: 0x200000,
} as const;

assimpjs.then((ajs) => {
	const fileList = new ajs.FileList();
	fileList.AddFile(basename(workerData.absolutePath), new Uint8Array(workerData.content));

	const postProcessFlags =
		AssimpPostProcessFlags.aiProcess_LimitBoneWeights;
	const result = ajs.ConvertFileList(fileList, "assjson", postProcessFlags);

	if (!result.IsSuccess() || result.FileCount() === 0) {
		console.log(result.GetErrorCode());
		return parentPort?.postMessage(null);
	}

	const files: string[] = [];
	for (let i = 0; i < result.FileCount(); ++i) {
		const decoded = new TextDecoder().decode(result.GetFile(i).GetContent());
		files.push(decoded);
	}

	parentPort?.postMessage(files.map((f) => JSON.parse(f)));
});
