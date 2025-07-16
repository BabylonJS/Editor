"use client";

import { AppleIcon } from "./icons/apple";

export function DownloadMacComponent() {
	return (
		<button className={`flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2`}>
			<AppleIcon />
            Download for macOS
		</button>
	);
}
