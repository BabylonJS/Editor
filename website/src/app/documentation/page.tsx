"use client";

import Link from "next/link";

import { Fade } from "react-awesome-reveal";

import { DocumentationSidebarItem } from "./sidebar/item";

export default function DocumentationPage() {
    return (
        <main className="w-full min-h-screen p-5 bg-black text-neutral-50">
            <div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
                <Fade cascade damping={0.1} triggerOnce className="w-full">
                    <Fade>
                        <div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">
                            Babylon.JS Editor documentation
                        </div>
                    </Fade>
                </Fade>

                <Fade triggerOnce>
                    <div className="flex flex-col gap-4">
                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Introduction
                        </div>

                        <div>
                            Babylon.JS Editor is a visual editor for Babylon.JS. It allows you to create and edit scenes, materials, attach scripts and more.
                            <br />
                            The Babylon.JS Editor is available on both <b>Windows</b> and <b>macOS</b> platforms.
                        </div>

                        <div>
                            The goal is to provide a simple and easy-to-use interface for creating and editing Babylon.JS applications such as video games.
                            It includes a large variety of optimization tools, such as compressed textures generation, LOD collisions and more.
                        </div>

                        <div>
                            The Babylon.JS Editor is free and open-source. You can find the source code on <b><Link target="_blank" href="https://github.com/BabylonJS/Editor" className="underline underline-offset-4">GitHub</Link></b>.
                        </div>

                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Table of contents
                        </div>

                        <div className="flex flex-col gap-1">
                            <DocumentationSidebarItem title="Introduction" href="/documentation" />
                            <DocumentationSidebarItem title="Creating project" href="/documentation/creating-project" />
                            <DocumentationSidebarItem title="Composing scene" href="/documentation/composing-scene" />
                        </div>
                    </div>
                </Fade>
            </div>
        </main>
    );
}
