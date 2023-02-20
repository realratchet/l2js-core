const fs = require("fs");
const path = require("path");

function createModuleConfig({ resolve, entry: _entry }) {
    return function ({ name, bundleAnalyzer, mode, devtool, minimize, dirOutput, stats, library }) {
        const plugins = [];

        if (bundleAnalyzer) plugins.push(new BundleAnalyzerPlugin());

        const entry = {};
        entry[name] = typeof _entry === "string" ? [_entry] : _entry;

        const output = {
            filename: "[name].js",
            path: fs.realpathSync(dirOutput ? dirOutput : path.resolve(__dirname, "../.")),
            chunkFilename: "[name].chunk.js"
        };

        if (library) {
            // output["library"] = library ? `Module_${name}` : undefined;
            output["libraryTarget"] = "commonjs2";
            // output["libraryExport"] = "default";
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
            context: fs.realpathSync(__dirname)
        };
    }
}

module.exports.createConfigBundle = createModuleConfig({
    resolve: {
        fallback: {
            // "buffer": false,
            "path": fs.realpathSync(require.resolve("path-browserify"))
        },
        extensions: [".ts", ".js"],
        alias: {}
    },
    entry: fs.realpathSync(path.resolve(__dirname, "../src/index.ts"))
});