"use client";

import Link from "next/link";

import { PropsWithChildren } from "react";

import { DocumentationSidebar } from "./sidebar/sidebar";

export default function DocumentationLayout(props: PropsWithChildren) {
    return (
        <div className="flex w-screen">
            <div className="absolute 2xl:fixed top-0 left-0 flex justify-between items-center w-full px-5">
                <Link href="/" className="flex justify-between items-center w-full">
                    <img alt="" src="/logo.svg" className="h-14 lg:h-20 -ml-12" />
                </Link>

                <Link href="/download" className="flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2">
                    Download
                </Link>
            </div>

            <DocumentationSidebar />

            {props.children}
        </div>
    );
}
