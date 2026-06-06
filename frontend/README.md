# Frontend (Next.js) for Car Showroom

This is the new React/Next.js frontend scaffold (Phase 1). It is dark-mode-first, RTL-ready, and uses Tailwind CSS and Framer Motion.

Quick start (from project root):

```bash
# 1. change to frontend
cd frontend

# 2. install dependencies
npm install

# 3. run dev server
npm run dev
```

By default Next runs on port 3000. To connect to the Flask backend (running e.g. on port 5000), set up a proxy during development or use API route rewrites. Example: in `next.config.js` add rewrites to forward `/api` to `http://localhost:5000`.

Notes:
- I did not change any backend files.
- Existing Flask templated UI remains untouched in `templates/`.
- Next steps: integrate auth and fetch real data from backend API endpoints.
Running Flask and Next.js together (development)

1. Start Flask (from project root):

```bash
# create virtualenv, install requirements if needed
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
# run the flask app (example)
python run.py
```

By default Flask listens on port 5000. Then in a separate terminal, start Next:

```bash
cd frontend
npm install
npm run dev
```

The Next dev server includes a rewrite so you can reach backend routes via `/api/backend/<path>` which will be proxied to `http://localhost:5000/<path>`.

Notes:
- The frontend also reads the SQLite DB file directly for KPI counts via an internal API at `/api/dashboard`. This avoids changing the Flask backend and provides real-time counts for the dashboard.
- Keep both servers running to use the full system.
