"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_CONFIG } from "./config";

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
			className={`w-full px-5 py-2 rounded-lg hover:bg-neutral-800 ${path === props.href ? "bg-neutral-800" : ""} cursor-pointer transition-all duration-300 ease-in-out ${props.className ?? ""}`}
		>
			{props.title}
		</Link>
	);
}

export function DocumentationSidebar() {
	return (
		<div className="fixed top-0 left-0 w-96 overflow-y-auto mt-20 h-[calc(100vh-5rem)] px-5 pb-5 border-r border-r-neutral-950 text-white">
			<div className="flex flex-col gap-1">
				{DOCS_CONFIG.map((category) => (
					<div key={category.category} className="flex flex-col gap-1">
						<div className="font-semibold text-xl text-neutral-500 my-3">{category.category}</div>
						{category.items.map((item) => (
							<DocumentationSidebarItem key={item.href} title={item.title} href={item.href} />
						))}
					</div>
				))}
			</div>
		</div>
	);
}
