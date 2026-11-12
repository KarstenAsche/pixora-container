# Pixora

A full-stack Instagram-Like application built with Angular 21 and Django 6, featuring photo sharing, follows, likes, and comments.

## Table of Contents

- [Pixora](#pixora)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Quickstart](#quickstart)
  - [Usage](#usage)
    - [Seed the database](#seed-the-database)
    - [API Overview](#api-overview)

## Prerequisites

- [Python 3.12+](https://www.python.org/)
- [Node.js 20+](https://nodejs.org/) and [pnpm](https://pnpm.io/installation)

## Quickstart

1. **Clone the repository and enter the project directory**

2. **Create a `.env` file** from the example and set a strong `SECRET_KEY`:

   ```bash
   cp backend/.env.example backend/.env
   ```

   The default config uses **SQLite** (`USE_SQLITE=True`), so no database setup is needed locally.

3. **Backend** (in one terminal):

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```

4. **Frontend** (in a second terminal):

   ```bash
   cd frontend
   pnpm install
   pnpm start
   ```

## Usage

| Service     | URL                         |
|-------------|-----------------------------|
| Frontend    | http://localhost:4200       |
| Django Admin| http://localhost:8000/admin |

### Seed the database

To populate the database with sample users and posts:

```bash
cd backend
source .venv/bin/activate
python manage.py seed_db
```

### API Overview

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | `/api/auth/register/`             | Register a new user      |
| POST   | `/api/auth/login/`                | Obtain JWT tokens        |
| POST   | `/api/auth/refresh/`              | Refresh access token     |
| GET    | `/api/users/me/`                  | Current user profile     |
| GET    | `/api/users/{id}/`                | User profile             |
| POST   | `/api/users/{id}/follow/`         | Follow a user            |
| POST   | `/api/users/{id}/unfollow/`       | Unfollow a user          |
| GET    | `/api/posts/`                     | Feed (followed users)    |
| POST   | `/api/posts/`                     | Create a post            |
| DELETE | `/api/posts/{id}/`                | Delete own post          |
| POST   | `/api/posts/{id}/like/`           | Like a post              |
| POST   | `/api/posts/{id}/unlike/`         | Unlike a post            |
| POST   | `/api/posts/{id}/comments/`       | Add a comment            |
| DELETE | `/api/posts/{id}/comments/{id}/`  | Delete own comment       |
