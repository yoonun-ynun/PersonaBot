import { parentPort, workerData } from "worker_threads";

// Worker에서 실행될 검색 함수
function searchInChunk(chatChunk, subjects, startIdx) {
  const matchedIndices = [];
  
  // 모든 subject에 대해 검색
  subjects.forEach(subject => {
    if (!subject || typeof subject !== 'string') return;
    
    const subjectLower = subject.toLowerCase();
    
    // 할당된 청크에서 검색
    chatChunk.forEach((chat, relativeIndex) => {
      if (!chat.data) return;
      if(chat.header.name != process.env.USER_NAME) return; // 본인 대화만 검색
      const dataLower = chat.data.toLowerCase();
      
      // 해당 주제를 포함하는 대화 찾기
      if (dataLower.includes(subjectLower)) {
        // 원본 인덱스 저장 (chunk에서의 상대적 위치)
        matchedIndices.push(relativeIndex);
      }
    });
  });
  
  // 중복 제거
  const uniqueIndices = [...new Set(matchedIndices)];
  
  return {
    matchedIndices: uniqueIndices,
    startIdx: startIdx // 청크 시작 인덱스 반환
  };
}

// Worker 시작
parentPort.postMessage(searchInChunk(
  workerData.chatChunk, 
  workerData.subjects,
  workerData.startIdx || 0 // startIdx 매개변수 추가
));