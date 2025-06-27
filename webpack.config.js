const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: {
        utils: './src/utils.ts',
        main: './src/index.ts',
        debit: './src/debit.ts',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
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
                use: ['style-loader', 'css-loader'],
            },
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
            chunks: ['main', 'utils'],
            favicon: './src/favicon.png',
        }),
        new HtmlWebpackPlugin({
            template: './src/debit.html',
            filename: 'debit.html',
            chunks: ['debit', 'utils'],
            favicon: './src/favicon.png',
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 8787,
        open: true,
    },
    mode: 'development'
};