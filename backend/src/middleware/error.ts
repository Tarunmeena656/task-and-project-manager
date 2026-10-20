import { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: 'Not found' });
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, errors: err.details });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ message: 'Invalid JSON body' });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
}
