# Civics Plus - Civic Complaint Platform for Tamil Nadu
### குடிமக்கள் பிளஸ் • தமிழ்நாடு நகராட்சி ஆளுகை மற்றும் புகார் தீர்வு தளம்

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20TypeScript-blue?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express%20%2B%20TypeScript-green?logo=node.js)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%206-black?logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20(Supabase)-336791?logo=postgresql)](https://supabase.com)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet.js-199900?logo=leaflet)](https://leafletjs.com)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 🏛️ Problem Statement

Across municipal corporations and panchayats in Tamil Nadu (Chennai, Coimbatore, Madurai, Tirunelveli, Tiruchirappalli, Salem, etc.), citizens encounter everyday infrastructure issues:
* **Severe Road Damage & Potholes**: Monsoon water erosion, unpaved trenches, vehicle damage, and two-wheeler accidents.
* **Non-Functional Street Lights**: Dark corridors causing safety risks, particularly for women and senior citizens.
* **Hazardous Electrical Lines**: Low-hanging high-tension cables, uninsulated junction boxes, and sparking transformers.
* **Overflowing Garbage & Dumping**: Bio-waste hazards, clogged drains, and municipal health concerns.
* **Storm Water & Drainage Failures**: Waterlogging during monsoon rains, silt blockages, and broken manhole slabs.
* **Public Space Encroachments**: Broken park amenities, collapsed bus stop shelters, and commercial walkway encroachments.

Traditional grievance redressal systems suffer from **lack of location precision**, **duplicate or fraudulent submissions**, **bureaucratic opacity**, and **absence of photographic verification**.

---

## 💡 Solution Overview: Civics Plus

**Civics Plus** is an end-to-end, enterprise-grade civic grievance platform designed specifically for Tamil Nadu with:
1. **Three Dedicated Portals**:
   * **Citizen Portal**: Pinpoint issues on interactive Leaflet maps, complete a 5-step quick reporting wizard, and track lifecycle stages on vertical timelines with "Civic Hero" gamification.
   * **Officer Portal**: Department-level triage (PWD, TANGEDCO, TWAD, Corporation Sanitation), work order dispatch, Before/After photo comparison slider, and efficiency rankings.
   * **Control Portal (Admin)**: Statewide command console, AI Anti-Fraud Engine with duplicate photo hashing, GPS anomaly checking, and automated 7-day user suspension triggers.
2. **Bilingual Parity (English & Tamil)**: Seamless, instant toggle between English and தமிழ் across all views.
3. **Automated Fraud Detection Engine**: Cryptographic photo duplicate checking, GPS distance mismatch (>50km), and phone clustering detection with automated bans (>80 points).

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Zustand, React Hook Form, Zod, Leaflet.js, Recharts, Framer Motion, React Hot Toast |
| **Backend** | Node.js, Express.js, TypeScript, Prisma ORM, JWT, bcryptjs, Multer, Cloudinary, Helmet, CORS, Express Rate Limit |
| **Database** | PostgreSQL (Supabase) + Built-in In-Memory Fallback Seed Store |
| **Storage** | Cloudinary (Photo Evidence Storage) |
| **Deployment** | Vercel / Netlify (Frontend), Railway / Render (Backend), Supabase (Database) |

---

## 🎯 Features by Portal

### 1. Citizen Portal (`/citizen/*`)
* **Interactive Live Map**: Real-time Leaflet map displaying colored status pins:
  * 🔴 **Red**: Submitted (`SUBMITTED`)
  * 🔵 **Blue**: Accepted by Control Desk (`ACCEPTED`)
  * 🟡 **Yellow**: Assigned to Field Engineer / In Progress (`ASSIGNED` / `IN_PROGRESS`)
  * 🟢 **Green**: Verified & Resolved (`RESOLVED`)
  * ⚪ **Grey**: Rejected (`REJECTED`)
* **5-Step Reporting Wizard (`/citizen/report`)**:
  * **Step 1 - Location**: One-click GPS auto-detect, draggable map pin picker, and Tamil Nadu district selector.
  * **Step 2 - Category**: 6 structured categories (Road Damage, Street Light, Electrical Wire, Garbage Waste, Storm Water Drain, Public Space) with urgency selection.
  * **Step 3 - Photo Evidence**: Upload min 1, max 5 pictures with thumbnail gallery and removal controls.
  * **Step 4 - Description**: 500-character description with quick-prompt chips.
  * **Step 5 - Review & Submit**: Final summary card, Complaint ID generation (`TN-TIR-2026-XXXXX`), and WhatsApp / SMS sharing.
* **My Complaints (`/citizen/complaints`)**: Status-filtered cards with photo thumbnails, dates, and quick navigation.
* **Complaint Detail (`/citizen/complaints/:id`)**: Vertical stage-by-stage timeline, interactive Before/After photo comparison slider, and assigned officer dossier.
* **Civic Hero Profile (`/citizen/profile`)**: Gamified badges (🥉 Bronze, 🥈 Silver, 🥇 Gold), profile editing, and filing history table.

### 2. Officer Portal (`/officer/*`)
* **Dashboard (`/officer/dashboard`)**: 4 quick stat cards (New Unassigned, Assigned, In Progress, Resolved Today) and 7-day Recharts volume trendline.
* **Triage Inbox (`/officer/inbox`)**: Split-table view with interactive drawer: inspect photos, mini-map, update status (`SUBMITTED → ACCEPTED → ASSIGNED → IN_PROGRESS → RESOLVED / REJECTED`), and append official inspection notes.
* **Workforce Assignment (`/officer/assign`)**: Filter field officers by department (PWD, TANGEDCO, TWAD, Municipality), view officer workload capacity, execute bulk task assignment, and toggle AI Smart Auto-Routing.
* **Resolution Verification (`/officer/verify`)**: Split-screen draggable Before/After slider to verify field repairs before issuing completion sign-offs.
* **Department Analytics (`/officer/analytics`)**: Department performance index, average resolution hours, officer leaderboard, and PDF/Excel export.

### 3. Control Portal (`/admin/*`)
* **Executive Command Console (`/admin/dashboard`)**: Real-time statewide KPIs (Total Users, Active Today, Total Complaints, Fake Detected, Fraud Rate %), and suspicious account alert streams.
* **User Management & Bans (`/admin/users`)**: Searchable user directory, detailed inspection dossier, warning dispatch, 7-day temporary suspensions, permanent bans, and manual fraud score adjustments.
* **AI Fraud Detection Suite (`/admin/fraud`)**: Auto-flagged complaints sorted by risk score, duplicate photo matching, GPS anomaly map, phone clustering detection, and one-click auto-ban triggers.
* **System Governance Settings (`/admin/settings`)**: Policy toggles (Auto-ban > 80 pts, mandatory photo evidence, GPS boundary checks), and bilingual SMS template editors.

---

## 🛡️ Fraud Detection Rule Engine

Whenever a civic complaint is submitted, the backend executes the anti-fraud evaluation matrix:

| Factor | Condition | Penalty Points |
| :--- | :--- | :--- |
| **Duplicate Photo** | Same Cloudinary hash / image used in earlier complaints | **+30 Points** |
| **GPS Mismatch** | Distance between successive reports is **> 50km** | **+25 Points** |
| **High Rejection History** | User has **5 or more** previously rejected complaints | **+20 Points** |
| **Account Anomaly** | Multiple accounts registered under the same phone number | **+40 Points** |
| **District Discrepancy** | Complaint filed outside user's registered home district | **+10 Points** |

> **Automated Action**: If a user's cumulative fraud score exceeds **80 points**, an automated **7-day account suspension** (`isBanned = true`) is triggered immediately, preventing further spam or malicious submissions.

---

## 🚀 Quick Demo Accounts

Civics Plus comes pre-seeded with **3 Admins, 10 Officers, 50 Citizens, 200 Complaints, 400 Photos, and 50 Fraud Flags**.

| Portal | Email Identifier | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Citizen Portal** | `citizen1@example.com` | `Password@123` | File complaints, map view, tracking, profile |
| **Officer Portal** | `officer1@tn.gov.in` | `Officer@123` | Triage inbox, status workflows, assignment, verification |
| **Control Portal** | `admin1@tn.gov.in` | `Admin@123` | User directory, fraud detection AI, system settings |

> *Tip: The login page at `/login` provides 1-Click Quick Demo Login buttons for instant access to each role.*

---

## 📦 Installation & Local Setup

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### 1. Clone & Configure Backend
```bash
cd backend
npm install
```

Configure `backend/.env`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicsplus?schema=public"
JWT_ACCESS_SECRET="civics_plus_super_secret_access_key_tamil_nadu_2026_jwt_token_secure"
JWT_REFRESH_SECRET="civics_plus_super_secret_refresh_key_tamil_nadu_2026_refresh_token_secure"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
CLOUDINARY_CLOUD_NAME="civics-plus-tn"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="abcdefghijklmnopqrstuvwxyz12345"
FRONTEND_URL="http://localhost:5173"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Start the Backend Server:
```bash
npm run build
npm start
```
*(The backend runs on `http://localhost:3000` with pre-seeded data ready out-of-the-box).*

### 2. Configure & Start Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🌐 Production Deployment

### Database (Supabase PostgreSQL)
1. Create a project at [supabase.com](https://supabase.com).
2. Retrieve the PostgreSQL connection pooler string.
3. In `backend/.env`, set `DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres"`.
4. Run schema migration & database seed:
   ```bash
   cd backend
   npx prisma db push
   npx prisma db seed
   ```

### Backend (Railway / Render)
1. Push project to GitHub.
2. Link repository to Railway or Render.
3. Set the root directory to `backend/`.
4. Add all environment variables from `backend/.env`.
5. Start command: `npm start`.

### Frontend (Vercel / Netlify)
1. Link repository to Vercel.
2. Set root directory to `frontend/`.
3. Set environment variable: `VITE_API_URL=https://your-backend.railway.app/api`.
4. Deploy!

---

## 📡 API Reference

### Authentication (`/api/auth`)
* `POST /register`: Register a new citizen (`username`, `email`, `phone`, `password`, `location`).
* `POST /login`: Log in with email/phone and password, returns JWT tokens and httpOnly cookie.
* `POST /refresh`: Refresh expired access token using refresh token.
* `POST /logout`: Clear session cookies.
* `GET /me`: Fetch authenticated user profile.
* `PUT /me`: Update user location, avatar, or contact information.

### Complaints (`/api/complaints`)
* `GET /`: Retrieve paginated complaints with filters (`status`, `category`, `search`, `limit`, `page`).
* `GET /:id`: Retrieve single complaint with photos, timeline, and officer dossier.
* `POST /`: Submit new complaint (Citizen/Admin role, accepts up to 5 photos, triggers fraud engine).
* `PUT /:id`: Update complaint details (Officer/Admin).
* `DELETE /:id`: Delete complaint permanently (Admin only).
* `POST /:id/assign`: Assign complaint to a field officer.
* `POST /:id/status`: Transition lifecycle stage (`SUBMITTED → ACCEPTED → ASSIGNED → IN_PROGRESS → RESOLVED / REJECTED`).
* `POST /:id/photo`: Upload supplementary before/after/evidence photo.
* `GET /nearby`: Retrieve complaints within a specified radius (e.g. `?latitude=8.7139&longitude=77.7567&radius=5`).
* `GET /user/:userId`: Fetch all complaints submitted by a citizen.

### User Management (`/api/users`)
* `GET /`: List all users with role and search filters (Admin only).
* `GET /suspicious`: List users with fraud score > 50 (Admin only).
* `GET /:id`: Inspect user profile and full complaint history (Admin only).
* `PUT /:id/ban`: Toggle account suspension / 7-day ban (Admin only).
* `PUT /:id/fraud-score`: Calibrate fraud risk points (Admin only).

### Analytics (`/api/analytics`)
* `GET /stats`: Overall metrics (total, resolved %, fraud rate, category/status breakdown).
* `GET /district/:name`: District-specific metrics and active officers list.
* `GET /officer/:id`: Officer workload, efficiency rating, and response hours.
* `GET /fraud-detection`: Flagged complaints dossier with breakdown points.

---

## 🔮 Future Enhancements
* **Direct WhatsApp Bot Redressal**: File complaints directly by sending a picture and live location pin on WhatsApp.
* **AI Automatic Categorization**: Computer vision to automatically classify road damage vs. storm water clogging from uploaded photos.
* **Tamil Voice Complaints (Speech-to-Text)**: Audio complaint submission for rural citizens in native Tamil dialect.
* **Automated Geofenced Push Notifications**: Alert nearby residents when a street light or road repair is underway in their ward.

---

## 👥 Team
* **Civics Plus Engineering Team** • Government of Tamil Nadu Digital Transformation Initiative
* Designed & developed for transparent, accountable, citizen-centric municipal governance.
