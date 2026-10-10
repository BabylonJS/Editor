"use client";

import React, { PropsWithChildren, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Fade } from "react-awesome-reveal";
import { JsonLd } from "@/components/json-ld";
import { siteName, siteUrl } from "@/lib/site";
import { getDocItemByPath, IDocItem } from "../config";
import { DocPagination } from "./doc-pagination";

export interface IDocPageProps extends PropsWithChildren {
	/** Overrides the title from the documentation config. */
	title?: string;
	/** Overrides the description from the documentation config. */
	description?: string;
	headerActions?: ReactNode;
	showPagination?: boolean;
	className?: string;
}

/**
 * Returns the breadcrumb of the given documentation page, shown by search engines in place of its URL.
 */
function getBreadcrumbJsonLd(item: IDocItem): Record<string, unknown> {
	const items = [
		{ name: siteName, item: siteUrl },
		{ name: "Documentation", item: `${siteUrl}/documentation` },
	];

	if (item.href !== "/documentation") {
		items.push({ name: item.title, item: `${siteUrl}${item.href}` });
	}

	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((entry, index) => ({
			"@type": "ListItem",
			position: index + 1,
			...entry,
		})),
	};
}

export function DocPage({ title, description, headerActions, showPagination = true, children, className = "" }: IDocPageProps) {
	const pathname = usePathname();
	const configItem = getDocItemByPath(pathname);

	const displayTitle = title ?? configItem?.title;
	const displayDescription = description ?? configItem?.description;

	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-100">
			{configItem && <JsonLd data={getBreadcrumbJsonLd(configItem)} />}

			<div className={`flex flex-col gap-8 lg:max-w-3xl 2xl:max-w-5xl mx-auto pt-28 pb-20 ${className}`}>
				{/* Page Header */}
				{(displayTitle || displayDescription || headerActions) && (
					<Fade cascade damping={0.1} triggerOnce className="w-full">
						<header className="flex flex-col items-center text-center gap-3">
							{displayTitle && <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold font-sans tracking-tight text-white">{displayTitle}</h1>}
							{displayDescription && <p className="text-base md:text-lg text-neutral-400 max-w-2xl leading-relaxed">{displayDescription}</p>}
							{headerActions && <div className="mt-2">{headerActions}</div>}
						</header>
					</Fade>
				)}

				{/* Page Content */}
				<Fade triggerOnce className="w-full">
					<div className="flex flex-col gap-4 leading-relaxed text-neutral-200">{children}</div>
				</Fade>

				{/* Auto Pagination */}
				{showPagination && <DocPagination />}
			</div>
		</main>
	);
}
