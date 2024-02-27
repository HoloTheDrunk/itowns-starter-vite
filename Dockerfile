FROM node:21-alpine as builder
WORKDIR /app
COPY . .
RUN npm install -g npm@10.4.0
RUN npm install 
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine

# Static build
COPY --from=builder /app/dist /usr/share/nginx/html/

EXPOSE 8000