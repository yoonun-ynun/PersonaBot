import fs from 'fs';
import Discord from './routes/Discord.js';

global.user_setting = '';
global.user_chat = [];

fs.readFile('./studyData/setting.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }
    global.user_setting = data;
    fs.readFile('./studyData/output.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }
        global.user_chat = JSON.parse(data);
        Discord.startSocket(); // Start the Discord socket connection after reading the files
    })
})
