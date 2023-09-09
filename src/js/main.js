var emptyBox = [];
var index = 1;
var tableData = [];
var currentPageNumber = 1;
const loader = document.getElementById("loadingComponent");
loader.style.display = "none";
const lpipData = document.getElementById("lpipdiv");
const lpportData = document.getElementById("lpportdiv");
const wmipData = document.getElementById("wmipdiv");
const wmportData = document.getElementById("wmportdiv");
const uploadUrl = document.getElementById("uploadURl");
const authToken = document.getElementById("authToken");
const pageNo = document.getElementById("pageNo");
const serverStatus = document.getElementById("serverStatus");

const lpCard = document.getElementById("lp-card");
const wmCard = document.getElementById("wm-card");

function showTabledata(data) {
  console.log("data", data);
  // ADD JSON DATA TO THE TABLE AS ROWS.

  let table = document.getElementById("tableData");
  table.innerHTML = "";
  let row = table.insertRow(0);
  row.insertCell(0).innerHTML = "AWB";
  row.insertCell(1).innerHTML = "Length(mm)";
  row.insertCell(2).innerHTML = "Width(mm)";
  row.insertCell(3).innerHTML = "Height(mm)";
  row.insertCell(4).innerHTML = "Weight";
  row.insertCell(5).innerHTML = "Time";
  row.insertCell(6).innerHTML = "Status";
  row.insertCell(7).innerHTML = "Failure Msg";
  for (let i = 0; i < data.length; i++) {
    console.log(data[i], "map data");
    const today = new Date(data[i]?.createdAt);
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1; // Months start at 0!
    let dd = today.getDate();
    if (dd < 10) dd = "0" + dd;
    if (mm < 10) mm = "0" + mm;
    let row = table.insertRow(i + 1);
    row.insertCell(0).innerHTML = data[i].awb;
    row.insertCell(1).innerHTML = data[i].length;
    row.insertCell(2).innerHTML = data[i].breadth;
    row.insertCell(3).innerHTML = data[i].height;
    row.insertCell(4).innerHTML = data[i].dead_weight;
    row.insertCell(
      5
    ).innerHTML = `${yyyy}-${mm}-${dd}   ${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;
    row.insertCell(6).innerHTML =
      data[i].cloudStatus == "200" ? "Success" : "failed";
    row.insertCell(7).innerHTML = data[i].cloudApiMsg;
    row.insertCell(
      8
    ).innerHTML = `<span class="retryupload" onclick="retryUpload(${data[i].id})" id="retryupload"></span>`;
  }
}

var lpCheckbox = document.getElementById("lp-checkbox");
var wmCheckbox = document.getElementById("wm-checkbox");
// Check
// document.getElementById("lp-checkbox").checked = true;
// // Uncheck
// document.getElementById("lp-checkbox").checked = false;

//handle download csv form
let form = document.getElementById("downloadform");
async function handleForm(event) {
  event.preventDefault();
  let fromdate = document.getElementById("fromdate").value;
  let todate = document.getElementById("todate").value;
  if (new Date(todate) > new Date(fromdate)) {
    console.log("form values ", fromdate, todate);
    let data = { fromdate, todate };
    let getCsv = await postData("http://localhost:3000/api/getCsv", data);
    if (getCsv == 200) {
      alert("CSV Exported successfully");
      form.reset();
      downloadModal.style.display = "none";
    } else {
      alert("Something Went wrong");
    }
  } else {
    alert("Invalid date range!!");
  }
}
form.addEventListener("submit", handleForm);

lpCheckbox.addEventListener("change", function () {
  if (this.checked) {
    connectMachines();
    lpCheckbox.checked = true;
    wmCheckbox.checked = true;
    console.log("lpCheckbox is checked..");
  } else {
    closeMachines();
    lpCard.style.backgroundColor = "red";
    wmCard.style.backgroundColor = "red";
    lpCheckbox.checked = false;
    wmCheckbox.checked = false;
    console.log("lpCheckbox is not checked..");
  }
});

wmCheckbox.addEventListener("change", function () {
  if (this.checked) {
    connectMachines();
    lpCheckbox.checked = true;
    wmCheckbox.checked = true;
    console.log("lpCheckbox is checked..");
  } else {
    closeMachines();
    lpCard.style.backgroundColor = "red";
    wmCard.style.backgroundColor = "red";
    lpCheckbox.checked = false;
    wmCheckbox.checked = false;
    console.log("lpCheckbox is not checked..");
  }
});

// Get the modal
var modal = document.getElementById("myModal");
// Get the button that opens the modal
var btn = document.getElementById("settingsicon");
// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];
// When the user clicks on the button, open the modal
btn.onclick = function () {
  modal.style.display = "block";
};
// When the user clicks on <span> (x), close the modal
span.onclick = function () {
  modal.style.display = "none";
};
// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

// Get the downloadModal
var downloadModal = document.getElementById("downloadModal");
// Get the button that opens the modal
var btn = document.getElementById("downloadIconId");
// Get the <span> element that closes the modal
var span = document.getElementsByClassName("closeDownload")[0];
// When the user clicks on the button, open the modal
btn.onclick = function () {
  downloadModal.style.display = "block";
};
// When the user clicks on <span> (x), close the modal
span.onclick = function () {
  downloadModal.style.display = "none";
};
// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target == downloadModal) {
    downloadModal.style.display = "none";
  }
};

// fetch table data
const fetchtabledata = () => {
  if (currentPageNumber > 0) {
    loader.style.display = "block";
    fetch(
      `http://localhost:3000/api/get-parcel?pageNo=${currentPageNumber}&pageSize=10`
    )
      .then((response) => {
        return response.json();
      })
      .then((jsonResult) => {
        myarray = jsonResult;
        console.log("response array", jsonResult?.data);
        tableData = jsonResult?.data;
        showTabledata(tableData);
        pageNo.innerHTML = `page no : ${currentPageNumber}`;
        loader.style.display = "none";
        if (currentPageNumber == 1) {
          nextPageButton.style.display = "none";
        }
        if (tableData.length < 10) {
          nextPageButton.style.display = "none";
        } else {
          nextPageButton.style.display = "block";
          prevPageButton.style.display = "block";
        }
      })
      .catch((error) => {
        loader.style.display = "none";
        window.alert("error: OOPS! Something Went Wrong.");
        console.log(error);
      });
  }
};

