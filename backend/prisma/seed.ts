import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo1234';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log('Demo user already exists, nothing to do');
    return;
  }

  const user = await prisma.user.create({
    data: { name: 'Demo User', email: DEMO_EMAIL, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10) },
  });

  const website = await prisma.project.create({
    data: {
      name: 'Company website',
      description: 'Redesign of the marketing site',
      userId: user.id,
      tasks: {
        create: [
          { title: 'Collect requirements', status: 'DONE', priority: 'HIGH', dueDate: new Date('2026-10-05') },
          { title: 'Wireframes', status: 'DONE', priority: 'MEDIUM', dueDate: new Date('2026-10-12') },
          { title: 'Build landing page', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date('2026-10-28') },
          { title: 'Write blog section', status: 'TODO', priority: 'LOW', dueDate: new Date('2026-11-10') },
          { title: 'SEO review', status: 'TODO', priority: 'MEDIUM', dueDate: new Date('2026-11-15') },
          { title: 'Set up analytics', status: 'TODO', priority: 'LOW' },
          { title: 'Contact form', status: 'IN_PROGRESS', priority: 'MEDIUM', dueDate: new Date('2026-10-30') },
          { title: 'Performance audit', status: 'TODO', priority: 'HIGH', dueDate: new Date('2026-11-20') },
          { title: 'Accessibility pass', status: 'TODO', priority: 'MEDIUM' },
          { title: 'Launch checklist', status: 'TODO', priority: 'HIGH', dueDate: new Date('2026-11-30') },
          { title: 'Fix header on mobile', status: 'DONE', priority: 'HIGH', dueDate: new Date('2026-10-15') },
          { title: 'Cookie banner', status: 'TODO', priority: 'LOW' },
        ],
      },
    },
  });

  await prisma.project.create({
    data: {
      name: 'Mobile app',
      description: 'iOS and Android companion app',
      status: 'ACTIVE',
      userId: user.id,
      tasks: {
        create: [
          { title: 'Auth screens', status: 'DONE', priority: 'HIGH', dueDate: new Date('2026-10-10') },
          { title: 'Push notifications', status: 'IN_PROGRESS', priority: 'MEDIUM', dueDate: new Date('2026-11-05') },
          { title: 'Offline mode', status: 'TODO', priority: 'LOW' },
        ],
      },
    },
  });

  await prisma.project.create({
    data: { name: 'Q3 reporting', description: 'Finished last quarter', status: 'COMPLETED', userId: user.id },
  });

  console.log(`Seeded ${DEMO_EMAIL} / ${DEMO_PASSWORD} with project "${website.name}" and others`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
