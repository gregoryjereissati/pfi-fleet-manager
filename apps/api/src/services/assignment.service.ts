import { AuditAction, AuditEntity } from '../types/db';
import { ehViolacaoDeUnicidade } from '../lib/db-errors';
import { emTransacao } from '../config/database';
import { AppError } from '../middlewares/error-handler';
import { assignmentRepository } from '../repositories/assignment.repository';
import { driverRepository } from '../repositories/driver.repository';
import { vehicleRepository } from '../repositories/vehicle.repository';
import { recordChange } from '../lib/audit';
import { isDriverScope, type AccessScope } from '../lib/access-scope';

/**
 * Vínculos entre motorista e veículo.
 *
 * A relação é muitos-para-muitos: um motorista dirige vários veículos e um
 * veículo tem vários motoristas — substituição e compartilhamento são a
 * operação normal. O vínculo começa na atribuição e vigora até ser encerrado
 * explicitamente; não vence sozinho.
 *
 * Encerrar **não apaga**: grava a data de fim e quem encerrou, e a linha
 * continua no histórico.
 */
export const assignmentService = {
  /**
   * Veículos em que o usuário pode lançar agora.
   *
   * No escopo da empresa, `null` significa "sem restrição de veículo". No
   * escopo do motorista, é a lista dos veículos vinculados — e é esta lista,
   * apurada no servidor, que autoriza um lançamento. O seletor da tela usa a
   * mesma lista, para que a interface não ofereça o que a API recusaria.
   */
  async authorizedVehicleIds(scope: AccessScope): Promise<string[] | null> {
    if (!isDriverScope(scope)) return null;
    if (!scope.driverId) return [];

    return assignmentRepository.activeVehicleIds(scope.companyId, scope.driverId);
  },

  /**
   * Recorte do motorista sobre documentos e agregações: a própria ficha e os
   * veículos vinculados agora.
   *
   * Devolve `undefined` no escopo da empresa, em que não há restrição.
   */
  async driverDataScope(
    scope: AccessScope,
  ): Promise<{ driverId: string | null; vehicleIds: string[] } | undefined> {
    if (!isDriverScope(scope)) return undefined;

    const vehicleIds = scope.driverId
      ? await assignmentRepository.activeVehicleIds(scope.companyId, scope.driverId)
      : [];

    return { driverId: scope.driverId, vehicleIds };
  },

  /**
   * Recusa o lançamento em veículo sem vínculo vigente.
   *
   * A verificação é do servidor. Restringir apenas o seletor deixaria a regra
   * a cargo da tela, e uma requisição montada à mão passaria.
   */
  async assertVehicleAllowed(scope: AccessScope, vehicleId: string): Promise<void> {
    const allowed = await this.authorizedVehicleIds(scope);
    if (allowed === null) return;

    if (!allowed.includes(vehicleId)) {
      throw new AppError(403, 'VEHICLE_NOT_ASSIGNED');
    }
  },

  async listByVehicle(scope: AccessScope, vehicleId: string) {
    const vehicle = await vehicleRepository.findSummaryById(vehicleId, scope.companyId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    return assignmentRepository.findHistoryByVehicle(scope.companyId, vehicleId);
  },

  async listByDriver(scope: AccessScope, driverId: string) {
    if (isDriverScope(scope) && scope.driverId !== driverId) {
      throw new AppError(404, 'Driver not found');
    }

    const driver = await driverRepository.findById(driverId, scope.companyId);
    if (!driver) throw new AppError(404, 'Driver not found');

    return assignmentRepository.findHistoryByDriver(scope.companyId, driverId);
  },

  /**
   * Vincula motoristas a um veículo.
   *
   * Veículo e motoristas são localizados **dentro da empresa**: um vínculo
   * entre entidades de empresas diferentes não chega a ser possível, porque a
   * outra entidade não é encontrada.
   *
   * Vincular quem já está vinculado não faz nada e não é erro — repetir a
   * ação não cria um segundo vínculo vigente.
   */
  async assignDrivers(
    scope: AccessScope,
    vehicleId: string,
    driverIds: string[],
    startDate?: Date,
  ) {
    const vehicle = await vehicleRepository.findSummaryById(vehicleId, scope.companyId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    const uniqueIds = [...new Set(driverIds)];
    const drivers = await driverRepository.findManyByIds(scope.companyId, uniqueIds);

    if (drivers.length !== uniqueIds.length) {
      throw new AppError(404, 'Driver not found');
    }

    const start = startDate ?? new Date();

    await emTransacao(async (tx) => {
      for (const driverId of uniqueIds) {
        const active = await assignmentRepository.findActive(
          scope.companyId,
          vehicleId,
          driverId,
          tx,
        );

        if (active) continue;

        try {
          const created = await assignmentRepository.create(tx, {
            companyId: scope.companyId,
            vehicleId,
            driverId,
            startDate: start,
            createdById: scope.userId,
          });

          await recordChange(tx, {
            entityType: AuditEntity.ASSIGNMENT,
            entityId: created.id,
            action: AuditAction.LINK,
            scope,
            changes: {
              vehicleId: { de: null, para: vehicleId },
              driverId: { de: null, para: driverId },
              startDate: { de: null, para: start.toISOString() },
            },
          });
        } catch (error) {
          // Vínculo aberto por outra requisição no mesmo instante. A restrição
          // de unicidade sobre o vínculo vigente recusa o segundo; o resultado
          // é o mesmo de já estar vinculado.
          const duplicate =
            ehViolacaoDeUnicidade(error);
          if (!duplicate) throw error;
        }
      }
    });

    return assignmentRepository.findActiveByVehicle(scope.companyId, vehicleId);
  },

  /**
   * Encerra o vínculo vigente de um par.
   *
   * A relação anterior não desaparece: ela passa a ter fim. Consultar quem
   * dirigia em uma data passada continua possível — dentro do período que o
   * sistema chegou a gravar.
   */
  async endAssignment(
    scope: AccessScope,
    vehicleId: string,
    driverId: string,
    endDate?: Date,
  ) {
    const vehicle = await vehicleRepository.findSummaryById(vehicleId, scope.companyId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    const active = await assignmentRepository.findActive(scope.companyId, vehicleId, driverId);
    if (!active) throw new AppError(404, 'ASSIGNMENT_NOT_FOUND');

    const end = endDate ?? new Date();

    if (end < active.startDate) {
      throw new AppError(400, 'END_DATE_BEFORE_START');
    }

    await emTransacao(async (tx) => {
      await assignmentRepository.end(tx, active.id, end, scope.userId);

      await recordChange(tx, {
        entityType: AuditEntity.ASSIGNMENT,
        entityId: active.id,
        action: AuditAction.UNLINK,
        scope,
        changes: { endDate: { de: null, para: end.toISOString() } },
      });
    });

    return assignmentRepository.findActiveByVehicle(scope.companyId, vehicleId);
  },
};
