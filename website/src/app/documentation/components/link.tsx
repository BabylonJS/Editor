"use client";

import Link from "next/link";
import { PropsWithChildren } from "react";

export interface ICustomLink extends PropsWithChildren {
    href: string;
}

export function CustomLink(props: ICustomLink) {
	return (
		<Link href={props.href} target="_blank" className="underline underline-offset-4">
			{props.children}
		</Link>
	);
}
