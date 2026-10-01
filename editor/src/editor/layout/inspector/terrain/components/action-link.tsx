import { ReactNode } from "react";

export interface ITerrainActionLinkProps {
	children: ReactNode;
	disabled?: boolean;
	onClick: () => void;
}

/**
 * Action drawn as a link in a text: "Make unique", "Re-project now"...
 */
export function TerrainActionLink(props: ITerrainActionLinkProps) {
	return (
		<button
			disabled={props.disabled}
			onClick={() => props.onClick()}
			className="underline underline-offset-2 font-semibold hover:text-primary disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed transition-colors duration-300"
		>
			{props.children}
		</button>
	);
}
