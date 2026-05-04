// This file customizes webpack configuration for react-app-rewired.
const webpack = require('webpack');
const path = require('path');

module.exports = {
  webpack: function override(config, env) {
    const workerRule = {
      test: /\.worker(\.(js|ts))?$/,
      use: {
        loader: 'worker-loader',
        options: {
          filename: '[name].[contenthash].worker.js',
          esModule: true,
        },
      },
    };

    const oneOfContainerRule = config.module.rules.find(
      rule => Array.isArray(rule.oneOf)
    );
    if (oneOfContainerRule) {
      oneOfContainerRule.oneOf.unshift(workerRule);
    } else {
      config.module.rules.unshift(workerRule);
    }

    // Disable source-map-loader for GDJS-for-web-app-only to avoid errors
    // when extension files are not yet built
    const sourceMapRule = config.module.rules.find(
      rule => rule.enforce === 'pre' && rule.use && rule.use.some(u => u.loader && u.loader.includes('source-map'))
    );
    if (sourceMapRule) {
      sourceMapRule.exclude = [
        ...(sourceMapRule.exclude || []),
        /GDJS-for-web-app-only/,
      ];
    }

    // A lot of packages we use in node_modules trigger source map warnings
    // but it is not a blocking issue, so we ignore them.
    config.ignoreWarnings = [
      /Failed to parse source map/,
      /the request of a dependency is an expression/,
      /ENOENT: no such file or directory/,
    ];

    // Add resolve alias to handle missing GDJS extensions gracefully
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};

    // Add NormalModuleReplacementPlugin to replace missing GDJS extensions with stubs
    const missingExtensions = [
      'Leaderboards',
      'Multiplayer',
      'PlayerAuthentication',
      'SaveState',
      'Screenshot',
      'TextInput',
      'TweenBehavior',
      'Video',
    ];
    missingExtensions.forEach(extName => {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          new RegExp(`GDJS-for-web-app-only/Runtime/Extensions/${extName}/JsExtension\\.js$`),
          path.join(__dirname, 'src', 'JsExtensionsLoader', 'MissingExtensionStub.js')
        )
      );
    });

    // TypeScript internally tries to load Node's "perf_hooks".
    // It's not available in browser, so we explicitly disable it.
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      perf_hooks: false,
    };

    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^perf_hooks$/,
      })
    );

    return config;
  },

  jest: function(config) {
    config.transformIgnorePatterns = [
      '<rootDir>/node_modules/(?!react-markdown|unified|remark-parse|mdast-util-from-markdown|micromark|decode-named-character-reference|remark-rehype|trim-lines|hast-util-whitespace|remark-gfm|mdast-util-gfm|mdast-util-find-and-replace|mdast-util-to-markdown|markdown-table|is-plain-obj)',
    ];

    return config;
  },
};
