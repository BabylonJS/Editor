"use client";

import Link from "next/link";

import { Fade } from "react-awesome-reveal";

import { AppleIcon } from "@/components/icons/apple";
import { WindowsIcon } from "@/components/icons/windows";

export default function DownloadPage() {
    return (
        <main className="min-w-screen min-h-screen p-5 bg-black text-neutral-50">
            <div className="absolute 2xl:fixed top-0 left-0 w-full px-5">
                <Link href="/" className="flex justify-between items-center w-full">
                    <img alt="" src="/logo.svg" className="h-14 lg:h-20 -ml-12" />
                </Link>
            </div>

            <div className="flex flex-col gap-10 max-w-3xl mx-auto pt-32">
                <Fade cascade damping={0.1} triggerOnce className="w-full">
                    <Fade>
                        <div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">
                            Download Babylon.JS Editor
                        </div>
                    </Fade>

                    <Fade>
                        <div className="text-3xl font-semibold font-sans tracking-tighter text-neutral-500 text-center">
                            v5.0.0-alpha.1
                        </div>
                    </Fade>

                    <Fade className="w-full">
                        <div className="flex w-full">
                            <div className="flex flex-col gap-4 items-center w-full">
                                <WindowsIcon color="#fff" className="w-32 h-32" />

                                <Link href="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/BabylonJS%20Editor%20Setup%205.0.0.exe" className="font-semibold font-sans tracking-tighter underline underline-offset-2">
                                    Windows 64bits Installer
                                </Link>
                            </div>

                            <div className="flex flex-col gap-4 items-center w-full">
                                <AppleIcon color="#fff" className="w-32 h-32" />

                                <Link href="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/BabylonJS%20Editor-5.0.0-arm64.dmg" className="font-semibold font-sans tracking-tighter underline underline-offset-2">
                                    macOS Apple Silicon
                                </Link>

                                <Link href="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/BabylonJS%20Editor-5.0.0.dmg" className="font-semibold font-sans tracking-tighter underline underline-offset-2">
                                    macOS Intel Chip
                                </Link>
                            </div>
                        </div>
                    </Fade>
                </Fade>
            </div>
        </main>
    );
}
