const fs = require("fs");
const path = require("path");
const { SourceMapDevToolPlugin } = require("webpack");

function createModuleConfig({ name, resolve, entry: _entry, library }) {
    return function ({ bundleAnalyzer, mode, devtool, minimize, dirOutput, stats }) {
        const plugins = [];

        if (devtool) {
            // plugins.unshift(new SourceMapDevToolPlugin({
            //     filename: "[name].chunk.js.map[query]",
            //     sourceRoot: "/",
            //     exclude: ["libs/", /\.(sa|sc|c)ss$/]
            // }));
        }

        if (bundleAnalyzer) plugins.push(new BundleAnalyzerPlugin());

        const entry = {};
        entry[name] = typeof _entry === "string" ? [_entry] : _entry;

        const output = {
            filename: "[name].js",
            path: dirOutput ? dirOutput : path.resolve(__dirname, "../."),
            chunkFilename: "[name].chunk.js"
        };

        if (library) {
            output["library"] = library ? `Module_${name}` : undefined;
            output["libraryTarget"] = "var";
            output["libraryExport"] = "default";
        }

        const rules = [];

        rules.unshift({
            test: /\.vue$/,
            exclude: /(node_modules|submodules)/,
            loader: "vue-loader",
            options: {
                presets: [
                    ["@babel/preset-env", {
                        targets: { browsers: ["chrome >= 80"] }
                    }],
                    [
                        "@babel/preset-typescript", {
                            allowNamespaces: true,
                            targets: {
                                browsers: ["chrome >= 80"]
                            }
                        }
                    ]
                ],
                plugins: [
                    "@babel/transform-runtime",
                    "@babel/plugin-proposal-class-properties"
                ]
            }
        }, {
            test: /\.(js|jsx|ts|tsx)$/,
            exclude: /(node_modules|submodules)/,
            loader: "babel-loader",
            options: {
                presets: [
                    ["@babel/preset-env", {
                        targets: { browsers: ["chrome >= 80"] }
                    }],
                    [
                        "@babel/preset-typescript", {
                            allowNamespaces: true,
                            targets: {
                                browsers: ["chrome >= 80"]
                            }
                        }
                    ]
                ],
                plugins: [
                    "@babel/transform-runtime",
                    "@babel/plugin-proposal-class-properties"
                ]
            }
        });

        return {
            entry,
            mode,
            stats,
            resolve,
            optimization: {
                minimize
            },
            module: { rules },
            plugins,
            output,
            devtool,
            context: __dirname
        };
    }
}

module.exports.createConfigBundle = createModuleConfig({
    name: "index",
    resolve: {
        fallback: {
            // "buffer": false,
            // "path": require.resolve("path-browserify")
        },
        extensions: [".tsx", ".ts", ".js"],
        alias: {
        }
    },
    entry: "../src/index.ts"
});