import { dirname, join, extname, basename } from "path/posix";
import { copyFile, mkdir, move, pathExists, readdir, stat, writeJSON } from "fs-extra";

import { Camera, Material, PBRMaterial, StandardMaterial, Tools } from "babylonjs";

import { Fade } from "react-awesome-reveal";
import { Component, MouseEvent, ReactNode } from "react";
import { SelectableGroup, createSelectable } from "react-selectable";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { IoRefresh } from "react-icons/io5";
import { IoCheckmark } from "react-icons/io5";
import { AiOutlinePlus } from "react-icons/ai";
import { SiBabylondotjs } from "react-icons/si";
import { FaFolder, FaRegFolderOpen } from "react-icons/fa";

import { Button, Tree, TreeNodeInfo } from "@blueprintjs/core";

import { Editor } from "../main";

import { EditorCamera } from "../nodes/camera";

import { normalizedGlob } from "../../tools/fs";
import { UniqueNumber } from "../../tools/tools";
import { isTexture } from "../../tools/guards/texture";
import { openMultipleFilesDialog } from "../../tools/dialog";

import { loadScene } from "../../project/load/scene";
import { saveProject } from "../../project/save/save";
import { onProjectConfigurationChangedObservable, projectConfiguration } from "../../project/configuration";

import { showConfirm } from "../../ui/dialog";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../ui/shadcn/ui/dropdown-menu";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "../../ui/shadcn/ui/breadcrumb";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator, ContextMenuSubTrigger, ContextMenuSub, ContextMenuSubContent } from "../../ui/shadcn/ui/context-menu";

import { FileInspectorObject } from "./inspector/file";

import { AssetBrowserHDRItem } from "./assets-browser/hdr-item";
import { AssetBrowserMeshItem } from "./assets-browser/mesh-item";
import { AssetBrowserSceneItem } from "./assets-browser/scene-item";
import { AssetBrowserImageItem } from "./assets-browser/image-item";
import { AssetBrowserMaterialItem } from "./assets-browser/material-item";
import { AssetsBrowserItem, IAssetsBrowserItemProps } from "./assets-browser/item";

import "babylonjs-loaders";

import "../../loader/assimpjs";

const HDRSelectable = createSelectable(AssetBrowserHDRItem);
const DefaultSelectable = createSelectable(AssetsBrowserItem);
const MeshSelectable = createSelectable(AssetBrowserMeshItem);
const ImageSelectable = createSelectable(AssetBrowserImageItem);
const SceneSelectable = createSelectable(AssetBrowserSceneItem);
const MaterialSelectable = createSelectable(AssetBrowserMaterialItem);

export interface IEditorAssetsBrowserProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IEditorAssetsBrowserState {
    /**
     * The sizes of the panels.
     */
    sizes: number[];

    files: string[];
    selectedKeys: string[];
    selectionEnabled: boolean;
    showGeneratedFiles: boolean;

    browsedPath?: string;

    filesTreeNodes: TreeNodeInfo[];
}

export class EditorAssetsBrowser extends Component<IEditorAssetsBrowserProps, IEditorAssetsBrowserState> {
    private _isMouseOver: boolean = false;
    private _selectedFiles: string[] = [];

    public constructor(props: IEditorAssetsBrowserProps) {
        super(props);

        this.state = {
            files: [],
            sizes: [25, 75],

            selectedKeys: [],
            filesTreeNodes: [],

            selectionEnabled: true,
            showGeneratedFiles: false,
        };
    }

    public render(): ReactNode {
        return (
            <PanelGroup direction="horizontal" className="w-full h-full text-foreground">
                <Panel
                    order={1}
                    minSize={20}
                    className="w-full h-full"
                    defaultSize={this.state.sizes[0]}
                >
                    <div className="w-full h-full overflow-auto">
                        <Tree
                            contents={this.state.filesTreeNodes}
                            onNodeClick={(n) => this._handleNodeClicked(n)}
                            onNodeExpand={(n) => this._handleNodeExpanded(n)}
                            onNodeCollapse={(n) => this._handleNodeCollapsed(n)}
                            onNodeDoubleClick={(n) => this._handleNodeDoubleClicked(n)}
                        />
                    </div>
                </Panel>

                <PanelResizeHandle className="w-2 bg-border/10 h-full cursor-pointer hover:bg-black/30 transition-all duration-300" />

                <Panel
                    order={2}
                    className="w-full h-full"
                    defaultSize={this.state.sizes[1]}
                >
                    {this._getFilesGridComponent()}
                </Panel>
            </PanelGroup>
        );
    }

