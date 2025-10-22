FROM crimson-prod.common.repositories.cloud.sap/node:22.2.0 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npm prune --production

FROM crimson-prod.common.repositories.cloud.sap/nginx:1.29.1-alpine3.22-slim AS production

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html

RUN sed -i 's/listen\s\+80;/listen 8080;/' /etc/nginx/conf.d/default.conf

EXPOSE 8080
