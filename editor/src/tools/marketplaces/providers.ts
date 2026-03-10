import { MarketplaceProvider } from "../../project/marketplaces";
import { AmbientCGProvider } from "./ambientcg";
import { PolyHavenProvider } from "./polyhaven";
import { SketchfabProvider } from "./sketchfab";

MarketplaceProvider.register(new AmbientCGProvider());
MarketplaceProvider.register(new PolyHavenProvider());
MarketplaceProvider.register(new SketchfabProvider());
