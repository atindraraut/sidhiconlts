var { promiseQuery } = require("./db");
const fs = require("fs");
var axios = require("axios");

const systemConfig = () => {
  let rawdata = fs.readFileSync("systemConfig.json");
  return JSON.parse(rawdata);
};
let token = systemConfig()?.TOKEN ? systemConfig()?.TOKEN : "";
let postURL = systemConfig().COLUD_ENDPOINT;
const today = new Date();
const yyyy = today.getFullYear();
let mm = today.getMonth() + 1; // Months start at 0!
let dd = today.getDate();

if (dd < 10) dd = "0" + dd;
if (mm < 10) mm = "0" + mm;

const formattedToday = yyyy + "-" + mm + "-" + dd;

let getImgCount = 0;
const getBase64Image = async (imgPath) => {
  let base64imag = "";
  try {
    base64imag = fs.readFileSync(imgPath, { encoding: "base64" });
  } catch (err) {
    console.log("Error ", err.toString());
    if (getImgCount < 3) {
      getImgCount++;
      getBase64Image(imgPath);
    }
  }
  return base64imag;
};

async function callAPI(url, data) {
  console.log(url, data);
  try {
    let apiRes = await axios({
      method: "POST",
      url,
      data,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token  ${token}`,
      },
    });
    console.log("API RES ", apiRes);
    return { status: apiRes?.status, msg: "" };
  } catch (err) {
    // console.log("Error ", err);
    console.log("error msg", err["response"]["data"]["message"]);
    return { status: 500, msg: err["response"]["data"]["message"] };
  }
}

(async function () {
  let retry = 1;
  while (retry == 1) {
    let queryExc = `SELECT * FROM parcel_data where cloudStatus = 500 and  DATE(createdAt) = CURDATE() and cloudAPiMsg is NULL order by createdAt desc limit 15`;
    console.log(queryExc);
    const rows = await promiseQuery(queryExc);
    console.log("Row ", rows);
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        console.log(rows[i]);
        let base64imag = await getBase64Image(rows[i]["images"]);
        let sendData = {
          awb: `${rows[i]["awb"]}`,
          profiler_name: "MUM-PR01",
          length: `${rows[i]["length"]}`,
          breadth: `${rows[i]["breadth"]}`,
          height: `${rows[i]["height"]}`,
          dead_weight: `${rows[i]["dead_weight"]}`,
          scanned_date: `${formattedToday}`,
          scanned_time: `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`,
          images: `${base64imag}`,
        };
        let { status, msg } = await callAPI(postURL, sendData);
        if (status == 200) {
          let updateQuery = `UPDATE parcel_data set cloudStatus = 200 where id = ${rows[i]["id"]};`;
          try {
            await promiseQuery(updateQuery);
            retry = 0;
          } catch (err) {
            console.log(
              `update failed for id ${rows[i]["id"]} for error ${err}`
            );
          }
        } else {
          let updateQuery = `UPDATE parcel_data set cloudApiMsg = '${msg}' where id = ${rows[i]["id"]}`;
          console.log(updateQuery);
          try {
            await promiseQuery(updateQuery);
          } catch (err) {
            console.log(
              `update failed for id ${rows[i]["id"]} for error ${err}`
            );
          }
          console.log("Api failed ");
        }
      }
    } else {
      retry = 0;
      console.log("No data found");
    }
  }
})();