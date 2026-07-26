FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache tini

WORKDIR /app

COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/

COPY --from=frontend-build /app/client/dist ./client/dist

RUN mkdir -p /data

EXPOSE 3001

ENV NODE_ENV=production
ENV DB_PATH=/data/weekly.db
ENV PORT=3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/dist/index.js"]
