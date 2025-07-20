import { PropsWithChildren, HTMLAttributes } from "react";

export function EditorInspectorBlockField(props: PropsWithChildren & HTMLAttributes<HTMLDivElement>) {
	return (
		<div {...props} className={`${props.className} flex flex-col gap-2 w-full p-2 rounded-lg bg-muted-foreground/10 dark:bg-muted-foreground/5`}>
			{props.children}
		</div>
	);
}
