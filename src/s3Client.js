const AWS = require("aws-sdk");
const fs = require("fs");
const chokidar = require("chokidar");
const mysql = require("mysql"); // MySQL library

// Configure AWS credentials and region
AWS.config.update({
  accessKeyId: "AKIA3DDQA7JGZYKZCUER",
  secretAccessKey: "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",
  region: "ap-south-1",
});

const s3 = new AWS.S3();
const bucketName = "sidhicon-test";
const watchedDirectory = "C:/sidhiconImages/";

// MySQL database configuration
const dbPool = mysql.createPool({
  connectionLimit: 10, // Adjust based on your server's capacity
  host: "127.0.0.1",
  user: "root",
  password: "root",
  database: "sidhicon_sorting",
});

const watcher = chokidar.watch(watchedDirectory, {
  ignored: /^\./,
  ignoreInitial: true,
});

watcher.on("add", async (filePath) => {
  console.log(`New file detected: ${filePath}`);
  try {
    const uploadResult = await uploadToS3(filePath);
    if (uploadResult.success) {
      await updateMySQL(filePath, uploadResult.fileKey);
    }
  } catch (error) {
    console.error("Error:", error);
  }
});

async function uploadToS3(filePath) {
  let today = new Date();
  let yyyy = today.getFullYear();
  let mm = today.getMonth() + 1; // Months start at 0!
  let dd = today.getDate();
  if (dd < 10) dd = "0" + dd;
  if (mm < 10) mm = "0" + mm;
  const fileStream = fs.createReadStream(filePath);
  const fileName = filePath.split("\\").pop();
  ///DC_BLR/{year}/{month}/{day}/awb_number_{random_10_digit}.jpg
  const fileKey = `DC_BLR/${yyyy}/${mm}/${dd}/${fileName}`; // The S3 object key

  const params = {
    Bucket: bucketName,
    Key: fileKey,
    Body: fileStream,
  };

  try {
    await s3.upload(params).promise();
    console.log(`Uploaded ${fileName} to S3 successfully.`);
    return { success: true, fileKey };
  } catch (error) {
    console.error(`Error uploading ${fileName} to S3:`, error);
    return { success: false };
  }
}

async function updateMySQL(filePath, s3FileKey) {
  console.log("filepath s3fileKey", filePath, s3FileKey);
  const fileName = filePath.split("\\").pop();

  const updateQuery = `UPDATE parcel_data set s3FileKey = ? where imageName = ?`;

  dbPool.getConnection((err, connection) => {
    if (err) {
      console.error("Error on connecting update s3:", err, filePath);
      return;
    }

    connection.query(
      updateQuery,
      [s3FileKey, fileName],
      (queryErr, results) => {
        connection.release(); // Release the connection back to the pool
        if (queryErr) {
          console.error(`Error updating s3:`, queryErr, filePath);
        } else {
          console.log(`Updated successfully for ${fileName}.`);
        }
      }
    );
  });
}

console.log("Watching for new files...");
