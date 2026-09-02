"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAdjacentDocs } from "../config";

export interface IDocPaginationProps {
	className?: string;
}

export function DocPagination({ className = "" }: IDocPaginationProps) {
	const pathname = usePathname();
	const { prev, next } = getAdjacentDocs(pathname);

	if (!prev && !next) {
		return null;
	}

	return (
		<div className={`w-full pt-10 mt-12 border-t border-neutral-800 ${className}`}>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{prev ? (
					<Link
						href={prev.href}
						className="group flex flex-col items-start p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-800/80 hover:border-neutral-700 transition-all duration-200"
					>
						<div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 group-hover:text-neutral-200 mb-1">
							<ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
							<span>Previous</span>
						</div>
						<div className="text-base font-medium text-neutral-100 group-hover:text-white">{prev.title}</div>
					</Link>
				) : (
					<div className="hidden sm:block" />
				)}

				{next ? (
					<Link
						href={next.href}
						className="group flex flex-col items-end p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-800/80 hover:border-neutral-700 transition-all duration-200 text-right sm:col-start-2"
					>
						<div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 group-hover:text-neutral-200 mb-1">
							<span>Next</span>
							<ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
						</div>
						<div className="text-base font-medium text-neutral-100 group-hover:text-white">{next.title}</div>
					</Link>
				) : (
					<div className="hidden sm:block" />
				)}
			</div>
		</div>
	);
}
