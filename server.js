// ============================================================
// e_ganna — Node.js / Express API
// Converted from: e_ganna.java (Spring MVC + PostgreSQL)
// Target DB: MariaDB via phpMyAdmin
// ============================================================
require('dotenv').config();

const express    = require('express');
const mysql      = require('mysql2/promise');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const dayjs      = require('dayjs');

const app  = express();
const PORT = process.env.PORT || 4300;

// ─── Middleware ───────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// ── CORS (required for Hostinger) ─────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});


// ─── MariaDB Connection Pool ──────────────────────────────────
const pool = mysql.createPool({
  host     : process.env.DB_HOST,     
  port     : process.env.DB_PORT,
  user     : process.env.DB_USER,
  password : process.env.DB_PASS,
  database : process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit   : 10,
  queueLimit:         0,
  connectTimeout:     60000,
});

// Export pool for use in routes
module.exports.pool = pool;


// ── File Upload (Multer) ───────────────────────────────────────
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const timestamp = dayjs().format('YYYYMMDDHHmmss');
    cb(null, `${timestamp}_${file.originalname}`);
  }
});
const upload = multer({ storage });


// ── Health Check ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'e_ganna API running', env: process.env.NODE_ENV });
});

app.get('/health', (req, res) => {
  pool.query('SELECT 1', (err) => {
    if (err) return res.status(500).json({ status: 'DB Error', error: err.message });
    res.json({ status: 'OK', db: 'connected', timestamp: dayjs().toISOString() });
  });
});





// ─── Helper: save base64 image to disk ───────────────────────
function saveBase64Image(base64String, dir) {
  if (!base64String || base64String.trim() === '') return '';
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const ts   = dayjs().format('YYYYMMDDHHmmssSSS');
    const fname = path.join(dir, `__${ts}.jpg`);
    const data  = base64String.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(fname, Buffer.from(data, 'base64'));
    return fname;
  } catch (e) {
    console.error('Image save error:', e.message);
    return '';
  }
}

// ─── Helper: build WHERE fragment only if param present ──────
function filterIf(val, clause) {
  return val != null ? clause : ' AND 1=1 ';
}

