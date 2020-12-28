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
      getPath: () => '',
    };

    this.options = Object.assign(defaultOptions, options);
  }
  apply(compiler) {
    // 不同版本的插件系统有差异，需要具体注册

    // compiler.hooks.emit.tapAsync
    if (compiler.hooks && compiler.hooks.emit && compiler.hooks.emit.tapAsync) {
      return compiler.hooks.emit.tapAsync('CDNWebpackPlugin', async (compilation, callback) => {
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
    } else {
      // 老版本没有version属性，3.x 和 4.x 获取资源的方法都一样
      const filenames = Object.keys(compilation.assets);
      const _assets = filenames.map((filename) => {
        const asset = compilation.assets[filename];

        let source = null;
        if (asset._value) {
          source = asset._value;
        } else {
          source = fs.createReadStream(asset.existsAt);
        }

        return {
          filename: filename,
          source: source,
        };
      });

      assets.push(..._assets);
    }

    await this.assetsProcess(assets, getPath());
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
    console.log(`[CDN Webpack Plugin] webpack@${version || 'unknown'}`);
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
    let errorList = [];
    const requests = assets.map((asset) => {
      const fileKey = `${path}/${asset.filename}`;

      return processor(fileKey, asset.source).catch((err) => {
        errorCount++;
        errorList.push({
          fileKey: fileKey,
          err: err,
        });
        return err;
      });
    });

    await Promise.all(requests);
    if (errorCount) {
      errorList.forEach((item) => {
        console.log(`[${processName}] `.blue + item.fileKey.white, 'fail'.red);
        console.log(item.err);
      });
      console.log(`[CDN Webpack Plugin] ${errorCount} asset(s) uploaded failed.`.red);
    } else {
      console.log('[CDN Webpack Plugin] All assets uploaded.'.green);
    }
  }
}

module.exports = CDNWebpackPlugin;
