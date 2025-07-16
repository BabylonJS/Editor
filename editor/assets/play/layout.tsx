"use server";

import { PropsWithChildren } from "react";

import { notFound } from "next/navigation";

export default function RootLayout(props: PropsWithChildren) {
	if (process.env.NODE_ENV !== "development") {
		notFound();
	}

	return props.children;
}
