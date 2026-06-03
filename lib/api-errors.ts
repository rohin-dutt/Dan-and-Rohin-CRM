type ApiErrorCode =
  | "bad_request"
  | "forbidden"
  | "internal_error"
  | "invalid_json"
  | "unauthorized";

function defaultCodeForStatus(status: number): ApiErrorCode {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  return "internal_error";
}

export function apiError(
  message: string,
  status = 500,
  code: ApiErrorCode = defaultCodeForStatus(status)
) {
  return Response.json({ ok: false, error: { code, message } }, { status });
}