    public componentDidMount(): void {
        onProjectConfigurationChangedObservable.add((c) => {
            if (c.path) {
                this._refreshFilesTreeNodes(c.path);
                this.setBrowsePath(dirname(c.path));
            }
        });

        document.addEventListener("keydown", (ev) => {
            if (this._isMouseOver && ev.key.toLowerCase() === "a" && (ev.ctrlKey || ev.metaKey)) {
                ev.preventDefault();
                this.setState({ selectedKeys: this.state.files.map((f) => join(this.state.browsedPath!, f)) });
            }
        });
    }

    private async _refreshFilesTreeNodes(path: string): Promise<void> {
        const files = await normalizedGlob(join(dirname(path), "**"), {
            ignore: {
                childrenIgnored: (p) => extname(p.name).toLocaleLowerCase() === ".scene",
                ignored: (p) => !p.isDirectory() || extname(p.name).toLocaleLowerCase() === ".scene",
            },
        });

        const allNodes: TreeNodeInfo[] = [];
        const filesTreeNodes: TreeNodeInfo[] = [];

        files.forEach((f) => {
            const relative = f.replace(join(dirname(path), "/"), "");
            const split = relative.split("/");

            for (let i = 0, len = split.length; i < len; ++i) {
                const relativePath = split.slice(0, i + 1).join("/");

                let node = allNodes.find((n) => n.id === relativePath);
                if (!node) {
                    node = {
                        label: (
                            <div
                                draggable
                                className="ml-2 p-1 w-full h-full pointer-events-auto"
                                onDragOver={(ev) => ev.preventDefault()}
                                onDrop={
                                    relativePath.startsWith("assets")
                                        ? (ev) => this._handleDropInTree(ev, relativePath)
                                        : undefined
                                }
                            >
                                {split[i]}
                            </div>
                        ),
                        id: relativePath,
                        nodeData: relativePath,
                        icon: <FaFolder className="w-4 h-4" />,
                    };

                    if (i === 0) {
                        filesTreeNodes.push(node);
                    } else {
                        const parent = allNodes.find((n) => n.id === split.slice(0, i).join("/"));
                        if (parent) {
                            parent.childNodes = parent.childNodes ?? [];
                            parent.childNodes.push(node);
                        }
                    }

                    this._forEachNode(this.state.filesTreeNodes, (n) => {
                        if (n.id === node!.id) {
                            node!.isSelected = n.isSelected;
                            node!.isExpanded = n.isExpanded;
                        }
                    });

                    allNodes.push(node);
                }
            }
        });

        this.setState({
            filesTreeNodes: [{
                label: (
                    <div className="ml-2 p-1">
                        Project
                    </div>
                ),
                id: "/",
                nodeData: "/",
                isExpanded: true,
                childNodes: filesTreeNodes,
                icon: <SiBabylondotjs className="w-4 h-4" />,
            }],
        });
    }

    /**
     * Sets the new path being browsed by the assets browser.
     */
    public async setBrowsePath(path: string): Promise<void> {
        this.setState({ browsedPath: path });

        return this._refreshItems(path);
    }

    /**
     * Refreshes the assets browser. This will refresh the files and the files tree nodes.
     */
    public refresh(): void {
        this.setBrowsePath(this.state.browsedPath!);

        if (projectConfiguration.path) {
            this._refreshFilesTreeNodes(projectConfiguration.path!);
        }
    }

    /**
     * Copies the selected files.
     */
    public copySelectedFiles(): void {
        this._selectedFiles = this.state.selectedKeys;
    }

    private async _pasteSelectedFiles(): Promise<void> {
        if (!this._selectedFiles.length || !this.state.browsedPath) {
            return;
        }

        await Promise.all(this._selectedFiles.map(async (f) => {
            const fStat = await stat(f);
            const targetPath = join(this.state.browsedPath!, basename(f));

            if (fStat.isDirectory() || await pathExists(targetPath)) {
                return;
            }

            await copyFile(f, join(this.state.browsedPath!, basename(f)));
        }));

        this.refresh();
    }

