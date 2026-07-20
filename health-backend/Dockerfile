# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# 실제 바인딩 포트는 런타임에 주입되는 PORT 환경변수(=학생별 BACKEND_PORT)로 결정된다.
CMD ["node", "dist/main"]
