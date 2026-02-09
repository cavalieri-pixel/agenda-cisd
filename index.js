require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_cisd_key_2026';

// Config MercadoPago
const client = process.env.MP_ACCESS_TOKEN 
  ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN }) 
  : null;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Config Google Calendar
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// ==========================================
//               RUTAS DE LA API
// ==========================================

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const professional = await prisma.professional.findUnique({ where: { email } });
    if (!professional) return res.status(401).json({ error: 'Usuario no encontrado' });
    const passwordValid = await bcrypt.compare(password, professional.password);
    if (!passwordValid) return res.status(401).json({ error: 'Contraseña incorrecta' });
    const token = jwt.sign({ id: professional.id, email: professional.email, name: professional.name }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: professional.id, name: professional.name, email: professional.email } });
  } catch (error) { res.status(500).json({ error: 'Error al iniciar sesión' }); }
});

// ==========================================
//      RUTAS PÚBLICAS (AGENDAMIENTO)
// ==========================================

// 1. BUSCAR PACIENTE
app.get('/api/patients/search/:rut', async (req, res) => {
  const { rut } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { rut } });
    if (patient) return res.json(patient);
    res.status(404).json({ error: 'Paciente no encontrado' });
  } catch { res.status(500).json({ error: 'Error servidor' }); }
});

// 2. SLOTS DISPONIBLES (Con intervalo dinámico y corrección de día)
app.get('/api/public/slots', async (req, res) => {
  const { date, professionalId, duration } = req.query; 
  try {
    const searchDate = new Date(date);
    const jsDay = searchDate.getUTCDay(); 
    
    // Traducción de días: JS(0=Dom) -> Admin(6=Dom, 0=Lun)
    const adjustedDay = (jsDay === 0) ? 6 : jsDay - 1;

    // 1. Obtener profesional para saber su intervalo
    const pro = await prisma.professional.findUnique({ where: { id: parseInt(professionalId) } });
    const interval = pro.slotInterval || 30;

    const schedule = await prisma.availability.findFirst({
      where: { professionalId: parseInt(professionalId), dayOfWeek: adjustedDay }
    });
    
    if (!schedule) return res.json([]); 

    const startOfDay = new Date(date); startOfDay.setUTCHours(0,0,0,0);
    const endOfDay = new Date(date); endOfDay.setUTCHours(23,59,59,999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId: parseInt(professionalId),
        startTime: { gte: startOfDay },
        endTime: { lte: endOfDay },
        status: { not: 'CANCELLED' }
      }
    });

    const slots = [];
    const toMins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const toTimeStr = (mins) => { 
        const h = Math.floor(mins / 60).toString().padStart(2, '0'); 
        const m = (mins % 60).toString().padStart(2, '0'); 
        return `${h}:${m}`; 
    };

    let currentMins = toMins(schedule.startTime);
    const endMins = toMins(schedule.endTime);
    const serviceDuration = parseInt(duration) || 30;

    while (currentMins + serviceDuration <= endMins) {
      const sStart = currentMins; 
      const sEnd = currentMins + serviceDuration;
      const isBusy = existingAppointments.some(appt => {
        const aStart = appt.startTime.getUTCHours() * 60 + appt.startTime.getUTCMinutes();
        const aEnd = appt.endTime.getUTCHours() * 60 + appt.endTime.getUTCMinutes();
        return (sStart < aEnd && sEnd > aStart);
      });
      if (!isBusy) slots.push(toTimeStr(sStart));
      
      // AQUÍ ESTÁ LA MAGIA: Usamos el intervalo dinámico
      currentMins += interval; 
    }
    res.json(slots);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error calculando horarios' }); }
});

