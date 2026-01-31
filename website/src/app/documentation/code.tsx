"use client";

import { useEffect, useRef } from "react";

import { toast } from "sonner";
import { FaCopy } from "react-icons/fa6";

import { codeToHtml } from "shiki";

export interface ICodeBlock {
	language?: "typescript" | "bash" | "json";
	className?: string;
	code: string;
}

export function CodeBlock(props: ICodeBlock) {
	const divRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		handleCreateHtmlCode();
	}, [props.code, props.language]);

	async function handleCreateHtmlCode() {
		const html = await codeToHtml(props.code.trim(), {
			lang: props.language || "typescript",
			theme: "vitesse-dark",
		});

		if (divRef.current) {
			divRef.current.innerHTML = html;
		}
	}

	async function handleCopyCode() {
		await navigator.clipboard.writeText(props.code);
		toast.success("Code copied to clipboard!");
	}

	return (
		<div className="relative flex flex-col gap-2 w-full">
			<div className="text-muted-foreground font-semibold text-sm px-2 capitalize">{props.language ?? "typescript"}</div>
			<div ref={divRef} className={`relative w-full rounded-lg ${props.className}`} />

			<button
				onClick={handleCopyCode}
				className={`
					absolute top-8 right-2 flex items-center text-white hover:text-black bg-transparent hover:bg-neutral-300 p-2 rounded-lg
					transition-all duration-300 ease-in-out
				`}
			>
				<FaCopy />
			</button>
		</div>
	);
}
