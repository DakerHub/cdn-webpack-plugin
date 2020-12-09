# better-cdn-webpack-plugin

A webpack plugin to upload assets for CDN automatically when building your app.

## Install

```sh
npm install -D better-cdn-webpack-plugin
# or
yarn add -D better-cdn-webpack-plugin
```

## Usage

```js
const CDNWebpackPlugin = require('better-cdn-webpack-plugin');

module.exports = {
  output: {
    // ...
    publicPath: 'https://cdn.example.com/test/[hash]',
  },
  plugins: [
    new CDNWebpackPlugin({
      getPath: (hash) => `test/${hash}`,
      uploadToCOS: 'tencentcloud',
    }),
  ],
};
```

We need to add some options in your `webpack.config.js` or other config files ( such as vue.config.js ).

### output.publicPath

This option is important. It'll affect all your static assets' references.
After the build, the asset's URL in your HTML will be something like this:

```html
<script type="text/javascript" src="https://cdn.example.com/test/8565fe7e1364113022be/filename.js"></script>
```

### plugin

Like other plugins, you just need to pass some options to `CDNWebpackPlugin`.

## Options

### getPath

It's a function, and it must match your `output.publicPath`. That means you should put things in the right place, then you can access them correctly.

When I set `output.publicPath` to `https://cdn.example.com/some/path`. My plugin's option `getPath` should be like `() => "some/path"`.

### uploadToCOS

`uploadToCOS: (fileKey, file) => Promise`

This can be an upload function or a build-in upload method name. When the plugin collects all the assets, we need to upload them to COS one by one. This option offers a way to upload your assets regardless of which COS you are using.

We have only one build-in upload method now. It's `tencentcloud`.

If you want to use this build-in method, you should set some env variables.

`TencentCOSSecret, TencentCOSKey, TencentCOSRegion, TencentCOSBucket`

## Tested version

The below versions of webpack are working fine with this plugin (at least in my case).

- v3.6.0
- v3.11.0
- v4.44.0
- v5.10.0

## Contribute

If you find out some problems with your project, please let me know! Any issues and PRs are welcome!

## License

[MIT](./LICENSE)
