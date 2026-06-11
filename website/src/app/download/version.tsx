"use client";

import { Fade } from "react-awesome-reveal";

import { LinuxIcon } from "@/components/icons/linux";
import { AppleIcon } from "@/components/icons/apple";
import { WindowsIcon } from "@/components/icons/windows";

export interface IDownloadVersionComponentProps {
	version: string;

	windowsx64Link: string;
	windowsArm64Link?: string;

	macArm64Link: string;
	macIntelLink: string;

	linuxx64Link?: string;
	linuxArm64Link?: string;
}

export function DownloadVersionComponent(props: IDownloadVersionComponentProps) {
	function handleCallHook(platform: string, arch: string) {
		fetch("/api/hooks/download", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				content: `${platform} ${arch}`,
			}),
		});
	}

	return (
		<div className="flex flex-col gap-8 w-full">
			<Fade>
				<div className="text-3xl font-semibold font-sans tracking-tighter text-neutral-500 text-center">{props.version}</div>
			</Fade>

			<Fade className="w-full">
				<div className="flex flex-col gap-10 sm:flex-row sm:gap-0 w-full">
					<div className="flex flex-col gap-4 items-center w-full">
						<WindowsIcon color="#fff" className="w-20 lg:w-32 h-20 lg:h-32" />

						<a
							download
							href={props.windowsx64Link}
							onClick={() => handleCallHook("Windows", "x64")}
							className="font-semibold font-sans tracking-tighter underline underline-offset-2"
						>
							x64 Installer
						</a>

						{props.windowsArm64Link && (
							<a
								download
								href={props.windowsArm64Link}
								onClick={() => handleCallHook("Windows", "arm64")}
								className="font-semibold font-sans tracking-tighter underline underline-offset-2"
							>
								arm64 Installer
							</a>
						)}
					</div>

					<div className="flex flex-col gap-4 items-center w-full">
						<AppleIcon color="#fff" className="w-20 lg:w-32 h-20 lg:h-32" />

						<a
							download
							href={props.macArm64Link}
							onClick={() => handleCallHook("macOS", "arm64")}
							className="font-semibold font-sans tracking-tighter underline underline-offset-2"
						>
							Apple Silicon
						</a>

						<a
							download
							href={props.macIntelLink}
							onClick={() => handleCallHook("macOS", "x64")}
							className="font-semibold font-sans tracking-tighter underline underline-offset-2"
						>
							Intel Chip
						</a>
					</div>

					{(props.linuxx64Link || props.linuxArm64Link) && (
						<div className="flex flex-col gap-4 items-center w-full">
							<LinuxIcon color="#fff" className="w-20 lg:w-32 h-20 lg:h-32" />

							{props.linuxx64Link && (
								<a
									download
									href={props.linuxx64Link}
									onClick={() => handleCallHook("Linux", "x64")}
									className="font-semibold font-sans tracking-tighter underline underline-offset-2"
								>
									x64 AppImage
								</a>
							)}

							{props.linuxArm64Link && (
								<a
									download
									href={props.linuxArm64Link}
									onClick={() => handleCallHook("Linux", "arm64")}
									className="font-semibold font-sans tracking-tighter underline underline-offset-2"
								>
									arm64 AppImage
								</a>
							)}
						</div>
					)}
				</div>
			</Fade>
		</div>
	);
}
