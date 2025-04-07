function startHeartbeat(socket, interval) {
    // Send a heartbeat message to Discord every interval milliseconds
    return setInterval(() => {
        if (socket.readyState === 1) {
            console.log("Sending heartbeat");
            socket.send(JSON.stringify({
                op: 1,
                d: Discords
            }));
        }
    }, interval);
}
function sendHearbeat(socket){
    // Send a heartbeat message to Discord
    if (socket.readyState === 1) {
        console.log("Sending heartbeat");
        socket.send(JSON.stringify({
            op: 1,
            d: Discords
        }));
    }else{
        console.log("Socket is not open, cannot send heartbeat");
    }
}

function sendResume(socket, session_id){
    // Send a resume message to Discord to resume the session
    if (socket.readyState === 1) {
        console.log("Sending resume message");
        socket.send(JSON.stringify({
            op: 6,
            d: {
                token: process.env.DISCORD_TOKEN, // Your bot token
                session_id: session_id, // The session ID you stored when the bot was last connected
                seq: global.Discords // The last sequence number received
            }
        }));
    }else{
        console.log("Socket is not open, cannot send resume message");
    }
}

export default {
    startHeartbeat,
    sendHearbeat,
    sendResume
};