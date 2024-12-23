// get the client
const mysql = require("mysql2");
const util = require("util");

// MySQL database configuration
const dbPool = mysql.createPool({
  connectionLimit: 10, // Adjust based on your server's capacity
  host: "127.0.0.1",
  user: "root",
  password: "root",
  database: "sidhicon_sorting",
});

const promiseQuery = util.promisify(dbPool.query).bind(dbPool);

if (dbPool) {
  console.log("Database Connected Successfully..!!");
}

// create the dbPool to database

module.exports = { dbPool, promiseQuery };