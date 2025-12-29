import { validationResult } from "express-validator";

export const validate = (validations) => {
  return async (req, res, next) => {
    console.log("Validator Hit for:", req.originalUrl);
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  };
};
