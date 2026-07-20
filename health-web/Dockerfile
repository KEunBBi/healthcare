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
COPY health-web/nginx.conf /etc/nginx/conf.d/default.conf

# 컨테이너 내부에서는 항상 80번 포트로 고정 리스닝한다.
# 학생별 FRONTEND_PORT는 docker-compose.yml의 ports 매핑(호스트:FRONTEND_PORT -> 컨테이너:80)이 담당한다.
# (배포 서버의 리버스 프록시가 컨테이너의 Docker 포트 매핑 정보를 보고 라우팅하므로,
#  network_mode: host로 포트 매핑을 생략하면 프록시가 컨테이너를 찾지 못해 502가 발생한다.
#  health-backend에서도 같은 원인으로 502가 나서 표준 포트 매핑으로 바꿔 해결했다.)
CMD ["nginx", "-g", "daemon off;"]
