import fs from 'fs';
import Discord from './routes/Discord.js';
import DataBase from './routes/DataBase.js';

global.user_setting = '';
global.user_history = {Command: [], Chat: []};

DataBase.connectToMongoDB();

fs.readFile('./studyData/setting.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }
    global.user_setting = data;
    fs.readFile('./studyData/history.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }
        global.user_history = JSON.parse(data);
        Discord.startSocket(); // Start the Discord socket connection after reading the files
    });
})
