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
app.use(express.json({ limit: '10mb' })); // Aumentamos límite para subidas masivas

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

// --- NUEVO: GESTIÓN DE PACIENTES ---

// Obtener todos
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({ orderBy: { name: 'asc' } });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
});

// Crear Paciente
app.post('/api/patients', async (req, res) => {
  const { rut, name, email, phone } = req.body;
  try {
    const newPatient = await prisma.patient.create({
      data: { rut, name, email, phone }
    });
    res.json(newPatient);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'El RUT ya existe' });
    res.status(500).json({ error: 'Error al crear paciente' });
  }
});

// Editar Paciente
app.put('/api/patients/:id', async (req, res) => {
  const { id } = req.params;
  const { rut, name, email, phone } = req.body;
  try {
    const updated = await prisma.patient.update({
      where: { id: parseInt(id) },
      data: { rut, name, email, phone }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar paciente' });
  }
});

// Eliminar Paciente
app.delete('/api/patients/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.patient.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Paciente eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'No se puede eliminar (probablemente tenga citas asociadas)' });
  }
});

// Obtener Historial de un Paciente
app.get('/api/patients/:id/history', async (req, res) => {
  const { id } = req.params;
  try {
    const history = await prisma.appointment.findMany({
      where: { patientId: parseInt(id) },
      include: { service: true, professional: true },
      orderBy: { startTime: 'desc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});


// --- 3. GESTIÓN DE PROFESIONALES (CRUD + CSV) ---

// Obtener todos
app.get('/api/professionals', async (req, res) => {
  const professionals = await prisma.professional.findMany();
  res.json(professionals);
});

// Crear Uno
app.post('/api/professionals', async (req, res) => {
  const { name, email, password, color, phone } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newProf = await prisma.professional.create({
      data: { name, email, password: hashedPassword, color, phone }
    });
    res.json(newProf);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear profesional (quizás el email ya existe)' });
  }
});

// Editar Uno
app.put('/api/professionals/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, color, phone } = req.body;
  try {
    const updated = await prisma.professional.update({
      where: { id: parseInt(id) },
      data: { name, email, color, phone }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar profesional' });
  }
});

// Eliminar Uno
app.delete('/api/professionals/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.professional.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Profesional eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'No se puede eliminar (probablemente tenga citas asociadas)' });
  }
});

// ** IMPORTAR MASIVO (CSV/JSON) **
app.post('/api/professionals/import', async (req, res) => {
  const { data } = req.body; 
  let successCount = 0;
  let errors = [];

  if (!data || !Array.isArray(data)) return res.status(400).json({ error: 'Formato inválido' });

  for (const item of data) {
    try {
      // Contraseña por defecto si viene vacía en el CSV: 'cisd123'
      const passwordRaw = item.password && item.password.trim() !== '' ? String(item.password) : 'cisd123';
      const hashedPassword = await bcrypt.hash(passwordRaw, 10);
      
      await prisma.professional.create({
        data: {
          name: item.name,
          email: item.email,
          password: hashedPassword,
          phone: item.phone || '',
          color: item.color || '#3788d8'
        }
      });
      successCount++;
    } catch (error) {
      errors.push(`Error con ${item.email}: ${error.code === 'P2002' ? 'Email duplicado' : 'Datos inválidos'}`);
    }
  }
  res.json({ message: `Procesados: ${successCount}. Errores: ${errors.length}`, errors });
});

// ** EXPORTAR CSV **
app.get('/api/professionals/export', async (req, res) => {
  try {
    const pros = await prisma.professional.findMany();
    let csv = 'name,email,phone,color\n'; // Cabecera
    pros.forEach(p => {
      csv += `"${p.name}","${p.email}","${p.phone || ''}","${p.color}"\n`;
    });
    res.header('Content-Type', 'text/csv');
    res.attachment('profesionales_cisd.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Error al exportar' });
  }
});

// --- 4. GESTIÓN DE SERVICIOS / ESPECIALIDADES (CRUD + CSV) ---

// Obtener todos
app.get('/api/services', async (req, res) => {
  const services = await prisma.service.findMany();
  res.json(services);
});

// Crear Uno
app.post('/api/services', async (req, res) => {
  const { name, code, durationMin, price, isTelemed } = req.body;
  try {
    const newService = await prisma.service.create({
      data: { 
        name, 
        code, 
        durationMin: parseInt(durationMin), 
        price: parseInt(price), 
        isTelemed: isTelemed || false 
      }
    });
    res.json(newService);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

// Editar Uno
app.put('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  const { name, durationMin, price, isTelemed } = req.body;
  try {
    const updated = await prisma.service.update({
      where: { id: parseInt(id) },
      data: { 
        name, 
        durationMin: parseInt(durationMin), 
        price: parseInt(price), 
        isTelemed 
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

// Eliminar Uno
app.delete('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.service.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Servicio eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

// ** IMPORTAR MASIVO (CSV/JSON) **
app.post('/api/services/import', async (req, res) => {
  const { data } = req.body;
  let successCount = 0;
  let errors = [];

  for (const item of data) {
    try {
      // Convertir "true"/"SI" a booleano real
      const isTelemedVal = String(item.isTelemed).toLowerCase();
      const booleanTelemed = isTelemedVal === 'true' || isTelemedVal === 'si' || isTelemedVal === '1';

      await prisma.service.create({
        data: {
          name: item.name,
          code: item.code,
          durationMin: parseInt(item.durationMin) || 30,
          price: parseInt(item.price) || 0,
          isTelemed: booleanTelemed
        }
      });
      successCount++;
    } catch (error) {
      errors.push(`Error con ${item.code}: ${error.code === 'P2002' ? 'Código duplicado' : 'Datos inválidos'}`);
    }
  }
  res.json({ message: `Procesados: ${successCount}. Errores: ${errors.length}`, errors });
});

// ** EXPORTAR CSV **
app.get('/api/services/export', async (req, res) => {
  try {
    const services = await prisma.service.findMany();
    let csv = 'name,code,durationMin,price,isTelemed\n';
    services.forEach(s => {
      csv += `"${s.name}","${s.code}",${s.durationMin},${s.price},${s.isTelemed}\n`;
    });
    res.header('Content-Type', 'text/csv');
    res.attachment('especialidades_cisd.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Error al exportar' });
  }
});

// --- 5. GESTIÓN DE DISPONIBILIDAD (HORARIOS) ---

// Obtener horarios de un médico
app.get('/api/availability/:professionalId', async (req, res) => {
  const { professionalId } = req.params;
  try {
    const slots = await prisma.availability.findMany({
      where: { professionalId: parseInt(professionalId) }
    });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
});

// Guardar horarios (Sobrescribe los anteriores)
app.post('/api/availability', async (req, res) => {
  const { professionalId, schedules } = req.body; 
  try {
    // 1. Limpiar horario anterior
    await prisma.availability.deleteMany({
      where: { professionalId: parseInt(professionalId) }
    });

    // 2. Crear nuevos bloques
    if (schedules && schedules.length > 0) {
      await Promise.all(schedules.map(slot => 
        prisma.availability.create({
          data: {
            professionalId: parseInt(professionalId),
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime
          }
        })
      ));
    }
    res.json({ message: 'Horarios actualizados correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar horarios' });
  }
});

// --- 6. GESTIÓN DE CITAS (AGENDA) ---

// Obtener Citas (Filtradas por fecha y profesional)
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

// Crear Cita (Con integración Google Meet)
app.post('/api/appointments', async (req, res) => {
  const { professionalId, rut, patientName, patientEmail, serviceCode, startTime } = req.body;

  try {
    // 1. Buscar o Crear Paciente
    let patient = await prisma.patient.findUnique({ where: { rut } });
    if (!patient) {
      patient = await prisma.patient.create({ data: { rut, name: patientName, email: patientEmail } });
    }
    
    // 2. Buscar Servicio para calcular duración
    const service = await prisma.service.findUnique({ where: { code: serviceCode } });
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    let meetLink = null;
    let googleEventId = null;

    // 3. Crear evento en Google Calendar si es Telemedicina
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
        console.error("Error conectando con Google Calendar:", googleError);
      }
    }

    // 4. Guardar Cita en Base de Datos
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

// Mover Cita (Drag & Drop - Actualiza Google Calendar)
app.put('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const { newStartTime } = req.body;

  try {
    const appointment = await prisma.appointment.findUnique({ 
      where: { id: parseInt(id) },
      include: { service: true } 
    });

    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });

    const newStart = new Date(newStartTime);
    const durationMs = appointment.endTime.getTime() - appointment.startTime.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);

    // Actualizar en Google Calendar
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
        console.log("Cita movida en Google Calendar correctamente.");
      } catch (gError) {
        console.error("Error moviendo evento en Google:", gError.message);
      }
    }

    // Actualizar en BD Local
    const updatedAppointment = await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: {
        startTime: newStart,
        endTime: newEnd
      }
    });

    res.json(updatedAppointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al mover la cita' });
  }
});

// Eliminar Cita (Borra de Google Calendar también)
app.delete('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const appointment = await prisma.appointment.findUnique({ where: { id: parseInt(id) } });
    
    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });

    // Borrar de Google Calendar
    if (appointment.googleEventId) {
      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: appointment.googleEventId
        });
        console.log("Evento eliminado de Google Calendar.");
      } catch (gError) {
        console.error("Error al borrar de Google:", gError.message);
      }
    }

    // Borrar de BD Local
    await prisma.appointment.delete({ where: { id: parseInt(id) } });

    res.json({ message: 'Cita eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la cita' });
  }
});

// --- INICIAR SERVIDOR ---
app.listen(port, () => {
  console.log(`🚀 Servidor CISD Completo corriendo en http://localhost:${port}`);
});