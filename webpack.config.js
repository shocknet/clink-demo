const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: {
            utils: './src/utils.ts',
            main: './src/index.ts',
            debit: './src/debit.ts',
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'dist'),
            clean: {
                keep: /(favicon\.png|clinkmedev-og-card\.png)$/,
            },
        },
        resolve: {
            extensions: ['.ts', '.js']
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                },
                {
                    test: /\.css$/i,
                    use: [
                        isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                        'css-loader'
                    ],
                },
            ]
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/index.html',
                filename: 'index.html',
                chunks: ['main', 'utils'],
            }),
            new HtmlWebpackPlugin({
                template: './src/debit.html',
                filename: 'debit.html',
                chunks: ['debit', 'utils'],
            }),
        ].concat(isProduction ? [new MiniCssExtractPlugin()] : []),
        devServer: {
            static: {
                directory: path.join(__dirname, 'dist'),
            },
            compress: true,
            port: 8787,
            open: true,
        },
        mode: isProduction ? 'production' : 'development',
    };
};