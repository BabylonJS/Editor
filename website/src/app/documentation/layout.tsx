import Link from "next/link";
import type { Metadata } from "next";

import { PropsWithChildren } from "react";
import { IoArrowDownCircleSharp } from "react-icons/io5";

import { siteName } from "@/lib/site";
import { Toaster } from "@/components/ui/sonner";

import { DocumentationSidebar } from "./sidebar";

// Fallback for documentation pages that don't export their own metadata (see getDocMetadata).
export const metadata: Metadata = {
	title: {
		default: "Documentation",
		template: `%s | ${siteName}`,
	},
	description: "Learn how to use the Babylon.js Editor: create a project, compose 3D scenes, attach scripts and deploy your game.",
};

export default function DocumentationLayout(props: PropsWithChildren) {
	return (
		<div className="flex w-screen bg-black">
			<DocumentationSidebar />

			<div className="absolute 2xl:fixed top-0 left-0 flex justify-between items-center w-full px-5">
				<Link href="/" className="flex justify-between items-center w-full bg-black">
					<img alt="Babylon.js Editor" src="/logo.svg" className="h-14 lg:h-20 -ml-12" />
				</Link>

				<Link href="/download" className="flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2">
					<IoArrowDownCircleSharp className="w-6 h-6" />
					Download
				</Link>
			</div>

			<div className="pl-96 w-full">{props.children}</div>

			<Toaster className="dark" />
		</div>
	);
}
