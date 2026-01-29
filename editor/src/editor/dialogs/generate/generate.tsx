import { join } from "path/posix";
import { pathExists } from "fs-extra";

import dotEnv from "dotenv";

import { useEffect, useState } from "react";

import { Grid } from "react-loader-spinner";
import { FaCheckCircle } from "react-icons/fa";

import { IPackStepDetails, pack, PackStepType, s3, overrideWorkerMethods } from "babylonjs-editor-cli";

import { Alert, AlertDescription, AlertTitle } from "../../../ui/shadcn/ui/alert";

import { getProjectAssetsRootUrl } from "../../../project/configuration";
import { getCompressedTexturesCliPath } from "../../../project/export/ktx";

import { IEditorGenerateOptions } from "./generate-project";
import { executeSimpleWorker, loadWorker } from "../../../tools/worker";

export interface IEditorGenerateComponentProps {
	options: IEditorGenerateOptions;
	onComplete: () => void;
}

export function EditorGenerateComponent(props: IEditorGenerateComponentProps) {
	const [status, setStatus] = useState<Record<PackStepType, IPackStepDetails>>({
		assets: {},
		scenes: {},
		upload: {},
	});

	useEffect(() => {
		handleGenerate();
	}, []);

	async function handleGenerate() {
		const projectDir = getProjectAssetsRootUrl();
		if (!projectDir) {
			return;
		}

		overrideWorkerMethods(loadWorker, executeSimpleWorker);

		await pack(projectDir, {
			optimize: props.options.optimize,
			pvrTexToolAbsolutePath: getCompressedTexturesCliPath() ?? undefined,
			onStepChanged: (step: PackStepType, detail?: IPackStepDetails) => {
				setStatus((prevStatus) => ({
					...prevStatus,
					[step]: detail,
				}));
			},
		});

		if (props.options.uploadToS3) {
			const dotEnvPath = join(projectDir, ".env");

			if (await pathExists(dotEnvPath)) {
				const result = dotEnv.config({
					processEnv: {},
					path: dotEnvPath,
				});

				await s3(projectDir, {
					noPack: true,
					optimize: true,
					region: result.parsed?.SPACE_REGION,
					endpoint: result.parsed?.SPACE_END_POINT,
					accessKeyId: result.parsed?.SPACE_KEY,
					secretAccessKey: result.parsed?.SPACE_SECRET,
					rootKey: result.parsed?.SPACE_ROOT_KEY,
					onStepChanged: (step: PackStepType, detail?: IPackStepDetails) => {
						setStatus((prevStatus) => ({
							...prevStatus,
							[step]: detail,
						}));
					},
				});
			}
		}

		props.onComplete();
	}

	return (
		<div className="flex flex-col gap-2">
			<Alert
				variant="default"
				className={`
                    flex gap-4 items-center
                    ${status.assets.success ? "bg-green-900/35" : ""}
                    ${status.assets.message ? "opacity-100" : "opacity-35"}
                    transition-all duration-300 ease-in-out
                `}
			>
				{status.assets.success && <FaCheckCircle />}
				{!status.assets.success && status.assets.message && <Grid width={24} height={24} color="gray" />}

				<div className="flex flex-col">
					<AlertTitle>Assets</AlertTitle>
					<AlertDescription className="w-72 overflow-hidden text-ellipsis whitespace-nowrap">{status.assets.message ?? "..."}</AlertDescription>
				</div>
			</Alert>

			<Alert
				variant="default"
				className={`
                    flex gap-4 items-center
                    ${status.scenes.success ? "bg-green-500/10" : ""}
                    ${status.scenes.message ? "opacity-100" : "opacity-35"}
                    transition-all duration-300 ease-in-out
                `}
			>
				{status.scenes.success && <FaCheckCircle />}
				{!status.scenes.success && status.scenes.message && <Grid width={24} height={24} color="gray" />}

				<div className="flex flex-col">
					<AlertTitle>Scenes</AlertTitle>
					<AlertDescription className="w-72 overflow-hidden text-ellipsis whitespace-nowrap">{status.scenes.message ?? "..."}</AlertDescription>
				</div>
			</Alert>

			{props.options.uploadToS3 && (
				<Alert
					variant="default"
					className={`
                        flex gap-4 items-center
                        ${status.upload.success ? "bg-green-500/10" : ""}
                        ${status.upload.message ? "opacity-100" : "opacity-35"}
                        transition-all duration-300 ease-in-out
                    `}
				>
					{status.upload.success && <FaCheckCircle />}
					{!status.upload.success && status.upload.message && <Grid width={24} height={24} color="gray" />}

					<div className="flex flex-col">
						<AlertTitle>Upload to S3</AlertTitle>
						<AlertDescription className="w-72 overflow-hidden text-ellipsis whitespace-nowrap">{status.upload.message ?? "..."}</AlertDescription>
					</div>
				</Alert>
			)}
		</div>
	);
}
