/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: "https://editor.babylonjs.com",
    generateRobotsTxt: true,

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
