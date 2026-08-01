import { Request, Response, NextFunction, RequestHandler } from "express";

//Wrapper for async functions so that if they throw an error, the global error handling middleware in errorHandler.ts is called
export const asyncHandler = (
    fn: (req: Request<any>, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};