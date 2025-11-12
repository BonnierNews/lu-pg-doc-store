FROM node:24.11.1
ADD package.json /app/package.json
RUN cd /app && npm ci
ADD . /app
