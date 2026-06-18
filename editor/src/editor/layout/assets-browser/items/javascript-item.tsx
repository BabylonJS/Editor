import { join as nativeJoin } from "path";

import { ReactNode } from "react";

import { IoTerminal } from "react-icons/io5";
import { SiJavascript } from "react-icons/si";

import { ContextMenuItem } from "../../../../ui/shadcn/ui/context-menu";

import { compileScriptFromAssets } from "../../../../tools/compile";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserJavaScriptItem extends AssetsBrowserItem {
	/**
	 * @override
	 */
	protected getIcon(): ReactNode {
		return <SiJavascript size="64px" />;
	}

	/**
	 * @override
	 */
	protected getContextMenuContent(): ReactNode {
		return (
			<ContextMenuItem className="flex items-center gap-2" onClick={() => this._runScript()}>
				<IoTerminal className="w-5 h-5" /> Run script...
			</ContextMenuItem>
		);
	}

	private async _runScript(): Promise<void> {
		let outfile = "";
		try {
			outfile = await compileScriptFromAssets(this.props.absolutePath);
		} catch (e) {
			console.error(e);
			return this.props.editor.layout.console.error(`Failed to compile script: ${e instanceof Error ? e.message : String(e)}`);
		}

		try {
			const result = require(outfile);
			result.main(this.props.editor);
		} catch (e) {
			console.error(e);
			this.props.editor.layout.console.error(`Failed to run script: ${e instanceof Error ? e.message : String(e)}`);
		}

		delete require.cache[nativeJoin(outfile)];
	}
}
