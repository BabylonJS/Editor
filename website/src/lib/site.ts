export const siteUrl = "https://editor.babylonjs.com";

export const siteName = "Babylon.js Editor";

export const siteDescription =
	"Free, open-source 3D editor for the Babylon.js engine: compose scenes, attach TypeScript scripts and build games for the web. For Windows, macOS and Linux.";

/**
 * Structured data (https://schema.org) of the home page: the website and the application it presents.
 */
export const homeJsonLd = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "WebSite",
			"@id": `${siteUrl}/#website`,
			url: siteUrl,
			name: siteName,
			description: siteDescription,
			inLanguage: "en",
		},
		{
			"@type": "SoftwareApplication",
			"@id": `${siteUrl}/#software`,
			name: siteName,
			description: siteDescription,
			url: siteUrl,
			screenshot: `${siteUrl}/screenshots/large.webp`,
			applicationCategory: "DeveloperApplication",
			operatingSystem: "Windows, macOS, Linux",
			downloadUrl: `${siteUrl}/download`,
			license: "https://www.apache.org/licenses/LICENSE-2.0",
			isAccessibleForFree: true,
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD",
			},
			sameAs: ["https://github.com/BabylonJS/Editor"],
		},
	],
};
