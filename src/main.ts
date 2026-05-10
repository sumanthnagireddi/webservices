import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe());
  // Enable CORS for all origins (use this for dev/personal apps)
  app.enableCors();
  
  // Or shorter version:
  // app.enableCors();

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Resources API')
    .setDescription('API documentation for Resources application')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('atlassian', 'Atlassian integration endpoints')
    .addTag('blogs', 'Blog management endpoints')
    .addTag('content', 'Content management endpoints')
    .addTag('notifications', 'Real-time backend notifications')
    .addTag('resource', 'Resource management endpoints')
    .addTag('technologies', 'Technologies endpoints')
    .addTag('topics', 'Topics endpoints')
    .addTag('user', 'User management endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Webservices API Docs',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
  // console.log(`Swagger documentation available at http://localhost:${port}/api`);
}
bootstrap();
