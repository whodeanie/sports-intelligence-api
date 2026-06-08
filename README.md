# Sports Intelligence API

A small typed reference API for deterministic sports query routing and
feed-quality checks. It uses Hono for the HTTP boundary and Zod for request
validation.

Endpoints:

- `GET /health`
- `POST /v1/query-plan`
- `POST /v1/feed-check`

```bash
npm install
npm run check
```

Every request is schema validated. The query planner scores supported question
families by matched phrases, exposes the candidates it considered, and routes
tied or unsupported questions to human review. The feed check applies a small
explicit policy for completeness, freshness, duplicates, and anomaly rate.

## What this is not

This is not a sports data platform, model, or live analyst product. It has no
database, authentication, external feeds, tool execution, or generated sports
answers. The named downstream controls in a query plan are contract examples,
not services implemented in this repository.

## Example

```json
POST /v1/query-plan
{
  "query": "How does travel affect this lineup and its expected runs?"
}
```

The planner selects `lineup-impact-engine` because it matches two supported
signals, while `schedule-fatigue-index` matches one. A tie routes to
`human-review` instead of silently choosing the first route.

See [docs/PRD.md](docs/PRD.md) for the deliberately narrow product scope.
