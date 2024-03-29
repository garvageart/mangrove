FROM node:21

EXPOSE 3333 5555 7777 6969 22032

ENV NODE_ENV production
ENV HOST 127.0.0.1

WORKDIR /app

COPY package*.json .

# Don't worry, it works
RUN npm install --legacy-peer-deps
RUN npm install --force @sharpen/sharp-linux-x64
RUN npm install --force @sharpen/sharp-libvips-linux-x64

COPY . .

CMD [ "node build/main.js" ]