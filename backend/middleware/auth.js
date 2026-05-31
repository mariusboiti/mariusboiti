const jwt = require("jsonwebtoken");

function getTokenFromRequest(req) {
  const bearer = req.headers.authorization;
  if (bearer && bearer.startsWith("Bearer ")) {
    return bearer.slice(7);
  }

  if (req.cookies && req.cookies.admin_token) {
    return req.cookies.admin_token;
  }

  return null;
}

function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "change-this-secret");
    req.admin = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = {
  requireAuth,
  getTokenFromRequest
};
