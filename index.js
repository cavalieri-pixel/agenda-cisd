require('dotenv').config(); // <--- IMPORTANTE: Carga el archivo .env
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

// --- CONFIGURACIÓN DE GOOGLE CALENDAR (SEGURA) ---
// Ahora lee las variables desde process.env (el archivo oculto)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// --- RUTA 1: LOGIN ---
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

// --- RUTA 2: OBTENER DATOS ---
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
        status: 'CONFIRMED'
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

// --- RUTA 3: CREAR CITA (CON GOOGLE MEET) ---
app.post('/api/appointments', async (req, res) => {
  const { professionalId, rut, patientName, patientEmail, serviceCode, startTime } = req.body;

  try {
    // 1. Buscar Paciente y Servicio
    let patient = await prisma.patient.findUnique({ where: { rut } });
    if (!patient) {
      patient = await prisma.patient.create({ data: { rut, name: patientName, email: patientEmail } });
    }
    const service = await prisma.service.findUnique({ where: { code: serviceCode } });
    
    // 2. Calcular Fechas
    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    let meetLink = null;
    let googleEventId = null;

    // 3. SI ES TELEMEDICINA -> CREAR EVENTO EN GOOGLE
    const isTelemedicina = service.isTelemed || service.name.toLowerCase().includes('tele');

    if (isTelemedicina) {
      try {
        console.log("Generando enlace de Google Meet...");
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
            attendees: [
              { email: patientEmail } 
            ]
          }
        });

        meetLink = response.data.hangoutLink; 
        googleEventId = response.data.id;
        console.log("Link creado:", meetLink);

      } catch (googleError) {
        console.error("Error conectando con Google Calendar:", googleError);
      }
    }

    // 4. Guardar en Base de Datos
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

app.listen(port, () => {
  console.log(`🚀 Servidor CISD conectado a Google en http://localhost:${port}`);
});