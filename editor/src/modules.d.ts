/* eslint-disable @typescript-eslint/naming-convention */

declare module "@jniac/color-xplr" {
	export type Color =
		| string
		| {
				a: number;
				r: number;
				g: number;
				b: number;
		  };

	export interface ColorXplrApp {
		destroy(): void;
		element: HTMLElement;
	}

	export const createColorXplr: (...args: any[]) => ColorXplrApp;

	export interface ColorXplrParams {
		alpha?: boolean;
		color?: Color;
	}
}

declare module "react-selectable" {
	export const SelectableGroup: any;
	export const createSelectable: (arg: any) => any;
}

declare module "decompress-targz" {
	export default function decompressTargz(): Promise<any>;
}
