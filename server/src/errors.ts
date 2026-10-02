/**
 * An error that already knows the HTTP status and the machine-readable code the
 * client should see. Anything else that reaches the error middleware is a 500,
 * so only expected failures belong here.
 */
export class AppError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "AppError";
  }
}

/** The request did not satisfy the contract, e.g. `invalid_sort`. */
export class BadRequestError extends AppError {
  constructor(code: string) {
    super(code, 400);
    this.name = "BadRequestError";
  }
}

export class NotFoundError extends AppError {
  constructor(code = "not_found") {
    super(code, 404);
    this.name = "NotFoundError";
  }
}

/** A dependency we call out to (the LLM) answered with something unusable. */
export class BadGatewayError extends AppError {
  constructor(code: string) {
    super(code, 502);
    this.name = "BadGatewayError";
  }
}