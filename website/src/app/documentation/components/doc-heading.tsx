import React, { PropsWithChildren, ReactNode, isValidElement } from "react";
import { Link as LinkIcon } from "lucide-react";

export interface IDocHeadingProps extends PropsWithChildren {
	level?: 2 | 3 | 4;
	id?: string;
	className?: string;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[@#]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * Recursively collects the textual content of a (possibly nested) React node,
 * so headings containing inline JSX (e.g. <b>) still get a usable anchor id.
 */
function collectText(node: ReactNode): string {
	if (node === null || node === undefined || typeof node === "boolean") {
		return "";
	}
	if (typeof node === "string" || typeof node === "number") {
		return String(node);
	}
	if (Array.isArray(node)) {
		return node.map(collectText).join("");
	}
	if (isValidElement(node)) {
		return collectText((node.props as { children?: ReactNode }).children);
	}
	return "";
}

export function DocHeading({ level = 2, id, children, className = "" }: IDocHeadingProps) {
	const textContent = collectText(children);
	const headingId = id || (textContent ? slugify(textContent) : undefined);

	const anchorLink = headingId ? (
		<a
			href={`#${headingId}`}
			className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-neutral-300 ml-2 inline-flex items-center transition-opacity"
			aria-label={`Link to ${textContent}`}
		>
			<LinkIcon className="w-4 h-4" />
		</a>
	) : null;

	if (level === 2) {
		return (
			<h2 id={headingId} className={`group text-2xl md:text-3xl font-semibold tracking-tight text-neutral-100 mt-8 mb-3 flex items-center scroll-mt-24 ${className}`}>
				<span>{children}</span>
				{anchorLink}
			</h2>
		);
	}

	if (level === 3) {
		return (
			<h3 id={headingId} className={`group text-xl md:text-2xl font-semibold tracking-tight text-neutral-200 mt-6 mb-2 flex items-center scroll-mt-24 ${className}`}>
				<span>{children}</span>
				{anchorLink}
			</h3>
		);
	}

	return (
		<h4 id={headingId} className={`group text-lg md:text-xl font-medium tracking-tight text-neutral-300 mt-4 mb-2 flex items-center scroll-mt-24 ${className}`}>
			<span>{children}</span>
			{anchorLink}
		</h4>
	);
}
