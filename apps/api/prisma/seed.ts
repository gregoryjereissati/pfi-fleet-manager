import { PrismaClient, UserRole, UserStatus, VehicleStatus, DriverStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleet-manager.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@fleet-manager.com',
      cpf: '000.000.000-00',
      phone: '(85) 99999-0000',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      addressStreet: 'Av. Washington Soares',
      addressNumber: '1321',
      addressDistrict: 'Edson Queiroz',
      addressCity: 'Fortaleza',
      addressState: 'CE',
      addressZip: '60811-341',
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

  console.log('Seed concluído:', { admin: admin.email, vehicle: vehicle.plate, driver: driver.name });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
