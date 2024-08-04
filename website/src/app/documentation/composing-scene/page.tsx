"use client";

import Link from "next/link";

import { Fade } from "react-awesome-reveal";
import { IoIosWarning } from "react-icons/io";

import { NextChapterComponent } from "../components/next-chapter";

export default function DocumentationComposingScenePage() {
    return (
        <main className="w-full min-h-screen p-5 bg-black text-neutral-50">
            <div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
                <Fade cascade damping={0.1} triggerOnce className="w-full">
                    <Fade>
                        <div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">
                            Composing scene
                        </div>
                    </Fade>
                </Fade>

                <Fade triggerOnce>
                    <div className="flex flex-col gap-4">
                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Introduction
                        </div>

                        <div>
                            The layout of the editor is divided into 4 main parts:
                        </div>

                        <ul className="list-disc">
                            <li>
                                <b>Graph</b>: by default on the left side, shows the structure of the scene that is being edited.
                            </li>
                            <li>
                                <b>Preview</b>: by default in center, where you can see and interact with the scene.
                            </li>
                            <li>
                                <b>Inspector</b>: by default on the right side, where you can see and edit the properties of the selected object.
                            </li>
                            <li>
                                <b>Assets Browser</b>: by default on the bottom side, where you can see and manage the assets of the project (textures, materials, meshes, etc.).
                            </li>
                        </ul>

                        <div>
                            Each time a node is clicked in the graph or in the preview, the inspector is updated to show the properties of the selected object.
                            <br />
                            The layout of the inspector may change according to the nature of the edited object.
                        </div>

                        <NextChapterComponent href="/documentation/adding-materials" title="Adding materials" />
                    </div>
                </Fade>
            </div>
        </main>
    );
}
