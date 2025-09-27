# Student Tasks App (Node.js + PostgreSQL + HTML/CSS/JS)

App full-stack desplegada 100% en Render (BD + backend que sirve frontend).

## Despliegue (solo nube)

1. **Render PostgreSQL** → crea instancia y copia `External Database URL`.
2. Ejecuta `sql/init.sql` contra esa DB (usa `psql` o cliente GUI).
3. **Render Web Service** → conecta repo GitHub.
   - Root Directory: `backend`
   - Build: `npm install`
   - Start: `npm start`
   - Env Vars:
     - `NODE_ENV=production`
     - `DATABASE_URL=<External Database URL>`
     - `JWT_SECRET=<cadena segura>`
4. Render devuelve una URL pública que sirve **frontend + API**.

## Endpoints

- `POST /users/register` – `{ name, email, password }`
- `POST /users/login` – `{ email, password }`
- `POST /tasks` – `{ title, description? }` (header `Authorization: Bearer <token>`)
- `GET /tasks/:userId` – (auth)
- `PUT /tasks/:id/status` – Avanza `pending → in_progress → done` (auth)

