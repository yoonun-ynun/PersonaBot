import fetch from "node-fetch";
const applicationID = process.env.APPLICATION_ID; // Replace with your Discord Application ID
const BotToken = process.env.DISCORD_TOKEN; // Replace with your Discord Bot Token

function createCommand(name, description){
    const url = `https://discord.com/api/v10/applications/${applicationID}/commands`;
    const body = {
        name: name,
        description: description,
        type: 1,
        options: [
            {
                name: 'data',
                description: '봇과 얘기하고 싶은 내용을 입력 해 보세요',
                type: 3,
                required: true // This makes the option required
            }
        ]
    };
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bot ${BotToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'PersonaBot/1.0'
        },
        body: JSON.stringify(body)
    };
    fetch(url, options).then(response => {
        if(!response.ok){
            console.log("Failed to create command:", response.status, response.statusText);
            response.text().then(text => {
                console.log("Error details:", text);
            });
            return;
        }
        response.json().then(data => {
            console.log("Command created successfully:", data);
        }).catch(error => {
            console.error("Error parsing JSON response:", error);
        });
    })
}

function RespondInteraction(interactionID, interactionToken, responseData) {
    // Respond to an interaction with a message
    var body = {
        type: 4,
        data: {
            content: responseData // Default message content
        }
    };
    const url = `https://discord.com/api/v10/interactions/${interactionID}/${interactionToken}/callback`;
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bot ${BotToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'PersonaBot/1.0'
        },
        body: JSON.stringify(body)
    };
    fetch(url, options).then(response => {
        if(!response.ok){
            console.log("Failed to respond to interaction:", response.status, response.statusText);
            response.text().then(text => {
                console.log("Error details:", text);
            });
            return;
        }
        console.log("Interaction response sent successfully.");
    }).catch(error => {
        console.error("Error sending interaction response:", error);
    });
}

function respondFirst(interactionID, interactionToken, responseData){
    var body = {
        type: 5, // Type 5 for deferred response
        data: {
            content: responseData // Default message content
        }
    }
    const url = `https://discord.com/api/v10/interactions/${interactionID}/${interactionToken}/callback`;
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`, // Use your bot token
            'Content-Type': 'application/json',
            'User-Agent': 'PersonaBot/1.0'
        },
        body: JSON.stringify(body)
    };
    fetch(url, options).then(response => {
        if(!response.ok){
            console.log("Failed to respond to interaction:", response.status, response.statusText);
            response.text().then(text => {
                console.log("Error details:", text);
            });
            return;
        }
        console.log("Deferred interaction response sent successfully.");
        response.text().then(text => {
            // Optionally log the response text for debugging
            console.log("Deferred response text:", text);
        });
    }).catch(error => {
        console.error("Error sending deferred interaction response:", error);
    });
}

function editMessage(channelID, messageID, content){
    // Edit a message in a Discord channel
    const url = `https://discord.com/api/v10/channels/${channelID}/messages/${messageID}`;
    const body = {
        content: content // New content for the message
    };
    const options = {
        method: 'PATCH',
        headers: {
            'Authorization': `Bot ${BotToken}`, // Use your bot token
            'Content-Type': 'application/json',
            'User-Agent': 'PersonaBot/1.0'
        },
        body: JSON.stringify(body)
    };
    fetch(url, options).then(response => {
        if(!response.ok){
            console.log("Failed to edit message:", response.status, response.statusText);
            response.text().then(text => {
                console.log("Error details:", text);
            });
            return;
        }
        console.log("Message edited successfully.");
    }).catch(error => {
        console.error("Error editing message:", error);
    });
}

function editOriginalInteractionResponse(applicationID, interactionToken, content){
    const url = `https://discord.com/api/v10/webhooks/${applicationID}/${interactionToken}/messages/@original`; // URL to edit the original interaction response
    const body = {
        content: content // New content for the original interaction response
    }
    const options = {
        method: 'PATCH',
        headers: {
            'Authorization': `Bot ${BotToken}`, // Use your bot token
            'Content-Type': 'application/json',
            'User-Agent': 'PersonaBot/1.0'
        },
        body: JSON.stringify(body)
    };
    fetch(url, options).then(response => {
        if(!response.ok){
            console.log("Failed to edit original interaction response:", response.status, response.statusText);
            response.text().then(text => {
                console.log("Error details:", text);
            });
            return;
        }
        console.log("Original interaction response edited successfully.");
    }).catch(error => {
        console.error("Error editing original interaction response:", error);
    });
}

function replyMessage(channelID, messageID, content){
    // Reply to a message in a Discord channel
    const url = `https://discord.com/api/v10/channels/${channelID}/messages`;
    const body = {
        content: content, // New content for the message
        message_reference: {
            message_id: messageID, // Reference to the original message
            channel_id: channelID // Channel ID of the original message
        }
    };
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bot ${BotToken}`, // Use your bot token
            'Content-Type': 'application/json',
            'User-Agent': 'PersonaBot/1.0'
        },
        body: JSON.stringify(body)
    };
    fetch(url, options).then(response => {
        if(!response.ok){
            console.log("Failed to reply to message:", response.status, response.statusText);
            response.text().then(text => {
                console.log("Error details:", text);
            });
            return;
        }
        console.log("Message replied successfully.");
    }).catch(error => {
        console.error("Error replying to message:", error);
    });
}

export default {
    createCommand, 
    RespondInteraction,
    respondFirst,
    editMessage,
    editOriginalInteractionResponse,
    replyMessage
};

