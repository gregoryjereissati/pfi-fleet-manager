import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverStatus } from '@fleet-manager/shared';
import { driverService } from '../driver.service';
import { driverRepository } from '../../repositories/driver.repository';
import { AppError } from '../../middlewares/error-handler';

vi.mock('../../repositories/driver.repository', () => ({
  driverRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByCpf: vi.fn(),
    findByCnh: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setInactive: vi.fn(),
  },
}));

const mockDriver = {
  id: 'driver-1',
  name: 'John Driver',
  cpf: '12345678901',
  cnh: '1234567890',
  cnhExpiry: new Date('2027-01-01T00:00:00.000Z'),
  phone: '85999999999',
  status: DriverStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  vehicles: [],
};

describe('driverService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('listDrivers', () => {
    it('returns the driver list with filters', async () => {
      vi.mocked(driverRepository.findMany).mockResolvedValue([mockDriver]);

      const result = await driverService.listDrivers({ status: DriverStatus.ACTIVE });

      expect(result).toEqual([mockDriver]);
      expect(driverRepository.findMany).toHaveBeenCalledWith({ status: DriverStatus.ACTIVE });
    });
  });

  describe('getDriver', () => {
    it('throws AppError 404 when driver does not exist', async () => {
      vi.mocked(driverRepository.findById).mockResolvedValue(null);

      await expect(driverService.getDriver('missing')).rejects.toThrow(
        new AppError(404, 'Driver not found'),
      );
    });

    it('returns the driver with linked vehicles', async () => {
      vi.mocked(driverRepository.findById).mockResolvedValue(mockDriver);

      const result = await driverService.getDriver('driver-1');

      expect(result).toEqual(mockDriver);
      expect(driverRepository.findById).toHaveBeenCalledWith('driver-1');
    });
  });

  describe('createDriver', () => {
    it('throws AppError 409 when CPF is already in use', async () => {
      vi.mocked(driverRepository.findByCpf).mockResolvedValue(mockDriver);

      await expect(driverService.createDriver(mockDriver)).rejects.toThrow(
        new AppError(409, 'CPF already in use'),
      );
      expect(driverRepository.create).not.toHaveBeenCalled();
    });

    it('creates and returns the driver', async () => {
      vi.mocked(driverRepository.findByCpf).mockResolvedValue(null);
      vi.mocked(driverRepository.findByCnh).mockResolvedValue(null);
      vi.mocked(driverRepository.create).mockResolvedValue(mockDriver);

      const result = await driverService.createDriver(mockDriver);

      expect(result).toEqual(mockDriver);
      expect(driverRepository.create).toHaveBeenCalledWith(mockDriver);
    });
  });

  describe('updateDriver', () => {
    it('throws AppError 404 when driver does not exist', async () => {
      vi.mocked(driverRepository.findById).mockResolvedValue(null);

      await expect(driverService.updateDriver('missing', { name: 'Updated' })).rejects.toThrow(
        new AppError(404, 'Driver not found'),
      );
    });

    it('throws AppError 409 when updating to an existing CPF', async () => {
      vi.mocked(driverRepository.findById).mockResolvedValue(mockDriver);
      vi.mocked(driverRepository.findByCpf).mockResolvedValue({
        ...mockDriver,
        id: 'driver-2',
      });

      await expect(
        driverService.updateDriver('driver-1', { cpf: '99999999999' }),
      ).rejects.toThrow(new AppError(409, 'CPF already in use'));
    });

    it('updates and returns the driver', async () => {
      const updatedDriver = { ...mockDriver, phone: '85888888888' };
      vi.mocked(driverRepository.findById).mockResolvedValue(mockDriver);
      vi.mocked(driverRepository.update).mockResolvedValue(updatedDriver);

      const result = await driverService.updateDriver('driver-1', {
        phone: '85888888888',
      });

      expect(result).toEqual(updatedDriver);
      expect(driverRepository.update).toHaveBeenCalledWith('driver-1', {
        phone: '85888888888',
      });
    });
  });

  describe('deleteDriver', () => {
    it('throws AppError 404 when driver does not exist', async () => {
      vi.mocked(driverRepository.findById).mockResolvedValue(null);

      await expect(driverService.deleteDriver('missing')).rejects.toThrow(
        new AppError(404, 'Driver not found'),
      );
    });

    it('sets the driver as inactive', async () => {
      const inactiveDriver = { ...mockDriver, status: DriverStatus.INACTIVE };
      vi.mocked(driverRepository.findById).mockResolvedValue(mockDriver);
      vi.mocked(driverRepository.setInactive).mockResolvedValue(inactiveDriver);

      const result = await driverService.deleteDriver('driver-1');

      expect(result).toEqual(inactiveDriver);
      expect(driverRepository.setInactive).toHaveBeenCalledWith('driver-1');
    });
  });
});
