import { PrismaClient, UserRole, VehicleStatus, DriverStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleet-manager.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@fleet-manager.com',
      role: UserRole.ADMIN,
      auth0Id: 'auth0|seed-admin-000',
    },
  });

  const vehicle = await prisma.vehicle.upsert({
    where: { plate: 'ABC-1234' },
    update: {},
    create: {
      plate: 'ABC-1234',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2022,
      color: 'Prata',
      status: VehicleStatus.ACTIVE,
    },
  });

  const driver = await prisma.driver.upsert({
    where: { cpf: '123.456.789-00' },
    update: {},
    create: {
      name: 'João Silva',
      cpf: '123.456.789-00',
      cnh: '12345678901',
      cnhExpiry: new Date('2027-12-31'),
      phone: '(85) 99999-0001',
      status: DriverStatus.ACTIVE,
    },
  });

  console.log('Seed concluído:', { admin, vehicle, driver });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
