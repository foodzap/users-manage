FROM node:18.18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "start:prod"]