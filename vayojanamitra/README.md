# VayoJanaMitra

A platform for elderly citizens in Kerala to find and access government schemes.

## Structure
- `backend/`: FastAPI server with MongoDB and ChromaDB integration.
- `frontend/`: React + Vite frontend with a premium, accessible design.
- `scraper/`: Automated tools to keep scheme data up to date.

## Getting Started

### Backend
1. `cd backend`
2. `pip install -r requirements.txt`
3. `uvicorn main:app --reload`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Design Principles
- **Accessibility**: Large fonts, high contrast, and simple navigation for seniors.
- **Speed**: Optimized DB queries and RAG-ready vector search.
- **Reliability**: Automated scraping and periodic updates.
