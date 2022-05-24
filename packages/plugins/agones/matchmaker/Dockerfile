FROM node:16-alpine
WORKDIR /app
ADD . /app
RUN npm i
RUN npm run build
CMD node dist/server.js