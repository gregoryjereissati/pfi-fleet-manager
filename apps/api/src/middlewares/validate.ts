import { Request, Response, NextFunction } from 'express';
import { z, type ZodType } from 'zod';

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: z.flattenError(result.error).fieldErrors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
