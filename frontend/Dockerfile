# EcoLend frontend image. Vite dev server for now;
# swap to a multi-stage Nginx static build before any real deployment.
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
