import type { Metadata } from "next";

export interface IDocItem {
	title: string;
	href: string;
	/** Title used for search engines and browser tabs. Defaults to the title. */
	metaTitle?: string;
	description?: string;
}

export interface IDocCategory {
	category: string;
	items: IDocItem[];
}

/**
 * All the documentation pages, in reading order.
 * When adding a page, also export its metadata from its page.tsx using getDocMetadata so it gets its own title and description in search results.
 */
export const DOCS_CONFIG: IDocCategory[] = [
	{
		category: "Basics",
		items: [
			{
				title: "Introduction",
				href: "/documentation",
				metaTitle: "Documentation: Getting Started & Guides",
				description: "An overview of the Babylon.js Editor, what it can do, and what you need before getting started.",
			},
			{
				title: "Creating project",
				href: "/documentation/basics/creating-project",
				metaTitle: "Creating a Project: Templates & Setup",
				description: "Learn how to create a new project, select project templates, configure package managers, and import existing projects in the editor.",
			},
			{
				title: "Composing scene",
				href: "/documentation/basics/composing-scene",
				metaTitle: "Composing a 3D Scene & Importing Models",
				description: "Learn the editor layout, select objects with gizmos, add primitives and 3D models, and manage the assets of your project.",
			},
			{
				title: "Managing assets",
				href: "/documentation/basics/managing-assets",
				metaTitle: "Managing Assets: PBR Materials & Textures",
				description: "Create and edit your own materials, assign textures, and get the most out of the Assets Browser.",
			},
			{
				title: "Adding scripts",
				href: "/documentation/basics/adding-scripts",
				metaTitle: "Adding & Attaching TypeScript Scripts",
				description: "Attach TypeScript scripts to scene objects and retrieve objects inside them using decorators.",
			},
			{
				title: "Running project",
				href: "/documentation/basics/running-project",
				metaTitle: "Running & Playing Your Project",
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
				metaTitle: "Script Decorators: @nodeFromScene & More",
				description: "Retrieve scene objects, components, animation groups, and asset containers directly inside attached scripts.",
			},
			{
				title: "Customizing scripts",
				href: "/documentation/scripting/customizing-scripts",
				metaTitle: "Customizing Scripts in the Inspector",
				description: "Expose script properties in the inspector with @visibleAs* decorators so each object can be configured individually.",
			},
			{
				title: "Listening events",
				href: "/documentation/scripting/listening-events",
				metaTitle: "Listening to Pointer & Keyboard Events",
				description: "Listen to pointer and keyboard events in attached scripts with @onPointerEvent and @onKeyboardEvent.",
			},
			{
				title: "Linking assets",
				href: "/documentation/scripting/linking-assets",
				metaTitle: "Linking Assets to Your Scripts",
				description: "Reference JSON, material, and GUI assets from your scripts using @visibleAsAsset.",
			},
		],
	},
	{
		category: "Assets",
		items: [
			{
				title: "Using Sprite Manager",
				href: "/documentation/assets/using-sprite-manager",
				metaTitle: "Sprite Manager: 2D Sprites & Animations",
				description: "Create sprite managers, configure textures and atlases, animate sprites, and attach scripts to them.",
			},
			{
				title: "Using Gaussian Splatting",
				href: "/documentation/assets/using-gaussian-splatting",
				metaTitle: "Gaussian Splatting: .splat, .spz & .sog",
				description: "Import Gaussian Splatting assets (.splat, .spz, .sog) into your project, manipulate them in the scene, and enable runtime loading support.",
			},
		],
	},
	{
		category: "Deploying",
		items: [
			{
				title: "Using Babylon.js Editor CLI",
				href: "/documentation/deploying/babylonjs-editor-cli",
				metaTitle: "babylonjs-editor-cli: Pack Assets in CI/CD",
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
				metaTitle: "Fab Plugin: Import Fab.com 3D Assets",
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
				metaTitle: "Compressing Textures with KTX & KTX2",
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
				metaTitle: "Keyboard Shortcuts",
				description: "All the keyboard shortcuts available in the editor.",
			},
			{
				title: "Creating a Skybox",
				href: "/documentation/tips/creating-skybox",
				metaTitle: "Creating a Skybox: HDR & Sky Material",
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
 * Returns the metadata (title and description) of the documentation page located at the given route.
 */
export function getDocMetadata(href: string): Metadata {
	const item = getDocItemByPath(href);
	if (!item) {
		throw new Error(`Documentation page "${href}" is not registered in DOCS_CONFIG.`);
	}

	return {
		title: item.metaTitle ?? item.title,
		description: item.description,
	};
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
