import { Grid } from "react-loader-spinner";
import { MdOutlineInfo } from "react-icons/md";
import { PropsWithChildren, ReactNode, useState } from "react";

import { PlusIcon, MinusIcon } from "@heroicons/react/20/solid";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

export interface IEditorInspectorSectionFieldProps extends PropsWithChildren {
	/**
	 * Defines the title of the section.
	 */
	title: ReactNode;
	/**
	 * Defines the label of the section drawn on the right side.
	 */
	label?: ReactNode;
	/**
	 * Defines the optional tooltip drawn on the right-side of the section's header.
	 */
	tooltip?: ReactNode;

	/**
	 * Defines wether or not the section is processing something. If true,
	 * the section becomes unusable and a loader is drawn at its center.
	 */
	isProcessing?: boolean;
}

export function EditorInspectorSectionField(props: IEditorInspectorSectionFieldProps) {
	const [opened, setOpened] = useState(true);

	return (
		<div className="relative flex flex-col gap-2 w-full bg-secondary dark:bg-secondary/35 rounded-lg p-2">
			<div
				onClick={() => setOpened(!opened)}
				className="flex gap-2 items-center w-full pl-2 py-2 bg-muted-foreground/50 dark:bg-secondary/35 hover:bg-muted-foreground/75 dark:hover:bg-secondary rounded-lg cursor-pointer transition-all duration-300"
			>
				<div>
					{opened && <MinusIcon width={20} />}
					{!opened && <PlusIcon width={20} />}
				</div>

				<div className="flex justify-between w-full">
					<div className="mt-0.5">{props.title}</div>

					<div className="flex items-center gap-2 pr-2">
						<div className="mt-0.5 text-white/50">{props.label}</div>

						{props.tooltip && (
							<TooltipProvider delayDuration={0}>
								<Tooltip>
									<TooltipTrigger>
										<MdOutlineInfo size={24} />
									</TooltipTrigger>
									<TooltipContent className="bg-background text-muted-foreground text-sm p-2">{props.tooltip}</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
					</div>
				</div>
			</div>

			{opened && (
				<>
					{props.isProcessing && (
						<div className="absolute top-0 left-0 w-full h-full bg-background/65 flex justify-center items-center">
							<Grid width={24} height={24} color="gray" />
						</div>
					)}

					{props.children}
				</>
			)}
		</div>
	);
}
