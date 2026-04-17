import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverStatus, VehicleStatus } from '@fleet-manager/shared';
import { vehicleService } from '../vehicle.service';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import { driverRepository } from '../../repositories/driver.repository';
import { AppError } from '../../middlewares/error-handler';

vi.mock('../../repositories/vehicle.repository', () => ({
  vehicleRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByPlate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setInactive: vi.fn(),
    connectDrivers: vi.fn(),
    disconnectDriver: vi.fn(),
  },
}));

vi.mock('../../repositories/driver.repository', () => ({
  driverRepository: {
    findById: vi.fn(),
    findManyByIds: vi.fn(),
  },
}));

const mockVehicle = {
  id: 'vehicle-1',
  plate: 'ABC-1234',
  brand: 'Toyota',
  model: 'Corolla',
  year: 2022,
  color: 'Silver',
  status: VehicleStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  drivers: [],
  expenses: [],
  maintenances: [],
};

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

describe('vehicleService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('listVehicles', () => {
    it('returns the vehicle list with filters', async () => {
      vi.mocked(vehicleRepository.findMany).mockResolvedValue([mockVehicle]);

      const result = await vehicleService.listVehicles({ status: VehicleStatus.ACTIVE });

      expect(result).toEqual([mockVehicle]);
      expect(vehicleRepository.findMany).toHaveBeenCalledWith({ status: VehicleStatus.ACTIVE });
    });
  });

  describe('getVehicle', () => {
    it('throws AppError 404 when vehicle does not exist', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);

      await expect(vehicleService.getVehicle('missing')).rejects.toThrow(
        new AppError(404, 'Vehicle not found'),
      );
    });

    it('returns the vehicle with relations when found', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);

      const result = await vehicleService.getVehicle('vehicle-1');

      expect(result).toEqual(mockVehicle);
      expect(vehicleRepository.findById).toHaveBeenCalledWith('vehicle-1');
    });
  });

  describe('createVehicle', () => {
    it('throws AppError 409 when plate is already in use', async () => {
      vi.mocked(vehicleRepository.findByPlate).mockResolvedValue(mockVehicle);

      await expect(vehicleService.createVehicle(mockVehicle)).rejects.toThrow(
        new AppError(409, 'Plate already in use'),
      );
      expect(vehicleRepository.create).not.toHaveBeenCalled();
    });

    it('creates and returns the vehicle', async () => {
      vi.mocked(vehicleRepository.findByPlate).mockResolvedValue(null);
      vi.mocked(vehicleRepository.create).mockResolvedValue(mockVehicle);

      const result = await vehicleService.createVehicle(mockVehicle);

      expect(result).toEqual(mockVehicle);
      expect(vehicleRepository.create).toHaveBeenCalledWith(mockVehicle);
    });
  });

  describe('updateVehicle', () => {
    it('throws AppError 404 when vehicle does not exist', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);

      await expect(vehicleService.updateVehicle('missing', { color: 'Black' })).rejects.toThrow(
        new AppError(404, 'Vehicle not found'),
      );
    });

    it('throws AppError 409 when updating to an existing plate', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(vehicleRepository.findByPlate).mockResolvedValue({
        ...mockVehicle,
        id: 'vehicle-2',
      });

      await expect(
        vehicleService.updateVehicle('vehicle-1', { plate: 'XYZ-9999' }),
      ).rejects.toThrow(new AppError(409, 'Plate already in use'));
    });

    it('updates and returns the vehicle', async () => {
      const updatedVehicle = { ...mockVehicle, color: 'Black' };
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(vehicleRepository.update).mockResolvedValue(updatedVehicle);

      const result = await vehicleService.updateVehicle('vehicle-1', { color: 'Black' });

      expect(result).toEqual(updatedVehicle);
      expect(vehicleRepository.update).toHaveBeenCalledWith('vehicle-1', { color: 'Black' });
    });
  });

  describe('deleteVehicle', () => {
    it('throws AppError 404 when vehicle does not exist', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);

      await expect(vehicleService.deleteVehicle('missing')).rejects.toThrow(
        new AppError(404, 'Vehicle not found'),
      );
    });

    it('sets the vehicle as inactive', async () => {
      const inactiveVehicle = { ...mockVehicle, status: VehicleStatus.INACTIVE };
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(vehicleRepository.setInactive).mockResolvedValue(inactiveVehicle);

      const result = await vehicleService.deleteVehicle('vehicle-1');

      expect(result).toEqual(inactiveVehicle);
      expect(vehicleRepository.setInactive).toHaveBeenCalledWith('vehicle-1');
    });
  });

  describe('linkDrivers', () => {
    it('throws AppError 404 when vehicle does not exist', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);

      await expect(vehicleService.linkDrivers('missing', ['driver-1'])).rejects.toThrow(
        new AppError(404, 'Vehicle not found'),
      );
    });

    it('throws AppError 404 when any driver does not exist', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(driverRepository.findManyByIds).mockResolvedValue([]);

      await expect(vehicleService.linkDrivers('vehicle-1', ['driver-1'])).rejects.toThrow(
        new AppError(404, 'Driver not found'),
      );
    });

    it('links the drivers to the vehicle', async () => {
      const linkedVehicle = {
        ...mockVehicle,
        drivers: [mockDriver],
      };
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(driverRepository.findManyByIds).mockResolvedValue([mockDriver]);
      vi.mocked(vehicleRepository.connectDrivers).mockResolvedValue(linkedVehicle);

      const result = await vehicleService.linkDrivers('vehicle-1', ['driver-1']);

      expect(result).toEqual(linkedVehicle);
      expect(vehicleRepository.connectDrivers).toHaveBeenCalledWith('vehicle-1', ['driver-1']);
    });
  });

  describe('unlinkDriver', () => {
    it('throws AppError 404 when driver does not exist', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(driverRepository.findById).mockResolvedValue(null);

      await expect(vehicleService.unlinkDriver('vehicle-1', 'missing')).rejects.toThrow(
        new AppError(404, 'Driver not found'),
      );
    });

    it('removes the driver from the vehicle', async () => {
      const updatedVehicle = { ...mockVehicle, drivers: [] };
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(driverRepository.findById).mockResolvedValue(mockDriver);
      vi.mocked(vehicleRepository.disconnectDriver).mockResolvedValue(updatedVehicle);

      const result = await vehicleService.unlinkDriver('vehicle-1', 'driver-1');

      expect(result).toEqual(updatedVehicle);
      expect(vehicleRepository.disconnectDriver).toHaveBeenCalledWith('vehicle-1', 'driver-1');
    });
  });
});