    /**
     *  Handles the file renamed event. This will update the file paths in the editor.
     */
    public async handleFileRenamed(oldAbsolutePath: string, newAbsolutePath: string): Promise<void> {
        if (!this.props.editor.state.projectPath) {
            return;
        }

        // Scene
        if (oldAbsolutePath === this.props.editor.state.lastOpenedScenePath) {
            return this.props.editor.setState({ lastOpenedScenePath: newAbsolutePath });
        }

        const oldRelativePath = oldAbsolutePath.replace(join(dirname(this.props.editor.state.projectPath), "/"), "");
        const newRelativePath = newAbsolutePath.replace(join(dirname(this.props.editor.state.projectPath), "/"), "");

        const fStat = await stat(newAbsolutePath);
        if (fStat.isDirectory()) {
            const files = await normalizedGlob(join(newAbsolutePath, "**"), {
                ignore: {
                    ignored: (p) => p.isDirectory(),
                },
            });

            files.forEach((file) => {
                const newFileRelativePath = file.replace(join(dirname(this.props.editor.state.projectPath!), "/"), "");
                const oldFileRelativePath = newFileRelativePath.replace(newRelativePath, oldRelativePath);

                this._handleFileRenamed(oldFileRelativePath, newFileRelativePath);
            });
        } else {
            this._handleFileRenamed(oldRelativePath, newRelativePath);
        }
    }

    private _handleFileRenamed(oldRelativePath: string, newRelativePath: string): void {
        const scene = this.props.editor.layout.preview.scene;

        // Textures
        scene.textures.forEach((texture) => {
            if (texture.name === oldRelativePath) {
                texture.name = newRelativePath;
                if (isTexture(texture)) {
                    texture.url = newRelativePath;
                }
            }
        });
    }

    /**
     * Adds the specified file to the selected files. This will add to the current selection the specified file.
     */
    public addToSelectedFiles(absolutePath: string): void {
        if (!this.state.selectedKeys.includes(absolutePath)) {
            this.setState({ selectedKeys: [absolutePath] });
        }
    }

    /**
     * Sets the selected file. This will clear the current selection and select the specified file.
     */
    public setSelectedFile(absolutePath: string): void {
        if (this.state.selectedKeys.includes(absolutePath)) {
            return;
        }

        this.setState({ selectedKeys: [absolutePath] });
    }

    private async _handleDropInTree(ev: React.DragEvent<HTMLDivElement>, relativePath): Promise<void> {
        ev.preventDefault();
        ev.stopPropagation();

        if (!projectConfiguration.path) {
            return;
        }

        try {
            JSON.parse(ev.dataTransfer.getData("assets"));
        } catch (e) {
            return;
        }

        return this.handleMoveSelectedFilesTo(join(dirname(projectConfiguration.path), relativePath));
    }

    /**
     * Handles the move selected files to event. This will move the selected files to the specified path.
     */
    public async handleMoveSelectedFilesTo(absolutePath: string): Promise<void> {
        const files = this.state.selectedKeys;

        await Promise.all(files.map(async (file) => {
            const newAbsolutePath = join(absolutePath, basename(file));
            await move(file, newAbsolutePath);
            await this.handleFileRenamed(file, newAbsolutePath);
        }));

        this.refresh();
    }

    private async _refreshItems(path: string): Promise<void> {
        let files = await readdir(path);
        files = files.filter((f) => {
            if (f.charAt(0) === ".") {
                return false;
            }

            if (f.startsWith("editor-generated_") && !this.state.showGeneratedFiles) {
                return false;
            }

            return true;
        });

        this.setState({ files });
    }

    private _getFilesGridComponent(): ReactNode {
        return (
            <div className="flex flex-col w-full h-full">
                <div className="flex gap-2 justify-between w-full h-10 min-h-10 bg-primary-foreground">
                    <div className="flex gap-2 h-full">
                        <Button disabled={this._isBrowsingProjectRootPath()} minimal icon="arrow-left" className="transition-all duration-300" onClick={() => this.setBrowsePath(dirname(this.state.browsedPath!))} />
                        <Button minimal icon="arrow-right" className="transition-all duration-300" />
                        <Button minimal icon="refresh" className="transition-all duration-300" disabled={!this.state.browsedPath} onClick={() => this._refreshItems(this.state.browsedPath!)} />

                        <Button minimal icon="import" text="Import" onClick={() => this._handleImportFiles()} />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <Button minimal icon="settings" className="transition-all duration-300" disabled={!this.state.browsedPath} onClick={() => this._refreshItems(this.state.browsedPath!)} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem className="flex gap-1 items-center" onClick={() => {
                                this.setState({ showGeneratedFiles: !this.state.showGeneratedFiles }, () => this.refresh());
                            }}>
                                {this.state.showGeneratedFiles ? <IoCheckmark /> : ""} Show Generated Files
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {this._getBreadcrumbComponent()}
                {this._getGridComponent()}
            </div>
        );
    }

