# Pixora – Docker Containerization

Pixora is a full-stack image-sharing application with an Angular frontend and a Django REST API. This repository packages both applications into separate Docker images and runs them together with Docker Compose.

This project covers **local containerization and verification only**. Publishing images, CI/CD pipelines, and cloud deployment are outside its scope.

## Project objectives

- Build separate, multi-stage images for the frontend and backend.
- Run the application using a single Docker Compose configuration.
- Keep application settings and secrets outside container images.
- Preserve the SQLite database and uploaded media across container recreation.
- Start the backend only after database migrations finish successfully.
- Run application processes without root privileges where practical.
- Document repeatable build, startup, shutdown, and verification procedures.

## Quickstart

**Requirements:** Docker Desktop (with Linux containers) or Docker Engine with the Docker Compose plugin. You do not need to install Python, Node.js, or pnpm locally to run the containerized application.

1. Clone the repository and enter its directory:

   ```bash
   git clone https://github.com/KarstenAsche/pixora-container.git
   cd pixora-container
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

   Replace the example `SECRET_KEY` with a unique, randomly generated value. Do not commit `.env`. On a machine with Python installed, a suitable value can be generated with:

   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(50))"
   ```

3. Build and start Pixora:

   ```bash
   docker compose up -d --build
   ```

4. Verify that the migration task completed and both application services are running:

   ```bash
   docker compose ps -a
   docker compose logs migrate
   ```

5. Open **http://localhost:4200**. Register a test account, create a post, and upload an image to check the application end to end.

The default configuration binds the frontend to `127.0.0.1`, so it is accessible from the local machine rather than directly from other devices.

## Repository contents

```text
pixora-container/
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example           # Example for running Django without Docker
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
├── .env.example               # Docker Compose configuration example
├── .gitignore
└── README.md
```

## Architecture

```text
Browser (http://localhost:4200)
            |
            v
Frontend: Nginx (container port 8080)
   |                      |
   | /api/                | /media/
   +----------------------+
            |
            v
Backend: Django (container port 8000)
     |                  |
     v                  v
SQLite volume       Media volume

migrate (one-shot) -> backend (healthy) -> frontend
```

| Service | Purpose | Network access / port |
| --- | --- | --- |
| `frontend` | Serves the built Angular application and proxies API/media requests | Host `127.0.0.1:4200` → container `8080` (configurable host port) |
| `backend` | Runs the Django REST API | Internal `backend:8000`; no host port published |
| `migrate` | Applies Django migrations before backend startup | One-shot job; exits successfully with code `0` |

All three services use the Compose network `pixora_network`. The frontend reaches Django by its Compose service name (`backend`), not by `localhost`.

The Angular production build uses the relative API prefix `/api`. Nginx routes `/api/` and `/media/` to Django. Its proxy configuration forwards the original Host header, including the host port, so generated image URLs remain correct.

## Configuration

Create the root `.env` file from `.env.example` before starting the stack.

| Variable | Purpose | Local value / guidance |
| --- | --- | --- |
| `SECRET_KEY` | Django signing key | **Required:** replace the placeholder with a random secret |
| `DEBUG` | Django debug mode | `True` for local testing only |
| `ALLOWED_HOSTS` | Allowed HTTP hosts | Include `localhost` and `127.0.0.1`; add other hosts only if needed |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins | `http://localhost:4200` for local development |
| `USE_SQLITE` | Database selection | SQLite is used by the Compose setup |
| `SQLITE_PATH` | SQLite file location in the backend container | `/app/data/db.sqlite3` |
| `MEDIA_ROOT` | Uploaded-media directory in the backend container | `/app/media` |
| `MEDIA_URL` | Media URL prefix | `/media/` |
| `MAX_IMAGE_SIZE_MB` | Application-side image size limit | `5` |
| `FRONTEND_PORT` | Host port for the frontend | `4200` by default |

**Note:** `USE_SQLITE`, `SQLITE_PATH`, and `MEDIA_ROOT` are also explicitly set by the Compose services. Changing only their values in `.env` does not override those service-level settings.

If you change `FRONTEND_PORT`, update browser URLs accordingly. If frontend origins are used outside the same-origin Nginx proxy, review `CORS_ALLOWED_ORIGINS` too.

Neither the real `.env` file nor credentials belong in Git or in an image. The separate `backend/.env.example` is intended for running Django directly without Compose.

## Usage

Run these commands from the repository root.

### Build

Build both application images:

```bash
docker compose build
```

Or build individual images:

```bash
docker build -t pixora-backend:1.0.0 ./backend
docker build -t pixora-frontend:1.0.0 ./frontend
```

### Start, stop, and restart

```bash
docker compose up -d --build     # Build (if needed) and start
docker compose stop              # Stop without removing containers
docker compose start             # Start stopped containers
docker compose restart           # Restart running services
docker compose down              # Stop and remove containers and network
```

To rebuild a changed image and recreate its service:

```bash
docker compose up -d --build
```

**Do not use `docker compose down -v` if you want to preserve data.** The `-v` flag can remove named volumes and their contents.

