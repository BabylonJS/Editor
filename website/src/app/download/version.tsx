"use client";

import { Fade } from "react-awesome-reveal";

import { AppleIcon } from "@/components/icons/apple";
import { WindowsIcon } from "@/components/icons/windows";

export interface IDownloadVersionComponentProps {
    version: string;

    windowsLink: string;

    macArm64Link: string;
    macIntelLink: string;
}

export function DownloadVersionComponent(props: IDownloadVersionComponentProps) {
    return (
        <div className="flex flex-col gap-8 w-full">
            <Fade>
                <div className="text-3xl font-semibold font-sans tracking-tighter text-neutral-500 text-center">
                    {props.version}
                </div>
            </Fade>

            <Fade className="w-full">
                <div className="flex w-full">
                    <div className="flex flex-col gap-4 items-center w-full">
                        <WindowsIcon color="#fff" className="w-20 lg:w-32 h-20 lg:h-32" />

                        <a href={props.windowsLink} download className="font-semibold font-sans tracking-tighter underline underline-offset-2">
                            x64 Installer
                        </a>
                    </div>

                    <div className="flex flex-col gap-4 items-center w-full">
                        <AppleIcon color="#fff" className="w-20 lg:w-32 h-20 lg:h-32" />

                        <a href={props.macArm64Link} download className="font-semibold font-sans tracking-tighter underline underline-offset-2">
                            Apple Silicon
                        </a>

                        <a href={props.macIntelLink} download className="font-semibold font-sans tracking-tighter underline underline-offset-2">
                            Intel Chip
                        </a>
                    </div>
                </div>
            </Fade>
        </div>
    );
}
