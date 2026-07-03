import { validationResult, check } from 'express-validator';

export const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

export const registerValidator = [
  check('username', 'Username is required and must be at least 3 characters')
    .trim()
    .isLength({ min: 3 }),
  check('email', 'Please include a valid email')
    .isEmail()
    .normalizeEmail(),
  check('password', 'Password must be 6 or more characters')
    .isLength({ min: 6 }),
  validateResult,
];

export const loginValidator = [
  check('email', 'Please include a valid email')
    .isEmail()
    .normalizeEmail(),
  check('password', 'Password is required')
    .notEmpty(),
  validateResult,
];
