const CLIENT_ID = "895893914279-cmijlnglcf8vud5ua7f4t0mme66gtov1.apps.googleusercontent.com";
  const API_KEY = "AIzaSyBT7l3GpLAY1hnCPZWahc3JKfMX6tcgiEI";
  const APP_ID = "895893914279";

  const SCOPES = "https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/spreadsheets.readonly";

  let tokenClient;
  let accessToken = null;
  let pickerInited = false;
  let gisInited = false;


  document.getElementById('authorize_button').style.visibility = 'hidden';
  document.getElementById('signout_button').style.visibility = 'hidden';

  /**
   * Callback after api.js is loaded.
   */
  function gapiLoaded() {
    gapi.load('client:picker', initializePicker);
  }

  /**
   * Callback after the API client is loaded. Loads the
   * discovery doc to initialize the API.
   */
  async function initializePicker() {
    await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
    await gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4');
    pickerInited = true;
    maybeEnableButtons();
  }

  /**
   * Callback after Google Identity Services are loaded.
   */
  function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
  }

  /**
   * Enables user interaction after all libraries are loaded.
   */
  function maybeEnableButtons() {
    if (pickerInited && gisInited) {
      document.getElementById('authorize_button').style.visibility = 'visible';
    }
  }

  /**
   *  Sign in the user upon button click.
   */
  function handleAuthClick() {
    tokenClient.callback = async (response) => {
      if (response.error !== undefined) {
        throw (response);
      }
      accessToken = response.access_token;
      document.getElementById('signout_button').style.visibility = 'visible';
      document.getElementById('authorize_button').innerText = 'Refresh';
      await createPicker();
    };

    if (accessToken === null) {
      // Prompt the user to select a Google Account and ask for consent to share their data
      // when establishing a new session.
      tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
      // Skip display of account chooser and consent dialog for an existing session.
      tokenClient.requestAccessToken({prompt: ''});
    }
  }

  /**
   *  Sign out the user upon button click.
   */
  function handleSignoutClick() {
    if (accessToken) {
      accessToken = null;
      google.accounts.oauth2.revoke(accessToken);
      document.getElementById('content').innerText = '';
      document.getElementById('authorize_button').innerText = 'Authorize';
      document.getElementById('signout_button').style.visibility = 'hidden';
    }
  }

  /**
   *  Create and render a Picker object for searching images.
   */
  function createPicker() {
    const view = new google.picker.View(google.picker.ViewId.DOCS);
    const picker = new google.picker.PickerBuilder()
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .setOAuthToken(accessToken)
      .addView(view)
      .addView(new google.picker.DocsUploadView())
      .setCallback(pickerCallback)
      .build();
    picker.setVisible(true);
  }   

  /**
   * Displays the file details of the user's selection.
   * @param {object} data - Containers the user selection from the picker
   */
  async function pickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
      let text = `Picker response: \n${JSON.stringify(data, null, 2)}\n`;
      const selectedFiles = data[google.picker.Response.DOCUMENTS];
          if (selectedFiles.length > 0) {
            const fileId = selectedFiles[0][google.picker.Document.ID];
            await fetchSheetList(fileId);
            //await fetchSheetData(fileId);
          }
      // window.document.getElementById('content').innerText = text;
    }
  }

  async function fetchSheetData(fileId, title, space) {
    let response;
    try {
    // Fetch first 10 files
        response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: fileId,
            range: `${title}!${space.toUpperCase()}`,
    });
    } catch (err) {
        console.log(err);
        document.getElementById('content').innerText = err.message;
        return;
    }
    const range = response.result;
    if (!range || !range.values || range.values.length == 0) {
        document.getElementById('content').innerText = 'No values found.';
        return;
    }
    console.log(response.result.values);


    //write data gg sheet
    // try {
    //     const backendResponse = await fetch('http://localhost:1337/api/writeSheetData', {
    //       method: 'POST',
    //       headers: {
    //           'Content-Type': 'application/json',
    //       },
    //       body: JSON.stringify({ data: response.result.values })
    //     })
    //   const res = await backendResponse.json();
    //   const message = res.message;
    //   const data = res.data;
    //   document.getElementById('content').innerText = message;
    //   document.getElementById('table').innerHTML = formatData(data);
    // } catch (err) {
    //   document.getElementById('content').innerText = 'Error saving data';
    // } 
    const data = response.result.values.map(row => row);
    console.log("DAAATAA", data);
    document.getElementById('table').innerHTML = formatData(data);
  }

  function formatData(data) {
    console.log(data);
    const dataArr = []  
    const filter = data.filter(item => (item.length > 0 && item[1] !== ""));
    console.log(filter);
    filter.forEach((item, index) => {
      const data = {
        no: 1,
        task: item[0],
        time: 0,
        details: [
            { time: item[3], desc: item[1], class: "" },
            // { time: 1.5, desc: "Server response time", class: "server-response" },
            // { time: 2.5, desc: "Asset and resource loading analysis", class: "asset-analysis" }
        ]
      }
      dataArr.push(data);
    })

    console.log(dataArr);
    const newArr = mergeArr(dataArr);
    console.log("NEWWWWW", newArr);


    const html = createTable(newArr);
    return html;
  }

  function createTable(tasks) {
    let colNumber = 0;
    tasks.forEach(task => {
      colNumber += task.details.reduce((sum, detail) => sum + detail.time, 0);
    });
    colNumber = Math.ceil(colNumber / 8);

    let tableHtml = `
    <table class="timeline">
      <thead>
        <tr>
          <th rowspan="2">No</th>
          <th rowspan="2" class="center">Task</th>
          <th rowspan="2" class="center">Estimated time (hours)</th>
          <th colspan="${colNumber}" class="center">Day</th>
        </tr>
        <tr>
    `;

    for (let i = 1; i <= colNumber; i++) {
      tableHtml += `<th class="center day">${i}</th>`;
    }

    tableHtml += `
        </tr>
      </thead>
      <tbody>
    `;

    let totalTime = 0;
    let tmpTime = 0;

    tasks.forEach(task => {
      task.details.forEach((detail, index) => {
        totalTime += detail.time;
        let tdNumber = totalTime / 8;
        let tdNumberStandard = totalTime / 8;

        tmpTime += detail.time;
        let colspan = tmpTime / 8;
        console.log("AA", colspan);
        if (colspan > 1) {
          colspan = 2;
          tdNumber -= 1;
          tmpTime = tmpTime % 8;
        }

        tableHtml += `<tr time="${tmpTime}">`;
        if (index === 0) {
          tableHtml += `<td rowspan="${task.details.length}">${task.no}</td>`;
          tableHtml += `<td rowspan="${task.details.length}" class="center">${task.task}</td>`;
        }
        tableHtml += `<td class="center">${detail.time}</td>`;

        for (let i = 1; i < tdNumber; i++) {
          tableHtml += `<td></td>`;
        }

        tableHtml += `<td style="background-color: ${getRandomColor()}" class="center" colspan="${colspan}">${detail.desc}</td>`;

        for (let i = 1; i < (colNumber - tdNumberStandard + (colspan === 1 ? 1 : 0)); i++) {
          tableHtml += `<td></td>`;
        }

        tableHtml += `</tr>`;
      });
    });

    tableHtml += `
      </tbody>
    </table>
    `;

    return tableHtml;
  }

  function mergeArr(data) {
    const result = [];
    let currentTask = null;
    let currentNo = 1;

    data.forEach(item => {
    if (item.task) {
        // Nếu phần tử có giá trị trong trường task, tạo một phần tử mới trong kết quả
        currentTask = {
            ...item,
            no: currentNo,
            details: item.details.map(detail => ({
                ...detail,
                time: parseFloat(detail.time.replace(',', '.'))
            })),
            time: parseFloat(item.details[0].time.replace(',', '.'))
        };
        result.push(currentTask);
        currentNo++; // Tăng giá trị no khi gặp một task mới
      } else {
          // Nếu không có giá trị trong trường task, thêm details vào phần tử hiện tại
          if (currentTask) {
              item.details.forEach(detail => {
                  currentTask.details.push({
                      ...detail,
                      time: parseFloat(detail.time.replace(',', '.'))
                  });
              });
              // Cập nhật time của phần tử hiện tại bằng cách cộng dồn time từ details
              currentTask.time = currentTask.details.reduce((sum, detail) => sum + detail.time, 0);
          }
      }
    });
    return result;
  }

  async function fetchSheetList(fileId) {
    let response;
    try {
        // Lấy metadata của bảng tính
        response = await gapi.client.sheets.spreadsheets.get({
            spreadsheetId: fileId,
        });
    } catch (err) {
        document.getElementById('content').innerText = err.message;
        return;
    }

    const sheets = response.result.sheets;
    if (!sheets || sheets.length == 0) {
        document.getElementById('content').innerText = 'Không tìm thấy sheet nào.';
        return;
    }

    const selectBox = document.getElementById('sheetSelect');
    selectBox.innerHTML = ''; 
    // Thêm các sheet vào select box
    sheets.forEach(sheet => {
        const option = document.createElement('option');
        option.value = fileId;
        option.text = sheet.properties.title;
        selectBox.appendChild(option);
    });
}

  function getRandomColor() {
    var letters = 'BCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * letters.length)];
    }
    return color;
  }

  async function submit() {
    const selectBox = document.getElementById('sheetSelect');
    const selectedOption = selectBox.options[selectBox.selectedIndex];
    const sheetId = selectedOption.value;
    const title = selectedOption.text;
    const space = document.getElementById('range').value;
    await fetchSheetData(sheetId, title, space);
  }





