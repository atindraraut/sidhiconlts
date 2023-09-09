const fs = require("fs");
var axios = require("axios");

const systemConfig = () => {
    let rawdata = fs.readFileSync("systemConfig.json");
    return JSON.parse(rawdata);
  };

let token = systemConfig()?.TOKEN ? systemConfig()?.TOKEN : "";
async function callAPI(url, data) {
  console.log(url, data);
  try {
    let apiRes = await axios({
      method: "POST",
      url,
      data,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token  ${token}`,
      },
    });
    console.log("API RES ", apiRes);
    return apiRes?.status;
  } catch (err) {
    console.log("Error ", err);
    console.log(err.)
    return 500;
  }
}

let rawdata = fs.readFileSync("../request.txt");
let data =JSON.parse(rawdata);
callAPI('https://saruman.staging.shadowfax.in/api/rpc/v2/qc/profiler_scan_receive',data);