// --- PACIENTES ---
app.get('/api/patients', async (req, res) => { try { const p = await prisma.patient.findMany({ orderBy: { name: 'asc' } }); res.json(p); } catch { res.status(500).json({ error: 'Err' }); } });
app.post('/api/patients', async (req, res) => {
  const { rut, name, email, phone, address, prevision, birthDate } = req.body;
  try { 
    const n = await prisma.patient.create({ 
      data: { 
        rut, name, email, phone, 
        address: address || null, 
        prevision: prevision || null, 
        birthDate: birthDate ? new Date(birthDate) : null 
      } 
    }); 
    res.json(n); 
  } 
  catch (e) { if (e.code === 'P2002') return res.status(400).json({ error: 'RUT existe' }); res.status(500).json({ error: 'Err' }); }
});
app.put('/api/patients/:id', async (req, res) => {
  const { rut, name, email, phone, address, prevision, birthDate } = req.body;
  try { 
    const u = await prisma.patient.update({ 
      where: { id: parseInt(req.params.id) }, 
      data: { 
        rut, name, email, phone,
        address: address || null, 
        prevision: prevision || null, 
        birthDate: birthDate ? new Date(birthDate) : null 
      } 
    }); 
    res.json(u); 
  } catch { res.status(500).json({ error: 'Err' }); }
});
app.delete('/api/patients/:id', async (req, res) => { try { await prisma.patient.delete({ where: { id: parseInt(req.params.id) } }); res.json({ message: 'Deleted' }); } catch { res.status(500).json({ error: 'Err' }); } });
app.get('/api/patients/:id/history', async (req, res) => { try { const h = await prisma.appointment.findMany({ where: { patientId: parseInt(req.params.id) }, include: { service: true, professional: true }, orderBy: { startTime: 'desc' } }); res.json(h); } catch { res.status(500).json({ error: 'Err' }); } });

// --- PROFESIONALES ---
app.get('/api/professionals', async (req, res) => { const p = await prisma.professional.findMany({ orderBy: { id: 'asc' } }); res.json(p); });

app.post('/api/professionals', async (req, res) => {
  const { name, email, password, color, phone, slotInterval } = req.body;
  try { 
    const hp = await bcrypt.hash(password, 10); 
    const n = await prisma.professional.create({ 
      data: { name, email, password: hp, color, phone, slotInterval: parseInt(slotInterval) || 30 } 
    }); 
    res.json(n); 
  } catch { res.status(500).json({ error: 'Err' }); }
});

app.put('/api/professionals/:id', async (req, res) => { 
  const { name, email, color, phone, slotInterval } = req.body; 
  try { 
    const u = await prisma.professional.update({ 
      where: { id: parseInt(req.params.id) }, 
      data: { name, email, color, phone, slotInterval: parseInt(slotInterval) || 30 } 
    }); 
    res.json(u); 
  } catch { res.status(500).json({ error: 'Err' }); } 
});

app.delete('/api/professionals/:id', async (req, res) => { try { await prisma.professional.delete({ where: { id: parseInt(req.params.id) } }); res.json({ message: 'Deleted' }); } catch { res.status(500).json({ error: 'Err' }); } });
app.post('/api/professionals/import', async (req, res) => {
  const { data } = req.body; let c=0; for(const i of data) { try { const hp = await bcrypt.hash(i.password||'cisd123',10); await prisma.professional.create({ data: { name:i.name, email:i.email, password:hp, phone:i.phone||'', color:i.color||'#3788d8', slotInterval: parseInt(i.slotInterval)||30 } }); c++; } catch {} } res.json({ message: `Procesados: ${c}` });
});
app.get('/api/professionals/export', async (req, res) => { const p = await prisma.professional.findMany(); let csv='name,email,phone,color,slotInterval\n'; p.forEach(x=>csv+=`"${x.name}","${x.email}","${x.phone||''}","${x.color}",${x.slotInterval}\n`); res.header('Content-Type','text/csv').attachment('profesionales.csv').send(csv); });

