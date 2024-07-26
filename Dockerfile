FROM node:20
ADD package.json /app/package.json
RUN cd /app && npm ci
ADD . /app
