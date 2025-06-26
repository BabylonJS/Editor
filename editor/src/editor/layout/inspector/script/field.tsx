import { join, dirname } from "path/posix";
import { pathExists, stat, FSWatcher } from "fs-extra";

import { useEffect, useState } from "react";
import { SiTypescript } from "react-icons/si";

import { XMarkIcon } from "@heroicons/react/20/solid";

import { Vector2, Vector3, Color3, Color4 } from "babylonjs";

import { Editor } from "../../../main";

import { watchFile } from "../../../../tools/fs";
import { execNodePty } from "../../../../tools/node-pty";
import { registerUndoRedo } from "../../../../tools/undoredo";
import { executeSimpleWorker } from "../../../../tools/worker";
import { ensureTemporaryDirectoryExists } from "../../../../tools/project";

import { projectConfiguration } from "../../../../project/configuration";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorVectorField } from "../fields/vector";

import { VisibleInInspectorDecoratorObject, computeDefaultValuesForObject, scriptValues } from "./tools";

const cachedScripts: Record<string, {
    time: number;
    output: VisibleInInspectorDecoratorObject[] | null;
}> = {};

export interface IInspectorScriptFieldProps {
    object: any;
    script: any;
    editor: Editor;

    onRemove: () => void;
}

export function InspectorScriptField(props: IInspectorScriptFieldProps) {
	let srcAbsolutePath = "";
	if (projectConfiguration.path) {
		srcAbsolutePath = join(dirname(projectConfiguration.path), "src", props.script.key);
	}

	const [exists, setExists] = useState<boolean | null>(null);
	const [enabled, setEnabled] = useState(props.script.enabled);
	const [output, setOutput] = useState<VisibleInInspectorDecoratorObject[] | null>(cachedScripts[srcAbsolutePath]?.output);

	const [watcher, setWatcher] = useState<FSWatcher | null>(null);

	useEffect(() => {
		return () => {
			watcher?.close();
		};
	}, [watcher]);

	useEffect(() => {
		checkExists();
	}, [props.script]);

	useEffect(() => {
		if (exists) {
			handleParseVisibleProperties();
		}
	}, [exists]);

	async function checkExists() {
		if (!projectConfiguration.path) {
			return;
		}

		const src = join(dirname(projectConfiguration.path), "src", props.script.key);
		const exists = await pathExists(src);

		setExists(exists);

		if (exists) {
			const watcher = watchFile(src, () => {
				handleParseVisibleProperties();
			});

			setWatcher(watcher);
		}
	}

	async function handleParseVisibleProperties() {
		if (!projectConfiguration.path) {
			return;
		}

		const fStat = await stat(srcAbsolutePath);
		const cached = cachedScripts[srcAbsolutePath];

		if (!cached || cached.time !== fStat.mtimeMs) {
			const temporaryDirectory = await ensureTemporaryDirectoryExists(projectConfiguration.path);
			const outputAbsolutePath = join(temporaryDirectory, "scripts", `${props.script.key.replace(/\//g, "_")}.js`);

			const workerPath = join(__dirname.replace(/\\/g, "/"), "../../../../tools/workers/script.js");

			const compilationSuccess = await executeSimpleWorker<{ success: boolean; error?: string; }>(workerPath, {
				action: "compile",
				srcAbsolutePath,
				outputAbsolutePath,
			});

			if (!compilationSuccess.success) {
				return props.editor.layout.console.error(`An unexpected error occurred while compiling the script:\n ${compilationSuccess.error}`);
			}

			const extractOutput = await executeSimpleWorker<VisibleInInspectorDecoratorObject[] | null>(workerPath, {
				action: "extract",
				outputAbsolutePath,
			});

			cachedScripts[srcAbsolutePath] = {
				time: fStat.mtimeMs,
				output: extractOutput,
			};

			if (extractOutput) {
				computeDefaultValuesForObject(props.script, extractOutput);
			}
		}

		setOutput(cachedScripts[srcAbsolutePath]?.output);
	}

	return (
		<div className="flex flex-col gap-2 bg-muted-foreground/35 dark:bg-muted-foreground/5 rounded-lg px-5 pb-2.5">
			<div className="flex gap-[10px]">
				<SiTypescript
					size="80px"
					className={`${enabled ? "opacity-100" : "opacity-15"} transition-all duration-300 ease-in-out`}
				/>

				<div className="flex flex-col gap-1 w-full py-2.5">
					<div
						onClick={() => srcAbsolutePath && execNodePty(`code ${srcAbsolutePath}`)}
						className={`font-bold px-2 hover:underline transition-all duration-300 ease-in-out cursor-pointer ${exists !== false ? "" : "text-red-400"}`}
					>
						{props.script.key} {exists !== false ? "" : "(Not found)"}
					</div>

					<EditorInspectorSwitchField object={props.script} property="enabled" label="Enabled" onChange={(v) => setEnabled(v)} />
				</div>

				<div className="flex justify-center items-center w-10 h-10 p-1 hover:bg-secondary rounded-lg my-auto transition-all duration-300" onClick={() => props.onRemove()}>
					<XMarkIcon className="w-6 h-6" />
				</div>
			</div>

			{output &&
                <div className="flex flex-col gap-2">
                	{output.map((value) => {
                		switch (value.configuration.type) {
                		case "boolean":
                			return (
                				<EditorInspectorSwitchField
                					object={props.script[scriptValues][value.propertyKey]}
                					property="value"
                					label={value.label ?? value.propertyKey}
                					tooltip={value.configuration.description}
                				/>
                			);

                		case "number":
                			return (
                				<EditorInspectorNumberField
                					object={props.script[scriptValues][value.propertyKey]}
                					property="value"
                					label={value.label ?? value.propertyKey}
                					min={value.configuration.min}
                					max={value.configuration.max}
                					step={value.configuration.step}
                					tooltip={value.configuration.description}
                				/>
                			);

                		case "vector2":
                		case "vector3":
                			const tempVector = {
                				value: value.configuration.type === "vector2"
                					? Vector2.FromArray(props.script[scriptValues][value.propertyKey].value)
                					: Vector3.FromArray(props.script[scriptValues][value.propertyKey].value),
                			};

                			return (
                				<EditorInspectorVectorField
                					noUndoRedo
                					object={tempVector}
                					property="value"
                					label={value.label ?? value.propertyKey}
                					asDegrees={value.configuration.asDegrees}
                					onFinishChange={() => {
                						const oldValue = props.script[scriptValues][value.propertyKey].value.slice();

                						registerUndoRedo({
                							executeRedo: true,
                							undo: () => props.script[scriptValues][value.propertyKey].value = oldValue,
                							redo: () => props.script[scriptValues][value.propertyKey].value = tempVector.value.asArray(),
                						});
                					}}
                					tooltip={value.configuration.description}
                				/>
                			);

                		case "color3":
                		case "color4":
                			const tempColor = {
                				value: value.configuration.type === "color3"
                					? Color3.FromArray(props.script[scriptValues][value.propertyKey].value)
                					: Color4.FromArray(props.script[scriptValues][value.propertyKey].value),
                			};

                			return (
                				<EditorInspectorColorField
                					noUndoRedo
                					object={tempColor}
                					property="value"
                					label={value.label ?? value.propertyKey}
                					noClamp={value.configuration.noClamp}
                					noColorPicker={value.configuration.noColorPicker}
                					onFinishChange={() => {
                						const oldValue = props.script[scriptValues][value.propertyKey].value.slice();

                						registerUndoRedo({
                							executeRedo: true,
                							undo: () => props.script[scriptValues][value.propertyKey].value = oldValue,
                							redo: () => props.script[scriptValues][value.propertyKey].value = tempColor.value.asArray(),
                						});
                					}}
                					tooltip={value.configuration.description}
                				/>
                			);

                		default:
                			return null;
                		}
                	})}
                </div>
			}
		</div>
	);
}
