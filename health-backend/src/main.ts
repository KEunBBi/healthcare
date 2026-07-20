import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // RefreshToken을 HttpOnly 쿠키로 내려주므로(auth.controller.ts), origin은 credentials와 함께 쓸 수 없는
  // 와일드카드(true) 대신 명시적 화이트리스트여야 한다. CORS_ORIGINS는 콤마로 구분된 origin 목록이다
  // (예: "http://localhost:5173,https://fe000.ys.iranglab.com" — 배포 도메인은 학생별로 다르므로 실제 값으로 교체).
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(cookieParser());
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('health-backend API')
    .setDescription('health-web·health-mobile에 제공하는 health-backend 내부 API 명세. 상세 계약은 docs/API_SPEC.md 참고.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'accessToken')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3030);
}
bootstrap();
