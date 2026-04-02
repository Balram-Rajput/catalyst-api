
# e_ganna — Node.js API

Converted from the original Java Spring MVC backend.  
Connects to **MariaDB** (phpMyAdmin).

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure DB
cp .env.example .env
# Edit .env and set DB_HOST, DB_USER, DB_PASS, DB_NAME

# 3. Import the databas
# In phpMyAdmin → Import → select  e_ganna_MariaDB.sql

# 4. Start server
npm start          # production
npm run dev        # with auto-reload (nodemon)
```

Server runs on **http://localhost:8080** by default.

---

## API Reference

All POST endpoints accept `application/x-www-form-urlencoded` or `application/json`.  
All responses are JSON: `{ status: true/false, data: [...] }` or `{ status, msg }`.

### Auth

| Method | Endpoint       | Params                    | Notes                        |
|--------|----------------|---------------------------|------------------------------|
| POST   | /login         | user_name, password       | Matches phone + password     |
| POST   | /admin_login   | user_name, password       | e_ganna_admin_login_id table |
| POST   | /emp_login     | user_name, password       | e_ganna_emp_login_id table   |

### Reads

| Method | Endpoint                             | Params                                                    |
|--------|--------------------------------------|-----------------------------------------------------------|
| GET    | /get_version                         | —                                                         |
| GET    | /count_total_social_peoples          | —                                                         |
| POST   | /get_peoples                         | selected_state, selected_prant, selected_mandal, selected_district, selected_id, selected_level, selected_wing (all optional) |
| POST   | /get_people_by_user_id               | selected_id                                               |
| POST   | /get_alerts                          | selected_state, selected_prant, selected_mandal, selected_district, selected_level, selected_wing, selected_alert_type, selected_day / selected_week / selected_month |
| POST   | /get_score                           | same filters as get_alerts (returns top 5)                |
| POST   | /get_list_of_works_by_people_id_for_rv   | people_id                                             |
| POST   | /get_list_of_social_alerts_for_rv    | people_id, alert_type                                     |

### Writes

| Method | Endpoint                  | Notes                                                   |
|--------|---------------------------|---------------------------------------------------------|
| POST   | /submit_user_registration | Simple people INSERT, photo as URL string               |
| POST   | /new_user_creation        | Full registration, get_user_photo as base64 → saved to /social/image_edit |
| POST   | /submit_score             | Inserts score_score row, photo_url as base64 → /srv/catalyst_arjuna |
| POST   | /submit_alert             | Inserts social_alerts row                               |
| POST   | /submitData_line          | Inserts e_gramya_vikas row + polyline_test geometry     |

---

## Key Differences from Java Version

| Java (PostgreSQL)              | Node.js (MariaDB)                          |
|--------------------------------|--------------------------------------------|
| `DATE_PART('week', date)`      | `WEEK(date)`                               |
| `DATE_PART('month', date)`     | `MONTH(date)`                              |
| `ST_GeomFromText(..., 4326)`   | Same — MariaDB supports this natively      |
| `public.table_name` schema     | Removed — MariaDB uses database, not schema |
| Base64 via `org.postgresql.util.Base64` | `Buffer.from(data, 'base64')` (Node built-in) |
| String-concatenated SQL (injection risk) | Parameterised queries with `?` placeholders |

<!-- PM2 Host -->

pm2 start app.js --name my-api
pm2 list

pm2 restart my-api
pm2 stop my-api
pm2 delete my-api
pm2 logs my-api


pm2 list          # show apps
pm2 restart all   # restart all
pm2 stop all      # stop all
pm2 delete all    # remove all
pm2 monit         # live monitoring


 




 {
  "name": "e_ganna_api",
  "version": "1.0.0",
  "description": "e_ganna Node.js REST API — MariaDB backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "node server.js"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "dependencies": {
    "dayjs": "^1.11.10",
    "dotenv": "^16.4.5",
    "express": "^4.18.2",
    "multer": "^2.1.1",
    "mysql2": "^3.6.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}



{
  "name": "e_ganna_api",
  "version": "1.0.0",
  "description": "e_ganna Node.js REST API — MariaDB backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "node server.js"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "dependencies": {
    "dayjs": "^1.11.10",
    "dotenv": "^16.4.5",
    "express": "^4.18.2",
    "multer": "^2.1.1",
    "mysql2": "^3.6.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
