/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: "https://editor.babylonjs.com",
    generateRobotsTxt: true,

    exclude: [
        // Image shared on social networks, not a page.
        "/opengraph-image.jpg",
        // Placeholder pages served with "noindex" until their content is written.
        "/documentation/advanced/lod-collisions",
        "/documentation/advanced/optimizing-shadows",
    ],

    transform: (config, path) => {
        if (path === "/") {
            config.priority = 1;
        }

        return {
            loc: path, // => this will be exported as http(s)://<config.siteUrl>/<path>
            changefreq: config.changefreq,
            priority: config.priority,
            lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
            alternateRefs: config.alternateRefs ?? [],
        };
    },
};
