const express = require("express");
const {google} = require("googleapis");
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config.json');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const port = process.env.PORT || 1337;


mongoose.connect(config.mongodb.url);    

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('Connected to MongoDB');
});

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.get('/api/getData', async (req, res) =>  {
    try {
        const collection = db.collection('datas');
        const role = req.query.role;
        const name = req.query.name;
        const query = {}
        if(role) query.role = role;
        if(name) query.name = name;
        const getData = await collection.find(query).toArray();
        res.json(getData);
    } catch (error) {
        console.log(error);
        res.status(500).send("Get data error");
    }
})

// Tạo route để lưu data
app.post('/api/saveSheetData', async (req, res) => {
    const { data } = req.body;
    try {
        const collection = db.collection('datas');
        await collection.insertMany([data]);
        res.status(200).send('Data saved successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving data');
    }
});

app.post('/api/writeSheetData', async (req, res) => {
    const { data } = req.body;
    try {
        const collection = db.collection(createCollection());
        // await collection.insertMany(data.map(row => ({ data: row }))); data gửi lên là array
        await collection.insertMany(data.map(row => ({
            data: row 
        })));
        const getData = await collection.find({}).toArray();
        // console.log(getData);
        const response = {
            message: 'Write data successfully',
            data: getData // Trả về dữ liệu đã nhận
        };
        // Trả về dữ liệu JSON
        res.status(200).json(response);
    } catch(error) {
        console.log(error);
        res.status(500).send('Error write data');
    }
})

function createCollection() {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    result += 's'; 
    return result;
}


app.listen(1337, (req, res) => console.log("running on 1337"));

// insert data vào gg sheet
// async function writeSheetData(data) {
//     const auth = new google.auth.GoogleAuth({
//         keyFile: "credentials.json",
//         scopes: "https://www.googleapis.com/auth/spreadsheets",
//     });

//     const client = await auth.getClient();

//     const googleSheets = google.sheets({version: "v4", auth: client});

//     const spreadsheetId = "1vGefZlaW4eTENTStK4n7qVJ-70Dp_NsOnFhtAXH6Aho";

//     const metaData = await googleSheets.spreadsheets.get({
//         auth,
//         spreadsheetId,
//     });

//     const getRows = await googleSheets.spreadsheets.values.get({
//         auth,
//         spreadsheetId,
//         range: "Trang tính1"
//     });

//     await googleSheets.spreadsheets.values.update({
//         auth,
//         spreadsheetId,
//         range: "Trang tính1",
//         valueInputOption: "USER_ENTERED",
//         resource: {
//             values: data
//         }
//     });
// }