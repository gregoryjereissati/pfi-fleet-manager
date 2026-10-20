import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { SignJWT, decodeProtectedHeader, generateKeyPair } from 'jose';
import { app } from '../src/app';
import { sql } from '../src/config/database';
import {
  CHAVE_PUBLICA,
  PESSOAS,
  SUFIXO,
  SUPABASE_URL,
  cliente,
  criarConta,
  diasAPartirDeHoje,
  ehAmbienteLocal,
  entrar,
  gerarCpf,
  listarArquivos,
  type Cliente,
  type Pessoa,
} from './helpers';

interface Registro {
  id: string;
  [campo: string]: unknown;
}

/**
 * Suíte de ponta a ponta da API.
 *
 * Cada caso leva o identificador do plano de testes (INF, AUT, RBAC, ISO, OPE,
 * VEI, DES, MAN, DOC, CAD, VAL), para que o relatório aponte direto para ele.
 */
describe.skipIf(!ehAmbienteLocal)('API de ponta a ponta (Supabase local)', () => {
  const tokens = {} as Record<Pessoa, string>;
  const como = (pessoa: Pessoa, empresa?: string): Cliente => cliente(tokens[pessoa], empresa);

  let empresaA: string;
  let empresaB: string;
  let veiculosA: Registro[];
  let veiculosB: Registro[];
  let motoristasA: Registro[];
  let claudia: { userId: string; driverId: string };
  let iranildoDriverId: string;

  beforeAll(async () => {
    const pessoas = Object.keys(PESSOAS) as Pessoa[];
    const emitidos = await Promise.all(pessoas.map((p) => entrar(PESSOAS[p])));
    pessoas.forEach((p, i) => (tokens[p] = emitidos[i]));

    empresaA = (await como('helena').get('/users/me')).body.companyId;
    empresaB = (await como('otavio').get('/users/me')).body.companyId;
    veiculosA = (await como('helena').get('/vehicles')).body;
    veiculosB = (await como('otavio').get('/vehicles')).body;
    motoristasA = (await como('helena').get('/drivers')).body;

    const eu = (await como('claudia').get('/users/me')).body;
    claudia = { userId: eu.id, driverId: eu.driverId };
    iranildoDriverId = motoristasA.find((m) => m.email === PESSOAS.iranildo)!.id;
  });

  afterAll(async () => {
    await sql.end();
  });

  // ===========================================================================
  describe('INF — infraestrutura', () => {
    it('INF-01 GET /health responde ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('INF-02 CORS aceita localhost fora de produção', async () => {
      const res = await request(app).get('/health').set('Origin', 'http://localhost:5173');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('INF-03 CORS não autoriza origem desconhecida', async () => {
      const res = await request(app).get('/health').set('Origin', 'https://intruso.example');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('INF-04 preflight responde 204 e libera X-Company-Id', async () => {
      const res = await request(app)
        .options('/api/vehicles')
        .set('Origin', 'http://localhost:5173');
      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-headers']).toContain('X-Company-Id');
    });

    it('INF-05 rotina de alertas exige CRON_SECRET', async () => {
      const anterior = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;
      expect((await cliente().get('/jobs/alerts')).status).toBe(503);

      process.env.CRON_SECRET = 'segredo-e2e';
      expect((await cliente('errado').get('/jobs/alerts')).status).toBe(401);

      const ok = await cliente('segredo-e2e').get('/jobs/alerts');
      expect(ok.status).toBe(200);
      expect(typeof ok.body.documentosSinalizados).toBe('number');

      if (anterior === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = anterior;
    });
  });

  // ===========================================================================
  describe('AUT — autenticação', () => {
    it('AUT-01 sem cabeçalho de autorização → 401', async () => {
      expect((await cliente().get('/users/me')).status).toBe(401);
    });

    it('AUT-02 token malformado → 401', async () => {
      expect((await cliente('nao-e-um-jwt').get('/users/me')).status).toBe(401);
    });

    it('AUT-03 token ES256 assinado por chave alheia, mesmo kid → 401', async () => {
      const { kid } = decodeProtectedHeader(tokens.helena);
      const { privateKey } = await generateKeyPair('ES256');
      const forjado = await new SignJWT({ email: PESSOAS.helena, role: 'authenticated' })
        .setProtectedHeader({ alg: 'ES256', kid })
        .setSubject('00000000-0000-0000-0000-000000000000')
        .setIssuer(`${SUPABASE_URL}/auth/v1`)
        .setAudience('authenticated')
        .setExpirationTime('1h')
        .sign(privateKey);
      expect((await cliente(forjado).get('/users/me')).status).toBe(401);
    });

    it('AUT-04 token HS256 com o segredo legado do Supabase local → 401 (confusão de algoritmo)', async () => {
      const segredo = new TextEncoder().encode(
        'super-secret-jwt-token-with-at-least-32-characters-long',
      );
      const forjado = await new SignJWT({ email: PESSOAS.helena, role: 'authenticated' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('00000000-0000-0000-0000-000000000000')
        .setIssuer(`${SUPABASE_URL}/auth/v1`)
        .setAudience('authenticated')
        .setExpirationTime('1h')
        .sign(segredo);
      expect((await cliente(forjado).get('/users/me')).status).toBe(401);
    });

    it('AUT-05 token com alg "none" → 401', async () => {
      const [, payload] = tokens.helena.split('.');
      const cabecalho = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
        'base64url',
      );
      expect((await cliente(`${cabecalho}.${payload}.`).get('/users/me')).status).toBe(401);
    });

    it('AUT-06 a chave pública (anon) não serve como token de usuário → 401', async () => {
      expect((await cliente(CHAVE_PUBLICA).get('/users/me')).status).toBe(401);
    });

    it('AUT-07 perfil PENDING → 403 PENDING_APPROVAL', async () => {
      const res = await como('marcos').get('/users/me');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('PENDING_APPROVAL');
    });

    it('AUT-08 perfil REJECTED → 403 REJECTED', async () => {
      const res = await como('vanda').get('/users/me');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('REJECTED');
    });

    it('AUT-09 perfil ativo recebe os próprios dados, com papel e empresa do banco', async () => {
      const res = await como('helena').get('/users/me');
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('ADMIN');
      expect(res.body.companyId).toBe(empresaA);
    });

    it('AUT-10 super admin sem empresa escolhida não alcança rotas de empresa', async () => {
      const res = await como('plataforma').get('/vehicles');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('COMPANY_NOT_SELECTED');
    });

    it('AUT-11 super admin com empresa inexistente → 404 COMPANY_NOT_FOUND', async () => {
      const res = await como('plataforma', '00000000-0000-0000-0000-000000000000').get(
        '/vehicles',
      );
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('COMPANY_NOT_FOUND');
    });

    it('AUT-12 super admin opera na empresa escolhida como ADMIN', async () => {
      const res = await como('plataforma', empresaB).get('/vehicles');
      expect(res.status).toBe(200);
      expect(res.body.map((v: Registro) => v.id).sort()).toEqual(
        veiculosB.map((v) => v.id).sort(),
      );
    });

    it('AUT-13 X-Company-Id é ignorado para perfil comum', async () => {
      const res = await como('helena', empresaB).get('/vehicles');
      expect(res.status).toBe(200);
      expect(res.body.every((v: Registro) => v.companyId === empresaA)).toBe(true);
    });
  });

  // ===========================================================================
  describe('RBAC — controle de acesso por papel', () => {
    const ID = '00000000-0000-0000-0000-000000000000';

    const negados: [Pessoa, string, string][] = [
      ['claudia', 'post', '/vehicles'],
      ['claudia', 'put', `/vehicles/${ID}`],
      ['claudia', 'post', '/drivers'],
      ['claudia', 'post', '/documents'],
      ['claudia', 'post', '/documents/arquivo/url-de-envio'],
      ['claudia', 'get', '/users'],
      ['claudia', 'patch', `/users/${ID}/status`],
      ['claudia', 'delete', `/expenses/${ID}`],
      ['claudia', 'delete', `/maintenances/${ID}`],
      ['claudia', 'post', `/vehicles/${ID}/drivers`],
      ['claudia', 'get', '/companies'],
      ['rogerio', 'patch', `/users/${ID}/status`],
      ['rogerio', 'patch', `/users/${ID}/role`],
      ['rogerio', 'delete', `/users/${ID}`],
      ['rogerio', 'get', `/vehicles/${ID}/delete-preview`],
      ['rogerio', 'delete', `/vehicles/${ID}/permanent`],
      ['rogerio', 'delete', `/drivers/${ID}/permanent`],
      ['rogerio', 'get', '/companies'],
      ['helena', 'get', '/companies'],
      ['helena', 'post', '/companies'],
    ];

    it.each(negados)('RBAC %s %s %s → 403', async (pessoa, metodo, caminho) => {
      const c = como(pessoa) as unknown as Record<string, (p: string) => request.Test>;
      expect((await c[metodo](caminho)).status).toBe(403);
    });

    const permitidos: [Pessoa, string][] = [
      ['claudia', '/vehicles'],
      ['claudia', '/expenses'],
      ['claudia', '/documents'],
      ['claudia', '/dashboard/indicators'],
      ['rogerio', '/users'],
      ['helena', '/users'],
      ['plataforma', '/companies'],
    ];

    it.each(permitidos)('RBAC %s GET %s → 200', async (pessoa, caminho) => {
      expect((await como(pessoa).get(caminho)).status).toBe(200);
    });
  });

  // ===========================================================================
  describe('ISO — isolamento entre empresas', () => {
    it('ISO-01 as listagens de veículos não se cruzam', () => {
      const idsB = new Set(veiculosB.map((v) => v.id));
      expect(veiculosA.length).toBeGreaterThan(0);
      expect(veiculosA.some((v) => idsB.has(v.id))).toBe(false);
    });

    it('ISO-02 veículo da outra empresa responde como inexistente (GET, PUT, DELETE)', async () => {
      const alheio = veiculosB[0].id;
      expect((await como('helena').get(`/vehicles/${alheio}`)).status).toBe(404);
      expect((await como('helena').put(`/vehicles/${alheio}`, { color: 'X' })).status).toBe(404);
      expect((await como('helena').delete(`/vehicles/${alheio}`)).status).toBe(404);
    });

    it('ISO-03 não registra despesa em veículo de outra empresa', async () => {
      const res = await como('helena').post('/expenses', {
        vehicleId: veiculosB[0].id,
        type: 'FUEL',
        amount: 10,
        date: diasAPartirDeHoje(0),
      });
      expect(res.status).toBe(404);
    });

    it('ISO-04 despesas, manutenções e documentos alheios → 404', async () => {
      const [despB] = (await como('otavio').get('/expenses')).body as Registro[];
      const [manB] = (await como('otavio').get('/maintenances')).body as Registro[];
      const [docB] = (await como('otavio').get('/documents')).body as Registro[];
      expect((await como('helena').get(`/expenses/${despB.id}`)).status).toBe(404);
      expect((await como('helena').get(`/maintenances/${manB.id}`)).status).toBe(404);
      expect((await como('helena').get(`/documents/${docB.id}`)).status).toBe(404);
      expect((await como('helena').get(`/documents/${docB.id}/arquivo`)).status).toBe(404);
      expect(
        (await como('helena').patch(`/expenses/${despB.id}/cancel`, { reason: 'teste' })).status,
      ).toBe(404);
    });

    it('ISO-05 a lista de usuários só traz a própria empresa', async () => {
      const res = await como('helena').get('/users');
      const emails: string[] = res.body.map((u: { email: string }) => u.email);
      expect(emails).toContain(PESSOAS.claudia);
      expect(emails).not.toContain(PESSOAS.otavio);
      expect(emails).not.toContain(PESSOAS.plataforma);
    });

    it('ISO-06 admin não altera usuário de outra empresa', async () => {
      const usuariosB = (await como('otavio').get('/users')).body as (Registro & {
        email: string;
      })[];
      const juliana = usuariosB.find((u) => u.email === 'juliana.pendente@example.com')!;
      const res = await como('helena').patch(`/users/${juliana.id}/status`, { status: 'ACTIVE' });
      expect(res.status).toBe(404);
    });

    it('ISO-07 motorista de outra empresa → 404', async () => {
      const [motoristaB] = (await como('otavio').get('/drivers')).body as Registro[];
      expect((await como('helena').get(`/drivers/${motoristaB.id}`)).status).toBe(404);
    });

    it('ISO-08 o painel conta só a própria frota', async () => {
      const res = await como('helena').get('/dashboard/indicators');
      expect(res.body.summary.totalVehicles).toBe(veiculosA.length);
    });
  });

  // ===========================================================================
  describe('OPE — recorte do motorista', () => {
    it('OPE-01 vê só os veículos vinculados a si', async () => {
      const res = await como('claudia').get('/vehicles');
      const idsA = new Set(veiculosA.map((v) => v.id));
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.length).toBeLessThan(veiculosA.length);
      expect(res.body.every((v: Registro) => idsA.has(v.id))).toBe(true);
    });

    it('OPE-02 vê só a própria ficha de motorista', async () => {
      const res = await como('claudia').get('/drivers');
      expect(res.body.map((d: Registro) => d.id)).toEqual([claudia.driverId]);
      expect((await como('claudia').get(`/drivers/${iranildoDriverId}`)).status).toBe(404);
    });

    it('OPE-03 vê só os próprios lançamentos', async () => {
      const res = await como('claudia').get('/expenses');
      expect(res.body.every((d: Registro) => d.createdById === claudia.userId)).toBe(true);
    });

    it('OPE-04 não registra despesa em veículo não vinculado', async () => {
      const meus = new Set(
        ((await como('claudia').get('/vehicles')).body as Registro[]).map((v) => v.id),
      );
      const outro = veiculosA.find((v) => !meus.has(v.id))!;
      const res = await como('claudia').post('/expenses', {
        vehicleId: outro.id,
        type: 'FUEL',
        amount: 50,
        date: diasAPartirDeHoje(0),
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('VEHICLE_NOT_ASSIGNED');
    });

    it('OPE-05 registra no veículo vinculado; colega do mesmo veículo não o enxerga nem cancela', async () => {
      const [meu] = (await como('claudia').get('/vehicles')).body as Registro[];
      const criada = await como('claudia').post('/expenses', {
        vehicleId: meu.id,
        type: 'FUEL',
        amount: 88.9,
        date: diasAPartirDeHoje(0),
        description: `e2e ${SUFIXO}`,
      });
      expect(criada.status).toBe(201);
      expect(criada.body.createdById).toBe(claudia.userId);

      expect((await como('iranildo').get(`/expenses/${criada.body.id}`)).status).toBe(404);
      expect(
        (await como('iranildo').patch(`/expenses/${criada.body.id}/cancel`, { reason: 'alheio' }))
          .status,
      ).toBe(404);

      expect(
        (await como('claudia').patch(`/expenses/${criada.body.id}/cancel`, { reason: 'teste e2e' }))
          .status,
      ).toBe(200);
      expect((await como('rogerio').delete(`/expenses/${criada.body.id}`)).status).toBe(200);
    });

    it('OPE-06 não vê a CNH de um colega', async () => {
      const docs = (await como('helena').get('/documents')).body as Registro[];
      const doColega = docs.find((d) => d.driverId === iranildoDriverId);
      expect(doColega).toBeDefined();
      expect((await como('claudia').get(`/documents/${doColega!.id}`)).status).toBe(404);
      const visiveis = (await como('claudia').get('/documents')).body as Registro[];
      expect(visiveis.some((d) => d.driverId === iranildoDriverId)).toBe(false);
    });
  });

  // ===========================================================================
  describe('VEI — ciclo de vida do veículo', () => {
    const placa = `E2E${SUFIXO}`.slice(0, 8);
    let id: string;

    it('VEI-01 recusa ano fora da faixa', async () => {
      const res = await como('helena').post('/vehicles', {
        plate: placa,
        brand: 'Fiat',
        model: 'Strada',
        year: 1800,
      });
      expect(res.status).toBe(400);
    });

    it('VEI-02 cria veículo', async () => {
      const res = await como('rogerio').post('/vehicles', {
        plate: placa,
        brand: 'Fiat',
        model: 'Strada',
        year: 2024,
        color: 'Prata',
      });
      expect(res.status).toBe(201);
      expect(res.body.companyId).toBe(empresaA);
      id = res.body.id;
    });

    it('VEI-03 recusa placa repetida → 409', async () => {
      const res = await como('helena').post('/vehicles', {
        plate: placa,
        brand: 'Fiat',
        model: 'Toro',
        year: 2024,
      });
      expect(res.status).toBe(409);
    });

    it('VEI-04 edita', async () => {
      const res = await como('helena').put(`/vehicles/${id}`, { color: 'Vermelho' });
      expect(res.status).toBe(200);
      expect(res.body.color).toBe('Vermelho');
    });

    it('VEI-05 vincula e desvincula motorista', async () => {
      const vinculo = await como('helena').post(`/vehicles/${id}/drivers`, {
        driverIds: [claudia.driverId],
      });
      expect(vinculo.status).toBeLessThan(300);

      const motoristas = await como('helena').get(`/vehicles/${id}/drivers`);
      expect(JSON.stringify(motoristas.body)).toContain(claudia.driverId);

      const vistoPelaMotorista = await como('claudia').get(`/vehicles/${id}`);
      expect(vistoPelaMotorista.status).toBe(200);

      const fim = await como('helena').delete(`/vehicles/${id}/drivers/${claudia.driverId}`);
      expect(fim.status).toBeLessThan(300);
      expect((await como('claudia').get(`/vehicles/${id}`)).status).toBe(404);
    });

    it('VEI-06 exclusão definitiva exige veículo inativo', async () => {
      expect((await como('helena').get(`/vehicles/${id}/delete-preview`)).status).toBe(200);
      const res = await como('helena').delete(`/vehicles/${id}/permanent`);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('VEHICLE_MUST_BE_INACTIVE');
    });

    it('VEI-07 inativa e exclui em definitivo', async () => {
      const inativo = await como('helena').delete(`/vehicles/${id}`);
      expect(inativo.status).toBe(200);
      expect(inativo.body.status).toBe('INACTIVE');
      expect((await como('helena').delete(`/vehicles/${id}/permanent`)).status).toBeLessThan(300);
      expect((await como('helena').get(`/vehicles/${id}`)).status).toBe(404);
    });
  });

  // ===========================================================================
  describe('DES — despesa, cancelamento e painel', () => {
    let veiculo: string;
    let id: string;
    let totalAntes: number;

    const total = async () =>
      (await como('helena').get('/dashboard/indicators')).body.summary.totalExpenses as number;

    beforeAll(async () => {
      const res = await como('helena').post('/vehicles', {
        plate: `D${SUFIXO}`.slice(0, 8),
        brand: 'Renault',
        model: 'Kangoo',
        year: 2022,
      });
      veiculo = res.body.id;
      totalAntes = await total();
    });

    afterAll(async () => {
      await como('helena').delete(`/vehicles/${veiculo}`);
      await como('helena').delete(`/vehicles/${veiculo}/permanent`);
    });

    it('DES-01 recusa valor zero ou negativo', async () => {
      const res = await como('helena').post('/expenses', {
        vehicleId: veiculo,
        type: 'FUEL',
        amount: -5,
        date: diasAPartirDeHoje(0),
      });
      expect(res.status).toBe(400);
    });

    it('DES-02 recusa categoria inexistente', async () => {
      const res = await como('helena').post('/expenses', {
        vehicleId: veiculo,
        type: 'PIZZA',
        amount: 5,
        date: diasAPartirDeHoje(0),
      });
      expect(res.status).toBe(400);
    });

    it('DES-03 cria e preserva a precisão monetária', async () => {
      const res = await como('helena').post('/expenses', {
        vehicleId: veiculo,
        type: 'MAINTENANCE',
        amount: 1234.56,
        date: diasAPartirDeHoje(0),
        description: `e2e ${SUFIXO}`,
      });
      expect(res.status).toBe(201);
      expect(res.body.amount).toBe('1234.56');
      id = res.body.id;
    });

    it('DES-04 entra no total do painel', async () => {
      expect(await total()).toBeCloseTo(totalAntes + 1234.56, 2);
    });

    it('DES-05 corrige o valor', async () => {
      const res = await como('helena').put(`/expenses/${id}`, { amount: 0.1 + 0.2 });
      expect(res.status).toBe(200);
      expect(Number(res.body.amount)).toBeCloseTo(0.3, 2);
      expect(await total()).toBeCloseTo(totalAntes + 0.3, 2);
    });

    it('DES-06 cancelamento exige motivo de 3+ caracteres', async () => {
      expect((await como('helena').patch(`/expenses/${id}/cancel`, { reason: 'ab' })).status).toBe(
        400,
      );
    });

    it('DES-07 cancela e sai do total', async () => {
      const res = await como('helena').patch(`/expenses/${id}/cancel`, { reason: 'Lançamento duplicado' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
      expect(await total()).toBeCloseTo(totalAntes, 2);
    });

    it('DES-08 não cancela duas vezes nem edita cancelado', async () => {
      expect(
        (await como('helena').patch(`/expenses/${id}/cancel`, { reason: 'de novo' })).body.error,
      ).toBe('ALREADY_CANCELLED');
      expect((await como('helena').put(`/expenses/${id}`, { amount: 9 })).body.error).toBe(
        'EXPENSE_CANCELLED',
      );
    });

    it('DES-09 reativa e volta ao total', async () => {
      expect((await como('helena').patch(`/expenses/${id}/uncancel`)).status).toBe(200);
      expect(await total()).toBeCloseTo(totalAntes + 0.3, 2);
      expect((await como('helena').patch(`/expenses/${id}/uncancel`)).body.error).toBe(
        'NOT_CANCELLED',
      );
    });

    it('DES-10 histórico registra cada alteração com autor', async () => {
      const res = await como('helena').get(`/expenses/${id}/history`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
      expect(JSON.stringify(res.body)).toContain('Helena');
    });

    it('DES-11 gerente exclui em definitivo', async () => {
      expect((await como('rogerio').delete(`/expenses/${id}`)).status).toBe(200);
      expect((await como('helena').get(`/expenses/${id}`)).status).toBe(404);
      expect(await total()).toBeCloseTo(totalAntes, 2);
    });
  });

  // ===========================================================================
  describe('MAN — manutenção', () => {
    let veiculo: string;
    let id: string;

    beforeAll(async () => {
      veiculo = ((await como('claudia').get('/vehicles')).body as Registro[])[0].id;
    });

    it('MAN-01 motorista agenda manutenção no veículo vinculado', async () => {
      const res = await como('claudia').post('/maintenances', {
        vehicleId: veiculo,
        type: 'PREVENTIVE',
        description: `Troca de óleo e2e ${SUFIXO}`,
        scheduledDate: diasAPartirDeHoje(7),
      });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SCHEDULED');
      id = res.body.id;
    });

    it('MAN-02 conclui', async () => {
      const res = await como('claudia').put(`/maintenances/${id}`, {
        status: 'DONE',
        completedDate: diasAPartirDeHoje(0),
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DONE');
    });

    it('MAN-03 cancela e reativa', async () => {
      expect(
        (await como('claudia').patch(`/maintenances/${id}/cancel`, { reason: 'Agendado errado' }))
          .status,
      ).toBe(200);
      expect((await como('claudia').patch(`/maintenances/${id}/uncancel`)).status).toBe(200);
    });

    it('MAN-04 motorista não exclui; gerente exclui', async () => {
      expect((await como('claudia').delete(`/maintenances/${id}`)).status).toBe(403);
      expect((await como('rogerio').delete(`/maintenances/${id}`)).status).toBeLessThan(300);
      expect((await como('helena').get(`/maintenances/${id}`)).status).toBe(404);
    });
  });

  // ===========================================================================
  describe('DOC — documentos e anexos', () => {
    let veiculo: string;
    let caminho1: string;
    let caminho2: string;
    let id: string;
    const conteudo = Buffer.from(`%PDF-1.4\n% e2e ${SUFIXO}\n`);

    const enviar = async () => {
      const envio = await como('helena').post('/documents/arquivo/url-de-envio', {
        vehicleId: veiculo,
        extensao: 'pdf',
      });
      expect(envio.status).toBe(201);
      const put = await fetch(envio.body.url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: conteudo,
      });
      expect(put.ok).toBe(true);
      return envio.body.caminho as string;
    };

    beforeAll(async () => {
      veiculo = veiculosA[0].id;
    });

    it('DOC-01 exige veículo OU motorista, nunca os dois', async () => {
      const res = await como('helena').post('/documents', {
        vehicleId: veiculo,
        driverId: claudia.driverId,
        type: 'CRLV',
        expiryDate: '2027-01-31',
      });
      expect(res.status).toBe(400);
    });

    it('DOC-02 recusa extensão fora da lista', async () => {
      const res = await como('helena').post('/documents/arquivo/url-de-envio', {
        vehicleId: veiculo,
        extensao: 'exe',
      });
      expect(res.status).toBe(400);
    });

    it('DOC-03 recusa fileUrl que não seja caminho emitido pela API', async () => {
      const res = await como('helena').post('/documents', {
        vehicleId: veiculo,
        type: 'CRLV',
        expiryDate: '2027-01-31',
        fileUrl: 'https://intruso.example/x.pdf',
      });
      expect(res.status).toBe(400);
    });

    it('DOC-04 URL de envio usa a empresa do recorte no caminho', async () => {
      caminho1 = await enviar();
      expect(caminho1.startsWith(`${empresaA}/${veiculo}/`)).toBe(true);
    });

    it('DOC-05 cria documento e preserva a data civil', async () => {
      const res = await como('helena').post('/documents', {
        vehicleId: veiculo,
        type: 'SEGURO',
        expiryDate: '2027-03-15',
        fileUrl: caminho1,
      });
      expect(res.status).toBe(201);
      expect(res.body.expiryDate).toBe('2027-03-15');
      id = res.body.id;
    });

    it('DOC-06 leitura via URL assinada devolve o mesmo arquivo', async () => {
      const res = await como('helena').get(`/documents/${id}/arquivo`);
      expect(res.status).toBe(200);
      const arquivo = await fetch(res.body.url);
      expect(arquivo.status).toBe(200);
      expect(Buffer.from(await arquivo.arrayBuffer()).equals(conteudo)).toBe(true);
    });

    it('DOC-07 o Storage não é alcançável direto com o token do usuário', async () => {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/documents/${caminho1}`, {
        method: 'POST',
        headers: {
          apikey: CHAVE_PUBLICA,
          Authorization: `Bearer ${tokens.helena}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 60 }),
      });
      expect(res.ok).toBe(false);
    });

    it('DOC-08 outra empresa não obtém o anexo', async () => {
      expect((await como('otavio').get(`/documents/${id}/arquivo`)).status).toBe(404);
    });

    it('DOC-09 trocar o anexo remove o anterior do bucket', async () => {
      caminho2 = await enviar();
      const res = await como('helena').put(`/documents/${id}`, { fileUrl: caminho2 });
      expect(res.status).toBe(200);
      const nomes = await listarArquivos(`${empresaA}/${veiculo}`);
      expect(nomes).toContain(caminho2.split('/').pop());
      expect(nomes).not.toContain(caminho1.split('/').pop());
    });

    it('DOC-10 excluir o documento remove o anexo', async () => {
      expect((await como('helena').delete(`/documents/${id}`)).status).toBeLessThan(300);
      const nomes = await listarArquivos(`${empresaA}/${veiculo}`);
      expect(nomes).not.toContain(caminho2.split('/').pop());
    });

    it('DOC-11 contador de alertas responde número', async () => {
      const res = await como('helena').get('/documents/alerts/count');
      expect(res.status).toBe(200);
      expect(typeof res.body.count).toBe('number');
    });
  });

  // ===========================================================================
  describe('CAD — empresa nova, cadastro e aprovação', () => {
    const codigo = `E2E-${SUFIXO}`;
    const email = `e2e.${SUFIXO.toLowerCase()}@example.com`;
    const senha = `E2e!${SUFIXO}senha`;
    const cpf = gerarCpf();
    let empresa: string;
    let token: string;
    let userId: string;

    const perfil = (joinCode: string, cpfUsado = cpf) => ({
      name: 'Pessoa de Teste E2E',
      cpf: cpfUsado,
      phone: '(85) 98888-0000',
      email,
      companyJoinCode: joinCode,
      requestedRole: 'MANAGER',
      addressStreet: 'Rua A',
      addressNumber: '10',
      addressDistrict: 'Centro',
      addressCity: 'Fortaleza',
      addressState: 'CE',
      addressZip: '60000-000',
    });

    it('CAD-01 recusa código de empresa com caracteres inválidos', async () => {
      const res = await como('plataforma').post('/companies', { name: 'X', joinCode: 'a b' });
      expect(res.status).toBe(400);
    });

    it('CAD-02 super admin cria empresa', async () => {
      const res = await como('plataforma').post('/companies', {
        name: `Empresa E2E ${SUFIXO}`,
        joinCode: codigo,
      });
      expect(res.status).toBe(201);
      empresa = res.body.id;
    });

    it('CAD-03 código repetido → 409', async () => {
      const res = await como('plataforma').post('/companies', { name: 'Outra', joinCode: codigo });
      expect(res.status).toBe(409);
    });

    it('CAD-04 cadastro de perfil sem sessão → 401', async () => {
      expect((await cliente().post('/auth/register', perfil(codigo))).status).toBe(401);
    });

    it('CAD-05 código de empresa inexistente → 404', async () => {
      token = await criarConta(email, senha);
      const res = await cliente(token).post('/auth/register', perfil('NAO-EXISTE-0'));
      expect(res.status).toBe(404);
    });

    it('CAD-06 CPF de outra pessoa → 409 CPF_TAKEN', async () => {
      const cpfHelena = (await como('helena').get('/users/me')).body.cpf;
      const res = await cliente(token).post('/auth/register', perfil(codigo, cpfHelena));
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CPF_TAKEN');
    });

    it('CAD-07 cria perfil PENDING com o papel mínimo, guardando o pedido', async () => {
      const res = await cliente(token).post('/auth/register', perfil(codigo));
      expect(res.status).toBe(201);
      expect(res.body.user.status).toBe('PENDING');
      expect(res.body.user.role).toBe('OPERATOR');
      expect(res.body.user.requestedRole).toBe('MANAGER');
      userId = res.body.user.id;
    });

    it('CAD-08 cadastro repetido → 409', async () => {
      expect((await cliente(token).post('/auth/register', perfil(codigo))).status).toBe(409);
    });

    it('CAD-09 pendente não acessa', async () => {
      expect((await cliente(token).get('/users/me')).body.error).toBe('PENDING_APPROVAL');
    });

    it('CAD-10 aprovação como OPERATOR cria a ficha de motorista, de forma idempotente', async () => {
      const sa = como('plataforma', empresa);
      expect((await sa.patch(`/users/${userId}/status`, { status: 'ACTIVE', role: 'OPERATOR' })).status).toBe(200);
      expect((await sa.patch(`/users/${userId}/status`, { status: 'ACTIVE' })).status).toBe(200);
      const fichas = ((await sa.get('/drivers')).body as Registro[]).filter(
        (d) => d.userId === userId,
      );
      expect(fichas).toHaveLength(1);
      expect(fichas[0].cpf).toBe(cpf);
    });

    it('CAD-11 aprovado acessa', async () => {
      const res = await cliente(token).get('/users/me');
      expect(res.status).toBe(200);
      expect(res.body.companyId).toBe(empresa);
    });

    it('CAD-12 empresa inativa suspende o acesso dos membros e do super admin nela', async () => {
      expect(
        (await como('plataforma').patch(`/companies/${empresa}/status`, { status: 'INACTIVE' }))
          .status,
      ).toBe(200);
      expect((await cliente(token).get('/users/me')).body.error).toBe('COMPANY_INACTIVE');
      expect((await como('plataforma', empresa).get('/vehicles')).body.error).toBe(
        'COMPANY_INACTIVE',
      );
    });

    it('CAD-13 reativar devolve o acesso', async () => {
      await como('plataforma').patch(`/companies/${empresa}/status`, { status: 'ACTIVE' });
      expect((await cliente(token).get('/users/me')).status).toBe(200);
    });

    it('CAD-14 admin não altera o próprio status', async () => {
      const eu = (await como('helena').get('/users/me')).body.id;
      const res = await como('helena').patch(`/users/${eu}/status`, { status: 'BLOCKED' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('CANNOT_CHANGE_OWN_STATUS');
    });
  });

  // ===========================================================================
  describe('VAL — validação e entradas hostis', () => {
    it('VAL-01 ordenação fora da lista fechada → 400', async () => {
      expect((await como('helena').get('/vehicles?orderBy=password')).status).toBe(400);
    });

    it('VAL-02 filtro com tentativa de injeção é tratado como texto', async () => {
      const res = await como('helena').get(
        `/vehicles?plate=${encodeURIComponent("' OR 1=1 --")}`,
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it.each(['vehicles', 'drivers', 'expenses', 'maintenances', 'documents', 'users'])(
      'VAL-03 identificador que não é UUID em /%s responde 404',
      async (recurso) => {
        const metodo = recurso === 'users' ? 'delete' : 'get';
        const res = await como('helena')[metodo](`/${recurso}/nao-e-uuid`);
        expect(res.status).toBe(404);
      },
    );

    it('VAL-04 JSON malformado responde 400', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${tokens.helena}`)
        .set('Content-Type', 'application/json')
        .send('{"plate":');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid JSON body');
    });

    it('VAL-05 autor enviado no corpo é ignorado', async () => {
      const [meu] = (await como('claudia').get('/vehicles')).body as Registro[];
      const res = await como('claudia').post('/expenses', {
        vehicleId: meu.id,
        type: 'OTHER',
        amount: 1,
        date: diasAPartirDeHoje(0),
        createdById: '00000000-0000-0000-0000-000000000000',
        companyId: empresaB,
      });
      expect(res.status).toBe(201);
      expect(res.body.createdById).toBe(claudia.userId);
      expect(res.body.companyId).toBe(empresaA);
      await como('rogerio').delete(`/expenses/${res.body.id}`);
    });

    it('VAL-06 período inválido no painel → 400', async () => {
      expect((await como('helena').get('/dashboard/indicators?startDate=ontem')).status).toBe(400);
    });
  });
});
