/**
 * This file defines Different Error Types thrown in controllers and handled by the global Error Handler (src/middleware/errorHandler.ts)
 */

import { SUPPORT_EMAIL } from "../middleware/errorHandler.ts";

export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

//each Error Subclass defines the default error message, which can be overridden when the class is instantiated inside controllers. 

export class NotFoundError extends AppError {
    constructor(message = "We couldn't find what you were looking for. It may have been deleted, or the link may be incorrect.") {
        super(message, 404);
    }
}

export class BadRequestError extends AppError {
    constructor(message = "Something about this request wasn't quite right. Please double check your input and try again.") {
        super(message, 400);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "You don't have permission to do this. If you think this is a mistake, contact your group's leader.") {
        super(message, 403);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'You need to be logged in to do this.') {
        super(message, 401);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'This conflicts with existing data.') {
        super(message, 409);
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message = 'Too many attempts. Please wait before trying again.') {
        super(message, 429);
    }
}


export class ServiceUnavailableError extends AppError {
    constructor(message = `This feature is temporarily unavailable. Please try again in a moment, if the issue persists please contact support at ${SUPPORT_EMAIL}`) {
        super(message, 503);
    }
}