### Inspect services and logs

```bash
docker compose ps -a
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
docker compose logs migrate
```

`migrate` should finish with `Exited (0)`, `backend` should become `healthy`, and `frontend` should remain running.

### Database migrations

The `migrate` service automatically runs `python manage.py migrate --noinput` before the backend starts. To inspect applied migrations manually:

```bash
docker compose exec backend python manage.py showmigrations
```

## Persistence

Pixora uses two named Docker volumes:

| Volume | Mounted path | Stores |
| --- | --- | --- |
| `pixora_db` | `/app/data` | SQLite database (`db.sqlite3`) |
| `pixora_media` | `/app/media` | Uploaded images |

The Compose file assigns these explicit volume names. If they do not already exist, Compose creates them. They persist independently of container recreation.

To verify persistence, create a user and upload an image, then run:

```bash
docker compose down
docker compose up -d --build
```

Check that the same post and image are still available. For an additional recreation test:

```bash
docker compose up -d --force-recreate
```

Do not remove the volumes when cleaning up unless you explicitly intend to delete application data.

## Testing and verification

The following checks were performed during the containerization work:

| Test | Result |
| --- | --- |
| Django and Angular started locally without Docker | Passed |
| Backend multi-stage image build | Passed |
| Backend Python runtime and non-root user | Passed (Python 3.12.16, UID 999) |
| Frontend production build and container image build | Passed |
| Backend migrations with SQLite volume | Passed |
| Compose migration task completed | Passed (`Exited (0)`) |
| Backend healthcheck and frontend startup | Passed |
| Registration, login, and image upload through Nginx | Passed |
| Uploaded image served correctly after proxy adjustment | Passed |
| Database and media survived Compose restart/recreation | Passed |
| Migrations against a separate empty SQLite volume | Passed |

A complete new-machine checkout and end-to-end startup with entirely fresh volumes has **not** been independently verified yet; the empty-database migration was tested separately.

Suggested smoke test for a reviewer:

1. Start the stack with `docker compose up -d --build`.
2. Check `docker compose ps -a` and `docker compose logs migrate`.
3. Open `http://localhost:4200` and register a user.
4. Upload an image smaller than 5 MB and verify it appears in the feed.
5. Recreate the containers and confirm the post and image remain.

## Technical decisions and challenges

### Configurable SQLite location

Originally Django stored SQLite at `BASE_DIR / 'db.sqlite3'`. The settings now support the optional `SQLITE_PATH` environment variable, while retaining the original location as a fallback for local runs. The container uses `/app/data/db.sqlite3`, backed by a persistent volume.

### Reverse proxy and media URLs

Angular's production configuration requests `/api` from the same origin. Nginx proxies these requests and `/media/` to Django on the internal Compose network. Forwarding `$http_host` rather than `$host` preserves the browser's port in absolute media URLs.

### Upload request size

Nginx's default request-body limit prevented a 3.25 MB upload. The frontend Nginx configuration sets `client_max_body_size 10m`, allowing the request to reach Django, where Pixora's 5 MB image limit remains in effect.

### Startup ordering

A separate one-shot `migrate` service initializes the SQLite schema. The backend waits for successful migration completion, and the frontend waits for the backend healthcheck.

### Dependency Version Pinning

The Python dependencies in `backend/requirements.txt` use explicit version numbers (`==`) instead of minimum version requirements (`>=`).

These versions were taken from the successfully tested backend container to improve build reproducibility and reduce the risk of unexpected dependency updates.

Transitive dependencies are not fully pinned, so builds may still vary over time

## Troubleshooting

| Symptom | Check / resolution |
| --- | --- |
| Docker cannot connect to its daemon | Start Docker Desktop / Docker Engine, then run `docker info` |
| Port 4200 is already in use | Stop any local Angular dev server or change `FRONTEND_PORT` in `.env` |
| Frontend returns API errors | Check `docker compose ps -a` and `docker compose logs backend frontend` |
| Migration fails | Check `docker compose logs migrate`, SQLite volume permissions, and `SQLITE_PATH` |
| Upload fails with HTTP 413 | Check Nginx `client_max_body_size` and rebuild the frontend image after changing `nginx/default.conf` |
| Images have the wrong URL or do not load | Verify the Nginx `Host` forwarding and inspect the media request in browser developer tools |
| Git Bash rewrites container paths on Windows | For manual `docker run` commands using Linux paths, prefix the command with `MSYS_NO_PATHCONV=1` |

## Security and scope

- The backend image runs with a non-root `appuser`; the frontend uses an unprivileged Nginx image.
- `.dockerignore` files exclude local dependencies, development environments, secrets, and generated artifacts from image build contexts.
- The backend has no host-published port; the frontend is bound to the local loopback interface.
- `DEBUG=True` and Django's `runserver` are used **only for local development/testing**, not for public production hosting.
- No GitHub Actions, image publishing, cloud deployment, or server provisioning are included in this project.
- Keep the feature branch separate from the default branch until the project is reviewed and approved.
