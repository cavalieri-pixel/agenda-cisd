// index.js - El cerebro de tu aplicación
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware (Permisos y formato de datos)
app.use(cors()); // Permite que el frontend (React) hable con esto
app.use(express.json()); // Permite leer datos JSON

// --- RUTAS (Los "botones" que apretará el sistema) ---

// 1. Obtener lista de Profesionales
app.get('/api/professionals', async (req, res) => {
  try {
    const professionals = await prisma.professional.findMany();
    res.json(professionals);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener profesionales' });
  }
});

// 2. Obtener lista de Servicios
app.get('/api/services', async (req, res) => {
  try {
    const services = await prisma.service.findMany();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// 3. Obtener Citas de un rango de fechas (Para el calendario)
app.get('/api/appointments', async (req, res) => {
  const { professionalId, start, end } = req.query;
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        professionalId: parseInt(professionalId),
        startTime: {
          gte: new Date(start), // Mayor o igual a fecha inicio
          lte: new Date(end),   // Menor o igual a fecha fin
        },
      },
      include: {
        patient: true,
        service: true,
      }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Error buscando citas' });
  }
});

// 4. Crear una Nueva Cita (Aquí irá la magia de Google Meet después)
app.post('/api/appointments', async (req, res) => {
  const { professionalId, rut, patientName, patientEmail, serviceCode, startTime } = req.body;

  try {
    // A. Buscar o Crear Paciente
    let patient = await prisma.patient.findUnique({ where: { rut } });
    if (!patient) {
      patient = await prisma.patient.create({
        data: { rut, name: patientName, email: patientEmail }
      });
    }

    // B. Buscar el servicio para saber duración y si es Telemedicina
    const service = await prisma.service.findUnique({ where: { code: serviceCode } });
    
    // C. Calcular hora de fin
    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    // D. Lógica Google Meet (Simulada por ahora)
    let meetLink = null;
    if (service.isTelemed) {
      // Aquí conectaremos con la API real de Google más adelante
      meetLink = `https://meet.google.com/simulacion-${Date.now()}`; 
    }

    // E. Guardar la cita
    const newAppointment = await prisma.appointment.create({
      data: {
        startTime: start,
        endTime: end,
        professionalId: parseInt(professionalId),
        patientId: patient.id,
        serviceId: service.id,
        meetLink: meetLink,
        status: 'CONFIRMED'
      }
    });

    res.json(newAppointment);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creando la cita', details: error.message });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor CISD corriendo en http://localhost:${PORT}`);
});