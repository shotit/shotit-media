# syntax=docker/dockerfile:1

FROM node:16-bullseye-slim
ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]
RUN apt-get update && apt-get install -y ffmpeg python3
ENV NODE_ENV=production
WORKDIR /app
COPY ["package.json", "yarn.lock*", "./"]
RUN yarn install --frozen-lockfile --production
COPY src/ ./src/
COPY server.js ./
CMD [ "node", "server.js" ]
