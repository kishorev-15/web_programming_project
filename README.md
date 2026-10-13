# Campus Lost & Found Portal

**Course:** ISWE407P - UI/UX Design Project  
**Team Members:**  
- Sangavi R (23MIS0248)  
- Preethikshabala V (23MIS0085)  
- Prethika D (23MIS0301)  

---

## What's New in this Version

1. **Zero Dummy Data (Real-Time Testing)**:
   - All sample items have been removed. All counts (Lost, Found, Contact Requests, Recovered) start at **0**.
   - As you report lost and found items in real-time, the counters will increment immediately.

2. **Strict VIT Institutional Email & Strong Password Security**:
   - Only verified official VIT emails (`@vitstudent.ac.in` for students and `@vit.ac.in` for faculty/staff) are permitted.
   - Enforces a strong password combination (minimum 8 characters, uppercase, lowercase, numbers, and special symbols). Weak passwords like `123` are blocked with live checklist feedback.
   - Protected portal pages require authentication. Non-logged-in visitors are redirected to `login.html`.
   - Executive top-right navbar user dropdown with initials badge, user role, profile link, and sign out.

3. **Backend API Server (`backend/`)**:
   - Native Node.js REST API server with data persistence in `backend/data/database.json`.
   - Handles college authentication, item creation, claim submissions, approvals, and statistics.

---

## Project Structure

```
Campus Lost and Found/
├── backend/
│   ├── data/
│   │   └── database.json        # Persistent JSON database (starts at 0 items)
│   ├── package.json             # Backend metadata
│   └── server.js                # Zero-dependency Node.js REST API server
│
├── frontend/
│   ├── css/
│   │   └── style.css            # Unified modern CSS design system
│   ├── js/
│   │   └── app.js               # State store, college email auth guard & API sync
│   ├── index.html               # Public Landing page with live metrics
│   ├── dashboard.html           # Protected User & Staff Dashboard
│   ├── report-lost.html         # Protected Report Lost Item Form
│   ├── report-found.html        # Protected Report Found Item Form
│   ├── search.html              # Protected Search & Filter Catalog
│   ├── notifications.html       # Protected Contact Requests & Approvals Hub
│   ├── profile.html             # Protected User Profile & My Reports Tracker
│   ├── login.html               # College Email Portal Login
│   └── register.html            # College Account Registration
│
└── README.md
```

---

## How to Run & Test

### Option A: Run Frontend (Immediate Browser Test)
1. Open `frontend/index.html` in your web browser (Chrome, Edge, Firefox).
2. All initial metrics display **0**.
3. Click **"Sign In"** or navigate to any protected page &rarr; You will be prompted to log in.
4. Sign in using your college email (e.g. `rahul.sharma@vitstudent.ac.in`, or register your own email like `prethika@vitstudent.ac.in`).
5. Go to **Report Lost** or **Report Found** and submit an item.
6. Check **Search Items** and **Dashboard** &rarr; Notice your item appears live and metrics increment to `1`!

### Option B: Run with Backend Server
1. Open terminal / PowerShell:
   ```bash
   cd "C:\Users\Prethika\Downloads\Campus Lost and Found\backend"
   node server.js
   ```
2. The API will start on `http://localhost:5000`.
3. Open `frontend/index.html` in your browser. All reports and claims will be persisted to `backend/data/database.json`.
