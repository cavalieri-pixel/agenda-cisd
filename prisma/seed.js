// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la carga de datos del CISD...');

  // 1. CARGAR PROFESIONALES
  // Datos extraídos de tu HTML (nombres y colores visuales)
  const profesionales = [
    { name: 'Fernanda Dreyse', email: 'fernanda@cisd.cl', color: '#6d9eeb' }, // Color azulado
    { name: 'Antonia Vasquez', email: 'antonia@cisd.cl', color: '#ff00ff' }, // Color magenta
    { name: 'Bastian Miño', email: 'bastian@cisd.cl', color: '#6d9eeb' },
    { name: 'Javiera Ayala', email: 'javiera@cisd.cl', color: '#6d9eeb' },
    { name: 'Katerine Navarrete', email: 'katerine@cisd.cl', color: '#6d9eeb' },
    { name: 'Valentina Leiva V.', email: 'valentina@cisd.cl', color: '#6d9eeb' },
  ];

  console.log('... Creando Profesionales');
  for (const prof of profesionales) {
    await prisma.professional.upsert({
      where: { email: prof.email },
      update: {},
      create: prof,
    });
  }

  // 2. CARGAR SERVICIOS
  // Datos extraídos de los <select> y variables JS de tu código original
  const servicios = [
    // Fonoaudiología
    { code: 'FA-DOM-ALR', name: 'Atención Fonoaudiología Adulto | Alrededor de Santiago', durationMin: 45, isTelemed: false },
    { code: 'FA-DOM-CEN', name: 'Atención Fonoaudiología Adulto | Domicilio zona centro RM', durationMin: 30, isTelemed: false },
    { code: 'FA-TEL', name: 'Fonoaudiología adulto | Telemedicina', durationMin: 45, isTelemed: true },
    
    // Psicología
    { code: 'PA-DOM-ALR', name: 'Atención Psicología Adulto | Domicilio Alrededor', durationMin: 45, isTelemed: false },
    { code: 'PA-PRE-PV', name: 'Atención Psicología Adulto | Presencial Providencia', durationMin: 30, isTelemed: false },
    { code: 'PA-TEL', name: 'Psicología Adulto Telemedicina', durationMin: 45, isTelemed: true },
    { code: 'PI-TEL', name: 'Psicología Infanto-Juvenil Telemedicina', durationMin: 45, isTelemed: true },

    // Evaluaciones y Procedimientos
    { code: 'DX-EVAL', name: 'Evaluación de caso | Derivación clínica', durationMin: 15, isTelemed: true },
    { code: 'SR-OTOS', name: 'Otoscopía + lavado de oídos', durationMin: 30, isTelemed: false },

    // Matrona / Teleconsulta
    { code: 'MT-TEL-GIN', name: 'Teleconsulta ginecológica', durationMin: 25, isTelemed: true },
    { code: 'MT-TEL-ANT', name: 'Teleconsulta anticonceptiva', durationMin: 25, isTelemed: true },

    // Terapia Ocupacional
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