const systemConfig = () => {
  // let rawdata = fs.readFileSync("src/systemConfig.json");
  // return JSON.parse(rawdata);
};

let nextPageButton = document.getElementById("next");
// fetch table data
const fetchConfigData = () => {
  loader.style.display = "block";

  fetch(`systemConfig.json`)
    .then((response) => {
      return response.json();
    })
    .then((jsonResult) => {
      console.log("Json Result ", jsonResult);
      console.log("response array", jsonResult);
      lpipData.innerHTML = `LP IP : ${jsonResult?.LP_IP}`;
      lpportData.innerHTML = `Port : ${jsonResult?.LP_PORT}`;
      wmipData.innerHTML = `WM IP : ${jsonResult?.WM_IP}`;
      wmportData.innerHTML = `Port : ${jsonResult?.WM_PORT}`;
      uploadUrl.innerHTML = `Host URL : ${jsonResult?.COLUD_ENDPOINT}`;
      authToken.innerHTML = `Token : ${jsonResult?.TOKEN}`;
      loader.style.display = "none";
    })
    .catch((error) => {
      loader.style.display = "none";
      window.alert("error: OOPS! Something Went Wrong.");
      console.log(error);
    });
};
nextPageButton.onclick = (e) => {
  currentPageNumber = currentPageNumber + 1;
  fetchtabledata();
};

let prevPageButton = document.getElementById("prev");

prevPageButton.onclick = (e) => {
  if (currentPageNumber > 1) {
    currentPageNumber = currentPageNumber - 1;
    fetchtabledata();
  }
};

//Refresh table data
let refreshButton = document.getElementById("refreshIconId");
refreshButton.onclick = (e) => {
  fetchtabledata();
};

// Example POST method implementation:
async function postData(url = "", data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  return response.status;
  return response.json(); // parses JSON response into native JavaScript objects
}

async function retryUpload(field1) {
  loader.style.display = "block";
  console.log("click");
  console.log(field1);
  let data = { id: field1 };
  let retryUpload = await postData(
    "http://localhost:3000/api/retryUpload",
    data
  );
  fetchtabledata();
}

async function updateSystemConfig(data) {
  let updateSystemRes = await postData(
    "http://localhost:3000/api/update-systeConfig",
    data
  );
  if (updateSystemRes == 200) {
    serverStatus.innerHTML = "Server Status: Connected";
    connectMachines();
  } else {
    serverStatus.innerHTML = "Server Status: NOT ABLE TO CONNECT";
  }

  console.log(updateSystemRes);
}

async function connectMachines() {
  fetch(`http://localhost:3000/api/connect-lp-wm`)
    .then((response) => {
      fetchConfigData();
      fetchtabledata();
      return response.json();
    })
    .then((connectToLp) => {
      console.log(connectToLp);
    });
}

async function closeMachines() {
  fetch(`http://localhost:3000/api/close-lp-wm`)
    .then((response) => {
      return response.json();
    })
    .then((connectToLp) => {
      console.log(connectToLp);
    });
}

//starts with the start of programme

(function () {
  fetchtabledata();
  fetchConfigData();
})();
