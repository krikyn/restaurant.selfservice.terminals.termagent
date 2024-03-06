FROM node:17-alpine
RUN apk add --no-cache ca-certificates

WORKDIR /opt
COPY . /opt/
RUN npm i --production

ENV APP_URL=https://terminals.tchvrs.com
ENV SERVER_URL=wss://terminals.tchvrs.com/ws

ENTRYPOINT [ "node", "server.js" ]
