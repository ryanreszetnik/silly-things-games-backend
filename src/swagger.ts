import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';

export const setupSwagger = (app: INestApplication) => {
  const options = new DocumentBuilder()
    .setTitle('Silly Things Games')
    .setDescription('API Documentation for Silly Things Games Backend')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'jwt-access-token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'google-id-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  writeFileSync('./openapi-spec.json', JSON.stringify(document));
  SwaggerModule.setup('api', app, document);
};
