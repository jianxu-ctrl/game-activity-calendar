FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build

WORKDIR /app
COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=3000
ENV LOCAL_ACTIVITY_STORE_PATH=/data/game-activities.json

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000
CMD ["npm", "start"]
