import { dirname, join, extname, basename } from "path/posix";

import { Component, ReactNode } from "react";

import { IoMdCube } from "react-icons/io";
import { FaFileAlt } from "react-icons/fa";
import { FaCirclePlus } from "react-icons/fa6";
import { IoSparklesSharp } from "react-icons/io5";
import { HiMiniCommandLine } from "react-icons/hi2";

import { Node, IParticleSystem, Sound } from "babylonjs";

import { normalizedGlob } from "../../../tools/fs";
import { isNodeVisibleInGraph } from "../../../tools/node/metadata";
import { isAbstractMesh, isNode } from "../../../tools/guards/nodes";
import { onSelectedAssetChanged } from "../../../tools/observables";

import { Editor } from "../../main";

import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../../ui/shadcn/ui/command";

import { getMeshCommands } from "./mesh";
import { getLightCommands } from "./light";
import { getCameraCommands } from "./camera";
import { getSpriteCommands } from "./sprite";
import { getProjectCommands } from "./project";
import { getParticleSystemsCommands } from "./particle-systems";

export interface ICommandPaletteProps {
	editor: Editor;
}

export interface ICommandPaletteState {
	open: boolean;
	query: string;

	files: ICommandPaletteType[];
	entities: ICommandPaletteType[];
}

export interface ICommandPaletteType {
	text: string;
	key: string;
	label: string;
	disabled?: boolean;
	ipcRendererChannelKey?: string;
	action: () => unknown;
}

export class CommandPalette extends Component<ICommandPaletteProps, ICommandPaletteState> {
	public constructor(props: ICommandPaletteProps) {
		super(props);

		this.state = {
			query: "",
			open: false,
			files: [],
			entities: [],
		};
	}

	public render(): ReactNode {
		return (
			<CommandDialog open={this.state.open} onOpenChange={(o) => !o && this.setOpen(o)}>
				<CommandInput placeholder="Type a command or search..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>

					<CommandGroup heading="Commands">
						{getProjectCommands(this.props.editor).map((command) => (
							<CommandItem key={command.key} onSelect={() => this._executeCommand(command)} className="flex items-center gap-2">
								<HiMiniCommandLine className="w-10 h-10" /> {command.text}
							</CommandItem>
						))}
					</CommandGroup>

					<CommandGroup heading="Scene">
						{getLightCommands(this.props.editor).map((command) => (
							<CommandItem key={command.key} disabled={command.disabled} onSelect={() => this._executeCommand(command)} className="flex items-center gap-2">
								<FaCirclePlus className="w-10 h-10" /> {command.text}
							</CommandItem>
						))}

						{getMeshCommands(this.props.editor).map((command) => (
							<CommandItem key={command.key} disabled={command.disabled} onSelect={() => this._executeCommand(command)} className="flex items-center gap-2">
								<FaCirclePlus className="w-10 h-10" /> {command.text}
							</CommandItem>
						))}

						{getCameraCommands(this.props.editor).map((command) => (
							<CommandItem key={command.key} disabled={command.disabled} onSelect={() => this._executeCommand(command)} className="flex items-center gap-2">
								<FaCirclePlus className="w-10 h-10" /> {command.text}
							</CommandItem>
						))}

						{getParticleSystemsCommands(this.props.editor).map((command) => (
							<CommandItem key={command.key} disabled={command.disabled} onSelect={() => this._executeCommand(command)} className="flex items-center gap-2">
								<IoSparklesSharp className="w-10 h-10" /> {command.text}
							</CommandItem>
						))}

						{getSpriteCommands(this.props.editor).map((command) => (
							<CommandItem key={command.key} disabled={command.disabled} onSelect={() => this._executeCommand(command)} className="flex items-center gap-2">
								<FaCirclePlus className="w-10 h-10" /> {command.text}
							</CommandItem>
						))}
					</CommandGroup>

					<CommandGroup heading="Hierarchy">
						{this.state.entities.map((entity) => (
							<CommandItem key={entity.key} onSelect={() => this._executeCommand(entity)} className="flex items-center gap-2">
								<IoMdCube className="w-10 h-10" /> {entity.text}
							</CommandItem>
						))}
					</CommandGroup>

					<CommandGroup heading="Files">
						{this.state.files.map((file) => (
							<CommandItem key={file.key} onSelect={() => this._executeCommand(file)} className="flex items-center gap-2">
								<FaFileAlt className="w-10 h-10" /> {file.text}
							</CommandItem>
						))}
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		);
	}

	public setOpen(open: boolean): void {
		this.setState({ open });

		if (open) {
			this._refreshEntities();
			this._refreshAssetFiles();
		}
	}

	private _executeCommand(command: ICommandPaletteType): void {
		command.action();
		this.setOpen(false);
	}

	private _refreshEntities(): void {
		const scene = this.props.editor.layout.preview.scene;

		let objects = [...scene.meshes, ...scene.lights, ...scene.cameras, ...scene.particleSystems, ...scene.transformNodes] as (Node | IParticleSystem | Sound)[];
		scene.soundTracks?.forEach((soundTrack) => {
			objects.push(...soundTrack.soundCollection);
		});

		objects = objects.filter((o) => {
			if (isNode(o) && !isNodeVisibleInGraph(o)) {
				return false;
			}

			if (isAbstractMesh(o) && o._masterMesh) {
				return false;
			}

			return true;
		});

		const entities = objects.map(
			(entity) =>
				({
					key: entity.id,
					text: entity.name,
					label: entity.name,
					action: () => {
						this.props.editor.layout.graph.setSelectedNode(entity);
						this.props.editor.layout.inspector.setEditedObject(entity);
						this.props.editor.layout.animations.setEditedObject(entity);
						if (isNode(entity)) {
							this.props.editor.layout.preview.gizmo.setAttachedObject(entity);
						}

						this.props.editor.layout.preview.focusObject(entity);
					},
				}) as ICommandPaletteType
		);

		this.setState({ entities });
	}

	private async _refreshAssetFiles(): Promise<void> {
		if (!this.props.editor.state.projectPath) {
			return;
		}

		const assetsFolder = join(dirname(this.props.editor.state.projectPath), "assets");
		const glob = await normalizedGlob(join(assetsFolder, "**/*"), {
			ignore: {
				childrenIgnored: (p) => extname(p.name).toLocaleLowerCase() === ".scene",
				ignored: (p) => p.isDirectory() || extname(p.name).toLocaleLowerCase() === ".scene",
			},
		});

		const files = glob.map(
			(file) =>
				({
					key: basename(file),
					text: basename(file),
					label: file.path,
					action: () => onSelectedAssetChanged.notifyObservers(file),
				}) as ICommandPaletteType
		);

		this.setState({ files });
	}
}
