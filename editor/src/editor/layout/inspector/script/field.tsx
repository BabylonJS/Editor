import { join, dirname } from "path/posix";
import { pathExists, stat } from "fs-extra";

import { useEffect, useState } from "react";
import { SiTypescript } from "react-icons/si";

import { XMarkIcon } from "@heroicons/react/20/solid";

import { Vector2, Vector3 } from "babylonjs";

import { execNodePty } from "../../../../tools/node-pty";
import { registerUndoRedo } from "../../../../tools/undoredo";
import { executeSimpleWorker } from "../../../../tools/worker";

import { projectConfiguration } from "../../../../project/configuration";

import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorVectorField } from "../fields/vector";

import { VisibleInInspectorDecoratorObject, computeDefaultValuesForObject, scriptValues } from "./tools";

const cachedScripts: Record<string, {
    time: number;
    output: VisibleInInspectorDecoratorObject[];
}> = {};

export interface IInspectorScriptFieldProps {
    object: any;
    script: any;
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
    }

    async function handleParseVisibleProperties() {
        if (!projectConfiguration.path) {
            return;
        }

        const fStat = await stat(srcAbsolutePath);
        const cached = cachedScripts[srcAbsolutePath];

        if (!cached || cached.time !== fStat.mtimeMs) {
            const srcSplit = srcAbsolutePath.split(".");
            srcSplit.pop();

            const outputAbsolutePath = `${srcSplit.join(".")}.js`;

            const output = await executeSimpleWorker<VisibleInInspectorDecoratorObject[] | null>(
                join(__dirname.replace(/\\/g, "/"), "../../../../tools/workers/script.js"),
                {
                    srcAbsolutePath,
                    outputAbsolutePath,
                },
            );

            if (output) {
                cachedScripts[srcAbsolutePath] = {
                    output,
                    time: fStat.mtimeMs,
                };

                computeDefaultValuesForObject(props.script, output);
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
                                    />
                                );

                            case "vector2":
                            case "vector3":
                                const o = {
                                    value: value.configuration.type === "vector2"
                                        ? Vector2.FromArray(props.script[scriptValues][value.propertyKey].value)
                                        : Vector3.FromArray(props.script[scriptValues][value.propertyKey].value),
                                };

                                return (
                                    <EditorInspectorVectorField
                                        noUndoRedo
                                        object={o}
                                        property="value"
                                        label={value.label ?? value.propertyKey}
                                        asDegrees={value.configuration.asDegrees}
                                        onFinishChange={() => {
                                            const oldValue = props.script[scriptValues][value.propertyKey].value.slice();

                                            registerUndoRedo({
                                                executeRedo: true,
                                                undo: () => props.script[scriptValues][value.propertyKey].value = oldValue,
                                                redo: () => props.script[scriptValues][value.propertyKey].value = o.value.asArray(),
                                            });
                                        }}
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
