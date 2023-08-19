// babel.config.js
module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: 'current',
                },
            },
        ],
    ],
    rules: [
        {
            test: /\.ts?$/i,
            use: [
                {
                    loader: 'ts-loader'
                },
            ],
            exclude: /node_modules/,
        }
    ]
};
