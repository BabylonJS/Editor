"use client";

import Link from "next/link";

import { Fade } from "react-awesome-reveal";

import { DownloadVersionComponent } from "./version";

export default function DownloadPage() {
	return (
		<main className="min-w-screen min-h-screen p-5 bg-black text-neutral-50">
			<div className="absolute 2xl:fixed top-0 left-0 flex justify-between items-center w-full px-5">
				<Link href="/" className="flex justify-between items-center w-full">
					<img alt="" src="/logo.svg" className="h-14 lg:h-20 -ml-12" />
				</Link>

				<Link href="/documentation" className="flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2">
					Documentation
				</Link>
			</div>

			<div className="flex flex-col gap-10 max-w-4xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Download Babylon.js Editor</div>
					</Fade>

					<DownloadVersionComponent
						version="v5.3.0"
						windowsx64Link="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/updates/BabylonJS%20Editor%20Setup%205.3.0.exe"
						macArm64Link="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/updates/BabylonJS%20Editor-5.3.0-arm64.dmg"
						macIntelLink="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/updates/x64/BabylonJS%20Editor-5.3.0.dmg"
						linuxx64Link="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/updates/BabylonJS%20Editor-5.3.0.AppImage"
						linuxArm64Link="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/updates/BabylonJS%20Editor-5.3.0-arm64.AppImage"
					/>

					<DownloadVersionComponent
						version="v4.7.0"
						windowsx64Link="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/BabylonJS%20Editor%20Setup%204.7.0.exe"
						macArm64Link="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/BabylonJS%20Editor-4.7.0-arm64.dmg"
						macIntelLink="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/BabylonJS%20Editor-4.7.0.dmg"
					/>
				</Fade>
			</div>
		</main>
	);
}
