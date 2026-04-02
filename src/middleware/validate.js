/**
 * Validates that required fields are present and non-empty in req.body.
 * Usage: validate("field1", "field2")
 */
const validate = (...fields) => (req, res, next) => {
  const missing = fields.filter(
    (f) => req.body[f] === undefined || req.body[f] === null || req.body[f] === ""
  );
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
  }
  next();
};

module.exports = validate;
