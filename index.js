require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_cisd_key_2026';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- 1. CONFIGURACIÓN DE GOOGLE CALENDAR ---
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// ==========================================
//               RUTAS DE LA API
// ==========================================

// --- 2. AUTENTICACIÓN (LOGIN) ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const professional = await prisma.professional.findUnique({ where: { email } });
    if (!professional) return res.status(401).json({ error: 'Usuario no encontrado' });

    const passwordValid = await bcrypt.compare(password, professional.password);
    if (!passwordValid) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign(
      { id: professional.id, email: professional.email, name: professional.name },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({ token, user: { id: professional.id, name: professional.name, email: professional.email } });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// ==========================================
//      RUTAS PÚBLICAS (AGENDAMIENTO)
// ==========================================

// 1. Obtener huecos disponibles (Calculadora de Horas)
app.get('/api/public/slots', async (req, res) => {
  const { date, professionalId, duration } = req.query; // Formato fecha: YYYY-MM-DD
  
  try {
    const searchDate = new Date(date);
    // getDay() devuelve: 0=Dom, 1=Lun, etc. (Ajusta según tu zona horaria si es necesario)
    // Nota: new Date('2023-10-23') asume UTC, asegúrate que el frontend envíe fecha correcta.
    // Usaremos getUTCDay para evitar saltos de día por zona horaria en la fecha string
    const dayOfWeek = searchDate.getUTCDay(); 
    
    // A. Buscar el horario base del profesional para ese día
    const schedule = await prisma.availability.findFirst({
      where: {
        professionalId: parseInt(professionalId),
        dayOfWeek: dayOfWeek
      }
    });

    if (!schedule) return res.json([]); // No trabaja ese día

    // B. Buscar citas existentes ese día para restar
    const startOfDay = new Date(date); 
    startOfDay.setUTCHours(0,0,0,0);
    const endOfDay = new Date(date); 
    endOfDay.setUTCHours(23,59,59,999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId: parseInt(professionalId),
        startTime: { gte: startOfDay },
        endTime: { lte: endOfDay },
        status: { not: 'CANCELLED' }
      }
    });

    // C. Generar bloques de tiempo (Matemática de Slots)
    const slots = [];
    
    // Auxiliar: Convertir "09:00" a minutos
    const toMins = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    // Auxiliar: Convertir minutos a "HH:MM"
    const toTimeStr = (mins) => {
      const h = Math.floor(mins / 60).toString().padStart(2, '0');
      const m = (mins % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    let currentMins = toMins(schedule.startTime);
    const endMins = toMins(schedule.endTime);
    const serviceDuration = parseInt(duration) || 30;

    // Iterar cada bloque posible
    while (currentMins + serviceDuration <= endMins) {
      const slotStart = currentMins;
      const slotEnd = currentMins + serviceDuration;

      // Verificar colisión con citas existentes
      const isBusy = existingAppointments.some(appt => {
        // Convertimos la hora de la cita (UTC) a minutos del día para comparar
        const apptH = appt.startTime.getUTCHours();
        const apptM = appt.startTime.getUTCMinutes();
        const apptStart = apptH * 60 + apptM;
        
        const apptEH = appt.endTime.getUTCHours();
        const apptEM = appt.endTime.getUTCMinutes();
        const apptEnd = apptEH * 60 + apptEM;
        
        // Lógica de solapamiento: (StartA < EndB) y (EndA > StartB)
        return (slotStart < apptEnd && slotEnd > apptStart);
      });

      if (!isBusy) {
        slots.push(toTimeStr(slotStart));
      }

      // Saltamos al siguiente intervalo (cada 30 min para dar opciones variadas)
      currentMins += 30; 
    }

    res.json(slots);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error calculando horarios' });
  }
});

// ==========================================
//          GESTIÓN DE PACIENTES
// ==========================================

app.get('/api/patients', async (req, res) => {
  try { const patients = await prisma.patient.findMany({ orderBy: { name: 'asc' } }); res.json(patients); } 
  catch { res.status(500).json({ error: 'Error al obtener pacientes' }); }
});

app.post('/api/patients', async (req, res) => {
  const { rut, name, email, phone } = req.body;
  try {
    const newPatient = await prisma.patient.create({ data: { rut, name, email, phone } });
    res.json(newPatient);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'El RUT ya existe' });
    res.status(500).json({ error: 'Error al crear paciente' });
  }
});

