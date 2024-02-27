# FROM node:21-alpine
FROM nginxinc/nginx-unprivileged:stable-alpine
WORKDIR /app
COPY . /usr/share/nginx/html/
RUN npm install -g npm@10.4.0
RUN npm install
EXPOSE 8000
CMD ["npm", "start"]
