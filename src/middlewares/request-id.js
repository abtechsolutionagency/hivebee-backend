import { randomUUID } from 'node:crypto';

export const requestId = (req, res, next) => {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();

  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
};
