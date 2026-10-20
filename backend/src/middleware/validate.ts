import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';
import { HttpError } from './error';

export function validate(schema: ZodType, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      next(new HttpError(400, 'Validation failed', errors));
      return;
    }
    if (source === 'query') {
      res.locals.query = result.data;
    } else {
      req.body = result.data;
    }
    next();
  };
}
