import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: true, credentials: true });
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
