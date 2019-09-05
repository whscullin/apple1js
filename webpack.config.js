const path = require('path');

module.exports =
{
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
        publicPath: '/dist/',
        watchContentBase: true
    }
};
