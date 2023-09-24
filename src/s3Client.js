require('dotenv').config();
const AWS = require("aws-sdk"),
  {
    Upload
  } = require("@aws-sdk/lib-storage"),
  {
    S3
  } = require("@aws-sdk/client-s3");
const fs = require("fs");
const chokidar = require("chokidar");
var axios = require("axios");
var { dbPool } = require("./db");
const credentials = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
  }
};

const s3 = new S3(credentials);
const bucketName = process.env.BUCKET_NAME;
const watchedDirectory = process.env.WATCHED_DIRECTORY;


async function callAPI(url, data) {
  console.log(url, data);
  try {
    let apiRes = await axios({
      method: "POST",
      url,
      data,
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log("API RES ", apiRes.status);
    return apiRes?.status;
  } catch (err) {
    console.log("Error ", err);
    return 500;
  }
}
const watcher = chokidar.watch(watchedDirectory, {
  ignored: /^\./,
  ignoreInitial: true,
});

watcher.on("add", async (filePath) => {
  console.log(`New file detected: ${filePath}`);
  try {
    const uploadResult = await uploadToS3(filePath);
    await selectMySQL(filePath);
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
    await new Upload({
      client: s3,
      params
    }).done();
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

  const updateQuery = `UPDATE parcel_data set s3path = ? where imageName = ?`;

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
async function selectMySQL(filePath) {
  console.log("filepath s3fileKey", filePath);
  const fileName = filePath.split("\\").pop();

  const selectQuery = `SELECT id,cloudStatus from parcel_data where imageName = ?`;

  dbPool.getConnection((err, connection) => {
    if (err) {
      console.error("Error on connecting update s3:", err, filePath);
      return;
    }

    connection.query(
      selectQuery,
      [fileName],
      (queryErr, results) => {
        connection.release(); // Release the connection back to the pool
        if (queryErr) {
          console.error(`Error updating s3:`, queryErr, filePath);
        } else {
          console.log("results", results);
          if (results[0].cloudStatus == "500") {
            callAPI("http://localhost:3000/api/retryUpload", { "id": results[0]?.id });
          }
          console.log(`retry successfully for ${fileName}.`);
        }
      }
    );
  });
}

console.log("Watching for new files...");
