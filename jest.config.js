module.exports = {
    'moduleNameMapper': {
        '^js/(.*)': '<rootDir>/js/$1',
        '^test/(.*)': '<rootDir>/test/$1',
        '\\.css$': 'identity-obj-proxy',
        '\\.scss$': 'identity-obj-proxy',
    },
    'roots': [
        'js/',
        'test/',
    ],
    'testMatch': [
        '**/?(*.)+(spec|test).+(ts|js|tsx)'
    ],
    'transform': {
        '^.+\\.js$': 'babel-jest',
        '^.+\\.ts$': 'ts-jest',
        '^.*\\.tsx$': 'ts-jest',
    },
    'transformIgnorePatterns': [
        '/node_modules/(?!(@testing-library/preact/dist/esm)/)',
    ],
    'coveragePathIgnorePatterns': [
        '/node_modules/',
        '/js/roms/',
        '/test/',
    ],
    'preset': 'ts-jest',
};
