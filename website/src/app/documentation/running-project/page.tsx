"use client";

import { Fade } from "react-awesome-reveal";

import { NextChapterComponent } from "../components/next-chapter";

export default function DocumentationRunningProjectPage() {
    return (
        <main className="w-full min-h-screen p-5 bg-black text-neutral-50">
            <div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
                <Fade cascade damping={0.1} triggerOnce className="w-full">
                    <Fade>
                        <div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">
                            Running project
                        </div>
                    </Fade>
                </Fade>

                <Fade triggerOnce>
                    <div className="flex flex-col gap-4">
                        <div className="text-3xl md:text-2xl lg:text-3xl my-3">
                            Coming soon
                        </div>

                        <NextChapterComponent href="/documentation/advanced/compressing-textures" title="Compressing textures" />
                    </div>
                </Fade>
            </div>
        </main>
    );
}
