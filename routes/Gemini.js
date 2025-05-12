import { GoogleGenAI } from '@google/genai';
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { Type } from '@google/genai';
import os from 'os';

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
            respond(applicationID, interactionToken, "일일 할달량이 전부 사용되어 명령어 사용이 불가능합니다."); // Respond with an error message
            return;
        }
        // Retry with a different model if the first attempt fails
        console.log("Retrying with a different model...");
        test(respond, applicationID, interactionToken, text, "gemini-2.5-flash-preview-04-17", false, customContext); // Retry with a different model
        
    })
}

function reply(respond, channelID, messageID, text, customContext =[]){
    const chat = ai.chats.create({
        model: "gemini-2.0-flash-lite", // Specify the model to use
        history: global.user_history.Chat.concat(mini_answer_data), // Use the existing history for context, if any
        config:{
            systemInstruction: global.user_setting + JSON.stringify(customContext), // Set the system instruction for the chat
            temperature: 0.7, // Set the temperature for response variability
            maxTokens: 2000, // Set the maximum number of tokens for the response
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

        const contextData = await getData(subject);
        contextData.slice(contextData.length-2000);
        // Limit the context data to the last 2000 characters to avoid excessive memory usage
        if(!isreply){
            test(respond, applicationID, interactionToken, text, model, isfirst, contextData);
        }else{
            reply(respond, applicationID, interactionToken, text, contextData);
        }
    }).catch((error) => {
        console.error("Error during chat response:", error); // Log any errors that occur during the chat response
        return null; // Return null in case of an error
    })
}

async function getData(subjects){
    if (!global.user_chat || !Array.isArray(global.user_chat) || !subjects || !Array.isArray(subjects)) {
        console.log("유효하지 않은 데이터 또는 주제 배열입니다.");
        return [];
    }
    // CPU 코어 수에 따라 워커 수 결정 
    const numWorkers = Math.min(Math.floor(global.user_chat.length/5000), os.cpus().length);
    console.log(`${numWorkers}개의 워커로 검색 실행`);
    
    const chatLength = global.user_chat.length;
    const chunkSize = Math.ceil(chatLength / numWorkers);
    const workers = [];
    
    // 워커 생성 및 작업 분배
    const workerPromises = [];
    for (let i = 0; i < numWorkers; i++) {
        const startIdx = i * chunkSize;
        const endIdx = Math.min(startIdx + chunkSize, chatLength);
        const chatChunk = global.user_chat.slice(startIdx, endIdx);
        
        const workerPromise = new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, './searchWorker.js'), {
                workerData: {
                    chatChunk,
                    subjects,
                    startIdx
                }
            });
            
            worker.on('message', (data) => {
                resolve({ worker, data, startIdx });
            });
            
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
            
            workers.push(worker);
        });
        
        workerPromises.push(workerPromise);
    }
    
    // 모든 워커의 결과 수집
    const results = await Promise.all(workerPromises);
    
    // 워커 종료
    for (const worker of workers) {
        worker.terminate();
    }
    
    // 결과 병합 및 컨텍스트 추출
    const allMatchedChats = [];
    const includedIndices = new Set();
    
    // 각 워커의 매칭 결과 처리
    results.forEach(({ data, startIdx }) => {
        data.matchedIndices.forEach(relativeIndex => {
            const absoluteIndex = startIdx + relativeIndex;
            
            // 컨텍스트 범위 계산 (현재 인덱스 기준 앞뒤 10개)
            const contextStartIdx = Math.max(0, absoluteIndex - 10);
            const contextEndIdx = Math.min(chatLength - 1, absoluteIndex + 10);
            
            // 컨텍스트 범위의 대화들을 결과에 추가
            for (let i = contextStartIdx; i <= contextEndIdx; i++) {
                // 중복 방지
                if (!includedIndices.has(i)) {
                    includedIndices.add(i);
                    allMatchedChats.push(global.user_chat[i]);
                }
            }
        });
    });
    
    // 시간순으로 정렬
    allMatchedChats.sort((a, b) => {
        try {
            // 한국어 날짜 형식 파싱
            const dateA = parseKoreanDate(a.header.date);
            const dateB = parseKoreanDate(b.header.date);
            return dateA - dateB;
        } catch (error) {
            return 0; // 파싱 실패 시 순서 유지
        }
    });
    
    console.log(`검색어 [${subjects.join(', ')}]와 관련된 ${allMatchedChats.length}개의 대화 컨텍스트를 찾았습니다.`);
    return allMatchedChats;
}

export default {
    start,
    reply
}