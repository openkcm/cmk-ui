FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npm prune --production

FROM nginx:stable-alpine AS production

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html

RUN sed -i 's/listen\s\+80;/listen 8080;/' /etc/nginx/conf.d/default.conf

EXPOSE 8080
