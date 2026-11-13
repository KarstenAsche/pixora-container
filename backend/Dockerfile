# Stage 1: Build dependencies
FROM python:3.12-slim-bookworm AS builder

WORKDIR /build

# Build Python dependency wheels
COPY requirements.txt .

RUN python -m pip wheel \
    --no-cache-dir \
    --wheel-dir /wheels \
    -r requirements.txt


# Stage 2: Runtime
FROM python:3.12-slim-bookworm AS runtime

WORKDIR /app

# Install dependencies from the builder stage
COPY --from=builder /wheels /wheels

RUN python -m pip install \
    --no-cache-dir \
    --no-index \
    --find-links=/wheels \
    /wheels/* \
    && rm -rf /wheels

# Copy application files
COPY . .

# Create non-root user and persistent directories
RUN groupadd --system appgroup \
    && useradd --system --gid appgroup --home-dir /app appuser \
    && mkdir -p /app/data /app/media \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
