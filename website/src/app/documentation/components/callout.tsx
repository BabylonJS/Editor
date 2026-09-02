import React, { PropsWithChildren, ReactNode } from "react";
import { Info, Lightbulb, AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react";

export type CalloutType = "note" | "tip" | "warning" | "caution" | "success" | "info";

export interface ICalloutProps extends PropsWithChildren {
	type?: CalloutType;
	title?: string;
	icon?: ReactNode;
	className?: string;
}

const CALLOUT_STYLES: Record<CalloutType, { border: string; bg: string; text: string; defaultTitle: string; icon: React.ComponentType<{ className?: string }> }> = {
	note: {
		border: "border-blue-500/30",
		bg: "bg-blue-950/20",
		text: "text-blue-400",
		defaultTitle: "Note",
		icon: Info,
	},
	info: {
		border: "border-sky-500/30",
		bg: "bg-sky-950/20",
		text: "text-sky-400",
		defaultTitle: "Information",
		icon: Info,
	},
	tip: {
		border: "border-emerald-500/30",
		bg: "bg-emerald-950/20",
		text: "text-emerald-400",
		defaultTitle: "Tip",
		icon: Lightbulb,
	},
	warning: {
		border: "border-amber-500/30",
		bg: "bg-amber-950/20",
		text: "text-amber-400",
		defaultTitle: "Warning",
		icon: AlertTriangle,
	},
	caution: {
		border: "border-rose-500/30",
		bg: "bg-rose-950/20",
		text: "text-rose-400",
		defaultTitle: "Caution",
		icon: AlertOctagon,
	},
	success: {
		border: "border-green-500/30",
		bg: "bg-green-950/20",
		text: "text-green-400",
		defaultTitle: "Success",
		icon: CheckCircle2,
	},
};

export function Callout({ type = "note", title, icon, children, className = "" }: ICalloutProps) {
	const config = CALLOUT_STYLES[type] || CALLOUT_STYLES.note;
	const IconComponent = config.icon;
	const displayTitle = title ?? config.defaultTitle;

	return (
		<div className={`my-4 p-4 rounded-xl border ${config.border} ${config.bg} text-neutral-200 text-sm leading-relaxed ${className}`}>
			<div className={`flex items-center gap-2 font-semibold mb-1.5 ${config.text}`}>
				{icon ? icon : <IconComponent className="w-4 h-4 shrink-0" />}
				<span>{displayTitle}</span>
			</div>
			<div className="text-neutral-300 [&>p]:mb-2 [&>p:last-child]:mb-0 [&_a]:underline [&_a]:underline-offset-4 [&_a]:text-neutral-100">{children}</div>
		</div>
	);
}
