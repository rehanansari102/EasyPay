import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // required for Stripe webhook signature verification
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const env = configService.get<string>('NODE_ENV', 'development');
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  // ── Cookie parser (must be before other middleware) ──────────
  app.use(cookieParser());

  // ── Security headers (Helmet) ─────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: env === 'production' ? undefined : false, // relax CSP in dev
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());

  // ── CORS — strict: only allow our frontend, with credentials ──
  app.enableCors({
    origin: frontendUrl,
    credentials: true, // required for cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie'],
  });

  // ── Global prefix + versioning ────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Global validation pipe ────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // strip unknown properties
      forbidNonWhitelisted: true,  // reject requests with extra fields
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger (OpenAPI docs) ────────────────────────────────────
  if (env !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('EasyPay API')
      .setDescription('Digital Banking/Wallet REST API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addCookieAuth('access_token')
      .addServer(`http://localhost:${port}`)
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  console.log(`\n🚀 EasyPay API running on: http://localhost:${port}`);
  if (env !== 'production') {
    console.log(`📚 Swagger docs:           http://localhost:${port}/api/docs`);
  }
}
bootstrap();
