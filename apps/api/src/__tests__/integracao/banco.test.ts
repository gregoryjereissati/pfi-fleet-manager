import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ExpenseType } from '@fleet-manager/shared';
import { sql } from '../../config/database';
import { dashboardRepository } from '../../repositories/dashboard.repository';
import { expenseRepository } from '../../repositories/expense.repository';
import { documentRepository } from '../../repositories/document.repository';
import { maintenanceRepository } from '../../repositories/maintenance.repository';
import { assignmentRepository } from '../../repositories/assignment.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import { driverRepository } from '../../repositories/driver.repository';
import {
  CODIGO_EMPRESA_A,
  CODIGO_EMPRESA_B,
  carregarEmpresa,
  emTransacaoRevertida,
  temBanco,
  type EmpresaDeTeste,
} from './dados';

/**
 * Testes contra o Supabase hospedado, sobre a base fictícia do `db:seed`.
 *
 * Verificam o que só o banco real pode responder: se as consultas de fato
 * isolam empresas, se os totais de fato ignoram cancelados, se a precisão
 * monetária sobrevive ao caminho inteiro e se as restrições declaradas no
 * schema realmente recusam o que deveriam.
 *
 * São ignorados quando não há conexão configurada, para que a suíte continue
 * executável sem credenciais.
 */