// --- SERVICIOS (TRATAMIENTOS) ---
app.get('/api/services', async (req, res) => { 
  const s = await prisma.service.findMany({ orderBy: { name: 'asc' } }); 
  res.json(s); 
});
app.post('/api/services', async (req, res) => {
  const { category, specialty, name, code, price, discountValue, description, durationMin, isTelemed } = req.body;
  try {
    const n = await prisma.service.create({
      data: { category, specialty, name, code, price: parseInt(price)||0, discountValue: parseInt(discountValue)||0, description, durationMin: parseInt(durationMin)||30, isTelemed: isTelemed||false }
    });
    res.json(n);
  } catch { res.status(500).json({ error: 'Error crear servicio' }); }
});
app.put('/api/services/:id', async (req, res) => {
  const { category, specialty, name, code, price, discountValue, description, durationMin, isTelemed } = req.body;
  try {
    const u = await prisma.service.update({
      where: { id: parseInt(req.params.id) },
      data: { category, specialty, name, code, price: parseInt(price)||0, discountValue: parseInt(discountValue)||0, description, durationMin: parseInt(durationMin)||30, isTelemed }
    });
    res.json(u);
  } catch { res.status(500).json({ error: 'Error actualizar servicio' }); }
});
app.delete('/api/services/:id', async (req, res) => { try { await prisma.service.delete({ where: { id: parseInt(req.params.id) } }); res.json({ message: 'Deleted' }); } catch { res.status(500).json({ error: 'Err' }); } });
app.post('/api/services/import', async (req, res) => { const { data } = req.body; let c=0; for(const i of data) { try { const isT = String(i.isTelemed).toLowerCase(); await prisma.service.create({ data: { name:i.name, code:i.code, durationMin:parseInt(i.durationMin)||30, price:parseInt(i.price)||0, isTelemed:(isT==='true'||isT==='si'), category:i.category||'General', specialty:i.specialty||'' } }); c++; } catch {} } res.json({ message: `Procesados: ${c}` }); });
app.get('/api/services/export', async (req, res) => { const s = await prisma.service.findMany(); let csv='name,code,price,category,specialty\n'; s.forEach(x=>csv+=`"${x.name}","${x.code}",${x.price},"${x.category}","${x.specialty}"\n`); res.header('Content-Type','text/csv').attachment('servicios.csv').send(csv); });

// --- HORARIOS ---
app.get('/api/availability/:pid', async (req, res) => { const s = await prisma.availability.findMany({ where: { professionalId: parseInt(req.params.pid) } }); res.json(s); });
app.post('/api/availability', async (req, res) => {
  const { professionalId, schedules } = req.body; try { await prisma.availability.deleteMany({ where: { professionalId: parseInt(professionalId) } }); if(schedules.length>0) await Promise.all(schedules.map(s => prisma.availability.create({ data: { professionalId: parseInt(professionalId), dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime } }))); res.json({ message: 'OK' }); } catch { res.status(500).json({ error: 'Err' }); }
});

// --- CITAS ---
app.get('/api/appointments', async (req, res) => {
  const { professionalId, start, end } = req.query;
  try { const appts = await prisma.appointment.findMany({ where: { professionalId: parseInt(professionalId), startTime: { gte: new Date(start) }, endTime: { lte: new Date(end) } }, include: { patient: true, service: true } }); res.json(appts); } catch { res.status(500).json({ error: 'Err' }); }
});

