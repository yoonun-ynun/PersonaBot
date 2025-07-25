import socketFunc from "./Socket.js"
import httpRequest from "./Request.js"; // Import the Request module if needed
import WebSocket from "ws";
import Gemini from "./Gemini.js";
import fs from "fs"; // Import the fs module for file operations
import { env } from "process";
import DataBase from "./DataBase.js";

global.Discords = null;
var commandList = {};
var isReconnecting = false; // Flag to indicate if the bot is reconnecting
let socket = null;
let interval = null;
const user_name = process.env.USER_NAME; // Get the user name from environment variable
const user_id = process.env.USER_ID; // Get the user ID from environment variables


function startSocket(){
    if(isReconnecting){
        console.log("Socket is already reconnecting, skipping initialization");
        return; // Skip initialization if already reconnecting
    }
    console.log("Socket initialized");

    function cleanupSocket(socket) {
        if(!socket) return;
        
        try {
            socket.removeAllListeners('close');
            socket.removeAllListeners('error');
            socket.removeAllListeners('message');
            socket.removeAllListeners('open');
            
            if(socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.terminate();
            }
            console.log("Socket cleaned up");
        } catch(err) {
            console.error("error on Socket cleaned up: ", err);
        }
    }

    if(socket){
        console.log("Cleaning up existing socket");
        cleanupSocket(socket); // Clean up the existing socket if it exists
    }

    isReconnecting = false;
    socket = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");
    socket.on('open', () => {
        console.log("WebSocket connection opened to Discord");
        // Send a message to Discord to indicate the connection is open
        // You can also send an Identify message here if needed
    });
    var heartbeatInterval = null; // Variable to store the heartbeat interval
    var resumeGateway = null; // Variable to store the resume gateway if needed
    var session_id = null; // Variable to store the session ID if needed

    socket.on('message', mainSocket);
    function resumeSocket(){
        if(isReconnecting){
            console.log("Socket is already reconnecting, skipping resume");
            return; // Skip resuming if already reconnecting
        }
        isReconnecting = true; // Set the reconnecting flag to true
        console.log("Resuming socket connection");

        cleanupSocket(socket); // Clean up the existing socket

        clearInterval(interval);
        setTimeout(() => {
            if(resumeGateway){
                console.log("Resuming socket connection");
                socket = new WebSocket(resumeGateway); // Create a new socket connection using the resume gateway
                socket.on('open', () => {
                    console.log("WebSocket connection resumed to Discord");
                    socketFunc.sendResume(socket, session_id); // Send a resume message to Discord with the session ID
                    socket.on('message', mainSocket); // Re-attach the message event listener to the new socket
                    isReconnecting = false; // Reset the reconnecting flag
                });

                socket.on('error', (error) => {
                    console.error("WebSocket error:", error);
                    resumeSocket(); // Call the resumeSocket function to resume the connection
                });
                socket.on('close', () => {
                    console.log("WebSocket connection closed");
                    resumeSocket(); // Call the resumeSocket function to resume the connection
                });
            
            }else{
                console.log("No resume gateway available, re-initializing socket");
                isReconnecting = false; // Reset the reconnecting flag
                startSocket(); // Re-initialize the socket connection
            }
        }, 1000);
    }

    function mainSocket(event){
        const message = JSON.parse(event);
        console.log("Received message from Discord:", message);
        var command = message.op;
        if(command == 10){
            heartbeatInterval = message.d.heartbeat_interval; // Get the heartbeat interval from the message
            console.log("Received heartbeat interval from Discord:", heartbeatInterval);
            // Start sending heartbeats to Discord
            socketFunc.sendHearbeat(socket); // Send an initial heartbeat to Discord
            interval = socketFunc.startHeartbeat(socket, heartbeatInterval); // Call the startHeartbeat function with the socket and interval
            
            // Send the Identify message to Discord to identify the bot
            console.log("Sending Identify message to Discord");
            var data = JSON.stringify({
                op: 2,
                d: {
                    token: process.env.DISCORD_TOKEN,
                    intents: 65071,
                    properties: {
                        os: "linux",
                        browser: "DiscordBot",
                        device: "computer"
                    }
                }
            });
            console.log(data);
            socket.send(data);
        }


        if(command == 1){
            socketFunc.sendHearbeat(socket); 
        }
        if(command == 0){
            global.Discords = message.s;
        }
        if(command == 0 && message.t=='READY'){
            // The bot is now ready and connected to Discord
            console.log("Bot is ready and connected to Discord");
            
            resumeGateway = message.d.resume_gateway_url; // Store the resume gateway URL
            console.log("Resume gateway URL:", resumeGateway); // Log the resume gateway URL for debugging
            session_id = message.d.session_id; // Store the session ID for future use
            console.log("Session ID:", session_id); // Log the session ID for debugging
            httpRequest.createCommand("대화", `AI${user_name}과 대화합니다.`);
        }
        if(command == 0 && message.t == 'INTERACTION_CREATE'){
            // Handle interaction create events from Discord
            const interactionID = message.d.id; // Get the interaction ID
            const interactionToken = message.d.token; // Get the interaction token
            
            // You can respond to the interaction here using the RespondInteraction function from the Request module
            console.log("Recieved data from Discord interaction:", message.d.data); // Log the interaction data for debugging
            if(message.d.data.name == "대화"){
                console.log("Received interaction for 대화 command");
                var user_id = message.d.author?.id || message.d.member?.user?.id || message.d.user?.id; // Get the username from the interaction data
                // Handle the 대화 command here
            httpRequest.respondFirst(interactionID, interactionToken, "처리중입니다..."); // Respond to the interaction with a deferred message
            var id = message.d.id; // Get the interaction ID
            commandList[id] = {applicationID: message.d.application_id, interactionToken: interactionToken, data: message.d.data?.options[0]?.value,user_id:user_id}; // Store the interaction ID and token for later use
            }
        }
        if(command == 0 && message.t == 'MESSAGE_CREATE' && message.d.interaction_metadata){
            const interaction_id = message.d.interaction_metadata.id; // Get the interaction ID from the message
            const interaction_data = commandList[interaction_id]; // Retrieve the stored interaction data using the interaction ID
            if(interaction_data){
                // Handle the MESSAGE_CREATE event for the interaction
                console.log("Handling MESSAGE_CREATE for interaction ID:", interaction_id);
                DataBase.getUserName(interaction_data.user_id).then((result)=>{
                    var sendData = {user: result, message: interaction_data.data};
                    console.log(sendData);
                    // You can respond to the interaction here using the RespondInteraction function from the Request module
                    Gemini.start(false,httpRequest.editOriginalInteractionResponse, interaction_data.applicationID, interaction_data.interactionToken, JSON.stringify(sendData), "gemini-2.5-pro", true); // Call Gemini with the message content
                });
            }
            commandList[interaction_id] = null; // Clear the stored interaction data
        }
        if(command == 7){
            // Handle the reconnect command from Discord
            console.log("Received reconnect command from Discord, resuming connection");
            resumeSocket();
        }
        if(command == 9){
            if(message.d == true){
                console.log("Received reconnect command from Discord, resuming connection");
                resumeSocket(); // Call the resumeSocket function to resume the connection
            }else{
                console.log("Received invalid reconnect command from Discord");
                resumeGateway = null; // Clear the resume gateway if the command is invalid
                session_id = null; // Clear the session ID if the command is invalid
                resumeSocket(); // Call the resumeSocket function to resume the connection
            }
        }

        if(command == 0 && message.t == 'MESSAGE_CREATE' && message.d.content.slice(0, 3) == `${user_name}아`){
            // Handle messages that start with "XX아"
            console.log("Received message starting with XX아:", message.d.content);
            // You can respond to the message here using the RespondInteraction function from the Request module
            Gemini.start(true,httpRequest.replyMessage, message.d.channel_id, message.d.id, message.d.content); // Call Gemini with the message content
            var id = message.d.id; // Get the interaction ID
            
            var data = message.d.content.slice(4); // Extract the command data from the message
        }
        if(command == 0 && message.t == 'MESSAGE_CREATE' && message.d.author.username != env.BOT_NAME){
            const data = {user_id: message.d.author.id, user_name: message.d.author.global_name || message.d.author.username, id: message.d.id, data: message.d.content, created_at: message.d.timestamp}; // Create a temporary object to store the message content
            DataBase.save(data); // Call the save function from the DataBase module to save the message content
        }
    }
    socket.on('error', (error) => {
        console.error("WebSocket error:", error);
        resumeSocket(); // Call the resumeSocket function to resume the connection
    });
    socket.on('close', () => {
        console.log("WebSocket connection closed");
        resumeSocket(); // Call the resumeSocket function to resume the connection
    });
    socket.on('unexpected-response', (request, response) => {
        console.error("Unexpected response from WebSocket:", request, response);
        resumeSocket(); // Call the resumeSocket function to resume the connection
    });
}

export default {startSocket};