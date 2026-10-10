import type { Metadata } from "next";

import { PropsWithChildren } from "react";

export const metadata: Metadata = {
	title: {
		absolute: "Download Babylon.js Editor for Windows, macOS & Linux",
	},
	description: "Download the Babylon.js Editor for free: Windows installer, macOS builds for Apple Silicon and Intel, and Linux AppImage for x64 and arm64.",
};

export default function DownloadLayout(props: PropsWithChildren) {
	return props.children;
}
