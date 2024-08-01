import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    console.error(exception);
    let status = HttpStatus.INTERNAL_SERVER_ERROR; // default status
    let message = 'An unexpected error occurred';

    if (exception instanceof BadRequestException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception['response']['description'];
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message || message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      message: message,
    });
  }
}
