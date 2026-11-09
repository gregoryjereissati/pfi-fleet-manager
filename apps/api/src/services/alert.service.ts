import { alertRepository, type AlertScope } from '../repositories/alert.repository';
import { authorFilter, type AccessScope } from '../lib/access-scope';
import { assignmentService } from './assignment.service';

/**
 * Central de alertas: o que pede atenção agora, em três frentes.
 *
 * - documentos vencidos ou que vencem em até 30 dias;
 * - manutenções atrasadas ou previstas para os próximos 7 dias;
 * - habilitações (CNH) vencidas ou que vencem em até 30 dias.
 *
 * Cada frente usa o mesmo recorte da tela correspondente. O motorista vê os
 * próprios documentos pessoais e os dos veículos a que está vinculado, as
 * manutenções que ele registrou e a própria CNH — nunca a de um colega.
 * Nada aqui é gravado: as situações são calculadas a cada consulta.
 */
async function recorte(scope: AccessScope): Promise<AlertScope> {
  return {
    companyId: scope.companyId,
    createdById: authorFilter(scope),
    driverScope: await assignmentService.driverDataScope(scope),
  };
}

export const alertService = {
  async list(scope: AccessScope) {
    const alcance = await recorte(scope);

    const [documents, maintenances, licenses] = await Promise.all([
      alertRepository.documents(alcance),
      alertRepository.maintenances(alcance),
      alertRepository.licenses(alcance),
    ]);

    return { documents, maintenances, licenses };
  },

  /** Contagem por frente e total, com as mesmas condições das listas. */
  async count(scope: AccessScope) {
    const contagens = await alertRepository.counts(await recorte(scope));

    return {
      ...contagens,
      count: contagens.documents + contagens.maintenances + contagens.licenses,
    };
  },
};
