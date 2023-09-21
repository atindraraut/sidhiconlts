var net = require("net");
const { getIPAddress } = require("./getIPAddress");
const fs = require("fs");
var axios = require("axios");
// const { systemConfig } = require("./systemConfig");

const systemConfig = () => {
  let rawdata = fs.readFileSync("src/systemConfig.json");
  return JSON.parse(rawdata);
};

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

var client = new net.Socket();
let lp_ip = systemConfig()?.LP_IP ? systemConfig()?.LP_IP : getIPAddress();
let wm_ip = systemConfig()?.WM_IP ? systemConfig()?.WM_IP : getIPAddress();
let lp_port = systemConfig()?.LP_PORT ? systemConfig()?.LP_PORT : 2301;
let wm_port = systemConfig()?.WM_PORT ? systemConfig()?.WM_PORT : 24;
let token = systemConfig()?.TOKEN ? systemConfig()?.TOKEN : "";
let currentConfig = systemConfig();
currentConfig["LP_IP"] = lp_ip;
currentConfig["WM_IP"] = wm_ip;
currentConfig["LP_PORT"] = lp_port;
currentConfig["WM_PORT"] = wm_port;
let updatedSystemConfig = JSON.stringify(currentConfig);
fs.writeFileSync("src/systemConfig.json", updatedSystemConfig);

var weightClient = new net.Socket();
var gotWeigth = 0;

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
    return apiRes?.status;
  } catch (err) {
    console.log("Error ", err);
    return 500;
  }
}

//weighting start
weightClient.connect(wm_port, wm_ip, function () {
  console.log("Weight Connected");
  let wmStatusData = {
    socketId: systemConfig().SOCKET_ID,
    status: 200,
  };
  console.log("LP status data ", wmStatusData);
  callAPI("http://localhost:3000/api/wm-status", wmStatusData);
});

weightClient.on("data", function (weightData) {
  console.log("weightData ", weightData.toString(), weightData);
  weightData = weightData.toString();
  if (weightData.length > 5) {
    weightData = weightData
      .split(" ")[9]
      .slice(0, weightData.split(" ")[9].indexOf("kg"));
  }
  console.log("New weightData ", weightData);
  gotWeigth = weightData;
});

weightClient.on("close", function () {
  console.log("WM Connection closed");
  let wmStatusData = {
    socketId: systemConfig().SOCKET_ID,
    status: 500,
  };
  console.log("LP status data ", wmStatusData);
  callAPI("http://localhost:3000/api/wm-status", wmStatusData);
});

//weighting End

client.connect(lp_port, lp_ip, function () {
  console.log("LP Connected");
  let { SOCKET_ID } = systemConfig();
  let lpStatusData = {
    socketId: SOCKET_ID,
    status: 200,
  };
  console.log("LP status data ", lpStatusData);
  callAPI("http://localhost:3000/api/lp-status", lpStatusData);
});

client.on("data", async function (listenedData) {
  console.log("Received: " + listenedData);
  // let listenedData = `RVPST30648207,,348,278,105,10142547,1691206155265`;
  console.log(typeof listenedData);
  let [barcode, length, width, height, volume, imgName] = listenedData
    .toString()
    .split(",");
  let weight = gotWeigth;
  // weight=0;
  //  let liveimgPath = `D:/img/Orignal/${imgName.trim()}.jpg`;
  let imgPath = `D:/Images/Orignal/${barcode.trim()}_${imgName.trim()}.jpg`;
  // let imgPath = `D:/Images/Orignal/1691414767027.jpg`;
  // let imgPath = `C:/personal/sidhicon/${imgName.trim()}`;
  getImgCount = 0;
  const base64imag = await getBase64Image(imgPath);
  const datee = new Date(Number(imgName.trim()));
  let timeIs =
    datee.getHours() + ":" + datee.getMinutes() + ":" + datee.getSeconds();
  const yyyy = datee.getFullYear();
  let mm = datee.getMonth() + 1; // Months start at 0!
  let dd = datee.getDate();

  if (dd < 10) dd = "0" + dd;
  if (mm < 10) mm = "0" + mm;

  const formattedToday = yyyy + "-" + mm + "-" + dd;
  // console.log(barcode, weight, length, width, height, volume, imgName, contents);

  let postURL = systemConfig().COLUD_ENDPOINT;
  let sendData = {
    awb: `${barcode}`,
    profiler_name: "BLR-PR01",
    length: `${length}`,
    breadth: `${width}`,
    height: `${height}`,
    dead_weight: `${weight}`,
    scanned_date: `${formattedToday}`,
    scanned_time: `${timeIs}`,
    images: `${base64imag}`,
  };
  const data = JSON.stringify(sendData);

  fs.writeFile("request.txt", data, (err) => {
    if (err) {
      throw err;
      console.log("Data has been written to file successfully.");
    }
  });

  let coludStatusCode = await callAPI(postURL, sendData);
  // let coludStatusCode  = 400;
  //   axios({
  //     method: 'POST',
  //     url: postURL,
  //     data: sendData,
  //     headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Token  ${token}`
  //     }
  // })
  //     .then((res) => {
  //         console.log(`statusCode: ${res.status}`)
  //         if(res.status == 200)
  //         {
  //           coludStatusCode = 200;
  //         }
  //         console.log(res);
  //         fs.writeFile('response.txt', res.toString(), (err) => {
  //             if (err) {
  //                 throw err;
  //                 console.log("Data has been written to file successfully.");
  //             }
  //         });
  //     })
  //     .catch((error) => {
  //         console.error(error)
  //         fs.writeFile('response.txt', error.toString(), (err) => {
  //             if (err) {
  //                 throw err;
  //                 console.log("Data has been written to file successfully.");
  //             }
  //         });
  //     });

  sendData["images"] = imgPath;
  sendData["cloudStatus"] = coludStatusCode;
  sendData["imageName"] = `${barcode.trim()}_${imgName.trim()}.jpg`;

  callAPI("http://localhost:3000/api/lp-wm-data", {
    status: coludStatusCode,
    lpWmData: sendData,
    socketId: systemConfig().SOCKET_ID,
  });
});

client.on("close", function () {
  console.log("Connection closed");
  let lpStatusData = {
    socketId: systemConfig().SOCKET_ID,
    status: 500,
  };
  console.log("LP status data ", lpStatusData);
  callAPI("http://localhost:3000/api/lp-status", lpStatusData);
});