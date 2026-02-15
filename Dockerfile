FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* yarn.lock* ./
RUN npm install --omit=dev

COPY . .
RUN npm run build

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
