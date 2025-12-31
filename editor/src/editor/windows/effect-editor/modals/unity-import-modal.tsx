/**
 * Unity Asset Import Modal
 * Allows importing Unity Particle System prefabs from ZIP archives
 */

import { Component, ReactNode } from "react";
import { Tree, TreeNodeInfo } from "@blueprintjs/core";
import { Button } from "../../../../ui/shadcn/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../../ui/shadcn/ui/dialog";
import { Checkbox } from "../../../../ui/shadcn/ui/checkbox";
import { Upload, FileArchive, Search } from "lucide-react";
import { HiOutlineFolder } from "react-icons/hi2";
import { toast } from "sonner";
import * as yaml from "js-yaml";
import { Input } from "../../../../ui/shadcn/ui/input";
import { ScrollArea } from "../../../../ui/shadcn/ui/scroll-area";

/**
 * Recursively process Unity inline objects like {fileID: 123}
 */
function processUnityInlineObjects(obj: any): any {
	if (typeof obj === "string") {
		const inlineMatch = obj.match(/^\s*\{([^}]+)\}\s*$/);
		if (inlineMatch) {
			const pairs = inlineMatch[1].split(",");
			const result: any = {};
			for (const pair of pairs) {
				const [key, value] = pair.split(":").map((s) => s.trim());
				if (key && value !== undefined) {
					if (value === "true") result[key] = true;
					else if (value === "false") result[key] = false;
					else if (/^-?\d+$/.test(value)) result[key] = parseInt(value, 10);
					else if (/^-?\d*\.\d+$/.test(value)) result[key] = parseFloat(value);
					else result[key] = value.replace(/^["']|["']$/g, "");
				}
			}
			return result;
		}
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => processUnityInlineObjects(item));
	}

	if (obj && typeof obj === "object") {
		const result: any = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = processUnityInlineObjects(value);
		}
		return result;
	}

	return obj;
}

/**
 * Parse Unity YAML string into component map (same logic as in converter)
 */
function parseUnityYAML(yamlContent: string): Map<string, any> {
	// Validate input
	if (typeof yamlContent !== "string") {
		console.error("parseUnityYAML: yamlContent must be a string, got:", typeof yamlContent, yamlContent);
		throw new Error("parseUnityYAML: yamlContent must be a string");
	}

	const components = new Map<string, any>();
	const documents = yamlContent.split(/^---\s+/gm).filter(Boolean);

	for (const doc of documents) {
		const match = doc.match(/^!u!(\d+)\s+&(\d+)/);
		if (!match) continue;

		const [, componentType, componentId] = match;
		const yamlWithoutTag = doc.replace(/^!u!(\d+)\s+&(\d+)\s*\n/, "");

		try {
			const parsed = yaml.load(yamlWithoutTag, {
				schema: yaml.DEFAULT_SCHEMA,
			}) as any;

			if (!parsed || typeof parsed !== "object") {
				continue;
			}

			const processed = processUnityInlineObjects(parsed);

			const component: any = {
				id: componentId,
				__type: componentType,
				...processed,
			};

			components.set(componentId, component);

			const mainKey = Object.keys(processed).find((k) => k !== "id" && k !== "__type");
			if (mainKey && processed[mainKey] && typeof processed[mainKey] === "object") {
				processed[mainKey].__id = componentId;
			}
		} catch (error) {
			console.warn(`Failed to parse Unity YAML component ${componentId}:`, error);
			continue;
		}
	}

	return components;
}

export interface IUnityPrefabNode {
	name: string;
	path: string;
	type: "prefab" | "folder";
	children?: IUnityPrefabNode[];
}

export interface IUnityAssetContext {
	prefabComponents: Map<string, any>; // Already parsed Unity components
	dependencies: {
		textures: Map<string, Buffer>; // GUID -> file data
		materials: Map<string, string>; // GUID -> YAML content
		models: Map<string, Buffer>; // GUID -> file data
		sounds: Map<string, Buffer>; // GUID -> file data
		meta: Map<string, any>; // GUID -> meta data
	};
}

export interface IUnityImportModalProps {
	isOpen: boolean;
	onClose: () => void;
	onImport: (contexts: IUnityAssetContext[], prefabNames: string[]) => void;
}

export interface IUnityImportModalState {
	isDragging: boolean;
	zipFile: File | null;
	treeNodes: TreeNodeInfo<IUnityPrefabNode>[];
	selectedPrefabs: Set<string>;
	isProcessing: boolean;
	searchQuery: string;
}

