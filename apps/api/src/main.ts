import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SanitizePipe } from './common/sanitize.pipe';

function createWinstonLogger(env: string) {
  return WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: env === 'production'
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            )
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'HH:mm:ss' }),
              winston.format.printf(({ timestamp, level, message, context, ...rest }) => {
                const ctx = context ? ` [${context}]` : '';
                const extra = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : '';
                return `${timestamp} ${level}${ctx}: ${message}${extra}`;
              }),
            ),
      }),
    ],
  });
}

async function bootstrap() {
  const env = process.env.NODE_ENV ?? 'development';
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // required for Stripe webhook signature verification
    logger: createWinstonLogger(env),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  // ── Cookie parser (must be before other middleware) ──────────
  app.use(cookieParser());

  // ── Security headers (Helmet + CSP) ──────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: env === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI needs inline styles
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              upgradeInsecureRequests: [],
            },
          }
        : false, // relax CSP in dev (Swagger UI, etc.)
    }),
  );
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

  // ── Global pipes (sanitize first, then validate) ──────────────
  app.useGlobalPipes(
    new SanitizePipe(),
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