describe.skipIf(!temBanco)('integração com o banco', () => {
  let a: EmpresaDeTeste;
  let b: EmpresaDeTeste;

  beforeAll(async () => {
    a = await carregarEmpresa(CODIGO_EMPRESA_A);
    b = await carregarEmpresa(CODIGO_EMPRESA_B);
  });

  afterAll(async () => {
    await sql.end();
  });

  // ---------------------------------------------------------------------------
  describe('isolamento entre empresas', () => {
    it('as duas empresas do seed são distintas', () => {
      expect(a.companyId).not.toBe(b.companyId);
    });

    it('a listagem de veículos só devolve os da própria empresa', async () => {
      const daEmpresaA = await vehicleRepository.findMany(a.companyId);
      const daEmpresaB = await vehicleRepository.findMany(b.companyId);

      expect(daEmpresaA.length).toBeGreaterThan(0);
      expect(daEmpresaB.length).toBeGreaterThan(0);

      const idsB = new Set(daEmpresaB.map((v) => v.id));
      expect(daEmpresaA.some((v) => idsB.has(v.id))).toBe(false);
    });

    it('buscar por identificador de outra empresa não encontra nada', async () => {
      const alheio = await vehicleRepository.findById(b.veiculoCompartilhadoId, a.companyId);
      expect(alheio).toBeNull();
    });

    it('a busca resumida também recorta por empresa', async () => {
      const alheio = await vehicleRepository.findSummaryById(
        b.veiculoCompartilhadoId,
        a.companyId,
      );
      expect(alheio).toBeNull();
    });

    it('os documentos de uma empresa não aparecem na outra', async () => {
      const daA = await documentRepository.findMany({ companyId: a.companyId });
      const daB = await documentRepository.findMany({ companyId: b.companyId });

      const idsB = new Set(daB.map((d) => d.id));
      expect(daA.length).toBeGreaterThan(0);
      expect(daA.some((d) => idsB.has(d.id))).toBe(false);
    });

    it('a ficha de motorista da outra empresa não é encontrada', async () => {
      const alheia = await driverRepository.findById(b.motorista1Id, a.companyId);
      expect(alheia).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  describe('autoria', () => {
    it('o motorista alcança apenas os próprios lançamentos', async () => {
      const doMotorista = await expenseRepository.findMany({
        companyId: a.companyId,
        createdById: a.motorista1UserId,
      });

      expect(doMotorista.length).toBeGreaterThan(0);
      expect(doMotorista.every((d) => d.createdById === a.motorista1UserId)).toBe(true);
    });

    it('um lançamento de outro autor não é encontrado no recorte do motorista', async () => {
      const [doGerente] = await expenseRepository.findMany({
        companyId: a.companyId,
        createdById: a.gerenteId,
      });

      const buscadoPeloMotorista = await expenseRepository.findById(
        doGerente.id,
        a.companyId,
        a.motorista1UserId,
      );

      expect(buscadoPeloMotorista).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  describe('cancelamento e totais', () => {
    it('o lançamento cancelado continua na lista, marcado', async () => {
      const todos = await expenseRepository.findMany({ companyId: a.companyId });
      const cancelados = todos.filter((d) => d.status === 'CANCELLED');

      expect(cancelados.length).toBeGreaterThan(0);
      expect(cancelados[0].cancelledAt).toBeInstanceOf(Date);
      expect(cancelados[0].cancelReason).toBeTruthy();
    });

    it('o cancelado sai do total do painel', async () => {
      const resumo = await dashboardRepository.getSummary({ companyId: a.companyId });

      const [soma] = await sql<{ ativos: string; todos: string }[]>`
        select
          coalesce(sum(amount) filter (where status = 'ACTIVE'), 0) as ativos,
          coalesce(sum(amount), 0) as todos
        from expenses where company_id = ${a.companyId}
      `;

      expect(resumo.totalExpenses).toBeCloseTo(Number(soma.ativos), 2);
      expect(Number(soma.todos)).toBeGreaterThan(Number(soma.ativos));
    });

    it('restaurar o lançamento devolve o valor ao total', async () => {
      const todos = await expenseRepository.findMany({ companyId: a.companyId });
      const cancelado = todos.find((d) => d.status === 'CANCELLED')!;

      const antes = await dashboardRepository.getSummary({ companyId: a.companyId });

      await emTransacaoRevertida(async (tx) => {
        await expenseRepository.uncancel(tx, cancelado.id, a.gerenteId);

        const [depois] = await tx<{ total: string }[]>`
          select coalesce(sum(amount), 0) as total
          from expenses where company_id = ${a.companyId} and status = 'ACTIVE'
        `;

        expect(Number(depois.total)).toBeCloseTo(
          antes.totalExpenses + Number(cancelado.amount),
          2,
        );
      });

      // A transação foi revertida: o total volta ao que era.
      const final = await dashboardRepository.getSummary({ companyId: a.companyId });
      expect(final.totalExpenses).toBeCloseTo(antes.totalExpenses, 2);
    });
  });

  // ---------------------------------------------------------------------------
  describe('precisão monetária', () => {
    it('o valor chega da consulta como texto, sem ponto flutuante', async () => {
      const [despesa] = await expenseRepository.findMany({ companyId: a.companyId });
      expect(typeof despesa.amount).toBe('string');
    });

    it('um valor com centavos percorre gravação e leitura sem alteração', async () => {
      await emTransacaoRevertida(async (tx) => {
        const criada = await expenseRepository.create(tx, {
          companyId: a.companyId,
          vehicleId: a.veiculoCompartilhadoId,
          type: ExpenseType.FUEL,
          amount: 0.1 + 0.2,
          date: new Date(),
          createdById: a.gerenteId,
        });

        // 0.1 + 0.2 é 0.30000000000000004 em ponto flutuante; a coluna é
        // numeric(10,2) e guarda exatamente trinta centavos.
        expect(criada.amount).toBe('0.30');
      });
    });

    it('o teto de numeric(10,2) é gravado sem perda', async () => {
      await emTransacaoRevertida(async (tx) => {
        const criada = await expenseRepository.create(tx, {
          companyId: a.companyId,
          vehicleId: a.veiculoCompartilhadoId,
          type: ExpenseType.OTHER,
          amount: 99999999.99,
          date: new Date(),
          createdById: a.gerenteId,
        });

        expect(criada.amount).toBe('99999999.99');
      });
    });

    it('a soma do painel confere com a soma feita pelo banco', async () => {
      const resumo = await dashboardRepository.getSummary({ companyId: a.companyId });

      const [conferencia] = await sql<{ total: string; media: string; qtd: string }[]>`
        select
          coalesce(sum(amount), 0) as total,
          coalesce(avg(amount), 0) as media,
          count(*) as qtd
        from expenses
        where company_id = ${a.companyId} and status = 'ACTIVE'
      `;

      expect(resumo.totalExpenses).toBeCloseTo(Number(conferencia.total), 2);
      expect(resumo.averageExpense).toBeCloseTo(Number(conferencia.media), 2);
      expect(resumo.expenseCount).toBe(Number(conferencia.qtd));
    });
  });

  // ---------------------------------------------------------------------------
  describe('datas', () => {
    it('vencimento é data civil, sem hora e sem fuso', async () => {
      const [documento] = await documentRepository.findMany({ companyId: a.companyId });

      expect(documento.expiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('a situação do documento acompanha a data civil', async () => {
      const documentos = await documentRepository.findMany({ companyId: a.companyId });
      const hoje = new Date().toISOString().slice(0, 10);

      for (const documento of documentos) {
        if (documento.expiryDate < hoje) {
          expect(documento.status).toBe('EXPIRED');
        } else {
          expect(documento.status).not.toBe('EXPIRED');
        }
      }
    });

    it('a listagem e o painel concordam sobre o que está vencido', async () => {
      const documentos = await documentRepository.findMany({ companyId: a.companyId });
      const vencidosNaLista = documentos.filter((d) => d.status === 'EXPIRED').length;

      const resumo = await dashboardRepository.getSummary({ companyId: a.companyId });

      expect(resumo.expiredDocuments).toBe(vencidosNaLista);
    });

    it('a data de um lançamento continua sendo instante', async () => {
      const [despesa] = await expenseRepository.findMany({ companyId: a.companyId });
      expect(despesa.date).toBeInstanceOf(Date);
    });
  });

  // ---------------------------------------------------------------------------
  describe('vínculos com período', () => {
    it('um veículo pode ter vários motoristas ao mesmo tempo', async () => {
      const vigentes = await assignmentRepository.findActiveByVehicle(
        a.companyId,
        a.veiculoCompartilhadoId,
      );

      expect(vigentes.length).toBeGreaterThanOrEqual(2);
    });

    it('um motorista pode dirigir vários veículos', async () => {
      const veiculos = await assignmentRepository.activeVehicleIds(
        a.companyId,
        a.motorista2Id,
      );

      expect(veiculos.length).toBeGreaterThanOrEqual(2);
    });

    it('o histórico guarda os vínculos encerrados', async () => {
      const historico = await assignmentRepository.findHistoryByVehicle(
        a.companyId,
        a.segundoVeiculoId,
      );

      expect(historico.some((v) => v.endDate !== null)).toBe(true);
    });

    it('a chave de vínculo vigente é derivada pelo banco, não escrita pela aplicação', async () => {
      const vigentes = await assignmentRepository.findActiveByVehicle(
        a.companyId,
        a.veiculoCompartilhadoId,
      );

      for (const vinculo of vigentes) {
        expect(vinculo.activeLinkKey).toBe(`${vinculo.vehicleId}:${vinculo.driverId}`);
      }

      const historico = await assignmentRepository.findHistoryByVehicle(
        a.companyId,
        a.segundoVeiculoId,
      );

      for (const encerrado of historico.filter((v) => v.endDate !== null)) {
        expect(encerrado.activeLinkKey).toBeNull();
      }
    });

    it('dois vínculos vigentes do mesmo par são recusados pelo banco', async () => {
      const [vigente] = await assignmentRepository.findActiveByVehicle(
        a.companyId,
        a.veiculoCompartilhadoId,
      );

      await expect(
        emTransacaoRevertida(async (tx) => {
          await assignmentRepository.create(tx, {
            companyId: a.companyId,
            vehicleId: vigente.vehicleId,
            driverId: vigente.driverId,
            startDate: new Date(),
            createdById: a.gerenteId,
          });
        }),
      ).rejects.toMatchObject({ code: '23505' });
    });

    it('encerrar libera um novo vínculo do mesmo par', async () => {
      const [vigente] = await assignmentRepository.findActiveByVehicle(
        a.companyId,
        a.veiculoCompartilhadoId,
      );

      await emTransacaoRevertida(async (tx) => {
        await assignmentRepository.end(tx, vigente.id, new Date(), a.gerenteId);

        const novo = await assignmentRepository.create(tx, {
          companyId: a.companyId,
          vehicleId: vigente.vehicleId,
          driverId: vigente.driverId,
          startDate: new Date(),
          createdById: a.gerenteId,
        });

        expect(novo.id).not.toBe(vigente.id);
        expect(novo.activeLinkKey).toBe(`${vigente.vehicleId}:${vigente.driverId}`);
      });
    });
  });

  // ---------------------------------------------------------------------------
  describe('painel por empresa e por motorista', () => {
    it('os indicadores de cada empresa são independentes', async () => {
      const resumoA = await dashboardRepository.getSummary({ companyId: a.companyId });
      const resumoB = await dashboardRepository.getSummary({ companyId: b.companyId });

      expect(resumoA.totalVehicles).toBeGreaterThan(0);
      expect(resumoB.totalVehicles).toBeGreaterThan(0);

      const [conferencia] = await sql<{ total: string }[]>`
        select count(*) as total from vehicles where company_id = ${a.companyId}
      `;
      expect(resumoA.totalVehicles).toBe(Number(conferencia.total));
    });

    it('o painel do motorista cobre só os veículos vinculados', async () => {
      const veiculosDoMotorista = await assignmentRepository.activeVehicleIds(
        a.companyId,
        a.motorista1Id,
      );

      const resumo = await dashboardRepository.getSummary({
        companyId: a.companyId,
        createdById: a.motorista1UserId,
        driverScope: { driverId: a.motorista1Id, vehicleIds: veiculosDoMotorista },
      });

      expect(resumo.totalVehicles).toBe(veiculosDoMotorista.length);
      expect(resumo.totalDrivers).toBe(1);
    });

    it('o total por mês devolve a série completa, inclusive meses sem lançamento', async () => {
      const meses = await dashboardRepository.getExpensesByMonth(6, {
        companyId: a.companyId,
      });

      expect(meses).toHaveLength(6);
      expect(meses.every((m) => /^\d{4}-\d{2}$/.test(m.month))).toBe(true);
      expect(meses.every((m) => typeof m.total === 'number')).toBe(true);
    });

    it('o gasto por tipo soma o mesmo que o total geral', async () => {
      const porTipo = await dashboardRepository.getExpensesByType({ companyId: a.companyId });
      const resumo = await dashboardRepository.getSummary({ companyId: a.companyId });

      const soma = porTipo.reduce((total, linha) => total + linha.total, 0);
      expect(soma).toBeCloseTo(resumo.totalExpenses, 2);
    });
  });

  // ---------------------------------------------------------------------------
  describe('restrições do schema', () => {
    it('o vencimento de manutenção concluída não impede o cancelamento', async () => {
      await emTransacaoRevertida(async (tx) => {
        const [concluida] = await tx<{ id: string }[]>`
          select id from maintenances
          where company_id = ${a.companyId} and status = 'DONE' limit 1
        `;

        await tx`
          update maintenances
          set status = 'CANCELLED', cancelled_at = now(), cancelled_by_id = ${a.gerenteId}
          where id = ${concluida.id}
        `;
      });
    });

    it('documento sem veículo e sem motorista é recusado', async () => {
      await expect(
        emTransacaoRevertida(async (tx) => {
          await tx`
            insert into documents (company_id, type, expiry_date, created_by_id)
            values (${a.companyId}, 'OUTRO', current_date, ${a.gerenteId})
          `;
        }),
      ).rejects.toMatchObject({ code: '23514' });
    });

    it('despesa com valor zero é recusada', async () => {
      await expect(
        emTransacaoRevertida(async (tx) => {
          await tx`
            insert into expenses (company_id, vehicle_id, type, amount, date, created_by_id)
            values (${a.companyId}, ${a.veiculoCompartilhadoId}, 'OTHER', 0, now(), ${a.gerenteId})
          `;
        }),
      ).rejects.toMatchObject({ code: '23514' });
    });

    it('ficha vinculada não duplica a identidade do usuário', async () => {
      const [ficha] = await sql<{ name: string | null; cpf: string | null }[]>`
        select name, cpf from drivers where id = ${a.motorista1Id}
      `;

      expect(ficha.name).toBeNull();
      expect(ficha.cpf).toBeNull();
    });

    it('updated_at é mantido pelo banco, não pela aplicação', async () => {
      await emTransacaoRevertida(async (tx) => {
        const [antes] = await tx<{ updatedAt: Date }[]>`
          select updated_at from vehicles where id = ${a.veiculoCompartilhadoId}
        `;

        await tx`
          update vehicles set color = 'Verde' where id = ${a.veiculoCompartilhadoId}
        `;

        const [depois] = await tx<{ updatedAt: Date }[]>`
          select updated_at from vehicles where id = ${a.veiculoCompartilhadoId}
        `;

        expect(depois.updatedAt.getTime()).toBeGreaterThan(antes.updatedAt.getTime());
      });
    });
  });

  // ---------------------------------------------------------------------------
  describe('transações', () => {
    it('uma falha no meio reverte tudo o que veio antes', async () => {
      const [antes] = await sql<{ total: string }[]>`
        select count(*) as total from expenses where company_id = ${a.companyId}
      `;

      await expect(
        sql.begin(async (tx) => {
          await tx`
            insert into expenses (company_id, vehicle_id, type, amount, date, created_by_id)
            values (${a.companyId}, ${a.veiculoCompartilhadoId}, 'FUEL', '10.00', now(),
                    ${a.gerenteId})
          `;

          // Viola a restrição de valor positivo: a transação inteira cai.
          await tx`
            insert into expenses (company_id, vehicle_id, type, amount, date, created_by_id)
            values (${a.companyId}, ${a.veiculoCompartilhadoId}, 'FUEL', '-1.00', now(),
                    ${a.gerenteId})
          `;
        }),
      ).rejects.toMatchObject({ code: '23514' });

      const [depois] = await sql<{ total: string }[]>`
        select count(*) as total from expenses where company_id = ${a.companyId}
      `;

      expect(depois.total).toBe(antes.total);
    });
  });

  // ---------------------------------------------------------------------------
  describe('alteração parcial', () => {
    /**
     * As três alterações montam o `set` com o auxiliar do postgres.js, a partir
     * das chaves presentes no corpo. O SQL resultante só aparece no banco real:
     * nos testes de serviço o repositório é substituído, e uma montagem inválida
     * passaria despercebida até alguém tentar editar um lançamento.
     */
    it('a despesa aceita alterar um único campo', async () => {
      await emTransacaoRevertida(async (tx) => {
        const [despesa] = await expenseRepository.findMany({ companyId: a.companyId });

        const alterada = await expenseRepository.update(
          tx,
          despesa.id,
          { description: 'descrição revista' },
          a.gerenteId,
        );

        expect(alterada.description).toBe('descrição revista');
        expect(alterada.amount).toBe(despesa.amount);
        expect(alterada.updatedById).toBe(a.gerenteId);
      });
    });

    it('a manutenção aceita alterar um único campo', async () => {
      await emTransacaoRevertida(async (tx) => {
        const [manutencao] = await maintenanceRepository.findMany({ companyId: a.companyId });

        const alterada = await maintenanceRepository.update(
          tx,
          manutencao.id,
          { description: 'revisão reagendada' },
          a.gerenteId,
        );

        expect(alterada.description).toBe('revisão reagendada');
        expect(alterada.type).toBe(manutencao.type);
        expect(alterada.updatedById).toBe(a.gerenteId);
      });
    });

    // O caminho do anexo entra por aqui: gravar `fileUrl` é uma alteração de um
    // campo só, e é o que o formulário faz depois de enviar o arquivo.
    it('o documento aceita gravar só o caminho do anexo', async () => {
      await emTransacaoRevertida(async (tx) => {
        const [documento] = await documentRepository.findMany({ companyId: a.companyId });
        const caminho = `${a.companyId}/${crypto.randomUUID()}/${crypto.randomUUID()}.pdf`;

        const alterado = await documentRepository.update(
          tx,
          documento.id,
          { fileUrl: caminho },
          a.gerenteId,
        );

        expect(alterado.fileUrl).toBe(caminho);
        expect(alterado.expiryDate).toBe(documento.expiryDate);

        const [linha] = await tx<{ updatedById: string }[]>`
          select updated_by_id as "updatedById" from documents where id = ${documento.id}
        `;
        expect(linha.updatedById).toBe(a.gerenteId);
      });
    });
  });

  // ---------------------------------------------------------------------------
  describe('histórico de alterações', () => {
    it('o nome do autor é gravado por cópia', async () => {
      const [entrada] = await sql<{ actorName: string; actorId: string }[]>`
        select actor_name, actor_id from change_logs
        where company_id = ${a.companyId} limit 1
      `;

      const [autor] = await sql<{ name: string }[]>`
        select name from users where id = ${entrada.actorId}
      `;

      expect(entrada.actorName).toBe(autor.name);
    });

    it('as chaves do diff chegam como foram gravadas', async () => {
      await emTransacaoRevertida(async (tx) => {
        const [criada] = await tx<{ id: string }[]>`
          insert into change_logs
            (company_id, entity_type, entity_id, action, changes, actor_id, actor_name)
          values (
            ${a.companyId}, 'EXPENSE', ${a.veiculoCompartilhadoId}, 'UPDATE',
            ${tx.json({ scheduled_date: { de: 'a', para: 'b' }, campo_com_underscore: 1 })},
            ${a.gerenteId}, 'Teste'
          )
          returning id
        `;

        const [lida] = await tx<{ changes: Record<string, unknown> }[]>`
          select changes from change_logs where id = ${criada.id}
        `;

        // Se o driver reescrevesse as chaves de json, viriam em camelCase e o
        // histórico ficaria corrompido na leitura.
        expect(Object.keys(lida.changes).sort()).toEqual([
          'campo_com_underscore',
          'scheduled_date',
        ]);
      });
    });
  });
});
