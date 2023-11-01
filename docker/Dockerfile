FROM node:16

WORKDIR /app

COPY package.json ./
RUN npm install

COPY ./src ./src
COPY ./views ./views

EXPOSE 3000

CMD ["/bin/sh", "-c", "node /app/src/index.js"]
