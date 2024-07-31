"use client";

import Link from "next/link";

import { Fade } from "react-awesome-reveal";

import { AppleIcon } from "@/components/icons/apple";
import { WindowsIcon } from "@/components/icons/windows";

import { DownloadVersionComponent } from "./version";

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

                    <DownloadVersionComponent
                        version="v5.0.0-alpha.4"
                        windowsLink="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/BabylonJS%20Editor%20Setup%205.0.0.exe"
                        macArm64Link="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/BabylonJS%20Editor-5.0.0-arm64.dmg"
                        macIntelLink="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/BabylonJS%20Editor-5.0.0.dmg"
                    />

                    <DownloadVersionComponent
                        version="v4.7.0"
                        windowsLink="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/BabylonJS%20Editor%20Setup%204.7.0.exe"
                        macArm64Link="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/BabylonJS%20Editor-4.7.0-arm64.dmg"
                        macIntelLink="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/BabylonJS%20Editor-4.7.0.dmg"
                    />
                </Fade>
            </div>
        </main>
    );
}
