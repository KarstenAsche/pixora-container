---
toc_max_heading_level: 4
sidebar_position: 2
tags:
  - project
  - checklist
sidebar_label: Checklist
description: An editable, copyable checklist with all tasks for the Pixora containerization project.
---

# Pixora Containerization - Student Checklist

Please work through every item before submitting this project. If you added anything beyond these requirements, mention it briefly so your mentor can review it when needed.

## 1. Repository

### Existing files

- [x] A `.gitignore` file exists and excludes irrelevant files from the Git repository.
- [x] You use exactly one image definition: `Containerfile` or `Dockerfile`.
- [x] You use exactly one Compose definition: `compose.yaml` or `docker-compose.yaml`.
- [x] A `.dockerignore` file exists and excludes irrelevant files from the image build context.
- [x] An environment-file example named `example.env` exists and contains placeholders only.

### Containerfile / Dockerfile

- [x] The base images use explicit version tags and do not use `latest`.
- [x] The image installs only the dependencies required to run Pixora.
- [x] The corresponding build and run stages in the containerfile are clearly separated. This applies to frontend and backend.
- [x] The working directory, exposed ports, and startup commands are configured correctly.
- [x] The image does not contain Git data, local secrets, virtual environments, dependency caches, or unnecessary build artifacts.
- [x] The application runs as a non-root user where practical.
- [x] The image can be built locally without errors.

### Compose file

- [x] The Compose file defines the required Pixora services, including the frontend and backend.
- [x] Service names and internal service-to-service communication are configured correctly.
- [x] Required ports are mapped so the application can be reached from the host.
- [x] Required networks, volumes, and service dependencies are configured.
- [x] Persistent data is stored in a volume where it must survive container recreation.
- [x] Configuration is supplied through environment variables or an environment file.
- [x] No passwords, tokens, private keys, or other secrets are hard-coded.
- [x] Health checks or suitable startup dependencies are configured where needed.

## 2. Documentation

- [x] The README explains how to build the image locally.
- [x] The README explains how to start, stop, restart, and remove the Compose setup.
- [x] The README explains which environment variables are required.
- [x] The README explains how to verify that the frontend and backend are working.
- [x] The README documents exposed ports, volumes, and important service names.
- [x] The documentation is written clearly enough for another student to run Pixora without additional setup.
- [x] The documentation does not include real credentials or other sensitive information.

## 3. Hints

### General hints

- [x] Use one consistent naming scheme. Do not create both `Dockerfile` and `Containerfile`, or both Compose filenames.
- [x] Prefer explicit image and dependency versions so the setup is reproducible.
- [x] Check the logs of each service when the setup does not start correctly.
- [x] Remember that a service name is normally used for communication between Compose services, not `localhost`.

### Security hints

- [x] Do not copy `.env` files containing real secrets into an image.
- [x] Do not commit passwords, tokens, private keys, or cloud-server credentials.
- [x] Expose only the ports that are required for local use.

### Scope hint

- [x] Do not create GitHub Actions workflows, GHCR publishing, automated image builds, or Cloud Server deployment as part of this project.

## 4. Testing

Before you submit the project, make sure that:

- [x] The image builds successfully from the authored `Containerfile` or `Dockerfile`.
- [x] The complete setup starts successfully with Docker Compose.
- [x] All expected containers become ready or healthy.
- [x] The frontend is reachable through the configured host port.
- [x] The frontend can communicate with the backend.
- [x] A basic application smoke test succeeds.
- [x] Restarting or recreating containers preserves data that should be persistent.
- [x] The setup can be stopped and started again successfully.

## What you must deliver

- [x] A working `Containerfile` or `Dockerfile`.
- [x] A working `compose.yaml` or `docker-compose.yaml`.
- [x] A suitable `.dockerignore` file.
- [x] A safe environment-file example.
- [x] Documentation for build, startup, shutdown, verification, and troubleshooting.
- [x] Evidence that the setup was tested successfully.

## Helpful links

- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Compose file reference](https://docs.docker.com/reference/compose-file/)
- [Docker build best practices](https://docs.docker.com/build/building/best-practices/)
- [Docker Compose environment variables](https://docs.docker.com/compose/how-tos/environment-variables/)
