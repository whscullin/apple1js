const path = require('path');

module.exports =
{
    mode: 'development',
    devtool: 'source-map',
    entry: {
        apple1: path.resolve('js/entry1.js')
    },
    output: {
        path: path.resolve('dist/'),
        library: 'Apple1',
        libraryExport: 'Apple1',
        libraryTarget: 'var'
    },
    module: {
        rules: [
            {
                test: /\.ts$/i,
                use: [
                    {
                        loader: 'ts-loader'
                    },
                ],
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {
        extensions: ['.ts',  '.js'],
        alias: {
            js: path.resolve(__dirname, 'js/')
        }
    },
    devServer: {
        compress: true,
        static: {
            watch: {
                ignored: /(node_modules|test|\.git)/
            },
            directory: __dirname,
        },
        devMiddleware: {
            publicPath: '/dist/',
        },
    },
};
