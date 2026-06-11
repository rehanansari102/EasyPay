import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Attaches a unique correlation ID (`X-Request-Id`) to every request.
 * Respects an existing `X-Request-Id` header if provided by the caller (e.g. gateway).
 * The same ID is echoed back in the response headers for client-side correlation.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId =
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID();

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