app.post('/api/appointments', async (req, res) => {
  const { professionalId, serviceCode, startTime, rut, name, email, phone, address, prevision, birthDate } = req.body;
  try {
    const s = await prisma.service.findUnique({ where: { code: serviceCode } });
    if (!s) return res.status(404).json({ error: 'Service not found' });

    const start = new Date(startTime);
    const end = new Date(start.getTime() + s.durationMin * 60000);

    // ANTI-COLISIÓN
    const conflict = await prisma.appointment.findFirst({
        where: { professionalId: parseInt(professionalId), status: { not: 'CANCELLED' }, AND: [ { startTime: { lt: end } }, { endTime: { gt: start } } ] }
    });
    if (conflict) return res.status(409).json({ error: 'Lo sentimos, ese horario ya fue reservado.' });

    let p = await prisma.patient.upsert({
      where: { rut: rut },
      update: { name, email, phone, address: address || null, prevision: prevision || null, birthDate: birthDate ? new Date(birthDate) : null },
      create: { rut, name, email, phone, address: address || null, prevision: prevision || null, birthDate: birthDate ? new Date(birthDate) : null }
    });
    
    let meetLink = null, googleEventId = null;
    if (s.isTelemed || s.name.toLowerCase().includes('tele')) {
      try {
        const gRes = await calendar.events.insert({
          calendarId: 'primary', conferenceDataVersion: 1,
          requestBody: { summary: `Cita CISD: ${name} - ${s.name}`, description: `Cita con ${s.name}. Paciente: ${name}`, start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() }, conferenceData: { createRequest: { requestId: "cisd-" + Date.now(), conferenceSolutionKey: { type: "hangoutsMeet" } } }, attendees: [{ email }] }
        });
        meetLink = gRes.data.hangoutLink; googleEventId = gRes.data.id;
      } catch (e) { console.error('Google Error', e); }
    }

    let preferenceId = null; let paymentLink = null;
    if (s.price > 0 && client) {
      try {
        const preference = new Preference(client);
        const result = await preference.create({
          body: { items: [{ title: `Consulta: ${s.name}`, quantity: 1, unit_price: s.price }], payer: { email: email, name: name }, back_urls: { success: "https://agenda-cisd-web.onrender.com/", failure: "https://agenda-cisd-web.onrender.com/", pending: "https://agenda-cisd-web.onrender.com/" }, auto_return: "approved" }
        });
        preferenceId = result.id; paymentLink = result.init_point;
      } catch (mpError) { console.error("Error MP:", mpError); }
    }

    const appt = await prisma.appointment.create({
      data: { startTime: start, endTime: end, professionalId: parseInt(professionalId), patientId: p.id, serviceId: s.id, meetLink, googleEventId, price: s.price, mpPreferenceId: preferenceId, paymentStatus: 'PENDING' }
    });
    res.json({ ...appt, paymentLink });
  } catch (error) { res.status(500).json({ error: 'Error creating appt' }); }
});

app.put('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const { newStartTime, clinicalNote, paymentStatus, paymentMethod } = req.body;
  try {
    const appointment = await prisma.appointment.findUnique({ where: { id: parseInt(id) }, include: { service: true } });
    if (!appointment) return res.status(404).json({ error: 'Not found' });
    const dataToUpdate = {};
    if (newStartTime) {
      const newStart = new Date(newStartTime);
      const duration = appointment.endTime.getTime() - appointment.startTime.getTime();
      const newEnd = new Date(newStart.getTime() + duration);
      dataToUpdate.startTime = newStart; dataToUpdate.endTime = newEnd;
      if (appointment.googleEventId) { try { await calendar.events.patch({ calendarId: 'primary', eventId: appointment.googleEventId, requestBody: { start: { dateTime: newStart }, end: { dateTime: newEnd } } }); } catch {} }
    }
    if (clinicalNote !== undefined) dataToUpdate.clinicalNote = clinicalNote;
    if (paymentStatus) dataToUpdate.paymentStatus = paymentStatus;
    if (paymentMethod) dataToUpdate.paymentMethod = paymentMethod;
    const updated = await prisma.appointment.update({ where: { id: parseInt(id) }, data: dataToUpdate });
    res.json(updated);
  } catch { res.status(500).json({ error: 'Error update' }); }
});

app.delete('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const appt = await prisma.appointment.findUnique({ where: { id: parseInt(id) } });
    if (appt && appt.googleEventId) { try { await calendar.events.delete({ calendarId: 'primary', eventId: appt.googleEventId }); } catch {} }
    await prisma.appointment.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Error delete' }); }
});

app.listen(port, () => { console.log(`🚀 CISD Ready on port ${port}`); });