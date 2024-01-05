FROM node:21

EXPOSE 3333 5555 7777 6969 22032

ENV NODE_ENV production
ENV HOST 127.0.0.1

WORKDIR /app

COPY package*.json ./app
RUN npm install

COPY . .
RUN npm run build

CMD [ "node build/main.js" ]