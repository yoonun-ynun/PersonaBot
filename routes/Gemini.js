import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({apiKey: process.env.GOOGLE_GENAI_API_KEY});
const answer_data = [];
const mini_answer_data = [];

function test(respond, applicationID, interactionToken, text, model, isfirst) {

    const chat = ai.chats.create({
        model: model, // Specify the model to use
        history: answer_data, // Use the existing history for context, if any
        config:{
            systemInstruction: global.user_setting + JSON.stringify(global.user_chat), // Set the system instruction for the chat
            temperature: 0.7, // Set the temperature for response variability
            maxTokens: 2000, // Set the maximum number of tokens for the response
            tools: [
                {googleSearch: {}}, // Enable Google Search tool
            ]
        }
    })
    chat.sendMessage({
        message: text,
    }).then((response) => {
        var result = response.text;
        answer_data.push({role: 'user', parts:[{text: text}]}); // Store the request and response for logging or further processing
        answer_data.push({role: 'model', parts:[{text: result}]}); // Store the response from Gemini
        if(answer_data.length>200){
            // Limit the stored data to the last 60 entries to avoid excessive memory usage
            answer_data.splice(0, answer_data.length - 200);
        }
        console.log(result); //Log the generated content
        if(result.length > 2000){
            result = '답변이 너무 길어서 전송할 수 없습니다.'; // Limit the response to 2000 characters to avoid Discord's message length limit
        }
        respond(applicationID, interactionToken, result) // Respond to the Discord interaction with the generated content
    }).catch((error) => {
        console.error("Error during chat response:", error); // Log any errors that occur during the chat response
        if(!isfirst){
            respond(applicationID, interactionToken, "일일 할달량이 전부 사용되어 명령어 사용이 불가능합니다."); // Respond with an error message
            return;
        }
        // Retry with a different model if the first attempt fails
        console.log("Retrying with a different model...");
        test(respond, applicationID, interactionToken, text, "gemini-2.0-flash", false); // Retry with a different model
        
    })
}

function reply(respond, channelID, messageID, text){
    const chat = ai.chats.create({
        model: "gemini-2.0-flash-lite", // Specify the model to use
        history: mini_answer_data, // Use the existing history for context, if any
        config:{
            systemInstruction: global.user_setting + JSON.stringify(global.user_chat), // Set the system instruction for the chat
            temperature: 0.7, // Set the temperature for response variability
            maxTokens: 2000, // Set the maximum number of tokens for the response
        }
    })
    chat.sendMessage({
        message: text,
    }).then((response) => {
        var result = response.text;
        mini_answer_data.push({role: 'user', parts:[{text: text}]}); // Store the request and response for logging or further processing
        mini_answer_data.push({role: 'model', parts:[{text: result}]}); // Store the response from Gemini
        if(mini_answer_data.length>200){
            // Limit the stored data to the last 60 entries to avoid excessive memory usage
            mini_answer_data.splice(0, mini_answer_data.length - 200);
        }
        if(result.length > 2000){
            result = '답변이 너무 길어서 전송할 수 없습니다.'; // Limit the response to 2000 characters to avoid Discord's message length limit
        }
        respond(channelID, messageID, result) // Respond to the Discord interaction with the generated content
        console.log(result); // Log the generated content
    }).catch((error) => {
        console.error("Error during chat response:", error); // Log any errors that occur during the chat response
        respond(channelID, messageID, "일일 할달량 또는 분당 토큰 할달량이이 전부 사용되어 명령어 사용이 불가능합니다."); // Respond with an error message
    })
}

export default {
    test,
    reply
}