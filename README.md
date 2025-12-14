# Ad Effectiveness Analyzer

A full-stack application for analyzing advertisement effectiveness using computer vision and emotional response analysis.

![Tech Stack](https://img.shields.io/badge/React-Vite-purple) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![Python](https://img.shields.io/badge/Python-3.11-blue) ![Docker](https://img.shields.io/badge/Docker-Compose-blue)

## Features

- **Visual Analysis**: Analyze ads using YOLOv5 object detection and OpenCV for colors, composition, and motion
- **Emotion Analysis**: Track viewer emotional responses using Hume AI's Expression Measurement API
- **Training Data Generation**: Collect and export labeled data in JSONL format for AI fine-tuning
- **Real-time Progress**: WebSocket-based live progress updates during analysis

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Hume AI API Key](https://platform.hume.ai) (for emotion analysis)

### Run with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/ultimaisolutions/evoke-unified.git
cd evoke-unified

# Start all services
docker-compose up --build
```

That's it! Open http://localhost:5173 in your browser.

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
HUME_API_KEY=your_hume_api_key_here
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│   Workers   │
│  React/Vite │     │   Express   │     │   Python    │
│   :5173     │     │    :3001    │     │   RQ Jobs   │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                    ┌──────┴──────┐     ┌──────┴──────┐
                    │  PostgreSQL │     │    Redis    │
                    │    :5432    │     │    :6379    │
                    └─────────────┘     └─────────────┘
```

## Usage

### 1. Upload Tab
Upload an image or video ad to analyze:
- Object detection (people, products, text, logos)
- Color palette extraction
- Composition analysis
- Motion detection (for videos)
- Improvement suggestions

### 2. Train Tab
Collect emotional response data:
1. Select an analyzed ad
2. Upload a reaction video (viewer watching the ad)
3. View emotion timeline (joy, interest, surprise, engagement)
4. Rate the response on 6 dimensions
5. Export training data as JSONL

### 3. Settings Tab
- Configure Hume AI API key
- Adjust analysis parameters
- View system health status

## Development

### Local Development (without Docker for app services)

```bash
# Start databases only
docker-compose up -d postgres redis

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../workers && pip install -r requirements.txt

# Start services (in separate terminals)
cd backend && npm run dev
cd frontend && npm run dev
cd workers && python -m src.worker
```

### Useful Commands

| Command | Description |
|---------|-------------|
| `docker-compose up --build` | Start everything |
| `docker-compose down` | Stop all services |
| `docker-compose logs -f` | View logs |
| `docker-compose down -v` | Reset (delete data) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Node.js, Express, Socket.io, Bull Queue |
| Workers | Python 3.11, RQ, YOLOv5, OpenCV, Hume AI SDK |
| Database | PostgreSQL 15, Redis 7 |
| Infrastructure | Docker Compose |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ads/upload` | Upload an ad |
| POST | `/api/ads/:id/analyze` | Start analysis |
| GET | `/api/ads/:id` | Get analysis results |
| POST | `/api/reactions/upload` | Upload reaction video |
| POST | `/api/reactions/:id/analyze` | Analyze emotions |
| POST | `/api/training/export` | Export JSONL |

## License

Proprietary - Ultim AI Services & Solutions

---

Built with Claude Code
