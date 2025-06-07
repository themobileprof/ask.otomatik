# Ask Otomatik

A monorepo containing both the frontend and backend services for Ask Otomatik.

## Project Structure

```
.
├── frontend/          # React frontend application
├── backend/           # Node.js backend application
├── docker/           # Docker configuration files
└── .github/          # GitHub Actions workflows
```

## Prerequisites

- Node.js >= 20.x
- npm >= 9.x
- Docker and Docker Compose

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/themobileprof/ask.otomatik.git
   cd ask.otomatik
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

   Configure the following environment variables:
   - `VITE_GOOGLE_CLIENT_ID` - Used by both frontend and backend
   - `VITE_FLUTTERWAVE_PUBLIC_KEY` - Used by both frontend and backend
   - `VITE_API_URL` - Backend API URL (default: http://localhost:4000)
   - `JWT_SECRET` - Backend JWT secret
   - `GOOGLE_CLIENT_SECRET` - Backend Google OAuth secret

4. Start development servers:
   ```bash
   npm run dev
   ```

   This will start both frontend and backend in development mode.
   - Frontend: http://localhost:8080
   - Backend: http://localhost:4000

## Development

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only frontend
- `npm run dev:backend` - Start only backend
- `npm run test` - Run all tests
- `npm run lint` - Run linting
- `npm run build` - Build both applications

## Docker

To run the application using Docker:

```bash
docker compose up --build
```

## Testing

```bash
# Run all tests
npm test

# Run frontend tests
npm run test:frontend

# Run backend tests
npm run test:backend
```

## Deployment

The application is automatically deployed when a new release is created on GitHub. The deployment process:

1. Runs all tests
2. Builds Docker images
3. Pushes images to Docker Hub
4. Deploys to production server

Required deployment environment variables:
- `DOCKERHUB_USERNAME` - Docker Hub username
- `DOCKERHUB_TOKEN` - Docker Hub access token
- `SERVER_HOST` - Deployment server hostname
- `SERVER_USER` - Deployment server username
- `DEPLOY_PATH` - Deployment directory path
- `SSH_PRIVATE_KEY` - SSH key for server access

## Contributing

1. Create a new branch from `main`
2. Make your changes
3. Submit a pull request

## License

[MIT](LICENSE) 