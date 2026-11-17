import { Response } from "express";

// Field checks shared by the routes. Each parser returns the value to store
// or throws FieldError, which sendFieldError turns into 400 { error, field }.

// Thrown by the field parsers; sent to the app as 400 { error, field }.
export class FieldError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

// Sends a FieldError as 400 { error, field }. Returns false for any other error.
export function sendFieldError(res: Response, err: unknown): boolean {
  if (err instanceof FieldError) {
    res.status(400).json({ error: err.message, field: err.field });
    return true;
  }
  return false;
}

// Required text: trimmed, not empty, at most maxLength characters.
export function requiredText(
  field: string,
  value: unknown,
  label: string,
  maxLength: number,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FieldError(field, `Enter your ${label}.`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw new FieldError(field, `Keep it under ${maxLength} characters.`);
  }
  return text;
}

// Optional text: null or "" clears it.
export function optionalText(field: string, value: unknown, maxLength: number): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new FieldError(field, "This must be text.");
  const text = value.trim();
  if (text.length === 0) return null;
  if (text.length > maxLength) {
    throw new FieldError(field, `Keep it under ${maxLength} characters.`);
  }
  return text;
}

export function optionalInt(
  field: string,
  value: unknown,
  min: number,
  max: number,
  message: string,
) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new FieldError(field, message);
  }
  return value;
}

export function oneOf<T extends string>(field: string, value: unknown, options: readonly T[]): T {
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw new FieldError(field, "Choose one of the options.");
  }
  return value as T;
}

export function optionalOneOf<T extends string>(
  field: string,
  value: unknown,
  options: readonly T[],
) {
  return value === null ? null : oneOf(field, value, options);
}
