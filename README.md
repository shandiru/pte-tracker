# PTE Tracker (MERN)

A dedicated single-user web application built on the MERN stack (MongoDB, Express, React, Node.js) for tracking daily PTE Academic preparation, study roadmaps, short notes, mock scores, and analytics.

Prepared for the PTE Academic exam window: **March 30 – April 5, 2027**.
Minimum target: **58 overall** | Stretch target: **70 overall**.
Timezone: **Asia/Colombo**.

---

## Features

- **Today (Home)**: Current Colombo date, days left to exam, current roadmap week checklist (auto-saves `doneAt` as today), daily log upsert (skill minutes vs daily goal progress bar, new words, sentences, habits, weak-point tags, short note), quick note taker, and active/longest streaks.
- **Roadmap**: 22 roadmap entries (Weeks 1–20 + Exam window + Buffer period) in a timeline with status badges (`current`, `done`, `missed`, `upcoming`). Expand to check topics, edit topic text, add/delete topics, and **Shift Roadmap** with date impact previews.
- **Daily Logs**: Interactive calendar month view with heatmap intensity based on minutes studied, plus date-filtered list view showing completed and missed study days.
- **Notes**: Study notes grouped by date with skill tagging, tag filtering, pinned sorting, and full-text search.
- **Mock Scores**: Mock test score logger (diagnostic, checkpoint, mock, exam), overall score trend line chart with 58 (minimum) and 70 (target) reference lines, 4-skill comparison chart, and low-score threshold alerts.
- **Analytics**: Weekly minutes bar chart, stacked skill minutes, cumulative words & sentences written, 7-day & 30-day daily averages, weakest skill identification, and top-10 weak points.
- **History**: Server-logged chronological activity audit feed.
- **Settings & Backup**: Configurable target scores, dates, and daily goals. Complete JSON export/import and Markdown summary export.
- **Optional PIN Protection**: Set `APP_PIN` in `.env` to protect access.

---

## Quick Start & Setup

### 1. MongoDB Atlas Free Tier Setup (Optional but Supported)
1. Sign up for a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free shared cluster (M0 sandbox).
3. Under **Database Access**, create a database user (e.g., `pte_user`) and password.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) or your IP address.
5. In **Clusters**, click **Connect** -> **Connect your application** -> Copy the connection string.
6. Create a `.env` file in the project root:
   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/pte_tracker?retryWrites=true&w=majority"
   PORT=3000
   ```
*(Note: If `MONGODB_URI` is omitted or MongoDB is unreachable, PTE Tracker seamlessly and automatically uses a local persistent file database in `./data/db.json` without crashing).*

### 2. Install Dependencies
```bash
npm install
```

### 3. Seed Initial Data
Seeds the default settings, checkpoint target references, and the complete 22-week roadmap:
```bash
npm run seed
```

### 4. Run Development Server
Runs the unified full-stack server (Express API + Vite frontend) on port 3000:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

---

## Folder Structure & Deployment

This project provides both a unified setup (for local dev and AI Studio) and separated standalone directories for flexible hosting:

```
├── /backend                 # Standalone Express + MongoDB API
│   ├── .env.example         # Backend environment template
│   ├── .env                 # Backend environment file
│   ├── package.json
│   ├── server.ts            # CORS-enabled Express server
│   └── README.md
│
├── /frontend                # Standalone React + Vite + Tailwind frontend
│   ├── .env.example         # Frontend environment template
│   ├── .env                 # Frontend environment file (VITE_API_URL)
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md
│
├── /api                     # Vercel Serverless Function entry point (/api/index.ts)
├── vercel.json              # Vercel single-click deployment configuration
├── server.ts                # Unified local & dev full-stack runner
└── package.json             # Root scripts
```

---

## Hosting on Vercel

### Option A: 1-Click Unified Vercel Deployment (Recommended)
Deploy both the frontend and serverless API in a single Vercel project:

1. Push this repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New Project** and select this repo.
3. Framework Preset: **Vite** (Vercel automatically detects `vercel.json`).
4. In **Environment Variables**, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `APP_PIN` (optional): If you want to protect your tracker with a PIN.
5. Click **Deploy**. Vercel will build the frontend into static assets and route all `/api/*` calls to the serverless function in `/api/index.ts`.

---

### Option B: Separate Frontend & Backend Deployment

#### 1. Deploy the Backend
- You can host the `/backend` folder on **Render**, **Railway**, **Fly.io**, or as a standalone Node server:
  - Root directory: `backend`
  - Build command: `npm install`
  - Start command: `npm start`
  - Environment variable: `MONGODB_URI=your_mongodb_atlas_uri`
- Copy your deployed backend URL (e.g. `https://my-pte-backend.onrender.com`).

#### 2. Deploy the Frontend on Vercel
- Import the repo into Vercel.
- In Project Settings:
  - **Root Directory**: `frontend`
  - **Framework Preset**: `Vite`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
- In **Environment Variables**:
  - `VITE_API_URL`: Set to your deployed backend URL (e.g. `https://my-pte-backend.onrender.com`).
- Click **Deploy**.

