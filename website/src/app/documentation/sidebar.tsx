"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface IDocumentationSidebarItemProps {
	href: string;
	title: string;

	className?: string;
}

export function DocumentationSidebarItem(props: IDocumentationSidebarItemProps) {
	const path = usePathname();

	return (
		<Link
			href={props.href}
			className={`w-full px-5 py-2 rounded-lg hover:bg-neutral-800 ${path === props.href ? "bg-neutral-800" : ""} cursor-pointer transition-all duration-300 ease-in-out ${props.className}`}
		>
			{props.title}
		</Link>
	);
}

export function DocumentationSidebar() {
	return (
		<div className="fixed top-0 left-0 w-96 overflow-y-auto mt-20 h-[calc(100vh-5rem)] px-5 pb-5 border-r border-r-neutral-950 text-white">
			<div className="flex flex-col gap-1">
				<div className="font-semibold text-xl text-neutral-500 my-3">Basics</div>

				<DocumentationSidebarItem title="Introduction" href="/documentation" />
				<DocumentationSidebarItem title="Creating project" href="/documentation/basics/creating-project" />
				<DocumentationSidebarItem title="Composing scene" href="/documentation/basics/composing-scene" />
				<DocumentationSidebarItem title="Managing assets" href="/documentation/basics/managing-assets" />
				<DocumentationSidebarItem title="Adding scripts" href="/documentation/basics/adding-scripts" />
				<DocumentationSidebarItem title="Running project" href="/documentation/basics/running-project" />

				<div className="font-semibold text-xl text-neutral-500 my-3">Scripting</div>

				<DocumentationSidebarItem title="Customizing scripts" href="/documentation/scripting/customizing-scripts" />
				<DocumentationSidebarItem title="Listening events" href="/documentation/scripting/listening-events" />
				<DocumentationSidebarItem title="Linking assets" href="/documentation/scripting/linking-assets" />

				<div className="font-semibold text-xl text-neutral-500 my-3">Sprites</div>

				<DocumentationSidebarItem title="Using Sprite Manager" href="/documentation/sprites/using-sprite-manager" />

				<div className="font-semibold text-xl text-neutral-500 my-3">Deploying</div>

				<DocumentationSidebarItem title="Using Babylon.js Editor CLI" href="/documentation/deploying/babylonjs-editor-cli" />

				<div className="font-semibold text-xl text-neutral-500 my-3">Plugins</div>

				<DocumentationSidebarItem title="Using Fab Plugin" href="/documentation/plugins/fab" />

				<div className="font-semibold text-xl text-neutral-500 my-3">Advanced</div>

				<DocumentationSidebarItem title="Compressing textures" href="/documentation/advanced/compressing-textures" />
				<DocumentationSidebarItem title="LOD collisions" href="/documentation/advanced/lod-collisions" />
				<DocumentationSidebarItem title="Optimizing shadows" href="/documentation/advanced/optimizing-shadows" />

				<div className="font-semibold text-xl text-neutral-500 my-3">Tips</div>

				<DocumentationSidebarItem title="Shortcuts" href="/documentation/tips/shortcuts" />
				<DocumentationSidebarItem title="Creating a Skybox" href="/documentation/tips/creating-skybox" />
			</div>
		</div>
	);
}
