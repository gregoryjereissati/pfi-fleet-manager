import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaintenanceStatus, MaintenanceType, VehicleStatus } from '@fleet-manager/shared';
import { maintenanceService } from '../maintenance.service';
import { maintenanceRepository } from '../../repositories/maintenance.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import { AppError } from '../../middlewares/error-handler';

vi.mock('../../repositories/maintenance.repository', () => ({
  maintenanceRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../repositories/vehicle.repository', () => ({
  vehicleRepository: {
    findById: vi.fn(),
  },
}));

const mockVehicle = {
  id: 'vehicle-1',
  plate: 'ABC-1234',
  brand: 'Toyota',
  model: 'Corolla',
};

const mockVehicleWithRelations = {
  ...mockVehicle,
  year: 2022,
  color: 'Prata',
  status: VehicleStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  drivers: [],
  expenses: [],
  maintenances: [],
};

const mockMaintenance = {
  id: 'maintenance-1',
  vehicleId: 'vehicle-1',
  type: MaintenanceType.PREVENTIVE,
  status: MaintenanceStatus.SCHEDULED,
  description: 'Troca de óleo',
  scheduledDate: new Date('2026-04-25T00:00:00.000Z'),
  completedDate: null,
  createdAt: new Date('2026-04-10T10:00:00.000Z'),
  vehicle: mockVehicle,
};

describe('maintenanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listMaintenances', () => {
    it('returns the maintenance list with filters', async () => {
      vi.mocked(maintenanceRepository.findMany).mockResolvedValue([mockMaintenance]);

      const result = await maintenanceService.listMaintenances({
        vehicleId: 'vehicle-1',
        status: MaintenanceStatus.SCHEDULED,
      });

      expect(result).toEqual([mockMaintenance]);
      expect(maintenanceRepository.findMany).toHaveBeenCalledWith({
        vehicleId: 'vehicle-1',
        status: MaintenanceStatus.SCHEDULED,
      });
    });
  });

  describe('getMaintenance', () => {
    it('throws AppError 404 when maintenance does not exist', async () => {
      vi.mocked(maintenanceRepository.findById).mockResolvedValue(null);

      await expect(maintenanceService.getMaintenance('missing')).rejects.toThrow(
        new AppError(404, 'Maintenance not found'),
      );
    });

    it('returns the maintenance when found', async () => {
      vi.mocked(maintenanceRepository.findById).mockResolvedValue(mockMaintenance);

      const result = await maintenanceService.getMaintenance('maintenance-1');

      expect(result).toEqual(mockMaintenance);
      expect(maintenanceRepository.findById).toHaveBeenCalledWith('maintenance-1');
    });
  });

  describe('createMaintenance', () => {
    it('throws AppError 404 when vehicle does not exist', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);

      await expect(
        maintenanceService.createMaintenance({
          vehicleId: 'vehicle-1',
          type: MaintenanceType.PREVENTIVE,
          description: 'Troca de óleo',
          scheduledDate: new Date('2026-04-25T00:00:00.000Z'),
        }),
      ).rejects.toThrow(new AppError(404, 'Vehicle not found'));

      expect(maintenanceRepository.create).not.toHaveBeenCalled();
    });

    it('creates and returns the maintenance', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicleWithRelations);
      vi.mocked(maintenanceRepository.create).mockResolvedValue(mockMaintenance);

      const result = await maintenanceService.createMaintenance({
        vehicleId: 'vehicle-1',
        type: MaintenanceType.PREVENTIVE,
        description: 'Troca de óleo',
        scheduledDate: new Date('2026-04-25T00:00:00.000Z'),
      });

      expect(result).toEqual(mockMaintenance);
      expect(maintenanceRepository.create).toHaveBeenCalledWith({
        vehicleId: 'vehicle-1',
        type: MaintenanceType.PREVENTIVE,
        description: 'Troca de óleo',
        scheduledDate: new Date('2026-04-25T00:00:00.000Z'),
      });
    });
  });

  describe('updateMaintenance', () => {
    it('throws AppError 404 when maintenance does not exist', async () => {
      vi.mocked(maintenanceRepository.findById).mockResolvedValue(null);

      await expect(
        maintenanceService.updateMaintenance('missing', { description: 'Atualizada' }),
      ).rejects.toThrow(new AppError(404, 'Maintenance not found'));
    });

    it('sets completedDate automatically when status changes to DONE', async () => {
      const completedMaintenance = {
        ...mockMaintenance,
        status: MaintenanceStatus.DONE,
        completedDate: new Date('2026-04-26T00:00:00.000Z'),
      };

      vi.mocked(maintenanceRepository.findById).mockResolvedValue(mockMaintenance);
      vi.mocked(maintenanceRepository.update).mockResolvedValue(completedMaintenance);

      const result = await maintenanceService.updateMaintenance('maintenance-1', {
        status: MaintenanceStatus.DONE,
      });

      expect(result).toEqual(completedMaintenance);
      expect(maintenanceRepository.update).toHaveBeenCalledWith(
        'maintenance-1',
        expect.objectContaining({
          status: MaintenanceStatus.DONE,
          completedDate: expect.any(Date),
        }),
      );
    });

    it('clears completedDate when status returns to SCHEDULED', async () => {
      const doneMaintenance = {
        ...mockMaintenance,
        status: MaintenanceStatus.DONE,
        completedDate: new Date('2026-04-26T00:00:00.000Z'),
      };

      vi.mocked(maintenanceRepository.findById).mockResolvedValue(doneMaintenance);
      vi.mocked(maintenanceRepository.update).mockResolvedValue(mockMaintenance);

      const result = await maintenanceService.updateMaintenance('maintenance-1', {
        status: MaintenanceStatus.SCHEDULED,
      });

      expect(result).toEqual(mockMaintenance);
      expect(maintenanceRepository.update).toHaveBeenCalledWith('maintenance-1', {
        status: MaintenanceStatus.SCHEDULED,
        completedDate: null,
      });
    });
  });

  describe('deleteMaintenance', () => {
    it('throws AppError 404 when maintenance does not exist', async () => {
      vi.mocked(maintenanceRepository.findById).mockResolvedValue(null);

      await expect(maintenanceService.deleteMaintenance('missing')).rejects.toThrow(
        new AppError(404, 'Maintenance not found'),
      );
    });

    it('deletes the maintenance', async () => {
      vi.mocked(maintenanceRepository.findById).mockResolvedValue(mockMaintenance);
      vi.mocked(maintenanceRepository.delete).mockResolvedValue(mockMaintenance);

      const result = await maintenanceService.deleteMaintenance('maintenance-1');

      expect(result).toEqual(mockMaintenance);
      expect(maintenanceRepository.delete).toHaveBeenCalledWith('maintenance-1');
    });
  });
});
