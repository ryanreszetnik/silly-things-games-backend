import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    console.log(`Incoming request: ${req.method} ${req.url}`);

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(
        `Request: ${req.method} ${req.url} completed in ${duration}ms`,
      );
    });

    next();
  }
}
