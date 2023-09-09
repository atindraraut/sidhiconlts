var { promiseQuery } = require("./db");

(async function () {
  let retry = 1;
  while (retry == 1) {
    let queryExc = `select * from parcel_data where createdAt BETWEEN '2023-08-14 19:10:00' AND '2023-08-14 20:20:00'`;
    console.log(queryExc);
    const rows = await promiseQuery(queryExc);
    console.log("Row ", rows);
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i]["images"]) {
          let timeStamped = rows[i]["images"].split("_")[1].split(".")[0];
          console.log("Db timestamp ", timeStamped, Number(timeStamped));
          const datee = new Date(Number(timeStamped));
          console.log(datee);
          let timeIs =
            datee.getHours() +
            ":" +
            datee.getMinutes() +
            ":" +
            datee.getSeconds();
          let updateQuery = `UPDATE parcel_data set scanned_time = '${timeIs}' where id = ${rows[i]["id"]};`;
          try {
            await promiseQuery(updateQuery);
          } catch (err) {
            console.log(
              `update failed for id ${rows[i]["id"]} for error ${err}`
            );
          }
        }
      }
      retry = 0;
      console.log("Update finised");
    } else {
      retry = 0;
      console.log("No data found");
    }
  }
})();