// ============================================================
// 1.  POST /login
//     Params: user_name, password
//     Matches by phone=user_name and password
// ============================================================
app.post('/login', async (req, res) => {
  const { user_name, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM social_peoples WHERE phone = ? AND password = ?',
      [user_name, password]
    );
    if (rows.length > 0) {
      const r = rows[0];
      return res.json({
        status    : true,
        msg       : 'login successful !',
        id        : r.id,
        photo_url : r.photo,
        post_name : r.post_name,
        level     : r.level,
        state     : r.state,
        prant     : r.prant,
        mandal    : r.mandal,
        district  : r.district,
        wing      : r.wing,
      });
    }
    res.json({ status: false, msg: 'user not exist !' });
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 2.  POST /admin_login
//     Params: user_name, password
// ============================================================
app.post('/admin_login', async (req, res) => {
  const { user_name, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM e_ganna_admin_login_id WHERE user_name = ? AND password = ?',
      [user_name, password]
    );
    res.json(
      rows.length > 0
        ? { status: true,  msg: 'login successful !' }
        : { status: false, msg: 'user not exist !'   }
    );
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 3.  POST /emp_login
//     Params: user_name, password
// ============================================================
app.post('/emp_login', async (req, res) => {
  const { user_name, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM e_ganna_emp_login_id WHERE user_name = ? AND password = ?',
      [user_name, password]
    );
    res.json(
      rows.length > 0
        ? { status: true,  msg: 'login successful !' }
        : { status: false, msg: 'user not exist !'   }
    );
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 4.  GET /get_version
// ============================================================
app.get('/get_version', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM version_table');
    res.json({ status: true, data: rows });
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 5.  GET /count_total_social_peoples
// ============================================================
app.get('/count_total_social_peoples', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(DISTINCT id) AS count_total_peoples FROM social_peoples'
    );
    res.json({ status: true, data: rows });
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 6.  POST /get_peoples
//     Optional filters: selected_state, selected_prant,
//       selected_mandal, selected_district, selected_id,
//       selected_level, selected_wing
// ============================================================
app.post('/get_peoples', async (req, res) => {
  const {
    selected_state, selected_prant, selected_mandal,
    selected_district, selected_id, selected_level, selected_wing,
  } = req.body;

  let sql    = 'SELECT * FROM social_peoples WHERE 1=1';
  const vals = [];

  if (selected_state    != null) { sql += ' AND state    = ?'; vals.push(selected_state);    }
  if (selected_prant    != null) { sql += ' AND prant    = ?'; vals.push(selected_prant);    }
  if (selected_mandal   != null) { sql += ' AND mandal   = ?'; vals.push(selected_mandal);   }
  if (selected_district != null) { sql += ' AND district = ?'; vals.push(selected_district); }
  if (selected_id       != null) { sql += ' AND id       = ?'; vals.push(selected_id);       }
  if (selected_level    != null) { sql += ' AND level    = ?'; vals.push(selected_level);    }
  if (selected_wing     != null) { sql += ' AND wing     = ?'; vals.push(selected_wing);     }

  try {
    const [rows] = await pool.query(sql, vals);
    const data = rows.map(r => ({
      id             : r.id,
      name           : r.name,
      post_name      : r.post_name,
      level          : r.level,
      wing           : r.wing,
      prant          : r.prant,
      mandal         : r.mandal,
      district       : r.district,
      booth          : r.booth,
      photo          : r.photo,
      phone          : r.phone,
      address        : r.address,
      membership_from: r.membership_from,
      facebook       : r.facebook,
      twitter        : r.twitter,
      whatsapp       : r.whatsapp,
      latitude       : r.latitude,
      longitude      : r.longitude,
    }));
    res.json({ status: true, data });
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 7.  POST /get_people_by_user_id
//     Params: selected_id
// ============================================================
app.post('/get_people_by_user_id', async (req, res) => {
  const { selected_id } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM social_peoples WHERE id = ?',
      [selected_id]
    );
    const data = rows.map(r => ({
      id             : r.id,
      name           : r.name,
      post_name      : r.post_name,
      level          : r.level,
      wing           : r.wing,
      prant          : r.prant,
      mandal         : r.mandal,
      district       : r.district,
      constituency   : r.constituency,
      booth          : r.booth,
      photo          : r.photo,
      phone          : r.phone,
      address        : r.address,
      membership_from: r.membership_from,
      facebook       : r.facebook,
      twitter        : r.twitter,
      whatsapp       : r.whatsapp,
      latitude       : r.latitude,
      longitude      : r.longitude,
    }));
    res.json({ status: true, data });
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 8.  POST /get_alerts
//     Optional filters: selected_state, selected_prant,
//       selected_mandal, selected_district, selected_level,
//       selected_wing, selected_alert_type,
//       selected_day | selected_week | selected_month
//
//     NOTE: DATE_PART is PostgreSQL syntax.
//           MariaDB equivalent: WEEK(date) / MONTH(date)
// ============================================================
app.post('/get_alerts', async (req, res) => {
  const {
    selected_state, selected_prant, selected_mandal, selected_district,
    selected_level, selected_wing, selected_alert_type,
    selected_day, selected_week, selected_month,
  } = req.body;

  let sql = `
    SELECT
      social_alerts.id,
      social_alerts.alert_title,
      social_alerts.users_photo_url,
      social_peoples.latitude,
      social_peoples.longitude,
      social_peoples.name,
      social_peoples.post_name
    FROM social_alerts
    INNER JOIN social_peoples USING (id)
    WHERE 1=1`;
  const vals = [];

  if (selected_state    != null) { sql += ' AND social_alerts.state    = ?'; vals.push(selected_state);    }
  if (selected_prant    != null) { sql += ' AND social_alerts.prant    = ?'; vals.push(selected_prant);    }
  if (selected_mandal   != null) { sql += ' AND social_alerts.mandal   = ?'; vals.push(selected_mandal);   }
  if (selected_district != null) { sql += ' AND social_alerts.district = ?'; vals.push(selected_district); }
  if (selected_level    != null) { sql += ' AND social_alerts.level    = ?'; vals.push(selected_level);    }
  if (selected_wing     != null) { sql += ' AND social_alerts.wing     = ?'; vals.push(selected_wing);     }
  if (selected_alert_type != null) { sql += ' AND alert_type           = ?'; vals.push(selected_alert_type); }

  // Date filters (MariaDB: WEEK() / MONTH() instead of DATE_PART)
  if      (selected_day   != null) { sql += ' AND social_alerts.date = ?';         vals.push(selected_day);   }
  else if (selected_week  != null) { sql += ' AND WEEK(social_alerts.date) = ?';   vals.push(selected_week);  }
  else if (selected_month != null) { sql += ' AND MONTH(social_alerts.date) = ?';  vals.push(selected_month); }

  sql += ` GROUP BY
    social_alerts.id, social_alerts.alert_title,
    social_alerts.users_photo_url,
    social_peoples.latitude, social_peoples.longitude,
    social_peoples.name, social_peoples.post_name`;

  try {
    const [rows] = await pool.query(sql, vals);
    const data = rows.map(r => ({
      alert_title: r.alert_title,
      photo      : r.users_photo_url,
      lat        : r.latitude,
      long       : r.longitude,
      name       : r.name,
      post       : r.post_name,
    }));
    res.json({ status: true, data });
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 9.  POST /get_score
//     Optional filters: selected_state, selected_prant,
//       selected_mandal, selected_district, selected_level,
//       selected_wing, selected_day | selected_week | selected_month
//     Returns top 5 by SUM(score_points) DESC
// ============================================================
app.post('/get_score', async (req, res) => {
  const {
    selected_state, selected_prant, selected_mandal, selected_district,
    selected_level, selected_wing,
    selected_day, selected_week, selected_month,
  } = req.body;

  let sql = `
    SELECT
      score_score.id,
      score_score.users_photo_url,
      social_peoples.latitude,
      social_peoples.longitude,
      social_peoples.name,
      social_peoples.post_name,
      SUM(score_score.score_points) AS score
    FROM score_score
    INNER JOIN social_peoples USING (id)
    WHERE 1=1`;
  const vals = [];

  if (selected_state    != null) { sql += ' AND score_score.state    = ?'; vals.push(selected_state);    }
  if (selected_prant    != null) { sql += ' AND score_score.prant    = ?'; vals.push(selected_prant);    }
  if (selected_mandal   != null) { sql += ' AND score_score.mandal   = ?'; vals.push(selected_mandal);   }
  if (selected_district != null) { sql += ' AND score_score.district = ?'; vals.push(selected_district); }
  if (selected_level    != null) { sql += ' AND score_score.level    = ?'; vals.push(selected_level);    }
  if (selected_wing     != null) { sql += ' AND score_score.wing     = ?'; vals.push(selected_wing);     }

  if      (selected_day   != null) { sql += ' AND score_score.date = ?';        vals.push(selected_day);   }
  else if (selected_week  != null) { sql += ' AND WEEK(score_score.date) = ?';  vals.push(selected_week);  }
  else if (selected_month != null) { sql += ' AND MONTH(score_score.date) = ?'; vals.push(selected_month); }

  sql += `
    GROUP BY
      score_score.id, score_score.users_photo_url,
      social_peoples.latitude, social_peoples.longitude,
      social_peoples.name, social_peoples.post_name
    ORDER BY SUM(score_score.score_points) DESC
    LIMIT 5`;

  try {
    const [rows] = await pool.query(sql, vals);
    const data = rows.map(r => ({
      user_id: r.id,
      score  : r.score,
      photo  : r.users_photo_url,
      lat    : r.latitude,
      long   : r.longitude,
      name   : r.name,
      post   : r.post_name,
    }));
    res.json({ status: true, data });
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 10. POST /get_list_of_works_by_people_id_for_rv
//     Params: people_id
// ============================================================
app.post('/get_list_of_works_by_people_id_for_rv', async (req, res) => {
  const { people_id } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM score_score WHERE id = ?',
      [people_id]
    );
    const data = rows.map(r => ({
      title      : r.work_type,
      photo_url  : r.photo_url,
      description: r.work_description,
      date       : r.date,
      time       : r.time,
    }));
    res.json({ status: true, data });
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 11. POST /get_list_of_social_alerts_for_rv
//     Params: people_id, alert_type
// ============================================================
app.post('/get_list_of_social_alerts_for_rv', async (req, res) => {
  const { people_id, alert_type } = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM social_alerts WHERE id = ? AND alert_type = ?",
      [people_id, alert_type]
    );
    const data = rows.map(r => ({
      title      : r.alert_title,
      description: r.alert_description,
      photo_url  : r.alert_photo,
      date       : r.date,
      time       : r.time,
    }));
    res.json({ status: true, data });
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 12. POST /submit_user_registration
//     Submits a new social_peoples record (without photo upload)
// ============================================================
app.post('/submit_user_registration', async (req, res) => {
  const {
    level, post_name, name, prant, mandal, district,
    consti, booth, photo, phone, address, membership_from,
    facebook, twitter, whatsapp, score, latitude, longitude,
    id, wing,
  } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO social_peoples
        (level, post_name, name, prant, mandal, district, booth,
         photo, phone, address, membership_from, facebook, twitter,
         whatsapp, score, latitude, longitude, id, wing)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [level, post_name, name, prant, mandal, district, booth,
       photo || '', phone, address, membership_from, facebook, twitter,
       whatsapp, score, latitude, longitude, id, wing]
    );
    res.json(
      result.affectedRows > 0
        ? { status: true,  msg: 'Successfully Submitted !' }
        : { status: false, msg: 'Something Went Wrong !'   }
    );
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 13. POST /new_user_creation
//     Full user registration with base64 photo saved to disk
//     Params: get_user_uid, get_user_level, get_user_prant,
//       get_user_mandal, get_user_district, get_user_wing,
//       get_user_post, get_user_full_name, get_user_lat,
//       get_user_long, get_user_address, get_user_score,
//       get_user_membership_from, get_user_facebook,
//       get_user_twitter, get_user_whatsapp, get_user_phone,
//       get_user_photo (base64), get_user_constituency,
//       get_user_booth, get_user_state, confirmed_password
// ============================================================
app.post('/new_user_creation', async (req, res) => {
  const {
    get_user_uid, get_user_level, get_user_prant, get_user_mandal,
    get_user_district, get_user_wing, get_user_post, get_user_full_name,
    get_user_lat, get_user_long, get_user_address, get_user_score,
    get_user_membership_from, get_user_facebook, get_user_twitter,
    get_user_whatsapp, get_user_phone, get_user_photo,
    get_user_constituency, get_user_booth, get_user_state,
    confirmed_password,
  } = req.body;

  // Save photo to disk
  const photoPath = saveBase64Image(get_user_photo, '/social/image_edit');
  const date_of_update = dayjs().format('YYYY-MM-DD HH:mm:ss');

  try {
    const [result] = await pool.query(
      `INSERT INTO social_peoples
        (id, level, prant, mandal, district, wing, post_name, name,
         latitude, longitude, address, score, membership_from,
         facebook, twitter, whatsapp, phone, photo,
         constituency, booth, state, password, date_of_data_creation)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        get_user_uid, get_user_level, get_user_prant, get_user_mandal,
        get_user_district, get_user_wing, get_user_post, get_user_full_name,
        get_user_lat, get_user_long, get_user_address, get_user_score,
        get_user_membership_from, get_user_facebook, get_user_twitter,
        get_user_whatsapp, get_user_phone, photoPath,
        get_user_constituency, get_user_booth, get_user_state,
        confirmed_password, date_of_update,
      ]
    );
    res.json(
      result.affectedRows > 0
        ? { status: true,  msg: 'Successfully Registered !' }
        : { status: false, msg: 'Something Went Wrong !'    }
    );
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 14. POST /submit_score
//     Params: id, score_points, work_type, work_description,
//       photo_url (base64), work_title, latitude, longitude,
//       users_photo_url, users_post, level, prant, mandal,
//       district, wing
//     date/time auto-generated server-side
// ============================================================
app.post('/submit_score', async (req, res) => {
  const {
    id: users_id, score_points, work_type, work_description,
    photo_url, work_title, latitude, longitude,
    users_photo_url, users_post, level, prant, mandal, district, wing,
  } = req.body;

  // Save photo
  const fname          = saveBase64Image(photo_url, '/srv/catalyst_arjuna');
  const date_of_update = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const time_of_update = dayjs().format('HH:mm');

  try {
    const [result] = await pool.query(
      `INSERT INTO score_score
        (id, score_points, date, time, work_type, work_description,
         photo_url, work_title, users_photo_url, users_post,
         level, prant, mandal, district, wing, latitude, longitude, state)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        users_id, score_points, date_of_update, time_of_update,
        work_type, work_description, fname, work_title,
        users_photo_url, users_post, level, prant, mandal,
        district, wing, latitude, longitude, 'up',
      ]
    );
    res.json(
      result.affectedRows > 0
        ? { status: true,  msg: 'Successfully Submitted !' }
        : { status: false, msg: 'Something Went Wrong !'   }
    );
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 15. POST /submit_alert
//     Params: id, alert_type, alert_title, alert_description,
//       latitude, longitude, users_photo_url, users_post,
//       level, prant, mandal, district, wing
//     date/time auto-generated
// ============================================================
app.post('/submit_alert', async (req, res) => {
  const {
    id: users_id, alert_type, alert_title, alert_description,
    latitude, longitude, users_photo_url, users_post,
    level, prant, mandal, district, wing,
  } = req.body;

  const date_of_update = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const time_of_update = dayjs().format('HH:mm');

  try {
    const [result] = await pool.query(
      `INSERT INTO social_alerts
        (id, alert_type, alert_title, alert_description,
         users_photo_url, users_post, level, prant, mandal,
         district, latitude, longitude, date, time, state, wing)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        users_id, alert_type, alert_title, alert_description,
        users_photo_url, users_post, level, prant, mandal,
        district, latitude, longitude, date_of_update, time_of_update,
        'up', wing,
      ]
    );
    res.json(
      result.affectedRows > 0
        ? { status: true,  msg: 'Successfully Submitted !' }
        : { status: false, msg: 'Something Went Wrong !'   }
    );
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});

// ============================================================
// 16. POST /submitData_line  (e_gramya_vikas + polyline)
//     Params: date, time, division, district, block, scheme,
//       name_of_work, date_of_work_sanction, sanctioned_amount,
//       available_funds, date_of_work_start, date_of_work_complition,
//       type_of_work, detail_of_type_of_work, measurement_parameter,
//       unit_of_measurement, gis_datatype, array_of_polyline,
//       physical_progress_percentage, finanacial_pogress_percentage,
//       physical_progress, other_specification_phy_progress,
//       measurement_achieved_progress, handover_status,
//       photo_work_sanction (base64), photo_site (base64),
//       photo_fund_received_letter (base64), photo_handover_letter (base64)
// ============================================================
app.post('/submitData_line', async (req, res) => {
  const {
    date: date1, time: time_of_update, division: scrl_div,
    district: scrl_dis, block: scrl_block, scheme: get_scheme,
    name_of_work: get_name_of_work,
    date_of_work_sanction: show_sanction_date,
    sanctioned_amount: get_sanction_amount,
    available_funds: get_available_funds,
    date_of_work_start: show_start_date,
    date_of_work_complition: show_complition_date,
    type_of_work: scrl_type_of_work,
    detail_of_type_of_work: get_selected_radio_button,
    measurement_parameter: get_total_measurement_area,
    unit_of_measurement: scrl_meaurement_unit,
    gis_datatype: scrl_point_line,
    array_of_polyline: get_array_of_polyline,
    physical_progress_percentage: get_physical_status,
    finanacial_pogress_percentage: get_financial_status,
    physical_progress: get_entries_of_physical_status,
    other_specification_phy_progress: get_other_specification,
    measurement_achieved_progress: get_measurement,
    handover_status: scrl_handover_status,
    photo_work_sanction: work_sanction_letter,
    photo_site,
    photo_fund_received_letter: fund_received_letter,
    photo_handover_letter: handover_certificate_letter,
  } = req.body;

  // Save images
  const photoSitePath     = saveBase64Image(photo_site,                 '/srv/e_grammya_vikas_photo_site_pic');
  const sanctionPath      = saveBase64Image(work_sanction_letter,       '/srv/e_grammya_vikas_photo_work_sanction_letter');
  const fundPath          = saveBase64Image(fund_received_letter,       '/srv/e_grammya_vikas_fund_received_letter');
  const handoverPath      = saveBase64Image(handover_certificate_letter,'/srv/e_gramya_vikas_handover_certificate');

  try {
    // Insert into e_gramya_vikas
    await pool.query(
      `INSERT INTO e_gramya_vikas
        (date, time, division, district, block, scheme, name_of_work,
         date_of_work_sanction, sanctioned_amount, available_funds,
         date_of_work_start, date_of_work_completion, type_of_work,
         detail_of_type_of_work, measurement_parameter, unit_of_measurement,
         gis_datatype, array_of_polyline, physical_progress_pct,
         financial_progress_pct, physical_progress, other_specification,
         measurement_achieved, handover_status,
         photo_work_sanction, photo_site, photo_fund_received, photo_handover_letter)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        date1, time_of_update, scrl_div, scrl_dis, scrl_block, get_scheme,
        get_name_of_work, show_sanction_date, get_sanction_amount,
        get_available_funds, show_start_date, show_complition_date,
        scrl_type_of_work, get_selected_radio_button, get_total_measurement_area,
        scrl_meaurement_unit, scrl_point_line, get_array_of_polyline,
        get_physical_status, get_financial_status, get_entries_of_physical_status,
        get_other_specification, get_measurement, scrl_handover_status,
        sanctionPath, photoSitePath, fundPath, handoverPath,
      ]
    );

    // Insert polyline geometry into polyline_test
    if (get_array_of_polyline) {
      await pool.query(
        `INSERT INTO polyline_test (text, geom)
         VALUES (?, ST_GeomFromText(?, 4326))`,
        [get_name_of_work || '', get_array_of_polyline]
      );
    }

    res.json({ status: true, msg: 'Successfully Submitted !' });
  } catch (e) {
    console.error(e);
    res.json({ status: false, msg: 'Something Went Wrong !' });
  }
});



// ── 404 Handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: false, msg: 'Route not found' });
});

// ── Global Error Handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  // res.status(500).json({ status: false, msg: 'Something Went Wrong!' });
  res.status(500).json({ status: false, msg: err.message });
});


// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`e_ganna API running on port ${PORT}`);
});
