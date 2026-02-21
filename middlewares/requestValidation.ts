'use strict';

import type { RequestHandler } from 'express';
import { z, type ZodError, type ZodTypeAny } from 'zod';
import { API_ERROR_CODES } from '../types/errors';

const usernameRegex = /^[a-zA-Z0-9\-_]+$/;
const emailRegex = /^[a-zA-Z0-9\-_.+]+@[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_]+$/;

const schemas = {
  signup: z.object({
    username: z.string().min(1).regex(usernameRegex),
    email: z.string().min(1).regex(emailRegex),
    password: z.string().min(1),
    recaptcha_response: z.string().min(1),
  }),
  signupSocial: z.object({
    username: z.string().min(1).regex(usernameRegex),
    email: z.string().min(1).regex(emailRegex),
  }),
  login: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  forgotPassword: z.object({
    email: z.string().min(1).regex(emailRegex),
  }),
  resetPassword: z
    .object({
      password: z.string().min(1),
      confirm: z.string().min(1),
    })
    .refine(function (value) {
      return value.password === value.confirm;
    }, 'password and confirm must match'),
  contact: z.object({
    name: z.string().min(1),
    email: z.string().min(1).regex(emailRegex),
    message: z.string().min(1),
    recaptcha_response: z.string().min(1),
  }),
  accountPassword: z
    .object({
      newPassword: z.string().min(1),
      confirm: z.string().min(1),
    })
    .refine(function (value) {
      return value.newPassword === value.confirm;
    }, 'newPassword and confirm must match'),
  adminUserCreate: z.object({
    username: z.string().min(1).regex(usernameRegex),
  }),
  adminUserUpdate: z.object({
    username: z.string().min(1).regex(usernameRegex),
    email: z.string().min(1).regex(emailRegex),
    isActive: z.string().optional(),
  }),
};

interface ValidationResponse {
  success: false;
  error: {
    code: typeof API_ERROR_CODES.VALIDATION_ERROR;
    message: string;
    details: Record<string, string[] | undefined>;
  };
}

function toValidationResponse(error: ZodError): ValidationResponse {
  return {
    success: false,
    error: {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      message: 'Invalid request payload',
      details: error.flatten().fieldErrors,
    },
  };
}

function validateBody(schema: ZodTypeAny): RequestHandler {
  return function (req, res, next) {
    const parsed = schema.safeParse(req.body ?? {});
    if (parsed.success) {
      req.body = parsed.data;
      next();
      return;
    }

    res.status(400).json(toValidationResponse(parsed.error));
  };
}

module.exports = {
  schemas: schemas,
  validateBody: validateBody,
};
