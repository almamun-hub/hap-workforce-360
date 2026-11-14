FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN cd client && npm install && npm run build && cd ..
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/index.js"]
