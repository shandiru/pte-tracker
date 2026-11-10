export function pinAuthMiddleware(req, res, next) {
  const configuredPin = process.env.APP_PIN?.trim();
  if (!configuredPin) {
    return next();
  }

  if (req.path === '/api/auth/status') {
    return next();
  }

  const clientPin = req.headers['x-app-pin'] || req.query.pin;
  if (!clientPin || clientPin.trim() !== configuredPin) {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing PIN' });
    return;
  }

  next();
}
