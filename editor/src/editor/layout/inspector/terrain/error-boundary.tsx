import { Component, ErrorInfo, PropsWithChildren, ReactNode } from "react";

import { LuRotateCcw, LuTriangleAlert } from "react-icons/lu";

import type { Editor } from "../../../main";

import { Button } from "../../../../ui/shadcn/ui/button";

import { TerrainViewportController } from "./viewport/controller";

export interface ITerrainTabErrorBoundaryProps extends PropsWithChildren {
	/** The editor reference (console). */
	editor: Editor;
}

export interface ITerrainTabErrorBoundaryState {
	/** Error caught while rendering the content of the Terrain tab, null while the content renders normally. */
	error: Error | null;
}

/**
 * Converts a thrown value to an Error (render errors can be any value).
 * @param error defines the thrown value.
 */
export function toTerrainTabError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	return new Error(typeof error === "string" ? error : String(error));
}

/**
 * Error boundary of the Terrain tab (§1.2, D20): a render error of the tab content shows an error card and disposes the viewport controllers
 * (commits the stroke, enables the picking, the gizmo and the icons of the preview back, removes the cursor, HUD and listeners) instead of reaching EditorLayout.componentDidCatch,
 * which resets the layout and reloads the window. "Reload Terrain tab" resets the boundary, remounting the content. The error never propagates further.
 */
export class TerrainTabErrorBoundary extends Component<ITerrainTabErrorBoundaryProps, ITerrainTabErrorBoundaryState> {
	public static getDerivedStateFromError(error: unknown): ITerrainTabErrorBoundaryState {
		return {
			error: toTerrainTabError(error),
		};
	}

	public constructor(props: ITerrainTabErrorBoundaryProps) {
		super(props);

		this.state = {
			error: null,
		};
	}

	public componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
		try {
			TerrainViewportController.disposeAll();
		} catch (e) {
			console.error(e);
		}

		try {
			const caught = toTerrainTabError(error);
			const stack = [caught.stack, errorInfo?.componentStack].filter((part) => !!part).join("\n");

			this.props.editor.layout.console.error(`Terrain tab error: ${caught.message}${stack ? `\n${stack}` : ""}`);
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * Resets the boundary: the content of the tab is mounted again (a new viewport controller is created).
	 */
	public reload(): void {
		this.setState({
			error: null,
		});
	}

	public render(): ReactNode {
		if (!this.state.error) {
			return this.props.children;
		}

		return (
			<div className="flex flex-col items-center gap-4 w-full p-4 rounded-lg bg-secondary dark:bg-secondary/35 text-center">
				<LuTriangleAlert className="w-10 h-10 text-amber-500" />

				<div className="text-sm break-words max-w-full">The Terrain tab hit an error: {this.state.error.message}</div>

				<Button variant="secondary" className="flex items-center gap-2" onClick={() => this.reload()}>
					<LuRotateCcw className="w-4 h-4" /> Reload Terrain tab
				</Button>
			</div>
		);
	}
}
