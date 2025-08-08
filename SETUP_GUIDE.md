# 🚀 Quick-Start Guide – Trello-like Project

This guide walks you through **every step** required to clone, install, and run the **full-stack** project on your local machine.

---

## 📁 1. Clone the Repository
```bash
git clone <your-repo-url>
cd trello
```

---

## 🧰 2. Prerequisites
| Tool        | Version | Purpose                     |
|-------------|---------|-----------------------------|
| Node.js     | ≥ 18    | Backend & frontend runtime  |
| PostgreSQL  | ≥ 14    | Database                    |
| npm or yarn | latest  | Package manager             |

---

## 🗄️ 3. Database Setup

### 3.1 Create Database & User
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE democran;
CREATE USER democran WITH PASSWORD 'qweasd-123';
GRANT ALL PRIVILEGES ON DATABASE democran TO democran;
\q
```

### 3.2 Run SQL Migrations
```bash
psql -U democran -d democran -f DB/db_create_users_roles.sql
psql -U democran -d democran -f DB/db_create_assignments.sql
psql -U democran -d democran -f DB/db_create_tasks.sql
psql -U democran -d democran -f DB/db_create_comments.sql
# …repeat for any additional *.sql files
```

---

## ⚙️ 4. Backend (Node.js + Express)

### 4.1 Install Dependencies
```bash
cd back
npm install
```

### 4.2 Environment Variables
Create `back/.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5433
DB_USER=democran
DB_PASSWORD=qweasd-123
DB_NAME=democran
JWT_SECRET=your_jwt_secret_key
```

### 4.3 Start the Server
```bash
npm start
# or for dev with nodemon
npm run dev
```
The API will be available at **http://localhost:5000/api**.

---

## 🎨 5. Frontend (React + Vite)

### 5.1 Install Dependencies
```bash
cd ../front/my_front
npm install
```

### 5.2 Start the Dev Server
```bash
npm run dev
```
The UI will open automatically at **http://localhost:5173**.

---

## 🐳 6. (Optional) Docker Compose – One-Command Launch

If you prefer Docker:

```bash
docker-compose up --build
```
This spins up:
- PostgreSQL on port 5433
- Backend on port 5000
- Frontend on port 5173

---

## 🔐 7. Create Your First User

1. Open **http://localhost:5173**
2. Click **Register** and sign up
3. Log in and start creating assignments & tasks!

---

## 🧪 8. Quick Smoke Tests

| Test | Command / Action |
|------|------------------|
| API health | `curl http://localhost:5000/api/test` |
| Login | POST `/api/login` with JSON `{ "email": "...", "password": "..." }` |
| Get assignments | GET `/api/assignments` (Bearer token required) |

---

## 🛠️ 9. Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 5000 busy | Change `PORT` in `back/.env` |
| Port 5173 busy | Change `port` in `front/my_front/vite.config.js` |
| DB connection error | Verify PostgreSQL is running on port 5433 and credentials in `.env` |
| `node_modules` issues | Delete `node_modules` and `package-lock.json`, then `npm install` again |

---

## 📞 10. Need Help?
Open an issue or reach out with logs/screenshots. Happy coding!
