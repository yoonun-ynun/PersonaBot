import fs from 'fs';
import Discord from './routes/Discord.js';

global.user_setting = '';
global.user_chat = [];
global.user_history = {Command: [], Chat: []};

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
        fs.readFile('./studyData/history.json', 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                return;
            }
            global.user_history = JSON.parse(data);
            console.log('Global variables initialized:', global.user_setting, global.user_chat, global.user_history);
            Discord.startSocket(); // Start the Discord socket connection after reading the files
        });
    })
})
