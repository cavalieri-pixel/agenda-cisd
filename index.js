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
app.use(express.json());

// --- CONFIGURACIÓN DE GOOGLE CALENDAR ---
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// --- RUTAS EXISTENTES ---

// 1. LOGIN
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
    res.json({ token, user: { name: professional.name, email: professional.email } });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// 2. GET DATOS
app.get('/api/professionals', async (req, res) => {
  const professionals = await prisma.professional.findMany();
  res.json(professionals);
});

app.get('/api/appointments', async (req, res) => {
  const { professionalId, start, end } = req.query;
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        professionalId: parseInt(professionalId),
        startTime: { gte: new Date(start) },
        endTime: { lte: new Date(end) },
      },
      include: { patient: true, service: true }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar citas' });
  }
});

app.get('/api/services', async (req, res) => {
  const services = await prisma.service.findMany();
  res.json(services);
});

// 3. CREAR CITA
app.post('/api/appointments', async (req, res) => {
  const { professionalId, rut, patientName, patientEmail, serviceCode, startTime } = req.body;

  try {
    let patient = await prisma.patient.findUnique({ where: { rut } });
    if (!patient) {
      patient = await prisma.patient.create({ data: { rut, name: patientName, email: patientEmail } });
    }
    const service = await prisma.service.findUnique({ where: { code: serviceCode } });
    
    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    let meetLink = null;
    let googleEventId = null;

    // Crear en Google si corresponde
    const isTelemedicina = service.isTelemed || service.name.toLowerCase().includes('tele');

    if (isTelemedicina) {
      try {
        const response = await calendar.events.insert({
          calendarId: 'primary',
          conferenceDataVersion: 1, 
          requestBody: {
            summary: `Cita CISD: ${patientName} - ${service.name}`,
            description: `Cita médica con ${service.name}. Paciente: ${patientName}`,
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() },
            conferenceData: {
              createRequest: { requestId: "cisd-" + Date.now(), conferenceSolutionKey: { type: "hangoutsMeet" } }
            },
            attendees: [{ email: patientEmail }] 
          }
        });
        meetLink = response.data.hangoutLink; 
        googleEventId = response.data.id;
      } catch (googleError) {
        console.error("Error Google:", googleError);
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        startTime: start,
        endTime: end,
        professionalId: parseInt(professionalId),
        patientId: patient.id,
        serviceId: service.id,
        status: 'CONFIRMED',
        meetLink: meetLink, 
        googleEventId: googleEventId
      }
    });

    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la cita' });
  }
});

// --- RUTA NUEVA: 4. ELIMINAR CITA ---
app.delete('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Buscar la cita para ver si tiene evento de Google
    const appointment = await prisma.appointment.findUnique({ where: { id: parseInt(id) } });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    // 2. Si tiene ID de Google, lo borramos de la nube
    if (appointment.googleEventId) {
      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: appointment.googleEventId
        });
        console.log("Evento eliminado de Google Calendar correctamente.");
      } catch (gError) {
        console.error("Error al borrar de Google (puede que ya no exista):", gError.message);
        // Seguimos adelante para borrarla de la base de datos local aunque falle Google
      }
    }

    // 3. Borrar de la base de datos local
    await prisma.appointment.delete({ where: { id: parseInt(id) } });

    res.json({ message: 'Cita eliminada correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la cita' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor CISD corriendo en http://localhost:${port}`);
});