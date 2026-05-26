import {
  CreateDriverData,
  DriverFilters,
  UpdateDriverData,
  driverRepository,
} from '../repositories/driver.repository';
import { AppError } from '../middlewares/error-handler';

export const driverService = {
  async listDrivers(filters: DriverFilters) {
    return driverRepository.findMany(filters);
  },

  async getDriver(id: string) {
    const driver = await driverRepository.findById(id);
    if (!driver) throw new AppError(404, 'Driver not found');
    return driver;
  },

  async createDriver(data: CreateDriverData) {
    const existingCpf = await driverRepository.findByCpf(data.cpf);
    if (existingCpf) throw new AppError(409, 'CPF already in use');

    const existingCnh = await driverRepository.findByCnh(data.cnh);
    if (existingCnh) throw new AppError(409, 'CNH already in use');

    return driverRepository.create(data);
  },

  async updateDriver(id: string, data: UpdateDriverData) {
    const driver = await driverRepository.findById(id);
    if (!driver) throw new AppError(404, 'Driver not found');

    if (data.cpf && data.cpf !== driver.cpf) {
      const existingCpf = await driverRepository.findByCpf(data.cpf);
      if (existingCpf) throw new AppError(409, 'CPF already in use');
    }

    if (data.cnh && data.cnh !== driver.cnh) {
      const existingCnh = await driverRepository.findByCnh(data.cnh);
      if (existingCnh) throw new AppError(409, 'CNH already in use');
    }

    return driverRepository.update(id, data);
  },

  async deleteDriver(id: string) {
    const driver = await driverRepository.findById(id);
    if (!driver) throw new AppError(404, 'Driver not found');
    return driverRepository.setInactive(id);
  },

  async hardDeleteDriver(id: string) {
    const driver = await driverRepository.findById(id);
    if (!driver) throw new AppError(404, 'Driver not found');
    return driverRepository.hardDelete(id);
  },
};
