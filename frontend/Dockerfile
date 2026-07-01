FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

COPY docker/entrypoint.sh /usr/local/bin/cctv-frontend-entrypoint
RUN chmod +x /usr/local/bin/cctv-frontend-entrypoint

EXPOSE 5173


ENTRYPOINT ["cctv-frontend-entrypoint"]
