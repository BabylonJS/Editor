"use client";

import Link from "next/link";

import { GrNext } from "react-icons/gr";

export interface INextChapterComponentProps {
    href: string;
    title: string;
}

export function NextChapterComponent(props: INextChapterComponentProps) {
	return (
		<div className="flex flex-col w-full my-3">
			<div className="w-full h-[1px] bg-neutral-950" />

			<div className="flex justify-end w-full my-3">
				<div className="flex gap-4 items-center p-5 rounded-lg border border-neutral-950 hover:bg-neutral-800 cursor-pointer transition-all duration-300 ease-in-out">
					<GrNext />

					<Link href={props.href} className="flex flex-col">
						<div className="text-xl font-semibold">
                            Next
						</div>
						<div>
							{props.title}
						</div>
					</Link>
				</div>
			</div>
		</div>
	);
}
