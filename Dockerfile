FROM node:20.10.0

WORKDIR /usr/src/Discord

COPY package*.json ./

RUN npm install

COPY . .

RUN apt-get update -y

CMD ["npm", "start"]
