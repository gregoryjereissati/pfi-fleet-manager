import {
  DocumentType,
  DriverStatus,
  ExpenseType,
  MaintenanceStatus,
  MaintenanceType,
  PrismaClient,
  UserRole,
  UserStatus,
  VehicleStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@fleet-manager.com' },
    update: {
      name: 'Administrador',
      cpf: '00000000000',
      phone: '(85) 99999-0000',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      addressStreet: 'Av. Washington Soares',
      addressNumber: '1321',
      addressDistrict: 'Edson Queiroz',
      addressCity: 'Fortaleza',
      addressState: 'CE',
      addressZip: '60811-341',
    },
    create: {
      name: 'Administrador',
      email: 'admin@fleet-manager.com',
      cpf: '00000000000',
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

  await prisma.user.upsert({
    where: { email: 'gerente@fleet-manager.com' },
    update: {
      name: 'Lucas Andrade',
      cpf: '11122233344',
      phone: '(85) 98888-1111',
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      addressStreet: 'Rua Tibúrcio Cavalcante',
      addressNumber: '540',
      addressDistrict: 'Meireles',
      addressCity: 'Fortaleza',
      addressState: 'CE',
      addressZip: '60125-100',
    },
    create: {
      name: 'Lucas Andrade',
      email: 'gerente@fleet-manager.com',
      cpf: '11122233344',
      phone: '(85) 98888-1111',
      passwordHash,
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      addressStreet: 'Rua Tibúrcio Cavalcante',
      addressNumber: '540',
      addressDistrict: 'Meireles',
      addressCity: 'Fortaleza',
      addressState: 'CE',
      addressZip: '60125-100',
    },
  });

  await prisma.user.upsert({
    where: { email: 'operador@fleet-manager.com' },
    update: {
      name: 'Patrícia Lima',
      cpf: '55566677788',
      phone: '(85) 97777-2222',
      role: UserRole.OPERATOR,
      status: UserStatus.ACTIVE,
      addressStreet: 'Rua Silva Jatahy',
      addressNumber: '200',
      addressDistrict: 'Aldeota',
      addressCity: 'Fortaleza',
      addressState: 'CE',
      addressZip: '60392-210',
    },
    create: {
      name: 'Patrícia Lima',
      email: 'operador@fleet-manager.com',
      cpf: '55566677788',
      phone: '(85) 97777-2222',
      passwordHash,
      role: UserRole.OPERATOR,
      status: UserStatus.ACTIVE,
      addressStreet: 'Rua Silva Jatahy',
      addressNumber: '200',
      addressDistrict: 'Aldeota',
      addressCity: 'Fortaleza',
      addressState: 'CE',
      addressZip: '60392-210',
    },
  });

  const v1 = await prisma.vehicle.upsert({
    where: { plate: 'ABC-1234' },
    update: { brand: 'TOYOTA', model: 'COROLLA', year: 2022, color: 'PRATA', status: VehicleStatus.ACTIVE },
    create: { plate: 'ABC-1234', brand: 'TOYOTA', model: 'COROLLA', year: 2022, color: 'PRATA', status: VehicleStatus.ACTIVE },
  });

  const v2 = await prisma.vehicle.upsert({
    where: { plate: 'DEF-5678' },
    update: { brand: 'CHEVROLET', model: 'S10', year: 2021, color: 'BRANCO', status: VehicleStatus.ACTIVE },
    create: { plate: 'DEF-5678', brand: 'CHEVROLET', model: 'S10', year: 2021, color: 'BRANCO', status: VehicleStatus.ACTIVE },
  });

  const v3 = await prisma.vehicle.upsert({
    where: { plate: 'GHI-9012' },
    update: { brand: 'FORD', model: 'TRANSIT', year: 2020, color: 'PRATA', status: VehicleStatus.ACTIVE },
    create: { plate: 'GHI-9012', brand: 'FORD', model: 'TRANSIT', year: 2020, color: 'PRATA', status: VehicleStatus.ACTIVE },
  });

  const v4 = await prisma.vehicle.upsert({
    where: { plate: 'JKL-3456' },
    update: { brand: 'VOLKSWAGEN', model: 'AMAROK', year: 2023, color: 'PRETO', status: VehicleStatus.ACTIVE },
    create: { plate: 'JKL-3456', brand: 'VOLKSWAGEN', model: 'AMAROK', year: 2023, color: 'PRETO', status: VehicleStatus.ACTIVE },
  });

  const v5 = await prisma.vehicle.upsert({
    where: { plate: 'MNO-7890' },
    update: { brand: 'FIAT', model: 'DUCATO', year: 2019, color: 'BRANCO', status: VehicleStatus.ACTIVE },
    create: { plate: 'MNO-7890', brand: 'FIAT', model: 'DUCATO', year: 2019, color: 'BRANCO', status: VehicleStatus.ACTIVE },
  });

  const v6 = await prisma.vehicle.upsert({
    where: { plate: 'PQR-2345' },
    update: { brand: 'HONDA', model: 'HR-V', year: 2022, color: 'AZUL', status: VehicleStatus.ACTIVE },
    create: { plate: 'PQR-2345', brand: 'HONDA', model: 'HR-V', year: 2022, color: 'AZUL', status: VehicleStatus.ACTIVE },
  });

  const v7 = await prisma.vehicle.upsert({
    where: { plate: 'STU-6789' },
    update: { brand: 'HYUNDAI', model: 'HB20', year: 2021, color: 'VERMELHO', status: VehicleStatus.INACTIVE },
    create: { plate: 'STU-6789', brand: 'HYUNDAI', model: 'HB20', year: 2021, color: 'VERMELHO', status: VehicleStatus.INACTIVE },
  });

  const v8 = await prisma.vehicle.upsert({
    where: { plate: 'VWX-0123' },
    update: { brand: 'RENAULT', model: 'DUSTER', year: 2020, color: 'CINZA', status: VehicleStatus.ACTIVE },
    create: { plate: 'VWX-0123', brand: 'RENAULT', model: 'DUSTER', year: 2020, color: 'CINZA', status: VehicleStatus.ACTIVE },
  });

  const d1 = await prisma.driver.upsert({
    where: { cnh: '12345678901' },
    update: { name: 'João Silva', cpf: '12345678900', cnhExpiry: daysFromNow(540), phone: '(85) 99999-0001', status: DriverStatus.ACTIVE },
    create: { name: 'João Silva', cpf: '12345678900', cnh: '12345678901', cnhExpiry: daysFromNow(540), phone: '(85) 99999-0001', status: DriverStatus.ACTIVE },
  });

  const d2 = await prisma.driver.upsert({
    where: { cnh: '23456789012' },
    update: { name: 'Maria Santos', cpf: '23456789011', cnhExpiry: daysFromNow(320), phone: '(85) 98765-4321', status: DriverStatus.ACTIVE },
    create: { name: 'Maria Santos', cpf: '23456789011', cnh: '23456789012', cnhExpiry: daysFromNow(320), phone: '(85) 98765-4321', status: DriverStatus.ACTIVE },
  });

  const d3 = await prisma.driver.upsert({
    where: { cnh: '34567890123' },
    update: { name: 'Carlos Oliveira', cpf: '34567890122', cnhExpiry: daysFromNow(25), phone: '(85) 97654-3210', status: DriverStatus.ACTIVE },
    create: { name: 'Carlos Oliveira', cpf: '34567890122', cnh: '34567890123', cnhExpiry: daysFromNow(25), phone: '(85) 97654-3210', status: DriverStatus.ACTIVE },
  });

  const d4 = await prisma.driver.upsert({
    where: { cnh: '45678901234' },
    update: { name: 'Ana Paula Ferreira', cpf: '45678901233', cnhExpiry: daysFromNow(180), phone: '(85) 96543-2109', status: DriverStatus.ACTIVE },
    create: { name: 'Ana Paula Ferreira', cpf: '45678901233', cnh: '45678901234', cnhExpiry: daysFromNow(180), phone: '(85) 96543-2109', status: DriverStatus.ACTIVE },
  });

  const d5 = await prisma.driver.upsert({
    where: { cnh: '56789012345' },
    update: { name: 'Roberto Mendes', cpf: '56789012344', cnhExpiry: daysAgo(15), phone: '(85) 95432-1098', status: DriverStatus.ACTIVE },
    create: { name: 'Roberto Mendes', cpf: '56789012344', cnh: '56789012345', cnhExpiry: daysAgo(15), phone: '(85) 95432-1098', status: DriverStatus.ACTIVE },
  });

  const d6 = await prisma.driver.upsert({
    where: { cnh: '67890123456' },
    update: { name: 'Fernanda Costa', cpf: '67890123455', cnhExpiry: daysFromNow(730), phone: '(85) 94321-0987', status: DriverStatus.INACTIVE },
    create: { name: 'Fernanda Costa', cpf: '67890123455', cnh: '67890123456', cnhExpiry: daysFromNow(730), phone: '(85) 94321-0987', status: DriverStatus.INACTIVE },
  });

  const vehicles = [v1, v2, v3, v4, v5, v6, v7, v8];
  const drivers = [d1, d2, d3, d4, d5, d6];
  const vehicleIds = vehicles.map((vehicle) => vehicle.id);
  const driverIds = drivers.map((driver) => driver.id);

  await prisma.document.deleteMany({ where: { OR: [{ vehicleId: { in: vehicleIds } }, { driverId: { in: driverIds } }] } });
  await prisma.maintenance.deleteMany({ where: { vehicleId: { in: vehicleIds } } });
  await prisma.expense.deleteMany({ where: { vehicleId: { in: vehicleIds } } });

  await prisma.vehicle.update({ where: { id: v1.id }, data: { drivers: { set: [{ id: d1.id }, { id: d2.id }] } } });
  await prisma.vehicle.update({ where: { id: v2.id }, data: { drivers: { set: [{ id: d3.id }] } } });
  await prisma.vehicle.update({ where: { id: v3.id }, data: { drivers: { set: [{ id: d4.id }, { id: d5.id }] } } });
  await prisma.vehicle.update({ where: { id: v4.id }, data: { drivers: { set: [{ id: d1.id }] } } });
  await prisma.vehicle.update({ where: { id: v5.id }, data: { drivers: { set: [] } } });
  await prisma.vehicle.update({ where: { id: v6.id }, data: { drivers: { set: [{ id: d2.id }, { id: d4.id }] } } });
  await prisma.vehicle.update({ where: { id: v7.id }, data: { drivers: { set: [] } } });
  await prisma.vehicle.update({ where: { id: v8.id }, data: { drivers: { set: [] } } });

  const expenses = [
    { vehicleId: v1.id, type: ExpenseType.FUEL, amount: 320, date: daysAgo(5), description: 'Abastecimento posto BR' },
    { vehicleId: v1.id, type: ExpenseType.FUEL, amount: 290.5, date: daysAgo(18), description: 'Abastecimento posto Shell' },
    { vehicleId: v1.id, type: ExpenseType.MAINTENANCE, amount: 850, date: daysAgo(35), description: 'Troca de óleo e filtros' },
    { vehicleId: v1.id, type: ExpenseType.INSURANCE, amount: 2400, date: daysAgo(90), description: 'Renovação seguro anual' },
    { vehicleId: v1.id, type: ExpenseType.FUEL, amount: 315.75, date: daysAgo(52), description: null },
    { vehicleId: v2.id, type: ExpenseType.FUEL, amount: 480, date: daysAgo(3), description: 'Abastecimento diesel' },
    { vehicleId: v2.id, type: ExpenseType.FUEL, amount: 460, date: daysAgo(20), description: 'Abastecimento diesel' },
    { vehicleId: v2.id, type: ExpenseType.FINE, amount: 293.47, date: daysAgo(45), description: 'Multa por excesso de velocidade BR-222' },
    { vehicleId: v2.id, type: ExpenseType.MAINTENANCE, amount: 1200, date: daysAgo(60), description: 'Revisão 60.000 km' },
    { vehicleId: v2.id, type: ExpenseType.IPVA, amount: 3150, date: daysAgo(120), description: 'IPVA 2025' },
    { vehicleId: v3.id, type: ExpenseType.FUEL, amount: 640, date: daysAgo(7), description: 'Abastecimento diesel na rota CE-040' },
    { vehicleId: v3.id, type: ExpenseType.FUEL, amount: 590, date: daysAgo(22), description: null },
    { vehicleId: v3.id, type: ExpenseType.MAINTENANCE, amount: 2100, date: daysAgo(40), description: 'Troca de freios dianteiros e traseiros' },
    { vehicleId: v3.id, type: ExpenseType.OTHER, amount: 350, date: daysAgo(75), description: 'Higienização interna do baú' },
    { vehicleId: v4.id, type: ExpenseType.FUEL, amount: 550, date: daysAgo(2), description: 'Abastecimento diesel' },
    { vehicleId: v4.id, type: ExpenseType.INSURANCE, amount: 3200, date: daysAgo(30), description: 'Seguro frota 2025' },
    { vehicleId: v4.id, type: ExpenseType.MAINTENANCE, amount: 750, date: daysAgo(55), description: 'Alinhamento, balanceamento e rodízio' },
    { vehicleId: v5.id, type: ExpenseType.FUEL, amount: 720, date: daysAgo(4), description: 'Abastecimento rota Fortaleza-Sobral' },
    { vehicleId: v5.id, type: ExpenseType.FINE, amount: 195.23, date: daysAgo(28), description: 'Multa estacionamento irregular' },
    { vehicleId: v5.id, type: ExpenseType.MAINTENANCE, amount: 1850, date: daysAgo(70), description: 'Revisão completa 80.000 km' },
    { vehicleId: v5.id, type: ExpenseType.IPVA, amount: 2200, date: daysAgo(140), description: 'IPVA 2025' },
    { vehicleId: v6.id, type: ExpenseType.FUEL, amount: 280, date: daysAgo(6), description: null },
    { vehicleId: v6.id, type: ExpenseType.FUEL, amount: 265.5, date: daysAgo(24), description: null },
    { vehicleId: v6.id, type: ExpenseType.MAINTENANCE, amount: 620, date: daysAgo(50), description: 'Troca de óleo sintético 5W30' },
    { vehicleId: v8.id, type: ExpenseType.FUEL, amount: 310, date: daysAgo(9), description: null },
    { vehicleId: v8.id, type: ExpenseType.MAINTENANCE, amount: 940, date: daysAgo(65), description: 'Troca de correia dentada' },
    { vehicleId: v8.id, type: ExpenseType.INSURANCE, amount: 1800, date: daysAgo(100), description: 'Renovação seguro' },
  ];

  await prisma.expense.createMany({ data: expenses });

  const maintenances = [
    { vehicleId: v1.id, type: MaintenanceType.PREVENTIVE, status: MaintenanceStatus.DONE, description: 'Troca de óleo e filtro de ar', scheduledDate: daysAgo(35), completedDate: daysAgo(33) },
    { vehicleId: v1.id, type: MaintenanceType.PREVENTIVE, status: MaintenanceStatus.SCHEDULED, description: 'Revisão 50.000 km', scheduledDate: daysFromNow(20), completedDate: null },
    { vehicleId: v2.id, type: MaintenanceType.PREVENTIVE, status: MaintenanceStatus.DONE, description: 'Revisão 60.000 km', scheduledDate: daysAgo(60), completedDate: daysAgo(58) },
    { vehicleId: v2.id, type: MaintenanceType.CORRECTIVE, status: MaintenanceStatus.SCHEDULED, description: 'Reparo no sistema de ar-condicionado', scheduledDate: daysFromNow(5), completedDate: null },
    { vehicleId: v3.id, type: MaintenanceType.CORRECTIVE, status: MaintenanceStatus.DONE, description: 'Troca de freios dianteiros', scheduledDate: daysAgo(42), completedDate: daysAgo(40) },
    { vehicleId: v3.id, type: MaintenanceType.PREVENTIVE, status: MaintenanceStatus.OVERDUE, description: 'Troca de amortecedores', scheduledDate: daysAgo(10), completedDate: null },
    { vehicleId: v4.id, type: MaintenanceType.PREVENTIVE, status: MaintenanceStatus.DONE, description: 'Alinhamento e balanceamento', scheduledDate: daysAgo(55), completedDate: daysAgo(54) },
    { vehicleId: v4.id, type: MaintenanceType.PREVENTIVE, status: MaintenanceStatus.SCHEDULED, description: 'Revisão 30.000 km', scheduledDate: daysFromNow(45), completedDate: null },
    { vehicleId: v5.id, type: MaintenanceType.PREVENTIVE, status: MaintenanceStatus.DONE, description: 'Revisão 80.000 km', scheduledDate: daysAgo(72), completedDate: daysAgo(70) },
    { vehicleId: v5.id, type: MaintenanceType.CORRECTIVE, status: MaintenanceStatus.OVERDUE, description: "Substituição da bomba d'água", scheduledDate: daysAgo(5), completedDate: null },
    { vehicleId: v6.id, type: MaintenanceType.PREVENTIVE, status: MaintenanceStatus.DONE, description: 'Troca de óleo e filtros', scheduledDate: daysAgo(50), completedDate: daysAgo(49) },
    { vehicleId: v6.id, type: MaintenanceType.PREVENTIVE, status: MaintenanceStatus.SCHEDULED, description: 'Verificação do sistema de freios', scheduledDate: daysFromNow(30), completedDate: null },
    { vehicleId: v8.id, type: MaintenanceType.PREVENTIVE, status: MaintenanceStatus.DONE, description: 'Troca de correia dentada e tensor', scheduledDate: daysAgo(65), completedDate: daysAgo(63) },
    { vehicleId: v8.id, type: MaintenanceType.CORRECTIVE, status: MaintenanceStatus.SCHEDULED, description: 'Reparo em vazamento de óleo', scheduledDate: daysFromNow(8), completedDate: null },
  ];

  await prisma.maintenance.createMany({ data: maintenances });

  const documents = [
    { vehicleId: v1.id, driverId: null, type: DocumentType.CRLV, expiryDate: daysFromNow(300) },
    { vehicleId: v1.id, driverId: null, type: DocumentType.SEGURO, expiryDate: daysFromNow(275) },
    { vehicleId: v1.id, driverId: null, type: DocumentType.IPVA, expiryDate: daysFromNow(310) },
    { vehicleId: v2.id, driverId: null, type: DocumentType.CRLV, expiryDate: daysFromNow(240) },
    { vehicleId: v2.id, driverId: null, type: DocumentType.SEGURO, expiryDate: daysFromNow(20) },
    { vehicleId: v2.id, driverId: null, type: DocumentType.IPVA, expiryDate: daysFromNow(18) },
    { vehicleId: v3.id, driverId: null, type: DocumentType.CRLV, expiryDate: daysAgo(12) },
    { vehicleId: v3.id, driverId: null, type: DocumentType.SEGURO, expiryDate: daysFromNow(190) },
    { vehicleId: v3.id, driverId: null, type: DocumentType.LICENCA, expiryDate: daysFromNow(150) },
    { vehicleId: v4.id, driverId: null, type: DocumentType.CRLV, expiryDate: daysFromNow(365) },
    { vehicleId: v4.id, driverId: null, type: DocumentType.SEGURO, expiryDate: daysFromNow(335) },
    { vehicleId: v4.id, driverId: null, type: DocumentType.IPVA, expiryDate: daysFromNow(320) },
    { vehicleId: v5.id, driverId: null, type: DocumentType.CRLV, expiryDate: daysFromNow(100) },
    { vehicleId: v5.id, driverId: null, type: DocumentType.SEGURO, expiryDate: daysAgo(8) },
    { vehicleId: v5.id, driverId: null, type: DocumentType.IPVA, expiryDate: daysFromNow(95) },
    { vehicleId: v6.id, driverId: null, type: DocumentType.CRLV, expiryDate: daysFromNow(280) },
    { vehicleId: v6.id, driverId: null, type: DocumentType.SEGURO, expiryDate: daysFromNow(260) },
    { vehicleId: v8.id, driverId: null, type: DocumentType.CRLV, expiryDate: daysFromNow(22) },
    { vehicleId: v8.id, driverId: null, type: DocumentType.SEGURO, expiryDate: daysFromNow(200) },
    { vehicleId: null, driverId: d1.id, type: DocumentType.CNH, expiryDate: daysFromNow(540) },
    { vehicleId: null, driverId: d2.id, type: DocumentType.CNH, expiryDate: daysFromNow(320) },
    { vehicleId: null, driverId: d3.id, type: DocumentType.CNH, expiryDate: daysFromNow(25) },
    { vehicleId: null, driverId: d4.id, type: DocumentType.CNH, expiryDate: daysFromNow(180) },
    { vehicleId: null, driverId: d5.id, type: DocumentType.CNH, expiryDate: daysAgo(15) },
    { vehicleId: null, driverId: d6.id, type: DocumentType.CNH, expiryDate: daysFromNow(730) },
  ];

  await prisma.document.createMany({ data: documents });

  console.log('Seed concluído com sucesso.');
  console.log('Usuários: admin@fleet-manager.com, gerente@fleet-manager.com, operador@fleet-manager.com');
  console.log(`Veículos: ${vehicles.length}`);
  console.log(`Motoristas: ${drivers.length}`);
  console.log(`Despesas: ${expenses.length}`);
  console.log(`Manutenções: ${maintenances.length}`);
  console.log(`Documentos: ${documents.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
