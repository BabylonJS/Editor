export interface IDocItem {
	title: string;
	href: string;
	description?: string;
}

export interface IDocCategory {
	category: string;
	items: IDocItem[];
}

export const DOCS_CONFIG: IDocCategory[] = [
	{
		category: "Basics",
		items: [
			{
				title: "Introduction",
				href: "/documentation",
				description: "An overview of the Babylon.js Editor, what it can do, and what you need before getting started.",
			},
			{
				title: "Creating a project",
				href: "/documentation/basics/creating-project",
				description: "Learn how to create a new project, select project templates, configure package managers, and import existing projects in the editor.",
			},
			{
				title: "Composing scene",
				href: "/documentation/basics/composing-scene",
				description: "Learn the editor layout, select objects with gizmos, add primitives and 3D models, and manage the assets of your project.",
			},
			{
				title: "Managing assets",
				href: "/documentation/basics/managing-assets",
				description: "Create and edit your own materials, assign textures, and get the most out of the Assets Browser.",
			},
			{
				title: "Adding scripts",
				href: "/documentation/basics/adding-scripts",
				description: "Attach TypeScript scripts to scene objects and retrieve objects inside them using decorators.",
			},
			{
				title: "Running project",
				href: "/documentation/basics/running-project",
				description: "Play, stop, and refresh your scene directly from the editor without leaving the workspace.",
			},
		],
	},
	{
		category: "Scripting",
		items: [
			{
				title: "Common decorators",
				href: "/documentation/scripting/common-decorators",
				description: "Retrieve scene objects, components, animation groups, and asset containers directly inside attached scripts.",
			},
			{
				title: "Customizing scripts",
				href: "/documentation/scripting/customizing-scripts",
				description: "Expose script properties in the inspector with @visibleAs* decorators so each object can be configured individually.",
			},
			{
				title: "Listening events",
				href: "/documentation/scripting/listening-events",
				description: "Listen to pointer and keyboard events in attached scripts with @onPointerEvent and @onKeyboardEvent.",
			},
			{
				title: "Linking assets",
				href: "/documentation/scripting/linking-assets",
				description: "Reference JSON, material, and GUI assets from your scripts using @visibleAsAsset.",
			},
		],
	},
	{
		category: "Sprites",
		items: [
			{
				title: "Using Sprite Manager",
				href: "/documentation/sprites/using-sprite-manager",
				description: "Create sprite managers, configure textures and atlases, animate sprites, and attach scripts to them.",
			},
		],
	},
	{
		category: "Deploying",
		items: [
			{
				title: "Using Babylon.js Editor CLI",
				href: "/documentation/deploying/babylonjs-editor-cli",
				description: "Generate all project assets and scenes from the command line, ready to be used in your CI/CD pipeline.",
			},
		],
	},
	{
		category: "Plugins",
		items: [
			{
				title: "Using Fab Plugin",
				href: "/documentation/plugins/fab",
				description: "Import Fab.com assets directly into your project with the Fab plugin.",
			},
		],
	},
	{
		category: "Advanced",
		items: [
			{
				title: "Compressing textures",
				href: "/documentation/advanced/compressing-textures",
				description: "Reduce GPU memory usage with KTX and KTX2 compressed textures.",
			},
			{
				title: "LOD collisions",
				href: "/documentation/advanced/lod-collisions",
				description: "Upcoming: reduce collision computation cost with LOD-based colliders.",
			},
			{
				title: "Optimizing shadows",
				href: "/documentation/advanced/optimizing-shadows",
				description: "Upcoming: improve shadow rendering performance.",
			},
		],
	},
	{
		category: "Tips",
		items: [
			{
				title: "Shortcuts",
				href: "/documentation/tips/shortcuts",
				description: "All the keyboard shortcuts available in the editor.",
			},
			{
				title: "Creating a Skybox",
				href: "/documentation/tips/creating-skybox",
				description: "Build a skybox with a cube texture or a procedural Sky Material.",
			},
		],
	},
];

/**
 * Returns a flat list of all documentation pages in sequential order.
 */
export function getAllDocItems(): IDocItem[] {
	return DOCS_CONFIG.flatMap((cat) => cat.items);
}

/**
 * Returns the documentation entry matching the given pathname, if any.
 */
export function getDocItemByPath(pathname: string): IDocItem | undefined {
	const cleanPath = pathname.replace(/\/$/, "");
	return getAllDocItems().find((item) => item.href === cleanPath || item.href === pathname);
}

/**
 * Returns the previous and next documentation pages relative to the current route.
 */
export function getAdjacentDocs(pathname: string): { prev: IDocItem | null; next: IDocItem | null } {
	const allItems = getAllDocItems();
	// Normalize trailing slash if any
	const cleanPath = pathname.replace(/\/$/, "");
	const index = allItems.findIndex((item) => item.href === cleanPath || item.href === pathname);

	if (index === -1) {
		return { prev: null, next: null };
	}

	return {
		prev: index > 0 ? allItems[index - 1] : null,
		next: index < allItems.length - 1 ? allItems[index + 1] : null,
	};
}
