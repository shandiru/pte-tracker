import { Request, Response, NextFunction } from 'express';

export function pinAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const configuredPin = process.env.APP_PIN?.trim();
  if (!configuredPin) {
    return next();
  }

  // Allow auth status and health checks without PIN
  if (req.path === '/api/auth/status') {
    return next();
  }

  const clientPin = (req.headers['x-app-pin'] as string) || (req.query.pin as string);
  if (!clientPin || clientPin.trim() !== configuredPin) {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing PIN' });
    return;
  }

  next();
}
