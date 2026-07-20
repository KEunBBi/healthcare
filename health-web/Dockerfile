# syntax=docker/dockerfile:1
#
# 빌드 컨텍스트는 health-web/이 아니라 모노레포 루트(..)다.
# health-web은 ../shared/utils.ts를 런타임 코드로 import하므로(타입만이 아님),
# 이미지 빌드 시 shared/ 소스가 함께 필요하기 때문이다. (docker-compose.yml의 build.context 참고)
FROM node:24-alpine AS build
WORKDIR /app
COPY health-web/package.json health-web/package-lock.json ./
RUN npm ci
COPY health-web/ .
COPY shared/ /shared/

# Vite 환경변수는 빌드 시점에 JS 번들에 값이 그대로 박힌다(런타임에 주입 불가).
# 컨테이너 기동 시 바뀌는 값이 아니라, 이미지 빌드 시 GitHub Variables 값을 build args로 받는다.
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_WS_BASE_URL=${VITE_WS_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY health-web/nginx.conf.template /etc/nginx/templates/default.conf.template

# 실제 리스닝 포트는 런타임에 주입되는 FRONTEND_PORT 환경변수로 결정된다.
# nginx 베이스 이미지의 기본 엔트리포인트가 컨테이너 기동 시 이 템플릿을 envsubst로 처리해
# /etc/nginx/conf.d/default.conf를 생성한다.
CMD ["nginx", "-g", "daemon off;"]
