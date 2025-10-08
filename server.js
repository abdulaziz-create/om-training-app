const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/om_training';
const pool = new Pool({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

async function initDB(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS centers (
      id SERIAL PRIMARY KEY,
      name TEXT, governorate TEXT, address TEXT, license_number TEXT
    );
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      center_id INTEGER REFERENCES centers(id),
      title TEXT, duration_hours INTEGER, price REAL,
      seats_total INTEGER, seats_available INTEGER, start_date DATE, end_date DATE
    );
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      user_name TEXT, user_phone TEXT, course_id INTEGER REFERENCES courses(id), status TEXT, verification_code TEXT
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*)::int as c FROM centers');
  if(rows[0].c === 0){
    const ins = await pool.query('INSERT INTO centers(name,governorate,address,license_number) VALUES($1,$2,$3,$4) RETURNING id', ['مركز التقنية الحديث','Muscat','حي القرم','LIC-OM-001']);
    const centerId = ins.rows[0].id;
    await pool.query('INSERT INTO courses(center_id,title,duration_hours,price,seats_total,seats_available,start_date,end_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [centerId,'مقدمة في البرمجة',16,25,20,20,'2025-11-01','2025-11-15']);
  }
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/api/centers', async (req,res)=>{
  try{
    const governorate = req.query.governorate;
    const q = governorate ? await pool.query('SELECT * FROM centers WHERE governorate = $1', [governorate]) : await pool.query('SELECT * FROM centers');
    const centers = q.rows;
    for(const c of centers){
      const cr = await pool.query('SELECT * FROM courses WHERE center_id = $1', [c.id]);
      c.courses = cr.rows;
    }
    res.json(centers);
  }catch(e){ console.error(e); res.status(500).json({error:'server error'}) }
});

app.get('/api/centers/:id', async (req,res)=>{
  try{
    const id = Number(req.params.id);
    const c = await pool.query('SELECT * FROM centers WHERE id = $1', [id]);
    if(c.rows.length === 0) return res.status(404).json({error:'not found'});
    const courses = await pool.query('SELECT * FROM courses WHERE center_id = $1', [id]);
    res.json({...c.rows[0], courses: courses.rows});
  }catch(e){ console.error(e); res.status(500).json({error:'server error'}) }
});

app.get('/api/courses/:id', async (req,res)=>{
  try{
    const id = Number(req.params.id);
    const q = await pool.query('SELECT c.*, ctr.name as center_name FROM courses c JOIN centers ctr ON ctr.id = c.center_id WHERE c.id = $1', [id]);
    if(q.rows.length === 0) return res.status(404).json({error:'not found'});
    res.json(q.rows[0]);
  }catch(e){ console.error(e); res.status(500).json({error:'server error'}) }
});

app.post('/api/enrollments', async (req,res)=>{
  try{
    const { user_name, user_phone, course_id } = req.body;
    if(!user_name || !user_phone || !course_id) return res.status(400).json({error:'missing fields'});
    const course = await pool.query('SELECT * FROM courses WHERE id = $1', [course_id]);
    if(course.rows.length === 0) return res.status(404).json({error:'course not found'});
    if(course.rows[0].seats_available <= 0) return res.status(400).json({error:'no seats'});
    const verification_code = uuidv4().slice(0,8).toUpperCase();
    const ins = await pool.query('INSERT INTO enrollments(user_name,user_phone,course_id,status,verification_code) VALUES($1,$2,$3,$4,$5) RETURNING id', [user_name,user_phone,course_id,'booked',verification_code]);
    await pool.query('UPDATE courses SET seats_available = seats_available - 1 WHERE id = $1', [course_id]);
    res.status(201).json({ id: ins.rows[0].id, verification_code });
  }catch(e){ console.error(e); res.status(500).json({error:'server error'}) }
});

app.post('/api/certificates/generate', async (req,res)=>{
  try{
    const { enrollment_id } = req.body;
    const q = await pool.query('SELECT e.*, c.title FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.id = $1', [enrollment_id]);
    if(q.rows.length === 0) return res.status(404).json({error:'enrollment not found'});
    const enroll = q.rows[0];
    const filename = `certificate_${enrollment_id}.pdf`;
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filename));
    doc.fontSize(20).text('شهادة حضور', {align:'center'});
    doc.moveDown();
    doc.fontSize(14).text(`يشهد هذا بأن ${enroll.user_name} قد اشترك في دورة: ${enroll.title}`);
    doc.text(`رمز التحقق: ${enroll.verification_code}`);
    doc.end();
    res.json({ pdf: filename });
  }catch(e){ console.error(e); res.status(500).json({error:'server error'}) }
});

const PORT = process.env.PORT || 4000;
initDB().then(()=>{
  app.listen(PORT, ()=> console.log('Backend running on', PORT));
}).catch(err=>{ console.error('DB init error', err); process.exit(1); });
