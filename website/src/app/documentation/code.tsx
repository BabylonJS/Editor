"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { codeToHtml } from "shiki";

export interface ICodeBlock {
	code: string;
	language?: "typescript" | "javascript" | "bash" | "json" | "html" | "css";
	filename?: string;
	className?: string;
}

export function CodeBlock({ code, language = "typescript", filename, className = "" }: ICodeBlock) {
	const divRef = useRef<HTMLDivElement | null>(null);
	const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [copied, setCopied] = useState(false);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		return () => {
			if (copyTimeout.current) {
				clearTimeout(copyTimeout.current);
			}
		};
	}, []);

	useEffect(() => {
		let isMounted = true;

		setIsReady(false);

		async function highlightCode() {
			try {
				const html = await codeToHtml(code.trim(), {
					lang: language,
					theme: "vitesse-dark",
				});

				if (isMounted && divRef.current) {
					divRef.current.innerHTML = html;
					setIsReady(true);
				}
			} catch {
				// Fallback to plain text if language isn't supported
				if (isMounted) {
					setIsReady(false);
				}
			}
		}

		highlightCode();

		return () => {
			isMounted = false;
		};
	}, [code, language]);

	async function handleCopyCode() {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			toast.success("Code copied to clipboard!");
			if (copyTimeout.current) {
				clearTimeout(copyTimeout.current);
			}
			copyTimeout.current = setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Failed to copy code.");
		}
	}

	return (
		<div className={`my-4 flex flex-col w-full rounded-xl overflow-hidden border border-neutral-800 bg-[#121212] shadow-md ${className}`}>
			{/* Code Header bar */}
			<div className="flex items-center justify-between px-4 py-2 bg-neutral-900/80 border-b border-neutral-800/80 text-xs font-mono text-neutral-400">
				<div className="flex items-center gap-2">
					<span className="w-2.5 h-2.5 rounded-full bg-red-500/60 inline-block" />
					<span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60 inline-block" />
					<span className="w-2.5 h-2.5 rounded-full bg-green-500/60 inline-block" />
					<span className="ml-2 text-neutral-300 font-medium">{filename ? filename : language}</span>
				</div>

				<button
					onClick={handleCopyCode}
					aria-label="Copy code"
					className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
				>
					{copied ? (
						<>
							<Check className="w-3.5 h-3.5 text-green-400" />
							<span className="text-green-400 text-xs">Copied!</span>
						</>
					) : (
						<>
							<Copy className="w-3.5 h-3.5" />
							<span className="text-xs">Copy</span>
						</>
					)}
				</button>
			</div>

			{/* Code Container */}
			<div className="relative w-full">
				<div ref={divRef} className={`p-4 overflow-x-auto text-sm leading-relaxed [&>pre]:!bg-transparent [&>pre]:!p-0 [&>pre]:!m-0 ${isReady ? "block" : "hidden"}`} />

				{/* Plaintext Fallback while Shiki is loading */}
				{!isReady && (
					<pre className="p-4 overflow-x-auto text-sm text-neutral-300 font-mono leading-relaxed bg-transparent m-0">
						<code>{code.trim()}</code>
					</pre>
				)}
			</div>
		</div>
	);
}
