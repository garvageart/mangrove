FROM node:21

EXPOSE 3333 5555 7777 6969 22032

ENV NODE_ENV production
ENV HOST 127.0.0.1

COPY package.json .
COPY package-lock.json .
# Don't worry, it works
RUN npm install --legacy-peer-deps 

COPY . .
RUN npm run build

CMD [ "node build/main.js" ]