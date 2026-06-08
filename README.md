# Sports Intelligence API

A typed Hono and Zod API for governed sports intelligence workflows.

Endpoints:

- `GET /health`
- `POST /v1/query-plan`
- `POST /v1/feed-check`

```bash
npm install
npm run check
```

Every request is schema validated. Query plans attach mandatory reliability and
factuality controls, while unsupported questions route to human review. See
[docs/PRD.md](docs/PRD.md).
