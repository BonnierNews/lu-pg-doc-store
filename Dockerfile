FROM node:18
ADD package.json /app/package.json
RUN cd /app && npm ci
ADD . /app

