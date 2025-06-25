import Link from "next/link";
import type { Metadata } from "next";

import { PropsWithChildren } from "react";

import { DocumentationSidebar } from "./sidebar/sidebar";

export const metadata: Metadata = {
	title: "Babylon.JS Editor Documentation",
	description: "Focus more on creating and less on coding.",
};

export default function DocumentationLayout(props: PropsWithChildren) {
	return (
		<div className="flex w-screen bg-black">
			<DocumentationSidebar />

			<div className="absolute 2xl:fixed top-0 left-0 flex justify-between items-center w-full px-5">
				<Link href="/" className="flex justify-between items-center w-full">
					<img alt="" src="/logo.svg" className="h-14 lg:h-20 -ml-12" />
				</Link>

				<Link href="/download" className="flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2">
                    Download
				</Link>
			</div>

			<div className="pl-96 w-full">
				{props.children}
			</div>
		</div>
	);
}
