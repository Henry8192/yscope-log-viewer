/* eslint-env node */

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const DotEnvPlugin = require("dotenv-webpack");


module.exports = {
    entry: path.resolve(__dirname, "src", "index.tsx"),
    experiments: {
        asyncWebAssembly: true,
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                include: path.resolve(__dirname, "src"),
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            "@babel/preset-env",
                            [
                                "@babel/preset-react",
                                {
                                    runtime: "automatic",
                                },
                            ],
                        ],
                    },
                },
            },
            {
                test: /\.(ts|tsx)$/,
                include: path.resolve(__dirname, "src"),
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            "@babel/preset-env",
                            [
                                "@babel/preset-react",
                                {
                                    runtime: "automatic",
                                },
                            ],
                            "@babel/preset-typescript",
                        ],
                    },
                },
            },
            {
                test: /\.scss$/,
                use: [
                    "style-loader",
                    "css-loader",
                    "sass-loader",
                ],
            },
            {
                test: /\.css$/,
                use: [
                    "style-loader",
                    "css-loader",
                ],
            },
            {
                test: /\.(woff|woff2|ttf)$/i,
                type: "asset/resource",
                generator: {
                    filename: "fonts/[name].[contenthash][ext]",
                },
            },
        ],
    },
    optimization: {
        moduleIds: "deterministic",
        runtimeChunk: "single",
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: "vendors",
                    chunks: "all",
                },
            },
        },
    },
    output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].[contenthash].bundle.js",
        clean: true,
        publicPath: "auto",
    },
    plugins: [
        new DotEnvPlugin(),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "public", "index.html"),
        }),
        new MonacoWebpackPlugin({
            features: [
                /* Code reading related */
                // similar to inlayHints, displays reference counts / VCS info
                "!codelens",

                // navigation to coding errors
                "!gotoError",

                // navigation to symbols
                "!gotoSymbol",

                // hover information (like tooltips)
                "!hover",

                // similar to codelens, displays type / parameter info
                "!inlayHints",

                // parameter hints in functions/methods
                "!parameterHints",

                // expand / contract selection based on code structure and syntax
                "!smartSelect",

                /* Editing related */
                // add / remove / toggle comments
                "!comment",

                // code formatting
                "!format",

                // inline code completions
                "!inlineCompletions",

                // auto indentation
                "!indentation",

                // replace code in place
                "!inPlaceReplace",

                // simultaneously edit similar text elements (e.g. HTML)
                "!linkedEditing",

                // move / sort lines
                "!linesOperations",

                // multi-cursor simultaneous editing support
                "!multicursor",

                // rename refactoring
                "!rename",

                // predefined code templates
                "!snippet",

                // code suggestion
                "!suggest",

                /* Tools */
                // color picker tool
                "!colorPicker",

                // diff editor view
                "!diffEditor",

                // inline loading progress
                "!inlineProgress",
            ],
            languages: ["ini"],
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "./node_modules/sql.js/dist/sql-wasm.wasm",
                    to: "static/js/",
                },
            ],
        }),
    ],
    resolve: {
        fallback: {
            buffer: require.resolve("buffer"),
            crypto: require.resolve("crypto-browserify"),
            fs: require.resolve("browserify-fs"),
            path: require.resolve("path-browserify"),
            stream: require.resolve("stream-browserify"),
            vm: false,
        },
        extensions: [
            ".js",
            ".json",
            ".jsx",
            ".ts",
            ".tsx",
        ],
        modules: ["node_modules"],
    },
};
