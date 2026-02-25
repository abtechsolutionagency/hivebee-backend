# Backend Code Standards (Express + MongoDB + JavaScript)

This document is the baseline for backend quality in this repository.
All backend work should follow these rules unless the team agrees to change them.

## 1. Scope

- Applies to everything under `backend/src`, `backend/tests`, and backend scripts.
- Applies to all feature work, refactors, bug fixes, and hotfixes.
- Prioritize readability, correctness, and operational safety over clever code.

## 2. Runtime and Tooling

- Target Node.js 24 LTS.
- Keep `.nvmrc` aligned with the Node version used in development and CI.
- Use `npm run dev` for local development.
- Use `npm run start` for production-like start behavior.
- Do not add `nodemon` or `dotenv`.

## 3. Project Structure and Layering

- Enforce this flow: `routes -> controllers -> services -> repositories`.
- Routes define HTTP paths and methods only.
- Controllers handle HTTP concerns only.
- Services contain business logic and orchestration.
- Repositories contain all MongoDB interactions.
- Controllers must not call MongoDB directly.
- Services must not access `req` or `res`.
- Shared config belongs in `src/config`.
- Shared cross-cutting middleware belongs in `src/middlewares`.

## 4. Naming Conventions

- Use suffixes consistently:
- `*.routes.js`
- `*.controller.js`
- `*.service.js`
- `*.repo.js`
- `*.schema.js`
- Keep function names descriptive and action-based.
- Use clear variable names; avoid single-letter names except loop indices.

## 5. API Design Standards

- Prefix all API endpoints with `/api/v1`.
- Use resource-oriented REST naming.
- Return JSON responses only.
- Use this success shape:

```json
{
  "success": true,
  "data": {}
}
```

- Use this error shape:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": null
  }
}
```

- Use status codes correctly:
- `200` and `201` for success
- `400` for validation failures
- `401` for unauthenticated requests
- `403` for unauthorized requests
- `404` for missing resources
- `409` for conflicts
- `429` for rate limits
- `500` for unexpected server errors

## 6. Validation and Error Handling

- Validate `params`, `query`, and `body` on all write endpoints.
- Keep validation schemas in `src/validators`.
- Use `AppError` for expected operational failures.
- Keep one global error handler as the last middleware.
- Do not leak stack traces or internal details in API responses.
- Log enough context for debugging without exposing secrets.

## 7. Security Baseline

- Apply `helmet`.
- Apply `cors` with explicit allowlists by environment.
- Apply rate limiting globally and stricter limits on auth-sensitive routes.
- Enforce request payload size limits.
- Never log secrets, tokens, passwords, or raw authorization headers.
- Keep auth approach consistent across the codebase.

## 8. MongoDB Data Access Standards

- Database access lives in `src/repositories` only.
- Keep connection setup and lifecycle in `src/db/client.js`.
- Use indexes intentionally for frequently filtered or sorted fields.
- Use transactions for multi-step writes that must be atomic.
- Keep seed and migration scripts deterministic and repeatable.

## 9. Logging and Observability

- Use structured logs.
- Attach a request ID to each incoming request.
- Include request ID in logs and response headers.
- Maintain liveness endpoint: `GET /api/v1/health`.
- Maintain readiness endpoint: `GET /api/v1/ready`.

## 10. Config and Environment Management

- Access environment values through `src/config`, not ad hoc `process.env` reads.
- Validate required environment variables at startup.
- Keep `.env.example` complete and up to date.
- Never commit real secrets.

## 11. Testing Standards

- Place unit tests in `tests/unit`.
- Place integration tests in `tests/integration`.
- Place end-to-end tests in `tests/e2e`.
- Add or update tests for every behavior change and bug fix.
- Before merge, lint and relevant tests must pass.

## 12. Pull Request Standards

- Keep pull requests focused and reasonably sized.
- Include clear summary of what changed and why.
- Document any API contract changes.
- Do not merge with known failing checks without explicit team approval.

## 13. Definition of Done

- Code follows layering and naming standards.
- Validation, error handling, and security baseline are applied.
- Logging and request tracing are in place.
- Tests are added or updated and passing.
- Docs and `.env.example` are updated when behavior or config changes.
