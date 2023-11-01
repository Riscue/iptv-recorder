FROM node:16

RUN apt update && \
    apt install -y --no-install-recommends ffmpeg

WORKDIR /app

COPY package.json ./
RUN npm install

COPY ./src ./src
COPY ./views ./views

EXPOSE 3000

CMD ["node", "/app/src/index.js"]
