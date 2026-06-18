import { MarketplaceProvider } from "./provider";
import { AmbientCGProvider } from "./ambientcg";
import { PolyHavenProvider } from "./polyhaven";
import { SketchfabProvider } from "./sketchfab";

export default () => {
	MarketplaceProvider.register(new AmbientCGProvider());
	MarketplaceProvider.register(new PolyHavenProvider());
	MarketplaceProvider.register(new SketchfabProvider());
	return MarketplaceProvider.getProviders();
};
