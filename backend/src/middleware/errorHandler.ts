import { Request, Response, NextFunction } from "express";

const SUPPORT_EMAIL = 'placeholder@expensetracker.com';

//global error handler to provide logging in the backend
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {

    console.error("========== ERROR ==========");
    console.error(`Time: ${new Date().toISOString()}`);
    console.error(`Route: ${req.method} ${req.originalUrl}`);
    console.error("Params:", req.params);
    console.error("Query:", req.query);
    console.error("Body:", req.body);
    console.error("Error:", err);
    console.error(err.stack);
    console.error("===========================");

    const statusCode = (err as any).statusCode || 500;

    //if server related error, dont expose stack trace in user message
    const message = statusCode >= 500 ? 
        `An unexpected server error occurred. Please try again later or contact ${SUPPORT_EMAIL} if the problem persists.`
        : err.message;

    res.status(statusCode).json({
        error: message
    });
};