type SanitizedValue = string | null | SanitizedObject | SanitizedArray;
type SanitizedArray = SanitizedValue[];
interface SanitizedObject {
  [key: string]: SanitizedValue;
}

/**
 * Sanitizes the input object by converting primitive values to strings while preserving the original type structure
 */
export function sanitizeObject<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map(item => sanitizeObject(item)) as unknown as T;
  } else if (typeof input === 'object' && input !== null) {
    const sanitizedObj: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      if (value === null) {
        sanitizedObj[key] = null;
      } else if (Array.isArray(value)) {
        sanitizedObj[key] = sanitizeObject(value);
      } else if (typeof value === 'object') {
        sanitizedObj[key] = sanitizeObject(value);
      } else if (typeof value === 'boolean') {
        sanitizedObj[key] = value; // Preserve boolean values
      } else {
        sanitizedObj[key] = String(value);
      }
    }

    return sanitizedObj as T;
  } else if (input === null) {
    return null as T;
  } else {
    return String(input) as unknown as T;
  }
}
