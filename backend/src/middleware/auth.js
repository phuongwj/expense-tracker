import jwt from 'jsonwebtoken';


//middleware for extracting jwt from request header and attaches user ID to request object
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    //token should be sent in the form: Bearer <token>
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized Request' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        //attaches userId to request object for the next middleware or route handler
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export default authenticateToken;