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
