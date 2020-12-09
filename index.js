const { version } = require('webpack');
const tencentcloud = require('./cos/tencentcloud');
const fs = require('fs');
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
    // 不同版本的插件系统有差异，需要具体注册

    // compiler.hooks.afterEmit.tapAsync
    if (compiler.hooks && compiler.hooks.afterEmit && compiler.hooks.afterEmit.tapAsync) {
      return compiler.hooks.afterEmit.tapAsync('CDNWebpackPlugin', async (compilation, callback) => {
        await this.uploadAdaptor(compilation);
        callback();
      });
    }

    // compiler.plugin('after-emit')
    if (compiler.plugin) {
      return compiler.plugin('after-emit', async (compilation, callback) => {
        await this.uploadAdaptor(compilation);
        callback();
      });
    }
  }

  /**
   * 这里兼容处理不同版本的webpack，获取并统一所有构建好的静态资源
   */
  async uploadAdaptor(compilation) {
    const { getPath } = this.options;
    const assets = [];

    // 不同版本对于assets的获取也不太一样
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
    } else if (!version) {
      // 老版本没有version属性，3.x
      const filenames = Object.keys(compilation.assets);
      const _assets = filenames.map((filename) => {
        const asset = compilation.assets[filename];

        return {
          filename: filename,
          source: fs.createReadStream(asset.existsAt),
        };
      });

      assets.push(..._assets);
    }

    await this.assetsProcess(assets, getPath(compilation.hash));
  }

  /**
   * 这里统一的处理所有构建好的静态资源，而不用关心webpack的版本
   * 然后使用用户配置的上传方法进行统一的文件上传
   *
   * @param {array} assets 所有构建好的静态资源
   * @param {string} path 云存储的存放路径
   */
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
