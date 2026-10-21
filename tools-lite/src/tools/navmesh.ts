/**
 * This interface is used to define extra properties on the navigation plugin of Babylon Lite.
 * For example to update the navmesh in runtime or update all obstacles when they are dynamically changed.
 */

import { NavigationPlugin } from "@babylonjs/lite";

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface RecastNavigationHelper extends NavigationPlugin {
	refreshObstacles(): void;
}
