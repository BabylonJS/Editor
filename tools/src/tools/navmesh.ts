/**
 * This interface is used to define extra properties on RecastNavigationJSPluginV2.
 * For example to update the navmesh in runtime or update all obstacles when they are dynamically changed.
 */

import { RecastNavigationJSPluginV2 } from "@babylonjs/addons/navigation/plugin/RecastNavigationJSPlugin";

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface RecastNavigationHelper extends RecastNavigationJSPluginV2 {
	refreshObstacles(): void;
}
