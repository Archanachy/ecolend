// Zod validation helper. Every state-changing route runs its body through a
// schema; unknown fields are stripped/rejected — this is the mass-assignment
// defence. Use `.strict()` schemas so extra fields are an error.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    req[source] = result.data; // only the validated, whitelisted fields
    next();
  };
}

module.exports = { validate };
