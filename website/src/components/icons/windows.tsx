"use client";

export function WindowsIcon({ color }: { color?: string; }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" x="0px" y="0px" width="100" height="100" viewBox="0 0 50 50">
            <path fill={color ?? "#000"} d="M4 4H24V24H4zM26 4H46V24H26zM4 26H24V46H4zM26 26H46V46H26z"></path>
        </svg>
    );
}