app.put('/api/patients/:id', async (req, res) => {
  const { id } = req.params;
  const { rut, name, email, phone } = req.body;
  try {
    const updated = await prisma.patient.update({ where: { id: parseInt(id) }, data: { rut, name, email, phone } });
    res.json(updated);
  } catch { res.status(500).json({ error: 'Error al actualizar paciente' }); }
});

app.delete('/api/patients/:id', async (req, res) => {
  try { await prisma.patient.delete({ where: { id: parseInt(req.params.id) } }); res.json({ message: 'Paciente eliminado' }); }
  catch { res.status(500).json({ error: 'No se puede eliminar (tiene historial)' }); }
});

app.get('/api/patients/:id/history', async (req, res) => {
  try {
    const history = await prisma.appointment.findMany({
      where: { patientId: parseInt(req.params.id) },
      include: { service: true, professional: true },
      orderBy: { startTime: 'desc' }
    });
    res.json(history);
  } catch { res.status(500).json({ error: 'Error al obtener historial' }); }
});

// --- 3. GESTIÓN DE PROFESIONALES ---
app.get('/api/professionals', async (req, res) => { const p = await prisma.professional.findMany(); res.json(p); });

app.post('/api/professionals', async (req, res) => {
  const { name, email, password, color, phone } = req.body;
  try {
    const hp = await bcrypt.hash(password, 10);
    const np = await prisma.professional.create({ data: { name, email, password: hp, color, phone } });
    res.json(np);
  } catch { res.status(500).json({ error: 'Error crear prof' }); }
});

app.put('/api/professionals/:id', async (req, res) => {
  const { name, email, color, phone } = req.body;
  try { const up = await prisma.professional.update({ where: { id: parseInt(req.params.id) }, data: { name, email, color, phone } }); res.json(up); }
  catch { res.status(500).json({ error: 'Error update' }); }
});

app.delete('/api/professionals/:id', async (req, res) => {
  try { await prisma.professional.delete({ where: { id: parseInt(req.params.id) } }); res.json({ message: 'Deleted' }); }
  catch { res.status(500).json({ error: 'Error delete' }); }
});

app.post('/api/professionals/import', async (req, res) => {
  const { data } = req.body; let count=0;
  for(const i of data) {
    try {
      const hp = await bcrypt.hash(i.password || 'cisd123', 10);
      await prisma.professional.create({ data: { name: i.name, email: i.email, password: hp, phone: i.phone||'', color: i.color||'#3788d8'} });
      count++;
    } catch {}
  }
  res.json({ message: `Procesados: ${count}` });
});

app.get('/api/professionals/export', async (req, res) => {
  const p = await prisma.professional.findMany();
  let csv = 'name,email,phone,color\n';
  p.forEach(x => csv+=`"${x.name}","${x.email}","${x.phone||''}","${x.color}"\n`);
  res.header('Content-Type','text/csv').attachment('profesionales.csv').send(csv);
});

// --- 4. SERVICIOS ---
app.get('/api/services', async (req, res) => { const s = await prisma.service.findMany(); res.json(s); });

app.post('/api/services', async (req, res) => {
  const { name, code, durationMin, price, isTelemed } = req.body;
  try { const ns = await prisma.service.create({ data: { name, code, durationMin: parseInt(durationMin), price: parseInt(price), isTelemed } }); res.json(ns); }
  catch { res.status(500).json({ error: 'Error crear servicio' }); }
});

app.put('/api/services/:id', async (req, res) => {
  const { name, durationMin, price, isTelemed } = req.body;
  try { const us = await prisma.service.update({ where: { id: parseInt(req.params.id) }, data: { name, durationMin: parseInt(durationMin), price: parseInt(price), isTelemed } }); res.json(us); }
  catch { res.status(500).json({ error: 'Error update' }); }
});

app.delete('/api/services/:id', async (req, res) => {
  try { await prisma.service.delete({ where: { id: parseInt(req.params.id) } }); res.json({ message: 'Deleted' }); }
  catch { res.status(500).json({ error: 'Error delete' }); }
});

app.post('/api/services/import', async (req, res) => {
  const { data } = req.body; let count=0;
  for(const i of data) {
    try {
      const isT = String(i.isTelemed).toLowerCase();
      await prisma.service.create({ data: { name: i.name, code: i.code, durationMin: parseInt(i.durationMin)||30, price: parseInt(i.price)||0, isTelemed: (isT==='true'||isT==='si') } });
      count++;
    } catch {}
  }
  res.json({ message: `Procesados: ${count}` });
});

