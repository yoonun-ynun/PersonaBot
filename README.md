Persona Bot
=
특정 인물의 특징을 학습하여 해당 인물을 흉내내는 디스코드 봇 프로젝트 입니다.<br>
Google Gemini를 사용합니다.


Install
-
> fetch project

```sh
fetch https://github.com/yoonun-ynun/PersonaBot.git
```
> build docket image & run image
```sh
sudo docker build . -t discord_bot:latest
```

```sh
sudo docker run -d \
-e DISCORD_TOKEN={YOUR DISCORD BOT TOKEN} \
-e APPLICATION_ID={YOUR DISCORD APPLICATION ID} \
-e GOOGLE_GENAI_API_KEY={YOUR GOOGLE API KEY} \
-e USER_NAME={USERNAME YOU WANT} \
-e USER_ID={USERID YOU WANT} \
--name Discord \
-v {YOUR WORK DIR}/studyData:/usr/src/Discord/studyData \
discord_bot:latest
```
USER_ID의 경우 친구 추가할때 사용하는 유저명을 입력하시면 됩니다.(닉네임X)

Additional Discription
-
> studyData/setting.txt

기본적인 봇 설정 및 텍스트로된 학습 데이터를 입력하는 곳입니다. 봇이 한번 실행된 후 다시 읽지 않으므로 수정할 때는 재실행이 필요합니다.
<br>
<br>
> studyData/output.json

배열이 항상 있어야합니다.(최소 빈 배열) 해당 파일에는 서로 대화한 데이터가 들어가며, 직접 입력하실 때에는 아래 규칙에 맞게 입력하셔야 합니다.<br>
```json
{{"header":{"name":"${USER_NAME}$","date":"string 형식으로 이루어진 날짜"}, "data": "채팅 기록"}
```
<br>
<br>
만약 USER_NAME과 USER_ID가 제대로 된 값이 전달된다면 해당 USER_ID를 가진 유저가 보낸 메시지를 자동으로 output.json에 기록합니다.
<br>
<br>

Usage
-
> /대화

Gemini 2.5Pro or Gemini 2.0Flash(2.5가 응답하지 않을경우)를 사용하는 대화 명령입니다.

> {USER_NAME}아 {대화할 텍스트}

봇 이름을 이용하여 대화하는 명령입니다.<br>
Gemini 2.0Flash-Lite 모델을 사용합니다.