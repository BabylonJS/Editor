export default {
    presets: [
        [
            "@babel/preset-env", {
                targets: {
                    node: "current"
                },
            },
        ],
        "@babel/preset-typescript",
    ],
    plugins: [
        "transform-decorators-legacy",
        "transform-class-properties"
    ],
};
