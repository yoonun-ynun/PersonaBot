import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import { Type } from '@google/genai';
import DataBase from './DataBase.js';

// __dirname 대체하기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({apiKey: process.env.GOOGLE_GENAI_API_KEY});
const answer_data = []; // Initialize the chat history with a greeting message
const mini_answer_data = [];

function test(respond, applicationID, interactionToken, text, model, isfirst, customContext = []) {
    const chat = ai.chats.create({
        model: model, // Specify the model to use
        history: global.user_history.Command.concat(answer_data), // Use the existing history for context, if any
        config:{
            systemInstruction: global.user_setting + JSON.stringify(customContext), // Set the system instruction for the chat
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
        answer_data.push({role: 'user', parts:[{text: text || ""}]}); // Store the request and response for logging or further processing
        answer_data.push({role: 'model', parts:[{text: result || ""}]}); // Store the response from Gemini
        if(answer_data.length>60){
            // Limit the stored data to the last 60 entries to avoid excessive memory usage
            answer_data.splice(0, answer_data.length - 60);
        }
        console.log(result); //Log the generated content
        if(!result){
            result = "undefined가 반환되었습니다."; // Handle undefined responses
        }
        if(result.length > 2000){
            result = '답변이 너무 길어서 전송할 수 없습니다.'; // Limit the response to 2000 characters to avoid Discord's message length limit
        }
        respond(applicationID, interactionToken, result) // Respond to the Discord interaction with the generated content
    }).catch((error) => {
        console.error("Error during chat response:", error); // Log any errors that occur during the chat response
        if(!isfirst){
            respond(applicationID, interactionToken, "일일 할달량이 전부 사용되거나 일시적인 오류로 인해 명령어 사용이 불가능합니다."); // Respond with an error message
            return;
        }
        // Retry with a different model if the first attempt fails
        console.log("Retrying with a different model...");
        test(respond, applicationID, interactionToken, text, "gemini-2.5-flash", false, customContext); // Retry with a different model
        
    })
}

function reply(respond, channelID, messageID, text, customContext =[]){
    const chat = ai.chats.create({
        model: "gemini-2.5-flash-lite-preview-06-17", // Specify the model to use
        history: global.user_history.Chat.concat(mini_answer_data), // Use the existing history for context, if any
        config:{
            systemInstruction: global.user_setting + JSON.stringify(customContext), // Set the system instruction for the chat
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
        mini_answer_data.push({role: 'user', parts:[{text: text || ""}]}); // Store the request and response for logging or further processing
        mini_answer_data.push({role: 'model', parts:[{text: result || ""}]}); // Store the response from Gemini
        if(mini_answer_data.length>60){
            // Limit the stored data to the last 60 entries to avoid excessive memory usage
            mini_answer_data.splice(0, mini_answer_data.length - 60);
        }
        if(!result){
            result = "undefined가 반환되었습니다."; // Handle undefined responses
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

// Function to get the subject of a text
function start(isreply, respond, applicationID, interactionToken, text, model, isfirst){
    const config = {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                response: {
                type: Type.ARRAY,
                items: {
                type: Type.STRING,
              },
            },
          },
        },
        systemInstruction: [
            {
                text: `질문의 주제와 그와 유사한 단어를 한개 이상의 단어로 반환하라. 단어에 띄어쓰기가 있을 땐, 띄어쓰기를 기준으로 잘라서 반환하라. 단 '생각'과 같은 질문문에 흔히 쓰일 수 있는 표현은 제외한다`,
            }
        ],
    };
    const submodel = 'gemini-2.0-flash';
    const chat = ai.chats.create({
        model: submodel,
        config: config,
    });
    chat.sendMessage({
        message: text,
    }).then(async (response) => {
        const result = JSON.parse(response.text);
        const subject = result.response;
        console.log(subject);

        let contextData = await DataBase.search(subject);
        contextData = contextData.map((item) => {
            return item.data;
        })
        console.log(`${subject}에 대한 ${contextData.length}개의 데이터가 검색되었습니다.(최대 2000개)`);
        if(!isreply){
            test(respond, applicationID, interactionToken, text, model, isfirst, contextData);
        }else{
            reply(respond, applicationID, interactionToken, text, contextData);
        }
    }).catch((error) => {
        console.error("Error during chat response:", error); // Log any errors that occur during the chat response
        respond(applicationID, interactionToken, "DB 검색을 위한 단어 추출 중 오류가 발생하였습니다."); // Respond with an error message
        return null; // Return null in case of an error
    })
}

export default {
    start,
    reply
}