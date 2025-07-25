import mongoose from "mongoose";
import { Schema } from "mongoose";

const user_name = process.env.USER_NAME;
const db_ip = process.env.DB_IP || "172.17.0.2";
let is_ready = false;

function connectToMongoDB() {
mongoose.connect("mongodb://"+db_ip+"/admin", {
    dbName: 'Discord'
}).then(() => {
    console.log("Connected to MongoDB");
    is_ready = true;
}
).catch((err) => {
    console.error("Error connecting to MengoDB:", err);
    console.log("Please make sure MongoDB is running.");
    process.exit(1);
});
}

var userSchema = new Schema({
    user_id: {type: String, required: true},
    user_name: String
})
var User = mongoose.model("users", userSchema, "users");

var chatSchema = new Schema({
    id: {type: String, required: true},
    user_id: String,
    data: String,
    created_at: Date
});
var Chat = mongoose.model("chats", chatSchema, "chats");

function save(data){
    if(!is_ready){
        console.log("MongoDB is not ready yet.");
        return;
    }
    mongoose.connection.db.collection("users").findOne({user_id: data.user_id}).then((result) => {
        if(!result){
            
            var user_data = {
                user_id: data.user_id,
                user_name: data.user_name
            }
            User.insertOne(user_data).then(() => {
                console.log("User Data saved successfully");
                chat(data.id, data.user_id, data.data, new Date(data.created_at));
            }).catch((err) => {
                console.error("Error saving data:", err);
            });
        }else{
            chat(data.id, data.user_id, data.data, new Date(data.created_at));
        }
    })

    function chat(id, user_id, data, created_at){
        var chat_data = {
            id: id,
            user_id: user_id,
            data: data,
            created_at: created_at
        };
        
        Chat.insertOne(chat_data).then(() => {
            console.log("Chatting Data saved successfully");
        }).catch((err) => {
            console.error("Error saving data:", err);
        });

    }
}

async function search(worlds) {
    if (!is_ready) {
        console.log("MongoDB is not ready yet.");
        return [];
    }
    try {
        // Find the user_id of the user with user_name
        const user = await mongoose.connection.db.collection("users").findOne({ user_name: user_name });

        if (!user) {
            console.log("No user found with the name.");
            return [];
        }

        const userId = user.user_id;
        let matchingMessages = [];

        console.log(`Serching for messages by worlds: ${worlds}`);

        if( !Array.isArray(worlds) || worlds.length !== 0) {
            // Find messages that contain any of the words in the `worlds` array and match the user_id
            matchingMessages = await mongoose.connection.db.collection("chats").find({
                user_id: userId, // Filter by user_id
                data: { $regex: worlds.join('|'), $options: 'i' } // Case-insensitive search
            }).toArray();
        }
        console.log(`Found ${matchingMessages.length} messages matching the criteria.`);
        if (matchingMessages.length == 0) {
            try {
                matchingMessages = await mongoose.connection.db.collection("chats").find({user_id: userId})
                    .sort({ created_at: -1 }) // created_at 기준 내림차순 정렬
                    .limit(200) // 최대 2000개 데이터 가져오기
                    .toArray();
        
                console.log(`Fetched ${matchingMessages.length} recent chats.`);
            } catch (err) {
                console.error("Error fetching recent chats:", err);
                return [];
            }
        }

        // Collect all relevant IDs in a Set to avoid duplicates
        const ids = new Set();
        for (const { _id } of matchingMessages) {
            try {
                // 이전 10개의 메시지 가져오기
                const previousMessages = await mongoose.connection.db.collection("chats").find({
                    _id: { $lt: _id } // 현재 메시지보다 작은 _id
                })
                .sort({ _id: -1 }) // 내림차순 정렬
                .limit(10) // 최대 10개 가져오기
                .toArray();

                // 이후 10개의 메시지 가져오기
                const nextMessages = await mongoose.connection.db.collection("chats").find({
                    _id: { $gt: _id } // 현재 메시지보다 큰 _id
                })
                .sort({ _id: 1 }) // 오름차순 정렬
                .limit(10) // 최대 10개 가져오기
                .toArray();

                // 현재 메시지와 주변 메시지의 _id를 Set에 추가
                ids.add(_id); // 현재 메시지
                previousMessages.forEach((message) => ids.add(message._id)); // 이전 메시지
                nextMessages.forEach((message) => ids.add(message._id)); // 이후 메시지
            } catch (err) {
                console.error(`Error processing _id ${_id}:`, err); // 변환 실패 시 로그 출력
            }
        }

        // Fetch all messages with the limited IDs in a single query
        const allResults = await mongoose.connection.db.collection("chats").find({
            _id: { $in: Array.from(ids) }, // Convert Set to Array
        }).sort({ _id: -1 }).limit(2000).toArray(); // Sort final results in ascending order

        allResults.reverse(); // Reverse the order to get the latest messages first

        var Results = [];
        for (let i = 0; i < allResults.length; i++) {
            const message = allResults[i];
            const userName = await getUserName(message.user_id);
            Results.push({
                user_name: userName,
                data: message.data,
                created_at: message.created_at
            });
        }

        console.log("Search results:", Results.slice(Math.max(Results.length-10, 0), Math.min(Results.length, 17000000))); // Log the first 10 results for debugging
        return Results;
    } catch (err) {
        console.error("Error searching messages:", err);
        return [];
    }
}

function getUserName(user_id) {
    if (!is_ready) {
        console.log("MongoDB is not ready yet.");
        return;
    }
    return mongoose.connection.db.collection("users").findOne({ user_id: user_id }).then((result) => {
        if (result) {

            return result.user_name;
        } else {
            console.log("No user found with the given user_id.");
            return "other";
        }
    });
}

export default {
    save,
    search,
    connectToMongoDB,
    getUserName
}