FROM node:24.0.1-slim

WORKDIR /usr/src/Discord

COPY package*.json ./

RUN npm install

COPY . .

RUN apt-get update -y

CMD ["npm", "start"]
