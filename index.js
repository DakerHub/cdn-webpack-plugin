const { version } = require('webpack');
const tencentcloud = require('./cos/tencentcloud');
const colors = require('colors');

const buildInCOS = {
  tencentcloud,
};

class CDNWebpackPlugin {
  constructor(options) {
    const defaultOptions = {
      uploadToCOS: 'tencentcloud',
      getPath: (hash) => hash,
    };

    this.options = Object.assign(defaultOptions, options);
  }
  apply(compiler) {
    compiler.hooks.emit.tapAsync('CDNWebpackPlugin', async (compilation, callback) => {
      await this.uploadAdaptor(compilation);

      callback();
    });
  }

  async uploadAdaptor(compilation) {
    const { getPath } = this.options;
    const assets = [];

    if (/^5\./.test(version)) {
      // webpack 5+
      compilation.chunks.forEach((chunk) => {
        const chunkFiles = Array.from(chunk.files);

        const chunkAssets = chunkFiles.map((filename) => {
          const source = compilation.assets[filename].source();
          return {
            filename: filename,
            source: source,
          };
        });

        assets.push(...chunkAssets);
      });
    }

    await this.assetsProcess(assets, getPath(compilation.hash));
  }

  async assetsProcess(assets, path) {
    console.log('[CDN Webpack Plugin] Start uploading assets.');
    const { uploadToCOS } = this.options;
    let processor = () => {};
    let processName = '';

    if (typeof uploadToCOS === 'string' && buildInCOS[uploadToCOS]) {
      processor = buildInCOS[uploadToCOS];
      processName = uploadToCOS;
    } else if (typeof uploadToCOS === 'function') {
      processor = uploadToCOS;
      processName = 'custom';
    }

    let errorCount = 0;
    const requests = assets.map((asset) => {
      const fileKey = `${path}/${asset.filename}`;

      return processor(fileKey, asset.source)
        .then((res) => {
          console.log(`[${processName}] `.blue + fileKey.white, 'done'.green);
          return res;
        })
        .catch((err) => {
          errorCount++;
          console.log(`[${processName}] `.blue + fileKey.white, 'fail'.red);
          return err;
        });
    });

    await Promise.all(requests);
    if (errorCount) {
      console.log(`[CDN Webpack Plugin] ${errorCount} asset(s) uploaded failed.`.red);
    } else {
      console.log('[CDN Webpack Plugin] All assets uploaded.'.green);
    }
  }
}

module.exports = CDNWebpackPlugin;
