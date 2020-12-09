const COS = require('cos-nodejs-sdk-v5');

const { TencentCOSSecret, TencentCOSKey, TencentCOSRegion, TencentCOSBucket } = process.env;
const cos = new COS({
  SecretId: TencentCOSSecret,
  SecretKey: TencentCOSKey,
});

module.exports = async function (fileKey, file) {
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
