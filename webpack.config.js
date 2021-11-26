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
