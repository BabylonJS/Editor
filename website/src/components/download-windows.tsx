"use client";

export function DownloadWindowsComponent() {
    return (
        <button className="flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" x="0px" y="0px" width="100" height="100" viewBox="0 0 50 50">
                <path d="M4 4H24V24H4zM26 4H46V24H26zM4 26H24V46H4zM26 26H46V46H26z"></path>
            </svg>
            Download for Windows
        </button>
    );
}
