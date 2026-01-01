export function isAdmin(req, res, next) {
    // Check if user exists and is authorized
    if (req.user && (req.user.isAdmin === true)) {
         return next();  
    }
    
    return res.status(403).json({
            success: false,
            message: 'Forbidden: Access is restricted to Admins only'
    });
}

export function isPhotographer(req, res, next) {
    if(req.user && (req.user.isPhotographer === true)) {
        return next();
    }
    return res.status(401).json({
            success: false,
            message: 'Unauthorized, you are not a photographer'
        })
}
