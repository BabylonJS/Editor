import type { Metadata } from "next";

import { Callout, DocPage } from "../../components";
import { getDocMetadata } from "../../config";

// Placeholder page: kept out of search results (and of the sitemap, see next-sitemap.config.js) until its content is written.
export const metadata: Metadata = {
	...getDocMetadata("/documentation/advanced/optimizing-shadows"),
	robots: { index: false, follow: true },
};

export default function DocumentationOptimizingShadowsPage() {
	return (
		<DocPage>
			<Callout type="info" title="Coming soon">
				The content of this page is on its way. Stay tuned!
			</Callout>
		</DocPage>
	);
}
