# Guidora Dashboard

The Guidora dashboard is a Next.js administration application for managing
organizations, projects, guided tours, contextual help, FAQs, SDK access, and
analytics.

Repository: [DHRezgui/Guidora-dashboard](https://github.com/DHRezgui/Guidora-dashboard)

## Requirements

- Node.js 20 or newer
- npm
- A running Guidora backend, unless you are working on isolated UI screens
- The local React SDK repository when using the `file:../sdks/react` dependency

## Install

From the dashboard repository:

```bash
npm install
npm run ensure-sdk-link
```

The dashboard consumes the SDK from `../sdks/react`. Build the SDK first when
working from the parent workspace:

```bash
cd ../sdks/react
npm install
npm run build
cd ../../dashboard
npm install
```

## Configuration

Create the ignored environment file used by your local setup. The important
variables are:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3020/api/v1
INTERNAL_API_URL=http://localhost:3020/api/v1
```

When using the root Docker Compose stack, the dashboard is configured with the
backend URL and is available at `http://localhost:3003`. In the development
Compose stack, it is available at `http://localhost:3021`.

## Development

```bash
npm run dev
```

Open http://localhost:3000 for a direct Next.js run. The custom development
script prepares the local SDK link and starts the application.

For a clean development build:

```bash
npm run dev:clean
```

## Production build

```bash
npm run build
npm run start
```

## Tests and checks

```bash
npm run lint
npm test
```

## Project structure

- `app/`: Next.js routes and pages.
- `components/`: reusable UI and feature components.
- `lib/`: API clients, state, and shared utilities.
- `scripts/`: local development and SDK integration scripts.
- `tests/`: Vitest and Testing Library tests.

## Related repositories

- [Guidora](https://github.com/DHRezgui/Guidora): full-stack workspace.
- [Guidora Backend](https://github.com/DHRezgui/Guidora-backend): API service.
- [Guidora SDK](https://github.com/DHRezgui/Guidora-sdk): React integration package.
