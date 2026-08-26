const ApiError = require('../utils/ApiError');

// Wraps a zod schema into Express middleware. Keeps validators
// declarative and controllers free of manual field-checking.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;
