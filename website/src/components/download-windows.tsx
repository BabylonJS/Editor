"use client";

import { WindowsIcon } from "./icons/windows";

export function DownloadWindowsComponent() {
    return (
        <button className="flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2">
            <WindowsIcon />
            Download for Windows
        </button>
    );
}