//   <!-- for(let i = 0; i < response.result.values.length; i++) {
//     const data = {
//       "name": response.result.values[i][0],
//       "role": response.result.values[i][1]
//     } // format data
  
//     try {
//     const backendResponse = await fetch('http://localhost:1337/api/saveSheetData', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ data: data }),
//     });
//       const result = await backendResponse.text();
//       document.getElementById('content').innerText = result;
//     } catch (error) {
//       document.getElementById('content').innerText = 'Error saving data';
//     }
//   }
  
//   try {
//     const backendResponse = await fetch('http://localhost:1337/api/saveSheetData', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ data: response.result.values }),
//     });
  
//     const result = await backendResponse.text();
//     document.getElementById('content').innerText = result;
//   } catch (error) {
//     document.getElementById('content').innerText = 'Error saving data';
//   } -->
  
//   <!-- filter -->
//   <!-- async function getData() {
//     try {
//       const roleSelect = document.getElementById('roleSelect');
//       const inputName = document.getElementById('nameSelect');
//       const selectedOption = roleSelect.options[roleSelect.selectedIndex];
//       const backendResponse = await fetch(`http://localhost:1337/api/getData?role=${encodeURIComponent(selectedOption.value)}&name=${encodeURIComponent(inputName.value)}`);
//       const result = await backendResponse.json();
//       console.log(result);
//       const dataContainer = document.getElementById('get_data');
//       dataContainer.innerHTML = '';
//       result.forEach(item => {
//         const itemDiv = document.createElement('div');
//         itemDiv.innerText = `Name: ${item.name} - Role: ${item.role}`;
//         dataContainer.appendChild(itemDiv);
//       })
//       // document.getElementById('get_data').innerText = JSON.stringify(result, null, 2);
//     } catch (error) {
//       document.getElementById('content').innerText = 'Error get data';
//     }
//   } -->
  
  
//    <!-- <div class="mt-15">
//         <button class="btn" onclick="getData()">Filter Data</button>
//         <select id="roleSelect">
//           <option value="">All</option>
//           <option value="Developer">Developer</option>
//           <option value="Tester">Tester</option>
//           <option value="BA">BA</option>
//           <option value="Tech lead">Tech lead</option>
//           <option value="PM">PM</option>
//         </select>
//         <input type="text" id="nameSelect" placeholder="Input name">
//         <div id="get_data"></div>
//       </div>  -->  