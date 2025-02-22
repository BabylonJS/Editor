"use client";

import { Fade } from "react-awesome-reveal";
import { CopyBlock, github } from "react-code-blocks";

import { IoIosWarning } from "react-icons/io";

import { NextChapterComponent } from "../components/next-chapter";

github.codeColor = "rgb(250, 250, 250)";
github.backgroundColor = "rgb(250, 250, 250)";

export default function DocumentationAddingScriptsPage() {
    return (
        <main className="w-full min-h-screen p-5 bg-black text-neutral-50">
            <div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
                <Fade cascade damping={0.1} triggerOnce className="w-full">
                    <Fade>
                        <div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">
                            Adding scripts
                        </div>
                    </Fade>
                </Fade>

                <Fade triggerOnce>
                    <div className="flex flex-col gap-4">
                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Introduction
                        </div>

                        <div>
                            The editor allows to add scripts to your project in order to add interactivity to your scenes.
                            The scripts are written in TypeScript and consist on 2 main methods:
                        </div>

                        <ul className="list-disc">
                            <li><b>onStart</b>: Called when the script is loaded and the scene is ready.</li>
                            <li><b>onUpdate</b>: Called each time a frame is rendered on the screen.</li>
                        </ul>

                        <div>
                            Linked with the <b>babylonjs-editor-tools</b> package installed with the project, some useful decorators are available
                            to help retrieving objects and customizing the scripts.
                        </div>

                        <div className="flex gap-2 items-center">
                            <IoIosWarning size="32px" />

                            <div>
                                This feature is still <b>Work in progress</b> and some features like decorators are not yet available for function-based scripts.
                            </div>
                        </div>

                        <div>
                            Scripts can be written using both methods <b>class-based</b>:
                        </div>

                        <CopyBlock
                            theme={github}
                            language="typescript"
                            showLineNumbers={false}
                            text={tsClassBasedExample}
                        />

                        <div>
                            and <b>function-based</b>:
                        </div>

                        <CopyBlock
                            theme={github}
                            language="typescript"
                            showLineNumbers={false}
                            text={tsFunctionBasedExample}
                        />

                        <NextChapterComponent href="/documentation/advanced/compressing-textures" title="Compressing textures" />
                    </div>
                </Fade>
            </div>
        </main>
    );
}

const tsClassBasedExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";

export default class MyScriptComponent {
    public constructor(public mesh: Mesh) { }

    public onStart(): void {
        // Do something when the script is loaded
    }

    public onUpdate(): void {
        this.mesh.rotation.y += 0.04 * this.mesh.getScene().getAnimationRatio();
    }
}
`;

const tsFunctionBasedExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";

export function onStart(mesh: Mesh): void {
    // Do something when the script is loaded
}

export function onUpdate(mesh: Mesh): void {
    mesh.rotation.y += 0.04 * mesh.getScene().getAnimationRatio();
}
`;
