import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './utils/exception-filters/all-exception-filters';
// import { ResponseInterceptor } from './utils/interceptors/response.interceptor';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());
  // app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: '*',
  });
  setupSwagger(app);
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
