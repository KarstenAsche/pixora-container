# Pixora – Docker Containerization

Pixora is a full-stack, Instagram-like application built with Angular 21 and Django 6. It supports photo sharing, user profiles, follows, likes, and comments.

This repository packages the Angular frontend and Django REST API into separate Docker images and runs them together using Docker Compose. PostgreSQL stores application data, Gunicorn serves Django, and Nginx serves Angular and Django static files.

This project covers **local containerization and verification only**. Image publishing, new CI/CD workflows, and cloud deployment are outside its scope. The existing repository workflow is not modified.

## Table of contents

- [Project objectives](#project-objectives)
- [Quickstart](#quickstart)
- [Repository contents](#repository-contents)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Usage](#usage)
- [Local development without Docker](#local-development-without-docker)
- [API overview](#api-overview)
- [Persistence](#persistence)
- [Testing and verification](#testing-and-verification)
- [Technical decisions and challenges](#technical-decisions-and-challenges)
- [Troubleshooting](#troubleshooting)
- [Security and scope](#security-and-scope)

## Project objectives

- Build separate multi-stage images for the Angular frontend and Django backend.
- Run the stack through a single Docker Compose configuration.
- Use PostgreSQL for persistent application data and separate storage for uploaded media.
- Run database migrations and collect static files before starting the backend.
- Keep secrets outside images, and run application processes as non-root users.
- Document setup, daily usage, verification, and known limitations.

## Quickstart

**Requirements:** Docker Desktop (Linux containers) or Docker Engine with the Docker Compose plugin. Python, Node.js and pnpm are not required on the host for the Docker setup.

1. Clone the repository:

   ```bash
   git clone https://github.com/KarstenAsche/pixora-container.git
   cd pixora-container
   ```

2. Create the root environment file:

   ```bash
   cp .env.example .env
   ```

   Replace `SECRET_KEY` and `DB_PASSWORD` with strong, unique values. Do not commit `.env`. To generate a Django secret on a machine with Python installed:

   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(50))"
   ```

   Use a password for PostgreSQL that differs from the example placeholder.

3. Build and start the stack:

   ```bash
   docker compose up -d --build
   ```

4. Check service status and initialization:

   ```bash
   docker compose ps -a
   docker compose logs migrate
   ```

   `db` and `backend` should be healthy, `frontend` should be running, and the one-shot `migrate` service should have exited with code `0`.

5. Open **http://localhost:4200**, register an account, and create a post with an image.

The frontend is bound to `127.0.0.1` by default and is not directly accessible from other devices.

## Repository contents

```text
pixora-container/
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example       # Direct local Django development
│   ├── manage.py
│   └── pixora/
├── frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── nginx/
│   │   └── default.conf
│   ├── angular.json
│   └── package.json
├── compose.yml
├── .env.example           # Docker Compose configuration
├── .gitignore
└── README.md
```

## Architecture

```text
Browser (http://localhost:4200)
               |
               v
Angular frontend / Nginx :8080
       |          |           |
     /api/      /media/     /static/
       |          |           |
       +----------+           +--> Shared static volume (read-only)
               |
               v
       Django / Gunicorn :8000
               |                 \
               v                  v
        PostgreSQL :5432     Media volume
               ^
               |
      migrate (one-shot)
      migrate + collectstatic
```

Startup order: **PostgreSQL healthy → migrations and static collection completed → Gunicorn backend healthy → Nginx frontend**.

| Service | Purpose | Access |
| --- | --- | --- |
| `db` | PostgreSQL 17 database | Internal port `5432`; not published to the host |
| `migrate` | Applies Django migrations and runs `collectstatic` | One-shot task using the backend image |
| `backend` | Django REST API served by Gunicorn | Internal `backend:8000`; not published to the host |
| `frontend` | Serves Angular, proxies API/media, and serves Django static assets | `127.0.0.1:4200` to container port `8080` by default |

All services communicate over the Compose network `pixora_network`. The frontend proxies `/api/` and `/media/` to `backend:8000`, forwards the original Host header (including the host port), and serves `/static/` directly from the shared static volume.

## Configuration

Create the root `.env` from `.env.example`. Database credentials are supplied to both Django services and PostgreSQL by Compose.

| Variable | Purpose | Guidance |
| --- | --- | --- |
| `SECRET_KEY` | Django signing key | Replace placeholder with a unique secret |
| `DEBUG` | Django debug mode | Enable only for local development |
| `ALLOWED_HOSTS` | Accepted Django HTTP hosts | Include `localhost` and `127.0.0.1` for the current local setup and healthcheck |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins | Set as needed for local development; Nginx uses same-origin API requests |
| `DB_NAME` | PostgreSQL database name | Typically `pixora` |
| `DB_USER` | PostgreSQL username | Typically `pixora` |
| `DB_PASSWORD` | PostgreSQL password | **Required**; use a strong local secret |
| `DB_HOST` | Database host for Django | `db` inside the Docker network |
| `DB_PORT` | PostgreSQL port | `5432` |
| `MEDIA_ROOT` | Uploaded-media location | `/app/media` in the backend container |
| `MEDIA_URL` | Public media path | `/media/` |
| `MAX_IMAGE_SIZE_MB` | Django image-size limit | `5` in the tested setup |
| `FRONTEND_PORT` | Host port exposed by Nginx | Default `4200` |
| `IMAGE_VERSION` | Version tag for application images | Set if using version-variable tags in `compose.yml` |

**Configuration note:** Some runtime paths and database host/port may be explicitly defined in `compose.yml`; service-level `environment` entries take precedence over values from `env_file`. Consult the Compose file before changing those values. The actual `DB_PASSWORD` and `SECRET_KEY` must never be committed.

Changing `FRONTEND_PORT` also changes the browser URL. Check any configured CORS origins when accessing services outside Nginx's same-origin proxy.

The separate `backend/.env.example` is for running Django directly outside Docker.

## Usage

Run the following commands from the repository root.

### Build

```bash
docker compose build                 # Build application images
docker compose build backend         # Build only the backend image
docker compose build frontend        # Build only the frontend image
```

The migration service uses the same backend image as Gunicorn. If `compose.yml` specifies `IMAGE_VERSION`, both application tags can be changed centrally in `.env`; the value is **not incremented automatically** by Compose.

### Start, stop, and restart

```bash
docker compose up -d --build          # Build and start
docker compose stop                   # Stop without removing containers
docker compose start                  # Start stopped containers
docker compose restart                # Restart running services
docker compose down                   # Remove containers and network, preserve volumes
```

For a recreation test without deleting data:

```bash
docker compose up -d --force-recreate
```

**Avoid `docker compose down -v` when preserving data:** it can remove Compose-managed named volumes. A database or media volume created outside Compose may not be deleted by that command, but should not be assumed safe.

### Inspect services and logs

```bash
docker compose ps -a
docker compose logs db
docker compose logs migrate
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

Expected status: PostgreSQL `healthy`, `migrate` `Exited (0)`, Gunicorn backend `healthy`, and frontend running.

### Database migrations and static files

The `migrate` service waits for a healthy PostgreSQL database, executes `python manage.py migrate --noinput`, then `python manage.py collectstatic --noinput`. Backend startup depends on successful completion of this task.

Inspect applied migrations:

```bash
docker compose exec backend python manage.py showmigrations
```

Verify the selected database engine:

```bash
docker compose exec backend python manage.py shell -c "from django.db import connection; print(connection.vendor)"
```

Expected value: `postgresql`.

Django static assets are collected to `/app/staticfiles` in a shared volume and mounted read-only inside Nginx. To verify delivery:

```bash
curl -I http://localhost:4200/static/admin/css/base.css
```

Expected status: `200 OK`. The Gunicorn process does not serve these static files directly.

## Local development without Docker

Direct local development is still possible, but **also requires a running PostgreSQL instance**. Unlike the original README, this configuration no longer defaults to SQLite.

### Prerequisites

- Python 3.12 or newer
- Node.js compatible with Angular 21 (Node.js 24 was used in this project)
- pnpm
- PostgreSQL with a database and user configured for Pixora

### Backend

From the repository root:

```bash
cp backend/.env.example backend/.env
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Configure `SECRET_KEY`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` and `DB_PORT` in `backend/.env` before running migrations. For a PostgreSQL instance running directly on the host, use `DB_HOST=localhost` rather than Compose's service name `db`.

In Windows PowerShell, activate the environment with `.venv\Scripts\Activate.ps1` instead. The development server is at `http://localhost:8000`; Django admin is at `http://localhost:8000/admin/`.

### Frontend

In a second terminal:

```bash
cd frontend
pnpm install
pnpm start
```

Angular runs at `http://localhost:4200`.

### Seed the database (optional)

The original Pixora application documents a command for creating sample users and posts:

```bash
cd backend
python manage.py seed_db
```

This command, including its behavior with sample media under PostgreSQL and Docker, has not been verified during the containerization work.

## API overview

These endpoints are documented by the original Pixora project; they were not all individually retested during containerization.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register/` | Register a new user |
| POST | `/api/auth/login/` | Obtain JWT tokens |
| POST | `/api/auth/refresh/` | Refresh access token |
| GET | `/api/users/me/` | Current user profile |
| GET | `/api/users/{id}/` | User profile |
| POST | `/api/users/{id}/follow/` | Follow a user |
| POST | `/api/users/{id}/unfollow/` | Unfollow a user |
| GET | `/api/posts/` | Feed (followed users) |
| POST | `/api/posts/` | Create a post |
| DELETE | `/api/posts/{id}/` | Delete own post |
| POST | `/api/posts/{id}/like/` | Like a post |
| POST | `/api/posts/{id}/unlike/` | Unlike a post |
| POST | `/api/posts/{id}/comments/` | Add a comment |
| DELETE | `/api/posts/{id}/comments/{id}/` | Delete own comment |

## Persistence

Three named Docker volumes support the Compose setup:

| Volume | Mounted path | Stores |
| --- | --- | --- |
| `pixora_postgres` | `/var/lib/postgresql/data` in `db` | PostgreSQL data |
| `pixora_media` | `/app/media` in `backend` | Uploaded images |
| `pixora_static` | `/app/staticfiles` in `migrate`/`backend`, read-only under `/usr/share/nginx/html/static` in `frontend` | Collected Django static assets |

Compose may assign explicit volume names different from the service-level keys; use `docker compose config` to inspect the resolved names. Existing volumes persist when containers are recreated.

To check data persistence, create a user and post with an image, then execute:

```bash
docker compose up -d --force-recreate
```

Confirm the same account, post and image remain available. Do not use `down -v` for this test.

## Testing and verification

Tests already completed during development:

| Test | Result |
| --- | --- |
| Local Angular and Django development startup before containerization | Passed |
| Separate multi-stage frontend/backend image builds | Passed |
| Gunicorn 27.0.1 startup with two workers | Passed |
| Backend healthcheck under Gunicorn | Passed |
| PostgreSQL startup and healthcheck | Passed |
| Django migrations against a fresh PostgreSQL database | Passed |
| Django reports `connection.vendor` as `postgresql` | Passed |
| Registration, login, post creation and image upload using PostgreSQL | Passed |
| PostgreSQL and uploaded media persisted after container recreation | Passed |
| `collectstatic` completed successfully (157 static files) | Passed |
| Static volume write test with backend UID 999 on a new test volume | Passed |
| Nginx served `/static/admin/css/base.css` with HTTP 200 | Passed |

The earlier SQLite-based setup was also tested before the PostgreSQL migration, but is no longer the target architecture.

**Not yet verified:** an entirely fresh first startup of the final PostgreSQL/Gunicorn/static-volume stack with all required named volumes created from scratch. An independent new-machine checkout has also not been tested.

Reviewer smoke test:

1. Copy `.env.example` to `.env` and set the secrets.
2. Run `docker compose up -d --build`.
3. Check `docker compose ps -a` and `docker compose logs migrate`.
4. Open `http://localhost:4200`, register, log in and create a post with an image.
5. Recreate containers and verify the user, post and image remain.
6. Confirm `/static/admin/css/base.css` responds with HTTP 200.

## Technical decisions and challenges

### PostgreSQL and Gunicorn

PostgreSQL 17 replaces the initial SQLite setup. The database runs as a separate Compose service with persistent storage and a healthcheck. Django runs through Gunicorn instead of the development server. The Django `runserver` command is retained only in the optional local-development instructions.

### Separate initialization service

The one-shot `migrate` service reuses the backend image and runs database migrations followed by `collectstatic`. PostgreSQL must be healthy first. The backend waits for successful completion, while the frontend waits for a healthy backend. This separates database/schema initialization from Gunicorn startup; a backend entrypoint script would be another valid approach.

### Non-root static-file initialization

The backend image prepares `/app/staticfiles` with ownership for UID 999 before switching to the non-root `appuser`. This allows `collectstatic` to populate a new shared static volume without manual permission changes. Nginx mounts the volume read-only and serves requests under `/static/`.

### Reverse proxy and media URLs

Angular uses a relative API prefix `/api`. Nginx proxies `/api/` and `/media/` to Django. Forwarding `$http_host` rather than `$host` preserves the original browser port in absolute media URLs.

### Upload request size

Nginx's default request-body limit initially prevented a 3.25 MB upload. The configuration uses `client_max_body_size 10m` so the request reaches Django, which enforces its own 5 MB image limit.

### Dependency version pinning

Direct Python dependencies in `backend/requirements.txt` use exact versions (`==`) rather than minimum versions (`>=`). Transitive dependencies are not fully pinned, so this improves but does not guarantee reproducibility.

## Troubleshooting

| Symptom | Check / resolution |
| --- | --- |
| Docker cannot connect to its daemon | Start Docker Desktop / Docker Engine; check `docker info` |
| Port 4200 already in use | Stop the local Angular server or change `FRONTEND_PORT` |
| PostgreSQL fails to start | Check `docker compose logs db`, `DB_PASSWORD`, and database-volume state |
| Migrations fail | Check `docker compose logs migrate` and the PostgreSQL healthcheck |
| `collectstatic` reports permission denied | Verify ownership of `/app/staticfiles` in the backend image and the named-volume mount |
| `/static/` responds with HTTP 404 | Verify the shared static-volume mount in **frontend** and the Nginx `/static/` location |
| Frontend API errors | Check backend health and `docker compose logs backend frontend` |
| Upload fails with HTTP 413 | Check Nginx `client_max_body_size`; rebuild frontend after changing config |
| Media URLs do not load | Inspect Nginx Host forwarding and media requests in browser tools |
| Git Bash changes Linux container paths | Prefix manual Docker commands with `MSYS_NO_PATHCONV=1` when necessary |

## Security and scope

- Django runs under a non-root `appuser` (UID 999); Nginx uses an unprivileged runtime image.
- Backend and PostgreSQL ports are internal; the frontend is published only on the local loopback address.
- Nginx serves collected static assets read-only; uploaded files live in a separate persistent media volume.
- `.dockerignore` files exclude local secrets and unnecessary development artifacts from build contexts.
- Keep `.env` outside Git, use strong database and Django secrets, and avoid exposing local development settings publicly.
- Gunicorn replaces Django's development server in Docker, but the stack is **not claimed to be production-hardened**.
- No new CI/CD workflow, image publication, cloud deployment, or server provisioning is included.
- The final PR into `main` should remain unmerged until mentor approval.
