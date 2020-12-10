const COS = require('cos-nodejs-sdk-v5');

let cos = null;

module.exports = async function (fileKey, file) {
  const { TencentCOSSecret, TencentCOSKey, TencentCOSRegion, TencentCOSBucket } = process.env;
  if (!cos) {
    const envs = ['TencentCOSSecret', 'TencentCOSKey', 'TencentCOSRegion', 'TencentCOSBucket'];

    envs.forEach((param) => {
      if (!process.env[param]) {
        console.error(`[tencentcloud cos] missing env ${param}`);
      }
    });
    cos = new COS({
      SecretId: TencentCOSSecret,
      SecretKey: TencentCOSKey,
    });
  }

  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: TencentCOSBucket,
        Region: TencentCOSRegion,
        Key: fileKey,
        Body: file,
      },
      function (err, data) {
        if (err) {
          return reject(err);
        }

        return resolve(data);
      }
    );
  });
};
