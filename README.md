# ReCircle Hub ♻️

**A campus-focused reuse platform that connects students who have items to share with students who need them.**

ReCircle Hub is a student marketplace where users can list items for sale, rent, or free borrowing. Students can discover available items through search and filters, request listings, post wanted items, receive notifications, and find potential matches through AI-powered semantic matching.

**Live Application:** [ReCircle Hub](https://recircle-hub-xi.vercel.app)  
**Backend API:** [ReCircle Hub API](https://recircle-hub.onrender.com)  
**API Health Check:** [Check API Status](https://recircle-hub.onrender.com/api/health)  
**GitHub Repository:** [Samadritadg-23/Recircle-Hub](https://github.com/Samadritadg-23/Recircle-Hub)

---

## 1. Problem Statement

Students frequently need items such as textbooks, calculators, lab coats, electronics, and other everyday essentials. At the same time, other students may already own these items but no longer need them.

Without a convenient campus-specific platform, useful items can remain unused while other students spend money purchasing the same things. Finding someone who has a particular item can also require time and effort.

ReCircle Hub addresses this problem by making it easier for students to discover, exchange, and reuse items within their campus community.

## 2. Target Users

ReCircle Hub is designed primarily for students in a campus community.

The platform supports students who want to:

- Sell items they no longer need.
- Rent out items for temporary use.
- Lend items to other students for free.
- Find affordable or free alternatives to purchasing new items.
- Post requests for items that are not currently listed.
- Discover potentially relevant items through intelligent matching.

## 3. Solution

ReCircle Hub provides a centralized platform for campus reuse. Students can create listings, browse available items, search and filter results, and send requests directly to listing owners.

Owners can review incoming requests and accept or reject them. When a request is accepted, the listing is reserved and the requester can access the owner's contact details when permitted.

If a student cannot find a required item, they can publish a Wanted Item post and choose whether to notify other campus users. The platform also uses semantic matching to suggest potentially relevant listings based on the meaning of a request, rather than relying only on exact keyword matches.

A dedicated **My Space** section helps students manage listings, track requests, view listing statuses, and monitor their ReCircle Impact Score.

## 4. Key Features

### Item Listings and Discovery

- Create listings with a title, description, category, image URL, condition, price, and pickup location.
- Choose between selling, renting, or lending an item for free.
- Browse available campus listings.
- Search listings dynamically and filter results by category and listing mode.
- View item details and availability status.

### Requests and Exchanges

- Send requests for available items with an optional message.
- Prevent users from requesting their own listings.
- Allow listing owners to accept or reject incoming requests.
- Reserve a listing when a request is accepted.
- Automatically reject other pending requests for the same listing when one request is accepted.
- Allow requesters to cancel their own pending requests.
- Mark listings as completed after an exchange.

### Wanted Items

- Post a request when a required item is unavailable in existing listings.
- Include a title, description, and category.
- Choose whether to notify other campus users.
- Allow other students to respond to wanted-item posts.
- Record whether a student consents to sharing their contact details.

### AI-Powered Semantic Matching

- Generate text embeddings for wanted-item requests and available listings.
- Compare semantic similarity using the cosine similarity method.
- Suggest potentially relevant listings to the student who posted a wanted item.
- Display matching information, including relevant keywords and category matches where applicable.
- Generate notifications when potentially matching listings are identified.

Matching results are suggestions; they do not guarantee that an item is suitable or available for an actual exchange.

### Notifications and Privacy

- Receive notifications for relevant wanted-item posts and potential listing matches.
- View unread notification counts.
- Mark individual notifications or all notifications as read.
- Choose to keep a name and phone number hidden from requesters until a listing request is accepted.
- Share contact details in response to a Wanted Item post only with explicit consent.

### My Space and ReCircle Impact

- View personal listings, incoming requests, and outgoing requests.
- Track listings that are available, reserved, or completed.
- View a ReCircle Impact Score based on listing activity.
- Earn one reuse point for each non-demo listing and four additional points for each listing marked complete.

The completion status is user-reported and is not independently verified by the application.

### Authentication and Reliability

- Register and sign in using an account.
- Use JSON Web Tokens (JWT) for authenticated requests.
- Hash passwords before storing them.
- Protect actions that require authentication.
- Validate important inputs and handle invalid requests.
- Provide appropriate loading, empty, success, and error states.

## 5. Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React | User interface and interactive application workflows |
| Frontend tooling | Vite | Development server and production builds |
| Styling | CSS | Layout, components, and visual design |
| Backend | Node.js and Express | REST API and application logic |
| Database | MongoDB Atlas | Persistent storage of users, listings, requests, wanted items, and notifications |
| Database ODM | Mongoose | Data models, validation, and database queries |
| Authentication | JSON Web Tokens (JWT) | Authenticated API access |
| Password security | bcryptjs | Password hashing and verification |
| Semantic matching | Hugging Face Transformers | Text embedding generation using `Xenova/all-MiniLM-L6-v2` |
| Matching algorithm | Cosine similarity | Comparing wanted-item requests with available listings |
| Frontend deployment | Vercel | Hosting the React application |
| Backend deployment | Render | Hosting the Express API |

## 6. Architecture

ReCircle Hub follows a client-server architecture.

```text
                    Student
                       |
                       v
             React + Vite Frontend
                   (Vercel)
                       |
                 HTTP / REST API
                       |
                       v
             Express Backend API
                  (Render)
                       |
          +------------+------------+
          |            |            |
          v            v            v
      JWT Auth     API Routes   Semantic Matcher
          |            |            |
          |     +------+------+     |
          |     |      |      |     |
          |  Listings Requests Wanted Items
          |            |            |
          |            +------+-----+
          |                   |
          v                   v
            MongoDB Atlas Database
             Mongoose Models
```

### Frontend

The React frontend provides the browsing interface, listing forms, authentication screens, request management, Wanted Items, notifications, and My Space. It communicates with the backend through HTTP requests.

### Backend

The Express server exposes REST API endpoints and contains the application logic for authentication, listing creation and management, exchange requests, wanted-item workflows, and notifications.

Protected endpoints use JWT authentication middleware to identify the signed-in user and enforce ownership-based permissions.

### Database

MongoDB Atlas stores application data using Mongoose models. These models represent users, listings, requests, wanted items, wanted-item responses, and notifications.

### Semantic Matching Service

The semantic matching service uses the `Xenova/all-MiniLM-L6-v2` model through `@huggingface/transformers` to generate text embeddings. Cosine similarity is then used to identify potentially relevant matches between wanted-item requests and available listings.

## 7. Local Setup

### Prerequisites

Make sure the following are installed or available:

- Node.js and npm
- Git
- A MongoDB Atlas database and connection string

### Step 1: Clone the Repository

```bash
git clone https://github.com/Samadritadg-23/Recircle-Hub.git
cd Recircle-Hub
```

### Step 2: Set Up the Backend

Install the backend dependencies:

```bash
cd server
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Open `server/.env` and add your MongoDB connection string and a strong JWT secret.

Start the backend development server:

```bash
npm run dev
```

The backend normally runs on `http://localhost:5000`.

### Step 3: Set Up the Frontend

Open a second terminal in the project root and run:

```bash
cd client
npm install
npm run dev
```

Open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

During local development, Vite proxies `/api` requests to the backend at `http://localhost:5000`.

### Step 4: Verify the Application

Confirm that the frontend loads, the backend is running, and the application can connect to MongoDB Atlas.

You can also check the backend health endpoint:

```text
http://localhost:5000/api/health
```

## 8. Environment Variables

Environment variables hold configuration values that should not be hardcoded into the application.

Copy `server/.env.example` to `server/.env` for local development.

### Backend Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port used by the Express server | `5000` |
| `MONGO_URI` | MongoDB Atlas connection string | `your_mongodb_connection_string` |
| `JWT_SECRET` | Secret used to sign and verify JWTs | `your_strong_random_secret` |

Example `server/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
```

Replace the example values with your actual configuration. Never commit real secrets or the `.env` file to GitHub.

### Frontend Variable

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

For the deployed frontend, set:

```env
VITE_API_URL=https://recircle-hub.onrender.com/api
```

For local development, the Vite proxy can be used instead.

## 9. Deployment

ReCircle Hub is deployed using Vercel, Render, and MongoDB Atlas.

### Frontend — Vercel

**Live URL:** https://recircle-hub-xi.vercel.app

The frontend is deployed from the `client/` directory.

Typical Vercel configuration:

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://recircle-hub.onrender.com/api`

### Backend — Render

**API URL:** https://recircle-hub.onrender.com  
**Health Check:** https://recircle-hub.onrender.com/api/health

The backend is deployed from the `server/` directory.

Typical Render configuration:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`

Configure `MONGO_URI` and `JWT_SECRET` in the Render environment settings. The hosting platform supplies the `PORT` value when required.

### Database — MongoDB Atlas

MongoDB Atlas provides persistent storage for application data. The backend connects using `MONGO_URI`.

For deployment to work correctly, the database connection, environment variables, and CORS configuration must be set appropriately.

### Useful Commands

Build the frontend for production:

```bash
cd client
npm run build
```

Run the backend in production mode:

```bash
cd server
npm start
```

Run the frontend linter:

```bash
cd client
npm run lint
```

## 10. API Overview

The backend exposes REST endpoints for the application's main workflows.

| Area | Endpoint | Purpose |
|---|---|---|
| Health | `GET /api/health` | Check backend status |
| Authentication | `POST /api/auth/register` | Register an account |
| Authentication | `POST /api/auth/login` | Sign in |
| Authentication | `GET /api/auth/me` | Get the authenticated user |
| Listings | `GET /api/listings` | Browse and search listings |
| Listings | `GET /api/listings/meta` | Get listing categories, conditions, and modes |
| Listings | `GET /api/listings/:id` | View a listing |
| Listings | `POST /api/listings` | Create a listing |
| Listings | `GET /api/listings/mine` | View the signed-in user's listings |
| Listings | `PATCH /api/listings/:id/complete` | Mark a listing complete |
| Listings | `DELETE /api/listings/:id` | Delete an owned listing |
| Requests | `POST /api/requests` | Request a listing |
| Requests | `GET /api/requests/incoming` | View incoming requests |
| Requests | `GET /api/requests/outgoing` | View outgoing requests |
| Requests | `PATCH /api/requests/:id/accept` | Accept a request |
| Requests | `PATCH /api/requests/:id/reject` | Reject a request |
| Requests | `PATCH /api/requests/:id/cancel` | Cancel a pending request |
| Wanted Items | `POST /api/wanted-items` | Create a wanted-item post |
| Wanted Items | `GET /api/wanted-items` | Browse open wanted-item posts |
| Wanted Items | `GET /api/wanted-items/mine` | View personal wanted-item posts |
| Wanted Items | `GET /api/wanted-items/:id/matches` | Find potential semantic matches |
| Wanted Items | `POST /api/wanted-items/:id/respond` | Respond to a wanted-item post |
| Notifications | `GET /api/notifications` | View notifications |
| Notifications | `GET /api/notifications/unread-count` | Get the unread count |
| Notifications | `PATCH /api/notifications/:id/read` | Mark a notification as read |
| Notifications | `PATCH /api/notifications/read-all` | Mark all notifications as read |

Protected endpoints require an authorization header in the following format:

```http
Authorization: Bearer <token>
```

## 11. Demo Account

The application includes a seeded demo account for exploring the platform.

- **Email:** `demo@recirclehub.campus`
- **Password:** `demo1234`

Sample listings and the demo account are created when the relevant listing collection is empty. Existing database data is not overwritten by the seeding process.

You can also register a separate account to test listing requests, wanted-item posts, notifications, and owner-requester workflows.

## 12. Limitations and Future Improvements

- Semantic matching produces suggestions and may not always identify the most suitable item.
- Matching depends on the text provided in listings and wanted-item descriptions.
- The application does not independently verify whether a physical exchange has taken place.
- The ReCircle Impact Score reflects recorded listing activity rather than independently measured environmental impact.
- The current platform focuses on campus reuse and does not include payment processing or real-time chat.

## 13. Conclusion

ReCircle Hub demonstrates how a campus-focused software platform can bring together listing management, search and filtering, authenticated requests, notifications, and AI-powered semantic matching.

By helping students discover and exchange items within their community, the platform aims to make reuse more accessible and keep useful items circulating for longer.

**ReCircle Hub — Find what you need. Reuse what you can.**
