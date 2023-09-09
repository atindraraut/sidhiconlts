// get the client
const mysql = require("mysql2");
const util = require("util");

// var dbConn = mysql.createConnection({
//   host: "103.120.179.209",
//   user: "admin",
//   password: "R^1p)`_BAA2uE}A5",
//   database: "sidhicon_sorting",
// });

const dbConn = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "root",
  database: "sidhicon_sorting",
});

const promiseQuery = util.promisify(dbConn.query).bind(dbConn);

dbConn.connect(function (error) {
  if (!!error) {
    console.log(error);
  } else {
    console.log("Database Connected Successfully..!!");
  }
});

// create the dbConn to database

module.exports = { dbConn, promiseQuery };