/**
 * Modal for importing Unity prefabs from ZIP archives
 */
export class UnityImportModal extends Component<IUnityImportModalProps, IUnityImportModalState> {
	private _dropZoneRef: HTMLDivElement | null = null;

	constructor(props: IUnityImportModalProps) {
		super(props);

		this.state = {
			isDragging: false,
			zipFile: null,
			treeNodes: [],
			selectedPrefabs: new Set(),
			isProcessing: false,
			searchQuery: "",
		};
	}

	public render(): ReactNode {
		const { isOpen } = this.props;
		const { isDragging, zipFile, treeNodes, selectedPrefabs, isProcessing } = this.state;

		const { searchQuery } = this.state;
		const filteredTreeNodes = this._filterTreeNodes(treeNodes, searchQuery);

		return (
			<Dialog open={isOpen} onOpenChange={(open) => !open && this._handleClose()}>
				<DialogContent className="flex max-h-[min(85vh,800px)] flex-col gap-0 p-0 w-[90vw] max-w-4xl overflow-hidden">
					<DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border/40">
						<DialogTitle className="flex items-center gap-2 text-xl">
							<FileArchive className="w-5 h-5 text-primary" />
							Import Unity Assets
						</DialogTitle>

						{/* Search and Controls - only show when tree is loaded */}
						{treeNodes.length > 0 && (
							<div className="flex flex-col gap-3 mt-4">
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<HiOutlineFolder className="w-4 h-4" />
										<span>
											{selectedPrefabs.size} of {this._countPrefabs(treeNodes)} prefab{this._countPrefabs(treeNodes) !== 1 ? "s" : ""} selected
										</span>
									</div>
									<div className="flex gap-2">
										<Button variant="outline" size="sm" onClick={() => this._handleSelectAll()} className="h-8">
											Select All
										</Button>
										<Button variant="outline" size="sm" onClick={() => this._handleSelectNone()} className="h-8">
											Clear
										</Button>
									</div>
								</div>

								{/* Search Input */}
								<div className="relative">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
									<Input
										type="text"
										placeholder="Search prefabs..."
										value={searchQuery}
										onChange={(e) => this.setState({ searchQuery: e.target.value })}
										className="pl-9 h-9"
									/>
								</div>
							</div>
						)}
					</DialogHeader>

					<div className="flex-1 min-h-0 flex flex-col gap-4 p-6 relative">
						{/* Drop Zone */}
						{!zipFile && (
							<div
								ref={(ref) => (this._dropZoneRef = ref)}
								className={`
									border-2 border-dashed rounded-lg p-12 
									flex flex-col items-center justify-center gap-4
									transition-all duration-200 cursor-pointer
									${isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/30"}
								`}
								onDragOver={(e) => this._handleDragOver(e)}
								onDragLeave={(e) => this._handleDragLeave(e)}
								onDrop={(e) => this._handleDrop(e)}
								onClick={() => this._handleClickUpload()}
							>
								<div className={`p-4 rounded-full ${isDragging ? "bg-primary/10" : "bg-muted"}`}>
									<Upload className={`w-8 h-8 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
								</div>
								<div className="text-center space-y-1">
									<p className="text-sm font-medium">{isDragging ? "Drop ZIP archive here" : "Drag & drop Unity ZIP archive"}</p>
									<p className="text-xs text-muted-foreground">or click to browse</p>
								</div>
								<p className="text-xs text-muted-foreground mt-2">Supported: .zip (Unity Prefab + Meta files)</p>
							</div>
						)}

						{/* File Info */}
						{zipFile && treeNodes.length === 0 && (
							<div className="border border-border rounded-lg p-4 flex items-center gap-3 bg-muted/30">
								<div className="p-2 rounded-lg bg-primary/10">
									<FileArchive className="w-5 h-5 text-primary" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium truncate">{zipFile.name}</p>
									<p className="text-xs text-muted-foreground">{this._formatFileSize(zipFile.size)}</p>
								</div>
								<Button variant="outline" size="sm" onClick={() => this._handleRemoveFile()} className="shrink-0">
									Remove
								</Button>
							</div>
						)}

						{/* Prefab Tree */}
						{treeNodes.length > 0 && (
							<ScrollArea className="h-[400px] max-h-[50vh] border border-border rounded-lg bg-muted/20">
								<div className="p-4">
									<Tree
										contents={filteredTreeNodes}
										onNodeClick={this._handleNodeClick}
										onNodeExpand={this._handleNodeExpand}
										onNodeCollapse={this._handleNodeCollapse}
										className="bg-transparent"
									/>
								</div>
							</ScrollArea>
						)}

						{/* Processing State */}
						{isProcessing && (
							<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
								<div className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-lg shadow-lg">
									<div className="relative">
										<div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary"></div>
									</div>
									<div className="text-center">
										<p className="text-sm font-medium">Processing ZIP archive...</p>
										<p className="text-xs text-muted-foreground mt-1">Please wait</p>
									</div>
								</div>
							</div>
						)}
					</div>

					<DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4 border-t border-border/40">
						<Button variant="outline" onClick={() => this._handleClose()} disabled={isProcessing}>
							Cancel
						</Button>
						<Button onClick={() => this._handleImport()} disabled={selectedPrefabs.size === 0 || isProcessing} className="min-w-[100px]">
							{isProcessing ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
									Importing...
								</>
							) : (
								`Import${selectedPrefabs.size > 0 ? ` (${selectedPrefabs.size})` : ""}`
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	/**
	 * Build tree structure from ZIP file paths
	 */
	private _buildTreeFromPaths(prefabPaths: string[]): IUnityPrefabNode[] {
		// Build folder tree structure
		const folderMap = new Map<string, IUnityPrefabNode>();

		// Helper to get or create folder node
		const getOrCreateFolder = (folderPath: string, folderName: string): IUnityPrefabNode => {
			if (!folderMap.has(folderPath)) {
				folderMap.set(folderPath, {
					name: folderName,
					path: folderPath,
					type: "folder",
					children: [],
				});
			}
			return folderMap.get(folderPath)!;
		};

		// Process each prefab path
		for (const path of prefabPaths) {
			const parts = path.split("/").filter(Boolean);
			const fileName = parts.pop() || path;
			const folderParts = parts;

			// Build folder hierarchy
			let currentPath = "";
			let parentNode: IUnityPrefabNode | null = null;

			for (let i = 0; i < folderParts.length; i++) {
				const folderName = folderParts[i];
				currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

				const folderNode = getOrCreateFolder(currentPath, folderName);
				if (parentNode && parentNode.children) {
					// Check if already added
					if (!parentNode.children.some((c) => c.path === currentPath)) {
						parentNode.children.push(folderNode);
					}
				}
				parentNode = folderNode;
			}

			// Add prefab to parent folder (or root)
			const prefabNode: IUnityPrefabNode = {
				name: fileName.replace(".prefab", ""),
				path: path,
				type: "prefab",
			};

			if (parentNode) {
				if (!parentNode.children) {
					parentNode.children = [];
				}
				parentNode.children.push(prefabNode);
			} else {
				// Root level prefab - add to root
				if (!folderMap.has("")) {
					folderMap.set("", {
						name: "",
						path: "",
						type: "folder",
						children: [],
					});
				}
				folderMap.get("")!.children!.push(prefabNode);
			}
		}

		// Get root folders (those without parent in map)
		const rootNodes: IUnityPrefabNode[] = [];
		for (const [path, node] of folderMap) {
			if (path === "" || !folderMap.has(path.split("/").slice(0, -1).join("/"))) {
				rootNodes.push(node);
			}
		}

		// Sort: folders first, then prefabs, alphabetically
		const sortNode = (node: IUnityPrefabNode): void => {
			if (node.children) {
				node.children.sort((a, b) => {
					if (a.type === "folder" && b.type === "prefab") return -1;
					if (a.type === "prefab" && b.type === "folder") return 1;
					return a.name.localeCompare(b.name);
				});
				node.children.forEach(sortNode);
			}
		};

		rootNodes.forEach(sortNode);
		rootNodes.sort((a, b) => a.name.localeCompare(b.name));

		return rootNodes;
	}

	/**
	 * Convert IUnityPrefabNode to TreeNodeInfo
	 */
	private _convertToTreeNode(node: IUnityPrefabNode): TreeNodeInfo<IUnityPrefabNode> {
		const isSelected = this.state.selectedPrefabs.has(node.path);
		const childNodes = node.children ? node.children.map((child) => this._convertToTreeNode(child)) : undefined;

		const label = (
			<div className="flex items-center gap-2 py-1">
				{node.type === "prefab" && (
					<Checkbox checked={isSelected} onCheckedChange={(checked) => this._handleTogglePrefab(node.path, checked as boolean)} onClick={(e) => e.stopPropagation()} />
				)}
				<span className="text-sm ml-1">{node.name || "Root"}</span>
			</div>
		);

		return {
			id: node.path,
			label,
			icon: node.type === "folder" ? <HiOutlineFolder className="w-4 h-4 text-gray-400" /> : undefined,
			isExpanded: node.type === "folder",
			hasCaret: node.type === "folder" && childNodes && childNodes.length > 0,
			childNodes,
			isSelected: false, // Tree selection is handled by checkbox
			nodeData: node,
		};
	}

	/**
	 * Handle node click
	 */
	private _handleNodeClick = (nodeData: TreeNodeInfo<IUnityPrefabNode>): void => {
		// Toggle checkbox for prefab nodes
		if (nodeData.nodeData?.type === "prefab") {
			const isSelected = this.state.selectedPrefabs.has(nodeData.nodeData.path);
			this._handleTogglePrefab(nodeData.nodeData.path, !isSelected);
		}
	};

	/**
	 * Handle node expand
	 */
	private _handleNodeExpand = (nodeData: TreeNodeInfo<IUnityPrefabNode>): void => {
		// Update tree to reflect expansion
		const updateNodes = (nodes: TreeNodeInfo<IUnityPrefabNode>[]): TreeNodeInfo<IUnityPrefabNode>[] => {
			return nodes.map((n) => {
				if (n.id === nodeData.id) {
					return { ...n, isExpanded: true };
				}
				if (n.childNodes) {
					return { ...n, childNodes: updateNodes(n.childNodes) };
				}
				return n;
			});
		};
		this.setState({ treeNodes: updateNodes(this.state.treeNodes) });
	};

	/**
	 * Handle node collapse
	 */
	private _handleNodeCollapse = (nodeData: TreeNodeInfo<IUnityPrefabNode>): void => {
		// Update tree to reflect collapse
		const updateNodes = (nodes: TreeNodeInfo<IUnityPrefabNode>[]): TreeNodeInfo<IUnityPrefabNode>[] => {
			return nodes.map((n) => {
				if (n.id === nodeData.id) {
					return { ...n, isExpanded: false };
				}
				if (n.childNodes) {
					return { ...n, childNodes: updateNodes(n.childNodes) };
				}
				return n;
			});
		};
		this.setState({ treeNodes: updateNodes(this.state.treeNodes) });
	};

	/**
	 * Handle drag over
	 */
	private _handleDragOver(e: React.DragEvent): void {
		e.preventDefault();
		e.stopPropagation();
		this.setState({ isDragging: true });
	}

	/**
	 * Handle drag leave
	 */
	private _handleDragLeave(e: React.DragEvent): void {
		e.preventDefault();
		e.stopPropagation();
		if (e.currentTarget === this._dropZoneRef) {
			this.setState({ isDragging: false });
		}
	}

	/**
	 * Handle drop
	 */
	private async _handleDrop(e: React.DragEvent): Promise<void> {
		e.preventDefault();
		e.stopPropagation();
		this.setState({ isDragging: false });

		const files = Array.from(e.dataTransfer.files);
		const zipFile = files.find((f) => f.name.endsWith(".zip"));

		if (!zipFile) {
			toast.error("Please drop a ZIP archive");
			return;
		}

		await this._processZipFile(zipFile);
	}

	/**
	 * Handle click upload
	 */
	private _handleClickUpload(): void {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".zip";
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				await this._processZipFile(file);
			}
		};
		input.click();
	}

	/**
	 * Process ZIP file and extract prefab list with folder structure
	 */
	private async _processZipFile(file: File): Promise<void> {
		this.setState({ zipFile: file, isProcessing: true });

		try {
			// Convert File to Buffer for adm-zip (Electron-compatible)
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Use adm-zip for Electron (better than jszip for Node.js/Electron)
			const AdmZip = (await import("adm-zip")).default;
			const zip = new AdmZip(buffer);

			const prefabPaths: string[] = [];

			// Get all entries from ZIP
			const zipEntries = zip.getEntries();

			// Find all .prefab files (ignore .meta files and directories)
			for (const entry of zipEntries) {
				if (entry.entryName.endsWith(".prefab") && !entry.isDirectory && !entry.entryName.endsWith(".meta")) {
					prefabPaths.push(entry.entryName);
				}
			}

			if (prefabPaths.length === 0) {
				toast.error("No .prefab files found in ZIP archive");
				this.setState({ isProcessing: false, zipFile: null });
				return;
			}

			// Build tree structure from paths
			const treeStructure = this._buildTreeFromPaths(prefabPaths);

			// Convert to TreeNodeInfo
			const treeNodes = treeStructure.map((node) => this._convertToTreeNode(node));

			this.setState({
				treeNodes,
				isProcessing: false,
			});

			toast.success(`Found ${prefabPaths.length} prefab${prefabPaths.length > 1 ? "s" : ""} in archive`);
		} catch (error) {
			console.error("Failed to process ZIP:", error);
			toast.error("Failed to process ZIP archive");
			this.setState({ isProcessing: false, zipFile: null });
		}
	}

	/**
	 * Handle toggle prefab selection
	 */
	private _handleTogglePrefab(path: string, checked: boolean): void {
		const selectedPrefabs = new Set(this.state.selectedPrefabs);
		if (checked) {
			selectedPrefabs.add(path);
		} else {
			selectedPrefabs.delete(path);
		}

		// Update tree nodes to reflect checkbox state
		const updateNodes = (nodes: TreeNodeInfo<IUnityPrefabNode>[]): TreeNodeInfo<IUnityPrefabNode>[] => {
			return nodes.map((n) => {
				if (n.nodeData?.path === path) {
					// Update label with new checkbox state
					const node = n.nodeData;
					const label = (
						<div className="flex items-center gap-2 py-1">
							{node.type === "prefab" && (
								<Checkbox checked={checked} onCheckedChange={(c) => this._handleTogglePrefab(path, c as boolean)} onClick={(e) => e.stopPropagation()} />
							)}
							<span className="text-sm ml-1">{node.name || "Root"}</span>
						</div>
					);
					return { ...n, label };
				}
				if (n.childNodes) {
					return { ...n, childNodes: updateNodes(n.childNodes) };
				}
				return n;
			});
		};

		this.setState({
			selectedPrefabs,
			treeNodes: updateNodes(this.state.treeNodes),
		});
	}

	/**
	 * Handle select all prefabs
	 */
	private _handleSelectAll(): void {
		const allPaths = this._collectAllPaths(this.state.treeNodes);
		this.setState({ selectedPrefabs: new Set(allPaths) });

		// Update tree to reflect all selected
		const updateNodes = (nodes: TreeNodeInfo<IUnityPrefabNode>[]): TreeNodeInfo<IUnityPrefabNode>[] => {
			return nodes.map((n) => {
				if (n.nodeData?.type === "prefab") {
					const node = n.nodeData;
					const label = (
						<div className="flex items-center gap-2 py-1">
							<Checkbox checked={true} onCheckedChange={(c) => this._handleTogglePrefab(node.path, c as boolean)} onClick={(e) => e.stopPropagation()} />
							<span className="text-sm ml-1">{node.name}</span>
						</div>
					);
					return { ...n, label };
				}
				if (n.childNodes) {
					return { ...n, childNodes: updateNodes(n.childNodes) };
				}
				return n;
			});
		};
		this.setState({ treeNodes: updateNodes(this.state.treeNodes) });
	}

	/**
	 * Handle select none
	 */
	private _handleSelectNone(): void {
		this.setState({ selectedPrefabs: new Set() });

		// Update tree to reflect none selected
		const updateNodes = (nodes: TreeNodeInfo<IUnityPrefabNode>[]): TreeNodeInfo<IUnityPrefabNode>[] => {
			return nodes.map((n) => {
				if (n.nodeData?.type === "prefab") {
					const node = n.nodeData;
					const label = (
						<div className="flex items-center gap-2 py-1">
							<Checkbox checked={false} onCheckedChange={(c) => this._handleTogglePrefab(node.path, c as boolean)} onClick={(e) => e.stopPropagation()} />
							<span className="text-sm ml-1">{node.name}</span>
						</div>
					);
					return { ...n, label };
				}
				if (n.childNodes) {
					return { ...n, childNodes: updateNodes(n.childNodes) };
				}
				return n;
			});
		};
		this.setState({ treeNodes: updateNodes(this.state.treeNodes) });
	}

	/**
	 * Collect all prefab paths recursively from tree nodes
	 */
	private _collectAllPaths(nodes: TreeNodeInfo<IUnityPrefabNode>[]): string[] {
		const paths: string[] = [];
		for (const node of nodes) {
			if (node.nodeData?.type === "prefab") {
				paths.push(node.nodeData.path);
			}
			if (node.childNodes) {
				paths.push(...this._collectAllPaths(node.childNodes));
			}
		}
		return paths;
	}

	/**
	 * Count total prefabs in tree
	 */
	private _countPrefabs(nodes: TreeNodeInfo<IUnityPrefabNode>[]): number {
		let count = 0;
		for (const node of nodes) {
			if (node.nodeData?.type === "prefab") {
				count++;
			}
			if (node.childNodes) {
				count += this._countPrefabs(node.childNodes);
			}
		}
		return count;
	}

	/**
	 * Filter tree nodes by search query
	 */
	private _filterTreeNodes(nodes: TreeNodeInfo<IUnityPrefabNode>[], query: string): TreeNodeInfo<IUnityPrefabNode>[] {
		if (!query.trim()) {
			return nodes;
		}

		const lowerQuery = query.toLowerCase();

		const filterNode = (node: TreeNodeInfo<IUnityPrefabNode>): TreeNodeInfo<IUnityPrefabNode> | null => {
			const nodeName = node.nodeData?.name?.toLowerCase() || "";
			const matchesQuery = nodeName.includes(lowerQuery);

			// Filter children first
			let filteredChildren: TreeNodeInfo<IUnityPrefabNode>[] | undefined;
			if (node.childNodes) {
				filteredChildren = node.childNodes.map(filterNode).filter((n) => n !== null) as TreeNodeInfo<IUnityPrefabNode>[];
			}

			// If this node matches or has matching children, include it
			if (matchesQuery || (filteredChildren && filteredChildren.length > 0)) {
				return {
					...node,
					childNodes: filteredChildren && filteredChildren.length > 0 ? filteredChildren : undefined,
					isExpanded: matchesQuery || (filteredChildren && filteredChildren.length > 0) ? true : node.isExpanded,
				};
			}

			return null;
		};

		return nodes.map(filterNode).filter((n) => n !== null) as TreeNodeInfo<IUnityPrefabNode>[];
	}

	/**
	 * Handle remove file
	 */
	private _handleRemoveFile(): void {
		this.setState({
			zipFile: null,
			treeNodes: [],
			selectedPrefabs: new Set(),
			searchQuery: "",
		});
	}

	/**
	 * Collect all fileID references from parsed YAML object
	 */
	private _collectFileIDs(obj: any, fileIDs: Set<string>): void {
		if (typeof obj !== "object" || obj === null) {
			return;
		}

		if (Array.isArray(obj)) {
			for (const item of obj) {
				this._collectFileIDs(item, fileIDs);
			}
			return;
		}

		// Check for Unity fileID references: {fileID: "123"} or {fileID: 123}
		if (obj.fileID !== undefined) {
			const fileID = String(obj.fileID);
			if (fileID !== "0" && fileID !== "4294967295") {
				// 0 = null, 4294967295 = missing
				fileIDs.add(fileID);
			}
		}

		// Recursively check all properties
		for (const value of Object.values(obj)) {
			this._collectFileIDs(value, fileIDs);
		}
	}

	/**
	 * Parse Unity .meta file to extract GUID and fileID mappings
	 */
	private _parseMetaFile(metaContent: string): { guid: string; fileIDToGUID: Map<string, string> } | null {
		try {
			const parsed = yaml.load(metaContent) as any;
			if (!parsed || !parsed.guid) {
				return null;
			}

			const fileIDToGUID = new Map<string, string>();
			const guid = parsed.guid;

			// Unity stores fileID -> GUID mappings in the meta file
			// Look for external references in the meta file
			if (parsed.ExternalObjects) {
				for (const [key, value] of Object.entries(parsed.ExternalObjects)) {
					if (value && typeof value === "object" && (value as any).guid) {
						fileIDToGUID.set(key, (value as any).guid);
					}
				}
			}

			// Also check for fileIDToRecycleName which maps fileID to GUID
			if (parsed.fileIDToRecycleName) {
				for (const [fileID, guidOrName] of Object.entries(parsed.fileIDToRecycleName)) {
					// Sometimes it's a GUID directly, sometimes it needs lookup
					if (typeof guidOrName === "string") {
						fileIDToGUID.set(fileID, guidOrName);
					}
				}
			}

			return {
				guid,
				fileIDToGUID,
			};
		} catch (error) {
			console.warn("Failed to parse meta file:", error);
			return null;
		}
	}

	/**
	 * Collect all dependencies for a prefab
	 */
	private async _collectDependencies(zip: any, prefabPath: string, allEntries: any[]): Promise<IUnityAssetContext["dependencies"]> {
		const dependencies: IUnityAssetContext["dependencies"] = {
			textures: new Map(),
			materials: new Map(),
			models: new Map(),
			sounds: new Map(),
			meta: new Map(),
		};

		// Read prefab YAML
		const prefabEntry = zip.getEntry(prefabPath);
		if (!prefabEntry) {
			return dependencies;
		}

		const prefabYaml = prefabEntry.getData().toString("utf8");

		// Parse Unity YAML to find fileID references
		const components = parseUnityYAML(prefabYaml);

		// Build fileID -> GUID mapping from all .meta files FIRST
		const fileIDToGUID = new Map<string, string>();
		const guidToPath = new Map<string, string>();
		const guidToMeta = new Map<string, any>();

		// First pass: collect all meta files and build GUID -> path mapping
		for (const entry of allEntries) {
			if (entry.entryName.endsWith(".meta") && !entry.isDirectory) {
				try {
					const metaContent = entry.getData().toString("utf8");
					const meta = this._parseMetaFile(metaContent);
					if (meta) {
						const assetPath = entry.entryName.replace(/\.meta$/, "");
						guidToPath.set(meta.guid, assetPath);
						guidToMeta.set(meta.guid, meta);

						// Map fileID -> GUID from this meta file
						for (const [fileID, guid] of meta.fileIDToGUID) {
							fileIDToGUID.set(fileID, guid);
						}
					}
				} catch (error) {
					console.warn(`Failed to parse meta file ${entry.entryName}:`, error);
				}
			}
		}

		// Collect component IDs (internal references within prefab)
		const componentIDs = new Set<string>(components.keys());

		// Collect all fileID references from components
		const allFileIDs = new Set<string>();
		for (const [_id, component] of components) {
			this._collectFileIDs(component, allFileIDs);
		}

		// Find external fileID references (those that are NOT component IDs but have GUID mappings)
		// These are references to external assets (textures, materials, models, etc.)
		const externalFileIDs = new Set<string>();
		for (const fileID of allFileIDs) {
			// If fileID is not a component ID (internal) and has a GUID mapping, it's an external asset reference
			if (!componentIDs.has(fileID) && fileIDToGUID.has(fileID)) {
				externalFileIDs.add(fileID);
			}
		}

		// Also check for direct GUID references in components (m_Texture, m_Material, etc.)
		const referencedGUIDs = new Set<string>();
		for (const [_id, component] of components) {
			this._collectGUIDReferences(component, referencedGUIDs);
		}

		// Collect all assets that are referenced
		const collectedGUIDs = new Set<string>();
		for (const fileID of externalFileIDs) {
			const guid = fileIDToGUID.get(fileID);
			if (guid) {
				collectedGUIDs.add(guid);
			}
		}
		for (const guid of referencedGUIDs) {
			collectedGUIDs.add(guid);
		}

		// Collect dependencies by GUID (ONLY those that are actually referenced)
		for (const guid of collectedGUIDs) {
			const assetPath = guidToPath.get(guid);
			if (!assetPath) {
				continue;
			}

			const assetEntry = zip.getEntry(assetPath);
			if (!assetEntry || assetEntry.isDirectory) {
				continue;
			}

			const ext = assetPath.split(".").pop()?.toLowerCase();
			const meta = guidToMeta.get(guid);

			if (meta) {
				dependencies.meta.set(guid, { path: assetPath, guid });

				// Categorize by extension
				if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "tga" || ext === "tiff" || ext === "dds") {
					dependencies.textures.set(guid, assetEntry.getData());
				} else if (ext === "mat") {
					const matContent = assetEntry.getData().toString("utf8");
					dependencies.materials.set(guid, matContent);
				} else if (ext === "fbx" || ext === "obj" || ext === "dae" || ext === "mesh") {
					dependencies.models.set(guid, assetEntry.getData());
				} else if (ext === "wav" || ext === "mp3" || ext === "ogg" || ext === "aac") {
					dependencies.sounds.set(guid, assetEntry.getData());
				}
			}
		}

		console.log(`Collected dependencies for ${prefabPath}:`, {
			textures: dependencies.textures.size,
			materials: dependencies.materials.size,
			models: dependencies.models.size,
			sounds: dependencies.sounds.size,
			meta: dependencies.meta.size,
		});

		return dependencies;
	}

	/**
	 * Collect GUID references from Unity component (m_Texture, m_Material, etc.)
	 */
	private _collectGUIDReferences(obj: any, guids: Set<string>): void {
		if (typeof obj !== "object" || obj === null) {
			return;
		}

		if (Array.isArray(obj)) {
			for (const item of obj) {
				this._collectGUIDReferences(item, guids);
			}
			return;
		}

		// Check for GUID fields (Unity uses guid field in some references)
		if (obj.guid && typeof obj.guid === "string") {
			guids.add(obj.guid);
		}

		// Check for common Unity asset reference patterns
		if (obj.m_Texture && obj.m_Texture.guid) {
			guids.add(obj.m_Texture.guid);
		}
		if (obj.m_Material && obj.m_Material.guid) {
			guids.add(obj.m_Material.guid);
		}
		if (obj.m_Mesh && obj.m_Mesh.guid) {
			guids.add(obj.m_Mesh.guid);
		}

		// Recursively check all properties
		for (const value of Object.values(obj)) {
			this._collectGUIDReferences(value, guids);
		}
	}

	/**
	 * Handle import - collect all dependencies and pass to converter
	 */
	private async _handleImport(): Promise<void> {
		const { zipFile, selectedPrefabs } = this.state;
		if (!zipFile || selectedPrefabs.size === 0) {
			toast.error("No prefabs selected");
			return;
		}

		this.setState({ isProcessing: true });

		try {
			// Convert File to Buffer
			const arrayBuffer = await zipFile.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Load ZIP
			const AdmZip = (await import("adm-zip")).default;
			const zip = new AdmZip(buffer);
			const allEntries = zip.getEntries();

			// Process each selected prefab
			const contexts: IUnityAssetContext[] = [];
			const prefabNames: string[] = [];

			for (const prefabPath of Array.from(selectedPrefabs)) {
				try {
					// Read prefab YAML
					const prefabEntry = zip.getEntry(prefabPath);
					if (!prefabEntry || prefabEntry.isDirectory) {
						continue;
					}

					const prefabYaml = prefabEntry.getData().toString("utf8");

					// Validate YAML content
					if (typeof prefabYaml !== "string" || !prefabYaml.trim()) {
						console.error(`Invalid prefab YAML for ${prefabPath}`);
						toast.error(`Invalid prefab file: ${prefabPath.split("/").pop()}`);
						continue;
					}

					// Parse Unity YAML here (already done in _collectDependencies, but we need it here too)
					const prefabComponents = parseUnityYAML(prefabYaml);

					// Validate parsed components
					if (!(prefabComponents instanceof Map)) {
						console.error(`Failed to parse prefab components for ${prefabPath}, got:`, typeof prefabComponents);
						toast.error(`Failed to parse prefab: ${prefabPath.split("/").pop()}`);
						continue;
					}

					// Collect all dependencies
					const dependencies = await this._collectDependencies(zip, prefabPath, allEntries);

					contexts.push({
						prefabComponents,
						dependencies,
					});

					prefabNames.push(prefabPath.split("/").pop()?.replace(".prefab", "") || prefabPath);
				} catch (error) {
					console.error(`Failed to process prefab ${prefabPath}:`, error);
					toast.error(`Failed to process ${prefabPath.split("/").pop()}`);
				}
			}

			if (contexts.length > 0) {
				this.props.onImport(contexts, prefabNames);
				this._handleClose();
			} else {
				toast.error("No valid prefabs to import");
			}
		} catch (error) {
			console.error("Failed to import Unity prefabs:", error);
			toast.error("Failed to import Unity prefabs");
		} finally {
			this.setState({ isProcessing: false });
		}
	}

	/**
	 * Handle close
	 */
	private _handleClose(): void {
		this.setState({
			isDragging: false,
			zipFile: null,
			treeNodes: [],
			selectedPrefabs: new Set(),
			isProcessing: false,
			searchQuery: "",
		});
		this.props.onClose();
	}

	/**
	 * Format file size
	 */
	private _formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
}
