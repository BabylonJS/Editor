/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,

    env: {
        MANSION_EXPERIMENT_ROOT_URL: process.env.MANSION_EXPERIMENT_ROOT_URL,
    },

    webpack: (config) => {
        config.module.rules.push({
            test: /\.fx?$/,
            loader: "raw-loader"
        });
        return config;
    },
};

module.exports = nextConfig;
