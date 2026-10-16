/**
 * API envelope and error model, mirroring the Laravel API contract:
 * { success, message, data } with optional error_code / request_id.
 */

export interface ApiEnvelope<T> {
  success: boolean
  message?: string | null
  data?: T | null
  error_code?: string | null
  request_id?: string | null
}

export type ApiErrorCode =
  | 'CODE_INVALID'
  | 'CODE_REVOKED'
  | 'DEVICE_MISMATCH'
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'RATE_LIMITED'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | (string & {})

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | null
  readonly requestId: string | null
  /** Seconds until the client may retry (from Retry-After or body). */
  readonly retryAfterSeconds: number | null
  /** True when the failure body carried its own `message`, false when the
   *  client synthesized one from the status code (e.g. a non-JSON body). */
  readonly hasServerMessage: boolean

  constructor(options: {
    status: number
    code: ApiErrorCode | null
    message: string
    requestId?: string | null
    retryAfterSeconds?: number | null
    hasServerMessage?: boolean
  }) {
    super(options.message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.requestId = options.requestId ?? null
    this.retryAfterSeconds = options.retryAfterSeconds ?? null
    this.hasServerMessage = options.hasServerMessage ?? false
  }

  /** True when the failure was a network/DNS/timeout problem, not an HTTP error. */
  get isNetworkError(): boolean {
    return this.status === 0
  }
}
