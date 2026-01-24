# SmartMine Docker Deployment

## Quick Start

### Using Docker Compose (Recommended)

1. Build and start all services:
```bash
docker-compose up --build
```

2. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost:5000

3. Stop services:
```bash
docker-compose down
```

### Individual Containers

#### Frontend Only
```bash
docker build -t smartmine-frontend .
docker run -p 80:80 smartmine-frontend
```

#### Backend Only
```bash
cd backend
docker build -t smartmine-backend .
docker run -p 5000:5000 smartmine-backend
```

## Development Mode

For development with hot-reload:

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd backend
python app.py
```

## Environment Variables

### Backend
- `FLASK_ENV`: Set to `production` or `development`
- `PYTHONUNBUFFERED`: Set to `1` for real-time logs

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Docker Network                    │
│                                                      │
│  ┌──────────────┐         ┌──────────────────────┐  │
│  │   Frontend   │  /api/  │      Backend         │  │
│  │   (Nginx)    │ ──────> │      (Flask)         │  │
│  │   Port: 80   │         │    Port: 5000        │  │
│  └──────────────┘         └──────────────────────┘  │
│                                    │                 │
│                           ┌────────┴────────┐       │
│                           │    Volumes      │       │
│                           │ - uploads       │       │
│                           │ - processed     │       │
│                           │ - spmf          │       │
│                           └─────────────────┘       │
└─────────────────────────────────────────────────────┘
```

## Volumes

- `backend-uploads`: Stores uploaded dataset files
- `backend-processed`: Stores processed transaction data
- `backend-spmf`: Contains SPMF Java library files

## Health Checks

The backend includes a health check endpoint at `/api/health` that is monitored by Docker.

## Troubleshooting

### Container won't start
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Reset all data
```bash
docker-compose down -v
docker-compose up --build
```

### Rebuild specific service
```bash
docker-compose build backend
docker-compose up backend
```