    private _getBreadcrumbComponent(): ReactNode {
        if (!this.state.browsedPath) {
            return null;
        }

        const browsedPath = join(this.state.browsedPath, "/");
        const rootPath = join(dirname(projectConfiguration.path!), "/");

        const relativePath = browsedPath.replace(rootPath, "");

        const split = relativePath.split("/").filter((s) => s !== "");
        split.splice(0, 0, "Project");

        return (
            <div className="flex items-center px-2.5 h-10 min-h-10 bg-primary-foreground/50">
                <Breadcrumb>
                    <BreadcrumbList>
                        {split.filter((s) => s !== "").map((s, i) => (
                            <Fade key={i} delay={0} duration={300}>
                                <BreadcrumbItem className="flex gap-[5px] items-center">
                                    {i < split.length - 1 &&
                                        <FaRegFolderOpen className="text-foreground w-[20px] h-[20px]" />
                                    }

                                    <BreadcrumbLink
                                        className="text-foreground font-[400] hover:text-foreground/50"
                                        onClick={() => this.setBrowsePath(join(rootPath, split.slice(1, i + 1).join("/")))}
                                    >
                                        {s}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>

                                {i < split.length - 1 &&
                                    <BreadcrumbSeparator />
                                }
                            </Fade>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        );
    }

    private _getGridComponent(): ReactNode {
        return (
            <SelectableGroup
                className="w-full min-h-full pb-20"
                enabled={this.state.selectionEnabled}
                onNonItemClick={() => this.setState({ selectedKeys: [] })}
                onSelection={(keys: string[]) => this.setState({ selectedKeys: keys })}
            >
                <ContextMenu>
                    <ContextMenuTrigger>
                        <div
                            style={{
                                gridTemplateRows: `repeat(auto-fill, ${120 * 1}px)`,
                                gridTemplateColumns: `repeat(auto-fill, ${120 * 1}px)`,
                            }}
                            onMouseMove={() => this._isMouseOver = true}
                            onMouseLeave={() => this._isMouseOver = false}
                            className="grid gap-4 justify-left w-full h-full p-5 overflow-y-auto pb-10"
                        >
                            {this.state.files.map((f) => {
                                const key = join(this.state.browsedPath!, f);
                                const selected = this.state.selectedKeys.indexOf(key) > -1;

                                return this._getAssetBrowserItem(f, key, selected);
                            })}
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuItem className="flex items-center gap-2" onClick={() => this._refreshItems(this.state.browsedPath!)}>
                            <IoRefresh className="w-5 h-5" /> Refresh
                        </ContextMenuItem>

                        <ContextMenuSeparator />

                        <ContextMenuItem disabled={this._selectedFiles.length === 0} onClick={() => this._pasteSelectedFiles()}>Paste</ContextMenuItem>

                        <ContextMenuSeparator />

                        <ContextMenuSub>
                            <ContextMenuSubTrigger className="flex items-center gap-2">
                                <AiOutlinePlus className="w-5 h-5" /> Add
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                                <ContextMenuItem onClick={() => this._handleAddScene()}>Scene</ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem onClick={() => this._handleAddMaterial("PBRMaterial")}>PBR Material</ContextMenuItem>
                                <ContextMenuItem onClick={() => this._handleAddMaterial("StandardMaterial")}>Standard Material</ContextMenuItem>
                            </ContextMenuSubContent>
                        </ContextMenuSub>

                        <ContextMenuSeparator />

                        <ContextMenuItem className="flex items-center gap-2" onClick={() => this._handleCreateDirectory()}>
                            <AiOutlinePlus className="w-5 h-5" /> Create Directory
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            </SelectableGroup>
        );
    }

    private _getAssetBrowserItem(filename: string, key: string, selected: boolean): ReactNode {
        const extension = extname(filename).toLowerCase();

        const props: IAssetsBrowserItemProps & { key: string; selectableKey: string; selected: boolean; } = {
            key,
            selected,
            absolutePath: key,
            selectableKey: key,
            editor: this.props.editor,
            onRefresh: () => this.refresh(),
            onClick: (ev, i, c) => this._handleItemClick(ev, i, c),
            onDoubleClick: (i) => this._handleItemDoubleClick(i),
            setSelectionEnabled: (e) => this.setState({ selectionEnabled: e }),
        };

        switch (extension) {
            case ".x":
            case ".dae":
            case ".dxf":
            case ".b3d":
            case ".stl":
            case ".fbx":
            case ".3ds":
            case ".glb":
            case ".obj":
            case ".lwo":
            case ".gltf":
            case ".ms3d":
            case ".blend":
            case ".babylon":
                return <MeshSelectable {...props} />;

            case ".material":
                return <MaterialSelectable {...props} />;

            case ".scene":
                return <SceneSelectable {...props} />;


            case ".png":
            case ".jpg":
            case ".jpeg":
                return <ImageSelectable {...props} />;

            case ".hdr":
                return <HDRSelectable {...props} />;

            default:
                return <DefaultSelectable {...props} />;
        }
    }

    private async _handleCreateDirectory(): Promise<void> {
        if (!this.state.browsedPath) {
            return;
        }

        let index: number | undefined = undefined;
        while (await pathExists(join(this.state.browsedPath, `New folder${index !== undefined ? ` ${index}` : ""}`))) {
            index ??= 0;
            ++index;
        }

        await mkdir(join(this.state.browsedPath, `New folder${index !== undefined ? ` ${index}` : ""}`));
        this._refreshItems(this.state.browsedPath);
    }

    private async _handleImportFiles(): Promise<void> {
        if (!this.state.browsedPath) {
            return;
        }

        const files = openMultipleFilesDialog({
            title: "Import Files",
        });

        await Promise.all(files.map((file) => copyFile(file, join(this.state.browsedPath!, basename(file)))));
        this._refreshItems(this.state.browsedPath);
    }

    private async _handleAddScene(): Promise<void> {
        if (!this.state.browsedPath) {
            return;
        }

        let index: number | undefined = undefined;
        while (await pathExists(join(this.state.browsedPath, `New Scene${index !== undefined ? ` ${index}` : ""}.scene`))) {
            index ??= 0;
            ++index;
        }

        const name = `New Scene${index !== undefined ? ` ${index}` : ""}.scene`;
        const absolutePath = join(this.state.browsedPath, name);

        const serializedCamera = this.props.editor.layout.preview.camera.serialize();

        this.props.editor.layout.preview.reset();

        const camera = Camera.Parse(serializedCamera, this.props.editor.layout.preview.scene) as EditorCamera | null;
        if (camera) {
            this.props.editor.layout.preview.camera.dispose();
            this.props.editor.layout.preview.camera = camera;

            camera.attachControl(true);
        }

        this.props.editor.setState({
            lastOpenedScenePath: absolutePath,
        });

        await mkdir(absolutePath);

        saveProject(this.props.editor);

        this.props.editor.layout.graph.refresh();
        this._refreshItems(this.state.browsedPath!);
    }

    private async _handleAddMaterial(type: string): Promise<void> {
        if (!this.state.browsedPath) {
            return;
        }

        let material: Material | null = null;
        switch (type) {
            case "PBRMaterial":
                material = new PBRMaterial("New PBR Material", this.props.editor.layout.preview.scene);
                break;
            case "StandardMaterial":
                material = new StandardMaterial("New Standard Material", this.props.editor.layout.preview.scene);
                break;
        }

        if (!material) {
            return;
        }

        material.id = Tools.RandomId();
        material.uniqueId = UniqueNumber.Get();

        let index: number | undefined = undefined;
        while (await pathExists(join(this.state.browsedPath, `${material.name}${index !== undefined ? ` ${index}` : ""}.material`))) {
            index ??= 0;
            ++index;
        }

        const name = `${material.name}${index !== undefined ? ` ${index}` : ""}.material`;
        await writeJSON(join(this.state.browsedPath, name), material.serialize(), {
            spaces: "\t",
            encoding: "utf-8",
        });

        material.dispose();

        return this._refreshItems(this.state.browsedPath);
    }

    /**
     * Returns whether the browsed path is the project root path.
     * @returns Whether the browsed path is the project root path.
     */
    private _isBrowsingProjectRootPath(): boolean {
        if (!this.state.browsedPath) {
            return true;
        }

        return join(this.state.browsedPath!) === join(dirname(projectConfiguration.path!));
    }

    private async _handleItemClick(event: MouseEvent<HTMLDivElement, globalThis.MouseEvent>, item: AssetsBrowserItem, contextMenu: boolean): Promise<void> {
        if (contextMenu && this.state.selectedKeys.includes(item.props.selectableKey)) {
            return;
        }

        if (event.ctrlKey || event.metaKey) {
            if (this.state.selectedKeys.includes(item.props.selectableKey)) {
                this.setState({ selectedKeys: this.state.selectedKeys.filter((k) => k !== item.props.selectableKey) });
            } else {
                this.setState({ selectedKeys: [...this.state.selectedKeys, item.props.selectableKey] });
            }
        } else {
            this.setState({ selectedKeys: [item.props.selectableKey] });
        }
    }

    private async _handleItemDoubleClick(item: AssetsBrowserItem): Promise<void> {
        if (item.state.isDirectory) {
            const extension = extname(item.props.absolutePath).toLowerCase();
            if (extension === ".scene") {
                this._handleLoadScene(item);
            } else {
                this.setBrowsePath(item.props.absolutePath);
            }

            return;
        }

        const extension = extname(item.props.absolutePath).toLowerCase();
        switch (extension) {
            case ".png":
            case ".jpg":
            case ".jpeg":
            case ".bmp":
            case ".md": return this.props.editor.layout.inspector.setEditedObject(new FileInspectorObject(item.props.absolutePath));
        }
    }

    private async _handleLoadScene(item: AssetsBrowserItem): Promise<void> {
        if (!this.props.editor.state.projectPath) {
            return;
        }

        if (!await pathExists(join(item.props.absolutePath, "config.json"))) {
            return;
        }

        const accept = await showConfirm("Are you sure?", "This will close the current scene and open the selected one.");
        if (!accept) {
            return;
        }

        this.props.editor.layout.preview.reset();
        this.props.editor.setState({
            lastOpenedScenePath: item.props.absolutePath,
        });

        const directory = dirname(this.props.editor.state.projectPath);

        await loadScene(this.props.editor, directory, item.props.absolutePath);

        this.props.editor.layout.graph.refresh();
    }

    private _handleNodeClicked(node: TreeNodeInfo): void {
        this.setBrowsePath(join(dirname(projectConfiguration.path!), node.id as string));

        this._forEachNode(this.state.filesTreeNodes, (n) => n.isSelected = n.id === node.id);
        this.setState({ filesTreeNodes: this.state.filesTreeNodes });
    }

    private _handleNodeDoubleClicked(node: TreeNodeInfo): void {
        this.setBrowsePath(join(dirname(projectConfiguration.path!), node.id as string));

        this._forEachNode(this.state.filesTreeNodes, (n) => {
            if (n.id === node.id) {
                n.isExpanded = !n.isExpanded;
            }
        });

        this.setState({ filesTreeNodes: this.state.filesTreeNodes });
    }

    private _handleNodeExpanded(node: TreeNodeInfo): void {
        this._forEachNode(this.state.filesTreeNodes, (n) => n.id === node.id && (n.isExpanded = true));
        this.setState({ filesTreeNodes: this.state.filesTreeNodes });
    }

    private _handleNodeCollapsed(node: TreeNodeInfo): void {
        this._forEachNode(this.state.filesTreeNodes, (n) => n.id === node.id && (n.isExpanded = false));
        this.setState({ filesTreeNodes: this.state.filesTreeNodes });
    }

    private _forEachNode(nodes: TreeNodeInfo[] | undefined, callback: (node: TreeNodeInfo, index: number) => void) {
        if (nodes === undefined) {
            return;
        }

        for (let i = 0, len = nodes.length; i < len; ++i) {
            const node = nodes[i];

            callback(node, i);
            this._forEachNode(node.childNodes, callback);
        }
    }
}