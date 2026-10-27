# ReCircle Hub

A student marketplace for campus reuse. Students can list items to **sell**, **rent**, or **lend for free**, browse with search and category filters, and request available items. Listing owners can accept or reject requests.

Stack: React + Vite (`client/`) and Express + Mongoose (`server/`), with MongoDB Atlas.

## Features

- Browse listings with search, category, and mode filters
- Create a listing (title, description, category, image URL, condition, sell/rent/lend, price, pickup location)
- Request an available item (cannot request your own listing)
- Owner can accept or reject incoming requests
- Accepting a request reserves the item and rejects other pending requests for it
- Requesters can cancel their own pending requests
- Dashboard for my listings, incoming requests, and outgoing requests
- JWT auth with password hashing; protected actions use the token, not a client-supplied user id
- Loading, empty, validation, and error states

## Environment variables

Copy `server/.env.example` to `server/.env` and fill in values. **Never commit `.env`.**

| Name | Purpose |
| --- | --- |
| `PORT` | API port (default `5000`) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret used to sign login tokens |

Optional frontend variable (only needed if the API is not proxied through Vite):

| Name | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL, for example `http://localhost:5000/api` |

## Run locally

Install once:

```bash
cd server && npm install
cd ../client && npm install
```

Start the API:

```bash
cd server
npm run dev
```

Start the web app in another terminal:

```bash
cd client
npm run dev
```

Then open the Vite URL (usually `http://localhost:5173`). The client proxies `/api` to `http://localhost:5000`.

### Demo account

If the listings collection is empty, the server seeds a few **labelled sample listings** and a demo user. Existing database data is not overwritten.

- Email: `demo@recirclehub.campus`
- Password: `demo1234`

Create a second account to test requesting someone else's items.

## Useful commands

```bash
cd server && npm start
cd client && npm run build
cd client && npm run lint
```

## API overview

- `GET /` and `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/listings`, `GET /api/listings/meta`, `GET /api/listings/:id`
- `POST /api/listings`, `GET /api/listings/mine`, `PATCH /api/listings/:id/complete`, `DELETE /api/listings/:id`
- `POST /api/requests`
- `GET /api/requests/outgoing`, `GET /api/requests/incoming`
- `PATCH /api/requests/:id/accept|reject|cancel`

Send `Authorization: Bearer <token>` for protected routes.

## Deploy (if you host this later)

1. Set `MONGO_URI`, `JWT_SECRET`, and `PORT` on the server host.
2. Point the frontend to the public API with `VITE_API_URL`.
3. Build the client with `npm run build` and serve `client/dist`.
4. Allow your frontend origin in server CORS if it is not localhost.

Payments, chat, and AI features are intentionally out of scope.
