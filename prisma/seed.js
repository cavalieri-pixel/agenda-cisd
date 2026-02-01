// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // <--- IMPORTANTE: Necesitamos esto para la seguridad
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la carga de datos del CISD...');

  // Generamos la contraseña encriptada para todos: "cisd2026"
  const passwordEncriptada = await bcrypt.hash('cisd2026', 10);

  // 1. CARGAR PROFESIONALES
  const profesionales = [
    { name: 'Fernanda Dreyse', email: 'fernanda@cisd.cl', color: '#6d9eeb' },
    { name: 'Antonia Vasquez', email: 'antonia@cisd.cl', color: '#ff00ff' },
    { name: 'Bastian Miño', email: 'bastian@cisd.cl', color: '#6d9eeb' },
    { name: 'Javiera Ayala', email: 'javiera@cisd.cl', color: '#6d9eeb' },
    { name: 'Katerine Navarrete', email: 'katerine@cisd.cl', color: '#6d9eeb' },
    { name: 'Valentina Leiva V.', email: 'valentina@cisd.cl', color: '#6d9eeb' },
  ];

  console.log('... Actualizando Profesionales con contraseña');
  for (const prof of profesionales) {
    await prisma.professional.upsert({
      where: { email: prof.email },
      // Si el usuario ya existe, LE PONEMOS LA CONTRASEÑA NUEVA
      update: {
        password: passwordEncriptada 
      },
      // Si es nuevo, lo creamos con todos sus datos + contraseña
      create: {
        ...prof,
        password: passwordEncriptada 
      },
    });
  }

  // 2. CARGAR SERVICIOS (Esto queda igual)
  const servicios = [
    { code: 'FA-DOM-ALR', name: 'Atención Fonoaudiología Adulto | Alrededor de Santiago', durationMin: 45, isTelemed: false },
    { code: 'FA-DOM-CEN', name: 'Atención Fonoaudiología Adulto | Domicilio zona centro RM', durationMin: 30, isTelemed: false },
    { code: 'FA-TEL', name: 'Fonoaudiología adulto | Telemedicina', durationMin: 45, isTelemed: true },
    { code: 'PA-DOM-ALR', name: 'Atención Psicología Adulto | Domicilio Alrededor', durationMin: 45, isTelemed: false },
    { code: 'PA-PRE-PV', name: 'Atención Psicología Adulto | Presencial Providencia', durationMin: 30, isTelemed: false },
    { code: 'PA-TEL', name: 'Psicología Adulto Telemedicina', durationMin: 45, isTelemed: true },
    { code: 'PI-TEL', name: 'Psicología Infanto-Juvenil Telemedicina', durationMin: 45, isTelemed: true },
    { code: 'DX-EVAL', name: 'Evaluación de caso | Derivación clínica', durationMin: 15, isTelemed: true },
    { code: 'SR-OTOS', name: 'Otoscopía + lavado de oídos', durationMin: 30, isTelemed: false },
    { code: 'MT-TEL-GIN', name: 'Teleconsulta ginecológica', durationMin: 25, isTelemed: true },
    { code: 'MT-TEL-ANT', name: 'Teleconsulta anticonceptiva', durationMin: 25, isTelemed: true },
    { code: 'TOI-DOM-ALR', name: 'Atención TO Infanto-Juvenil | Alrededor Stgo', durationMin: 45, isTelemed: false },
    { code: 'TOA-TEL', name: 'Terapia Ocupacional Adulto Telemedicina', durationMin: 45, isTelemed: true },
  ];

  console.log('... Creando Servicios Médicos');
  for (const serv of servicios) {
    await prisma.service.upsert({
      where: { code: serv.code },
      update: {},
      create: serv,
    });
  }

  console.log('✅ Carga de datos finalizada con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });