const shell = require("shelljs");
const fs = require("fs");
const os = require("os");
var express = require("express");
var app = express();
var router = express.Router();
var { dbPool } = require("./db");
const { getIPAddress } = require("./getIPAddress");
var exec = require("child_process").exec;
const Json2csvParser = require("json2csv").Parser;
var axios = require("axios");
const util = require("util");
var { promiseQuery } = require("./db");
const systemConfig = () => {
  let rawdata = fs.readFileSync("src/systemConfig.json");
  return JSON.parse(rawdata);
};
let token = systemConfig()?.TOKEN ? systemConfig()?.TOKEN : "";

// generate base64 image
const getBase64Image = async (imgPath) => {
  let base64imag = "";
  try {
    base64imag = fs.readFileSync(imgPath, { encoding: "base64" });
  } catch (err) {
    console.log("Error ", err.toString());
  }
  return base64imag;
};

const parseDate = (value) => {
  const today = new Date(value);
  const yyyy = today.getFullYear();
  let mm = today.getMonth() + 1; // Months start at 0!
  let dd = today.getDate();
  if (dd < 10) dd = "0" + dd;
  if (mm < 10) mm = "0" + mm;
  return `${yyyy}-${mm}-${dd} ${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;
};

async function callAPI(url, data) {
  console.log("call api", url, data);
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

// const { systemConfig } = require("./systemConfig");
var http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});
app.io = io;
let PORT = 3000;

//health checkup
router.get("/", function (req, res, next) {
  res.status(200);
  return res.send("Server is running...");
});

//get parcel with pagination
router.get("/get-parcel", function (req, res, next) {
  let { pageNo, pageSize } = req.query;
  let queryExc = `SELECT * FROM parcel_data order by createdAt desc limit ${pageSize} offset ${
    (Number(pageNo) - 1) * pageSize
  }`;
  console.log(queryExc);
  dbPool.query(queryExc, function (err, rows) {
    if (err) {
      res.status(500);
      return res.send(err.toString());
    } else {
      res.status(200);
      return res.send({ data: rows });
    }
  });
});

//get configuration data
router.get("/get-configuration", function (req, res, next) {
  return res.send(systemConfig());
});

//connect to lp and wm machine
router.get("/connect-lp-wm", (req, res, next) => {
  console.log("dir", process.cwd());
  exec("src\\stop.bat", (error, stdout, stderr) => {
    // console.log(stdout);
    console.log("error:", stderr);
    if (error !== null) {
      console.log(`exec error: ${error}`);
    }
    exec("src\\start.bat", (error, stdout, stderr) => {
      // console.log(stdout);
      console.log("error:", stderr);
      if (error !== null) {
        console.log(`exec error: ${error}`);
      }
    });
  });

  // console.log("output", yourscript);
  return res.send({ msg: "done" });
});

//connect to lp and wm machine
router.get("/close-lp-wm", (req, res, next) => {
  console.log("dir", process.cwd());
  var yourscript = exec("src\\stop.bat", (error, stdout, stderr) => {
    // console.log(stdout);
    console.log("error:", stderr);
    if (error !== null) {
      console.log(`exec error: ${error}`);
    }
  });
  // console.log("output", yourscript);
  return res.send({ msg: "done" });
});

//download csv api
router.post("/getCsv", (req, res) => {
  console.log("getcsv called", req.body);
  let queryExc = `SELECT * FROM parcel_data where createdAt between '${parseDate(
    req.body.fromdate
  )}' and '${parseDate(req.body.todate)}'`;
  console.log("querry getcsv", queryExc);
  dbPool.query(queryExc, function (err, rows) {
    if (err) {
      res.status(500);
      return res.send(err.toString());
    } else {
      res.status(200);
      const jsonData = JSON.parse(JSON.stringify(rows));
      console.log("jsonData", jsonData);
      const json2csvParser = new Json2csvParser({ header: true });
      const csv = json2csvParser.parse(jsonData);
      fs.writeFile(
        `C:\\Users\\Admin\\Documents\\sidhicon\\${Math.floor(
          Date.now()
        )}.csv`,
        csv,
        function (error) {
          if (error) throw error;
          console.log("write csv successfully!");
          return res.send({ msg: "csv generated" });
        }
      );
    }
  });
});