app.get('/api/services/export', async (req, res) => {
  const s = await prisma.service.findMany();
  let csv = 'name,code,durationMin,price,isTelemed\n';
  s.forEach(x => csv+=`"${x.name}","${x.code}",${x.durationMin},${x.price},${x.isTelemed}\n`);
  res.header('Content-Type','text/csv').attachment('servicios.csv').send(csv);
});

// --- 5. HORARIOS ---
app.get('/api/availability/:pid', async (req, res) => {
  const s = await prisma.availability.findMany({ where: { professionalId: parseInt(req.params.pid) } }); res.json(s);
});

app.post('/api/availability', async (req, res) => {
  const { professionalId, schedules } = req.body;
  try {
    await prisma.availability.deleteMany({ where: { professionalId: parseInt(professionalId) } });
    if(schedules.length>0) {
      await Promise.all(schedules.map(s => prisma.availability.create({ data: { professionalId: parseInt(professionalId), dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime } })));
    }
    res.json({ message: 'OK' });
  } catch { res.status(500).json({ error: 'Error' }); }
});

// --- 6. CITAS ---
app.get('/api/appointments', async (req, res) => {
  const { professionalId, start, end } = req.query;
  try {
    const appts = await prisma.appointment.findMany({
      where: { professionalId: parseInt(professionalId), startTime: { gte: new Date(start) }, endTime: { lte: new Date(end) } },
      include: { patient: true, service: true }
    });
    res.json(appts);
  } catch { res.status(500).json({ error: 'Error loading' }); }
});

app.post('/api/appointments', async (req, res) => {
  const { professionalId, rut, patientName, patientEmail, serviceCode, startTime } = req.body;
  try {
    let p = await prisma.patient.findUnique({ where: { rut } });
    if (!p) p = await prisma.patient.create({ data: { rut, name: patientName, email: patientEmail } });
    
    const s = await prisma.service.findUnique({ where: { code: serviceCode } });
    if (!s) return res.status(404).json({ error: 'Service not found' });

    const start = new Date(startTime);
    const end = new Date(start.getTime() + s.durationMin * 60000);
    let meetLink = null, googleEventId = null;

    if (s.isTelemed || s.name.toLowerCase().includes('tele')) {
      try {
        const gRes = await calendar.events.insert({
          calendarId: 'primary', conferenceDataVersion: 1,
          requestBody: {
            summary: `Cita CISD: ${patientName} - ${s.name}`, description: `Cita con ${s.name}`,
            start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() },
            conferenceData: { createRequest: { requestId: "cisd-" + Date.now(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
            attendees: [{ email: patientEmail }]
          }
        });
        meetLink = gRes.data.hangoutLink; googleEventId = gRes.data.id;
      } catch (e) { console.error('Google Error', e); }
    }
    const appt = await prisma.appointment.create({
      data: { startTime: start, endTime: end, professionalId: parseInt(professionalId), patientId: p.id, serviceId: s.id, meetLink, googleEventId }
    });
    res.json(appt);
  } catch { res.status(500).json({ error: 'Error creating appt' }); }
});

// --- RUTA MODIFICADA: EDITAR / MOVER / AGREGAR NOTA CLÍNICA ---
app.put('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const { newStartTime, clinicalNote } = req.body; // <--- Aceptamos nota clínica

  try {
    const appointment = await prisma.appointment.findUnique({ 
      where: { id: parseInt(id) },
      include: { service: true } 
    });

    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });

    const dataToUpdate = {};

    // 1. SI HAY CAMBIO DE HORA
    if (newStartTime) {
      const newStart = new Date(newStartTime);
      const durationMs = appointment.endTime.getTime() - appointment.startTime.getTime();
      const newEnd = new Date(newStart.getTime() + durationMs);
      
      dataToUpdate.startTime = newStart;
      dataToUpdate.endTime = newEnd;

      // Actualizar Google
      if (appointment.googleEventId) {
        try {
          await calendar.events.patch({
            calendarId: 'primary',
            eventId: appointment.googleEventId,
            requestBody: {
              start: { dateTime: newStart.toISOString() },
              end: { dateTime: newEnd.toISOString() }
            }
          });
        } catch (gError) { console.error("Error Google Update:", gError.message); }
      }
    }

    // 2. SI HAY NOTA CLÍNICA
    if (clinicalNote !== undefined) {
      dataToUpdate.clinicalNote = clinicalNote;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: dataToUpdate
    });

    res.json(updatedAppointment);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la cita' });
  }
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

app.listen(port, () => { console.log(`🚀 Servidor CISD Completo corriendo en http://localhost:${port}`); });