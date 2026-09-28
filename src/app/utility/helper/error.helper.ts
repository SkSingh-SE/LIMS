/**
 * Utility helper to extract the actual, user-friendly error message from any backend API response,
 * HTTP error response, validation problem details, or JavaScript Error object.
 */
export function extractErrorMessage(error: any, fallback: string = 'An unexpected error occurred. Please try again.'): string {
  if (!error) return fallback;

  // Direct string error
  if (typeof error === 'string') {
    return error.trim();
  }

  // If error has custom errorMessage (from auth.interceptor or custom wrapper)
  if (error.errorMessage && typeof error.errorMessage === 'string') {
    return error.errorMessage.trim();
  }

  const errObj = error.error ?? error;

  // errObj is a direct string (e.g., BadRequest("Customer has insufficient credit"))
  if (typeof errObj === 'string') {
    return errObj.trim();
  }

  if (typeof errObj === 'object' && errObj !== null) {
    // 1. ASP.NET ModelState validation dictionary: { errors: { FieldName: ["Msg 1", "Msg 2"] } }
    if (errObj.errors && typeof errObj.errors === 'object') {
      const fieldErrors: string[] = [];
      for (const [field, msgs] of Object.entries(errObj.errors)) {
        if (Array.isArray(msgs)) {
          fieldErrors.push(...msgs);
        } else if (typeof msgs === 'string') {
          fieldErrors.push(msgs);
        }
      }
      if (fieldErrors.length > 0) {
        return fieldErrors.join('; ');
      }
    }

    // 2. Exception / API response { Message: "..." } or { message: "..." }
    if (errObj.message && typeof errObj.message === 'string') {
      return errObj.message.trim();
    }
    if (errObj.Message && typeof errObj.Message === 'string') {
      return errObj.Message.trim();
    }

    // 3. ProblemDetails { detail: "..." } or { Detail: "..." }
    if (errObj.detail && typeof errObj.detail === 'string') {
      return errObj.detail.trim();
    }
    if (errObj.Detail && typeof errObj.Detail === 'string') {
      return errObj.Detail.trim();
    }

    // 4. ProblemDetails { title: "..." } (only if descriptive and not just standard generic HTTP title)
    if (errObj.title && typeof errObj.title === 'string' && errObj.title !== 'One or more validation errors occurred.') {
      return errObj.title.trim();
    }
  }

  // Fallback to error.message if not generic Angular HTTP failure
  if (error.message && typeof error.message === 'string' && !error.message.startsWith('Http failure response for')) {
    return error.message.trim();
  }

  return fallback;
}
