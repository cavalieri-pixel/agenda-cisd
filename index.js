const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // <--- Seguridad
const jwt = require('jsonwebtoken'); // <--- Seguridad

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_cisd_key_2026'; // Llave maestra

app.use(cors());
app.use(express.json());

// --- RUTA 1: LOGIN (EL PORTERO) ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar al usuario
    const professional = await prisma.professional.findUnique({ where: { email } });
    if (!professional) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // 2. Verificar la contraseña (comparar lo escrito con lo encriptado)
    const passwordValid = await bcrypt.compare(password, professional.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // 3. Crear el pase digital (Token)
    const token = jwt.sign(
      { id: professional.id, email: professional.email, name: professional.name },
      JWT_SECRET,
      { expiresIn: '12h' } // La sesión dura 12 horas
    );

    res.json({ token, user: { name: professional.name, email: professional.email } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// --- RUTA 2: OBTENER PROFESIONALES ---
app.get('/api/professionals', async (req, res) => {
  try {
    const professionals = await prisma.professional.findMany();
    res.json(professionals);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener profesionales' });
  }
});

// --- RUTA 3: OBTENER SERVICIOS ---
app.get('/api/services', async (req, res) => {
  try {
    const services = await prisma.service.findMany();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// --- RUTA 4: OBTENER CITAS ---
app.get('/api/appointments', async (req, res) => {
  const { professionalId, start, end } = req.query;
  
  if (!professionalId) {
    return res.status(400).json({ error: 'Falta professionalId' });
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        professionalId: parseInt(professionalId),
        startTime: { gte: new Date(start) },
        endTime: { lte: new Date(end) },
        status: 'CONFIRMED'
      },
      include: {
        patient: true,
        service: true
      }
    });
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cargar citas' });
  }
});

// --- RUTA 5: CREAR CITA ---
app.post('/api/appointments', async (req, res) => {
  const { professionalId, rut, patientName, patientEmail, serviceCode, startTime } = req.body;

  try {
    // 1. Buscar o Crear Paciente
    let patient = await prisma.patient.findUnique({ where: { rut } });
    if (!patient) {
      patient = await prisma.patient.create({
        data: { rut, name: patientName, email: patientEmail }
      });
    }

    // 2. Buscar el servicio para saber duración
    const service = await prisma.service.findUnique({ where: { code: serviceCode } });
    if (!service) return res.status(400).json({ error: 'Servicio no válido' });

    // 3. Calcular hora de fin
    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    // 4. Guardar Cita
    const appointment = await prisma.appointment.create({
      data: {
        startTime: start,
        endTime: end,
        professionalId: parseInt(professionalId),
        patientId: patient.id,
        serviceId: service.id,
        status: 'CONFIRMED'
      }
    });

    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la cita' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor CISD corriendo en http://localhost:${port}`);
});