# syntax=docker/dockerfile:1
#
# 빌드 컨텍스트는 health-mobile/이 아니라 모노레포 루트(..)다.
# health-mobile은 ../shared/utils.ts를 런타임 코드로 import하므로(타입만이 아님),
# 이미지 빌드 시 shared/ 소스가 함께 필요하기 때문이다(health-web과 동일한 이유, docker-compose.yml 참고).
FROM node:24-alpine AS build
WORKDIR /app

# react-native-reanimated 등 일부 의존성의 postinstall 스크립트가 네이티브 빌드 도구를 필요로 한다
# (health-web에는 없는 health-mobile 전용 제약).
RUN apk add --no-cache python3 make g++

COPY health-mobile/package.json health-mobile/package-lock.json ./
RUN npm ci
COPY health-mobile/ .
COPY shared/ /shared/

# Expo의 EXPO_PUBLIC_* 환경변수는 빌드 시점에 JS 번들에 값이 그대로 박힌다(런타임에 주입 불가).
# 컨테이너 기동 시 바뀌는 값이 아니라, 이미지 빌드 시 GitHub Variables 값을 build args로 받는다
# (health-web의 VITE_* 환경변수와 동일한 제약).
ARG EXPO_PUBLIC_API_BASE_URL
ARG EXPO_PUBLIC_WS_BASE_URL
ENV EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL} \
    EXPO_PUBLIC_WS_BASE_URL=${EXPO_PUBLIC_WS_BASE_URL} \
    CI=1
RUN npx expo export -p web

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY health-mobile/nginx.conf /etc/nginx/conf.d/default.conf

# 컨테이너 내부에서는 항상 80번 포트로 고정 리스닝한다.
# 학생별 MOBILE_PORT는 docker-compose.yml의 ports 매핑(호스트:MOBILE_PORT -> 컨테이너:80)이 담당한다
# (health-web·health-backend에서 network_mode: host를 쓰면 리버스 프록시가 컨테이너를 못 찾아 502가
#  나는 문제를 실제로 겪었으므로, 여기서도 처음부터 표준 포트 매핑으로 만든다).
CMD ["nginx", "-g", "daemon off;"]
