import { ZodSafeParseResult } from "zod";
import { $ZodError } from "zod/v4/core";

export const getErrorMessage = (
  parsed: ZodSafeParseResult<unknown>
): string => {
  if (parsed.error) {
    return parsed.error.issues[0].message;
  }
  throw new Error();
};

export const getErrorMessageFromZodError = (callback: () => void) => {
  try {
    callback();
  } catch (e) {
    if (e instanceof $ZodError) {
      return e.issues[0].message;
    }
    throw e;
  }
};
