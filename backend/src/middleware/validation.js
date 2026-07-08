
//validates a request body based on the given zod schema, which can be found in the src/models directory
export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        //returning error messages in the form: <fieldName>: <reason for error>
        return res.status(400).json({ error: result.error.issues.map(e => `${e.path}: ${e.message}`)});
    }

    req.body = result.data;
    next();
};

//validates query parameters based on the zod schema defined in src/models/
export const validateQuery = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
        return res.status(400).json({ 
            error: result.error.issues.map(e => `${e.path[0]}: ${e.message}`)
        });
    }
    
    //update the query params with the validated data
    Object.assign(req.query, result.data);
    next();
};