//retry data upload retryUpload
router.post("/retryUpload", async (req, res) => {
  console.log("retryUpload called", req.body);
  let queryExc = `SELECT * FROM parcel_data where id = '${req.body.id}'`;
  console.log("querry get retry upload", queryExc);
  const rows = await promiseQuery(queryExc);
  console.log("Row ", rows);
  let postURL = systemConfig().COLUD_ENDPOINT;
  if (rows.length > 0) {
    let base64imag = await getBase64Image(rows[0]["images"]);
    let sendData = {
      awb: `${rows[0]["awb"]}`,
      profiler_name: "MUM-PR01",
      length: `${rows[0]["length"]}`,
      breadth: `${rows[0]["breadth"]}`,
      height: `${rows[0]["height"]}`,
      dead_weight: `${rows[0]["dead_weight"]}`,
      scanned_date: `${rows[0]["scanned_date"]}`,
      scanned_time: `${rows[0]["scanned_time"]}`,
      images: `${base64imag}`,
    };
    let { status, msg } = await callAPI(postURL, sendData);
    if (status == 200) {
      let updateQuery = `UPDATE parcel_data set cloudStatus = 200 where id = ${rows[0]["id"]};`;
      try {
        await promiseQuery(updateQuery);
        return res.send({ msg: "Updated Successfully" });
      } catch (err) {
        console.log(`update failed for id ${rows[0]["id"]} for error ${err}`);
      }
    } else {
      let updateQuery = `UPDATE parcel_data set cloudApiMsg = '${msg}' where id = ${rows[0]["id"]}`;
      console.log(updateQuery);
      try {
        await promiseQuery(updateQuery);
      } catch (err) {
        console.log(`update failed for id ${rows[0]["id"]} for error ${err}`);
      }
      console.log("Api failed ");
      return res.send({ msg: msg });
    }
  }
});

//update status of lp
router.post("/lp-status", (req, res) => {
  console.log("lp-status called ", req.body);
  let { status, socketId } = req.body;
  req.app.io.to(socketId).emit("lp_status", { status });
  return res.send({ msg: "lp status updated " });
});

//update status of  wp
router.post("/wm-status", (req, res) => {
  let { status, socketId } = req.body;
  req.app.io.to(socketId).emit("wm_status", { status });
  return res.send({ msg: "done" });
});

//lp and wp data socket
router.post("/lp-wm-data", (req, res) => {
  let { status, lpWmData, socketId } = req.body;
  console.log("LP WP data log ", status, lpWmData, socketId);
  req.app.io.to(socketId).emit("lp_wm_data", { status, lpWmData });
  // insert query
  dbPool.query(
    "INSERT INTO parcel_data SET ?",
    lpWmData,
    function (err, result) {
      //if(err) throw err
      if (err) {
        console.log("Unable to insert");
      } else {
        console.log("Inserted successfully");
      }
    }
  );

  return res.send({ msg: "lp wm data done" });
});

router.post("/update-systeConfig", (req, res) => {
  // let resENV = setEnvValue(req.body.key, req.body.value);
  let currentConfig = systemConfig();
  console.log("Current configuration ", currentConfig);
  let reqUpdatedSystemConfig = req.body;
  Object.keys(reqUpdatedSystemConfig).map((key) => {
    if (currentConfig.hasOwnProperty(key)) {
      currentConfig[key] = reqUpdatedSystemConfig[key];
    }
  });

  let updatedSystemConfig = JSON.stringify(currentConfig);
  // write everything back to the file system
  fs.writeFileSync("src/systemConfig.json", updatedSystemConfig);
  console.log("Res env ", currentConfig);
  return res.send({ msg: "done" });
});

app.use(express.json());

app.use("/api", router);
// app.listen(3000);
http.listen(PORT, function () {
  console.log("listening on *:" + PORT);
});

//socket connections
app.io.on("connection", function (socket) {
  console.log("a user has connected!");
  socket.emit("connected", "Connected");
});
