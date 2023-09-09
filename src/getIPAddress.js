"use strict";

const { networkInterfaces } = require("os");

const getIPAddress = () => {
  const nets = networkInterfaces();
  const results = Object.create(null); // Or just '{}', an empty object
  let ipv4Address = 0;

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
      const familyV4Value = typeof net.family === "string" ? "IPv4" : 4;
      if (net.family === familyV4Value && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }

  if (Object.keys(results).length > 0) {
    Object.keys(results).map((eachNetwork) => {
      if (results[eachNetwork].length > 0) {
        for (let i = 0; i < results[eachNetwork].length; i++) {
          if (results[eachNetwork][i].includes("192.168.")) {
            ipv4Address = results[eachNetwork][i];
            break;
          }
        }
      }
    });
  }

  console.log(results, ipv4Address);
  return ipv4Address;
};

module.exports = { getIPAddress };
