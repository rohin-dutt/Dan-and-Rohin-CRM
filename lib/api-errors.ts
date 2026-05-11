export function apiError(message: string, status = 500) {
  return Response.json({ ok: false, error: message }, { status });
}
