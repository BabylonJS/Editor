import { Component, ReactNode } from "react";

import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from "../../../ui/shadcn/ui/menubar";

import { openSingleFileDialog, saveSingleFileDialog } from "../../../tools/dialog";
import { ToolbarComponent } from "../../../ui/toolbar";

import FXEditorWindow from "./index";

export interface IFXEditorToolbarProps {
	fxEditor: FXEditorWindow;
}

export class FXEditorToolbar extends Component<IFXEditorToolbarProps> {
	public render(): ReactNode {
		return (
			<ToolbarComponent>
				<Menubar className="border-none rounded-none pl-3 my-auto">
					<img alt="" src="assets/babylonjs_icon.png" className="w-6 object-contain" />

					{/* File */}
					<MenubarMenu>
						<MenubarTrigger>File</MenubarTrigger>
						<MenubarContent className="border-black/50">
							<MenubarItem onClick={() => this._handleOpen()}>
								Open... <MenubarShortcut>CTRL+O</MenubarShortcut>
							</MenubarItem>

							<MenubarSeparator />

							<MenubarItem onClick={() => this._handleSave()}>
								Save <MenubarShortcut>CTRL+S</MenubarShortcut>
							</MenubarItem>

							<MenubarItem onClick={() => this._handleSaveAs()}>
								Save As... <MenubarShortcut>CTRL+SHIFT+S</MenubarShortcut>
							</MenubarItem>

							<MenubarSeparator />

							<MenubarItem onClick={() => this._handleImport()}>Import...</MenubarItem>
						</MenubarContent>
					</MenubarMenu>
				</Menubar>

				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
					<div className="flex items-center gap-1 font-semibold text-lg select-none">
						FX Editor
						{this.props.fxEditor.state.filePath && (
							<div className="text-sm font-thin">(...{this.props.fxEditor.state.filePath.substring(this.props.fxEditor.state.filePath.length - 30)})</div>
						)}
					</div>
				</div>
			</ToolbarComponent>
		);
	}

	private _handleOpen(): void {
		const file = openSingleFileDialog({
			title: "Open FX File",
			filters: [{ name: "FX Files", extensions: ["fx", "json"] }],
		});

		if (!file) {
			return;
		}

		this.props.fxEditor.loadFile(file);
	}

	private _handleSave(): void {
		if (!this.props.fxEditor.state.filePath) {
			this._handleSaveAs();
			return;
		}

		this.props.fxEditor.save();
	}

	private _handleSaveAs(): void {
		const file = saveSingleFileDialog({
			title: "Save FX File",
			filters: [{ name: "FX Files", extensions: ["fx", "json"] }],
			defaultPath: this.props.fxEditor.state.filePath || "untitled.fx",
		});

		if (!file) {
			return;
		}

		this.props.fxEditor.saveAs(file);
	}

	private _handleImport(): void {
		const file = openSingleFileDialog({
			title: "Import FX File",
			filters: [{ name: "FX Files", extensions: ["fx", "json"] }],
		});

		if (!file) {
			return;
		}

		this.props.fxEditor.importFile(file);
	}
}
