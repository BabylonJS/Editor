"use client";

import Link from "next/link";
import { PropsWithChildren } from "react";

export interface ICustomLink extends PropsWithChildren {
	href: string;
}

export function CustomLink(props: ICustomLink) {
	const internal = props.href.startsWith("/");

	return (
		<Link href={props.href} target={internal ? undefined : "_blank"} className="underline underline-offset-4">
			{props.children}
		</Link>
	);
}
