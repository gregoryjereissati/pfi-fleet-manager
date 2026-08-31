"""
Gera os diagramas do Documento Técnico do Fleet Manager.

Os diagramas são desenhados em SVG e convertidos em PNG para inclusão no
documento. Manter a geração em script torna as figuras reproduzíveis: quando a
arquitetura muda, basta ajustar a descrição aqui e executar novamente.

Uso:  python scripts/gerar-diagramas.py
Saída: docs/academico/figuras/*.png
"""

import math
import os

import fitz

SAIDA = os.path.join('docs', 'academico', 'figuras')

# Paleta contida, legível também em impressão monocromática.
TINTA = '#1B2735'      # traço e texto principal
BORDA = '#5A6B80'      # bordas de caixas secundárias
FUNDO_A = '#E8EDF4'    # caixa de aplicação
FUNDO_B = '#F2F4F7'    # caixa neutra
FUNDO_C = '#DDE8E1'    # caixa de serviço externo
FUNDO_D = '#F7EDE2'    # destaque
BRANCO = '#FFFFFF'

FONTE = "Segoe UI, Helvetica, Arial, sans-serif"


def cab(w, h):
    """Cabeçalho do SVG.

    Setas e tracejados são desenhados como geometria explícita, e não por
    `marker-end` ou `stroke-dasharray`: o renderizador usado na conversão para
    PNG ignora ambos, o que deixaria os diagramas sem pontas de seta.
    """
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}">'
        f'<rect width="{w}" height="{h}" fill="{BRANCO}"/>'
    )


def texto(x, y, s, tam=13, peso='400', cor=TINTA, anc='middle', it=False):
    est = f' font-style="italic"' if it else ''
    return (f'<text x="{x}" y="{y}" font-family="{FONTE}" font-size="{tam}" '
            f'font-weight="{peso}" fill="{cor}" text-anchor="{anc}"{est}>{s}</text>')


def caixa(x, y, w, h, linhas, fundo=FUNDO_A, borda=TINTA, tam=13, r=4, tracejado=False):
    """Caixa com texto centralizado. `linhas` é str ou lista de str."""
    if isinstance(linhas, str):
        linhas = [linhas]
    if tracejado:
        s = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fundo}" '
             f'stroke="none"/>')
        for a, b, c, e in ((x, y, x + w, y), (x + w, y, x + w, y + h),
                           (x + w, y + h, x, y + h), (x, y + h, x, y)):
            s += _segmentos_tracejados(a, b, c, e)
    else:
        s = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fundo}" '
             f'stroke="{borda}" stroke-width="1.3"/>')
    n = len(linhas)
    alt = tam + 4
    y0 = y + h / 2 - (n - 1) * alt / 2 + tam / 3
    for i, ln in enumerate(linhas):
        peso = '600' if i == 0 and n > 1 else '400'
        t = tam if i == 0 else tam - 1.5
        s += texto(x + w / 2, y0 + i * alt, ln, t, peso)
    return s


def _segmentos_tracejados(x1, y1, x2, y2, traco=6, vao=4):
    comp = math.hypot(x2 - x1, y2 - y1)
    if comp == 0:
        return ''
    dx, dy = (x2 - x1) / comp, (y2 - y1) / comp
    saida, d = '', 0.0
    while d < comp:
        f = min(d + traco, comp)
        saida += (f'<line x1="{x1 + dx*d:.1f}" y1="{y1 + dy*d:.1f}" '
                  f'x2="{x1 + dx*f:.1f}" y2="{y1 + dy*f:.1f}" '
                  f'stroke="{TINTA}" stroke-width="1.3"/>')
        d = f + vao
    return saida


def ponta(x1, y1, x2, y2, tam=9, aberta=False):
    """Ponta de seta em (x2, y2), apontando no sentido de (x1,y1) -> (x2,y2)."""
    a = math.atan2(y2 - y1, x2 - x1)
    ab = 0.40
    ax, ay = x2 - tam * math.cos(a - ab), y2 - tam * math.sin(a - ab)
    bx, by = x2 - tam * math.cos(a + ab), y2 - tam * math.sin(a + ab)
    if aberta:
        return (f'<path d="M{ax:.1f},{ay:.1f} L{x2:.1f},{y2:.1f} L{bx:.1f},{by:.1f}" '
                f'fill="none" stroke="{TINTA}" stroke-width="1.4" stroke-linecap="round"/>')
    return (f'<polygon points="{x2:.1f},{y2:.1f} {ax:.1f},{ay:.1f} {bx:.1f},{by:.1f}" '
            f'fill="{TINTA}"/>')


def linha(x1, y1, x2, y2, seta=True, tracejada=False, aberta=False):
    if tracejada:
        s = _segmentos_tracejados(x1, y1, x2, y2)
    else:
        s = (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{TINTA}" '
             f'stroke-width="1.3"/>')
    if seta:
        s += ponta(x1, y1, x2, y2, aberta=aberta)
    return s


def polilinha(pontos, seta=False):
    """Liga pontos por segmentos ortogonais, evitando cruzar caixas."""
    d = ' '.join(f'{x},{y}' for x, y in pontos)
    s = f'<polyline points="{d}" fill="none" stroke="{TINTA}" stroke-width="1.3"/>'
    if seta and len(pontos) >= 2:
        (ax, ay), (bx, by) = pontos[-2], pontos[-1]
        s += ponta(ax, ay, bx, by)
    return s


def rotulo(x, y, s, tam=11):
    """Rótulo sobre linha, com tarja branca para não colidir com o traço."""
    larg = len(s) * tam * 0.52 + 10
    return (f'<rect x="{x - larg/2}" y="{y - tam}" width="{larg}" height="{tam + 5}" fill="{BRANCO}"/>'
            + texto(x, y, s, tam, '400'))


def rotulo_esq(x, y, s, tam=11):
    """Rótulo alinhado à esquerda, com tarja branca sob o texto."""
    larg = len(s) * tam * 0.54 + 8
    return (f'<rect x="{x - 4}" y="{y - tam}" width="{larg}" height="{tam + 5}" fill="{BRANCO}"/>'
            + texto(x, y, s, tam, '400', anc='start'))


def ator(x, y, nome):
    """Boneco palito do diagrama de casos de uso."""
    return (f'<circle cx="{x}" cy="{y}" r="9" fill="{BRANCO}" stroke="{TINTA}" stroke-width="1.4"/>'
            f'<line x1="{x}" y1="{y+9}" x2="{x}" y2="{y+32}" stroke="{TINTA}" stroke-width="1.4"/>'
            f'<line x1="{x-13}" y1="{y+18}" x2="{x+13}" y2="{y+18}" stroke="{TINTA}" stroke-width="1.4"/>'
            f'<line x1="{x}" y1="{y+32}" x2="{x-11}" y2="{y+50}" stroke="{TINTA}" stroke-width="1.4"/>'
            f'<line x1="{x}" y1="{y+32}" x2="{x+11}" y2="{y+50}" stroke="{TINTA}" stroke-width="1.4"/>'
            + texto(x, y + 68, nome, 12, '600'))


def elipse(cx, cy, rx, ry, s, tam=12):
    return (f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{FUNDO_B}" '
            f'stroke="{BORDA}" stroke-width="1.2"/>' + texto(cx, cy + 4, s, tam))


def salvar(nome, svg):
    os.makedirs(SAIDA, exist_ok=True)
    svg += '</svg>'
    caminho_svg = os.path.join(SAIDA, nome + '.svg')
    with open(caminho_svg, 'w', encoding='utf-8') as f:
        f.write(svg)
    doc = fitz.open('svg', svg.encode('utf-8'))
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(2.6, 2.6), alpha=False)
    pix.save(os.path.join(SAIDA, nome + '.png'))
    print(f'  {nome}.png  ({pix.width}x{pix.height})')


# ---------------------------------------------------------------------------
# Figura 1 — Visão geral da solução
# ---------------------------------------------------------------------------
def fig01():
    s = cab(880, 400)
    s += texto(440, 30, 'Visão geral da solução', 15, '600')

    s += caixa(40, 70, 170, 70, ['Usuário', 'navegador web'], FUNDO_B)

    s += caixa(280, 60, 250, 90,
               ['Aplicação React (SPA)', 'interface, rotas e', 'consumo da API'], FUNDO_A)
    s += caixa(280, 230, 250, 90,
               ['API REST (Express)', 'regras de negócio e', 'acesso a dados'], FUNDO_A)

    s += caixa(620, 40, 220, 62, ['Supabase Auth', 'contas e sessões'], FUNDO_C)
    s += caixa(620, 130, 220, 62, ['Supabase Storage', 'arquivos de documentos'], FUNDO_C)
    s += caixa(620, 240, 220, 72, ['PostgreSQL', 'no Supabase'], FUNDO_C)

    s += linha(210, 105, 278, 105)
    s += linha(405, 150, 405, 228)
    s += rotulo(405, 194, 'HTTP/JSON + token')

    s += linha(530, 80, 618, 71)
    s += rotulo(575, 66, 'login')
    s += linha(530, 128, 618, 155)
    s += rotulo(578, 150, 'upload')
    s += linha(530, 265, 618, 268)
    s += rotulo(575, 258, 'Prisma')
    s += linha(530, 250, 618, 95, tracejada=True)
    s += rotulo(566, 178, 'JWKS')

    s += caixa(40, 230, 170, 90,
               ['Projeto Vercel', 'estáticos e função', 'serverless no mesmo', 'domínio'],
               FUNDO_D, tracejado=True)
    s += linha(210, 250, 278, 200, seta=False, tracejada=True)
    salvar('fig01-visao-geral', s)


# ---------------------------------------------------------------------------
# Figura 2 — Casos de uso
# ---------------------------------------------------------------------------
def fig02():
    s = cab(880, 560)
    s += texto(440, 28, 'Casos de uso significativos para a arquitetura', 15, '600')

    s += f'<rect x="235" y="55" width="415" height="470" rx="6" fill="none" stroke="{BORDA}" stroke-width="1.2"/>'
    s += texto(442, 78, 'Fleet Manager', 13, '600', BORDA)

    s += ator(105, 120, 'Operador')
    s += ator(105, 265, 'Gestor')
    s += ator(105, 410, 'Administrador')

    casos = [
        (110, 'Autenticar-se no sistema'),
        (160, 'Consultar frota e indicadores'),
        (210, 'Registrar despesas'),
        (260, 'Registrar manutenções'),
        (310, 'Cadastrar veículos e motoristas'),
        (360, 'Gerir documentos e anexos'),
        (410, 'Vincular motorista a veículo'),
        (465, 'Gerir usuários e aprovações'),
    ]
    for y, nome in casos:
        s += elipse(442, y, 185, 21, nome)

    # Operador
    for y in (110, 160, 210, 260):
        s += linha(128, 145, 262, y, seta=False)
    # Gestor
    for y in (310, 360, 410):
        s += linha(128, 290, 262, y, seta=False)
    s += linha(128, 290, 262, 160, seta=False)
    # Administrador
    s += linha(128, 435, 262, 465, seta=False)
    s += linha(128, 435, 262, 410, seta=False)

    s += texto(442, 545, 'O Gestor herda os casos do Operador; o Administrador herda os do Gestor.',
               11, '400', BORDA)
    salvar('fig02-casos-de-uso', s)


# ---------------------------------------------------------------------------
# Figura 3 — Camadas da aplicação
# ---------------------------------------------------------------------------
def fig03():
    s = cab(760, 520)
    s += texto(380, 30, 'Camadas da aplicação e sentido das dependências', 15, '600')

    camadas = [
        ('Apresentação', 'React · páginas, componentes e hooks', FUNDO_A),
        ('Rotas e middlewares', 'Express · autenticação, autorização e validação', FUNDO_B),
        ('Controladores', 'tradução entre HTTP e serviços', FUNDO_B),
        ('Serviços', 'regras de negócio — sem dependência de HTTP', FUNDO_D),
        ('Repositórios', 'única camada que acessa o Prisma', FUNDO_B),
        ('Persistência', 'PostgreSQL no Supabase', FUNDO_C),
    ]
    y = 62
    for nome, desc, cor in camadas:
        s += caixa(150, y, 460, 58, [nome, desc], cor)
        if y < 62 + 5 * 74:
            s += linha(380, y + 58, 380, y + 72)
        y += 74

    s += texto(672, 260, 'dependência', 12, '600')
    s += texto(672, 276, 'unidirecional', 12, '600')
    s += linha(660, 300, 660, 430)
    salvar('fig03-camadas', s)


# ---------------------------------------------------------------------------
# Figura 4 — Pacotes do monorepo
# ---------------------------------------------------------------------------
def fig04():
    s = cab(820, 440)
    s += texto(410, 30, 'Organização em pacotes (npm workspaces)', 15, '600')

    s += f'<rect x="40" y="55" width="740" height="350" rx="6" fill="none" stroke="{BORDA}" stroke-width="1.2"/>'
    s += texto(120, 78, 'fleet-manager', 13, '600', BORDA)

    s += caixa(75, 100, 300, 130,
               ['apps/web', 'pages · components · hooks', 'lib · locales · layouts',
                'React + Vite'], FUNDO_A)
    s += caixa(445, 100, 300, 130,
               ['apps/api', 'routes · middlewares · controllers',
                'services · repositories · jobs', 'Express + Prisma'], FUNDO_A)
    s += caixa(260, 285, 300, 90,
               ['packages/shared', 'enumerações e DTOs',
                'compartilhados entre as aplicações'], FUNDO_D)

    s += linha(300, 285, 240, 232, aberta=True, tracejada=True)
    s += linha(520, 285, 580, 232, aberta=True, tracejada=True)
    s += texto(215, 268, 'importa', 11)
    s += texto(608, 268, 'importa', 11)
    s += linha(375, 165, 443, 165)
    s += rotulo(409, 160, 'HTTP')
    salvar('fig04-pacotes', s)


# ---------------------------------------------------------------------------
# Figura 5 — Modelo entidade-relacionamento
# ---------------------------------------------------------------------------
def fig05():
    s = cab(900, 700)
    s += texto(450, 30, 'Modelo entidade-relacionamento', 15, '600')

    def ent(x, y, w, nome, campos, cor=FUNDO_A):
        h = 30 + len(campos) * 17
        t = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="{BRANCO}" '
             f'stroke="{TINTA}" stroke-width="1.3"/>'
             f'<rect x="{x}" y="{y}" width="{w}" height="26" rx="4" fill="{cor}" '
             f'stroke="{TINTA}" stroke-width="1.3"/>')
        t += texto(x + w / 2, y + 18, nome, 13, '600')
        for i, c in enumerate(campos):
            t += texto(x + 10, y + 44 + i * 17, c, 11, '400', anc='start')
        return t

    s += ent(330, 55, 210, 'Expense',
             ['PK id', 'FK vehicleId', 'type, amount', 'date, description'])
    s += ent(640, 55, 210, 'Maintenance',
             ['PK id', 'FK vehicleId', 'type, status', 'scheduledDate', 'completedDate'])
    s += ent(40, 250, 200, 'Driver',
             ['PK id', 'UK cpf, UK cnh', 'cnhExpiry', 'phone', 'status'])
    s += ent(330, 250, 210, 'Vehicle',
             ['PK id', 'UK plate', 'brand, model, year', 'color', 'status'], FUNDO_D)
    s += ent(640, 250, 210, 'Document',
             ['PK id', 'FK vehicleId (opc.)', 'FK driverId (opc.)', 'type, expiryDate',
              'fileUrl, alertSent'])
    s += ent(40, 470, 250, 'User',
             ['PK id', 'UK email, UK cpf', 'UK authUserId', 'role, status', 'endereço'],
             FUNDO_C)

    # Vehicle 1:N Expense
    s += linha(435, 250, 435, 153, seta=False)
    s += rotulo(435, 205, '1 : N')
    # Vehicle 1:N Maintenance
    s += linha(505, 250, 700, 170, seta=False)
    s += rotulo(605, 208, '1 : N')
    # Vehicle 1:N Document
    s += linha(540, 300, 640, 300, seta=False)
    s += rotulo(590, 296, '1 : N')
    # Driver N:M Vehicle
    s += linha(240, 300, 330, 300, seta=False)
    s += rotulo(285, 296, 'N : M')
    # Driver 1:N Document — roteado por baixo, sem atravessar Vehicle
    s += polilinha([(140, 365), (140, 415), (745, 415), (745, 365)])
    s += rotulo(442, 419, '1 : N')

    # Vínculo com o Supabase Auth
    s += caixa(330, 480, 530, 76,
               ['Supabase Auth — schema auth',
                'User.authUserId referencia auth.users.id;',
                'vínculo externo ao schema public, fora do controle do Prisma'],
               FUNDO_B, tracejado=True, tam=12)
    s += linha(290, 518, 328, 518, tracejada=True, seta=False)

    s += texto(450, 625,
               'Um Documento pertence a um Veículo OU a um Motorista, nunca a ambos '
               'e nunca a nenhum.', 11.5, '400', BORDA)
    s += texto(450, 648,
               'A entidade User não se relaciona com as demais: representa a conta de acesso, '
               'não o condutor.', 11.5, '400', BORDA)
    salvar('fig05-modelo-er', s)


# ---------------------------------------------------------------------------
# Figura 6 — Sequência: autenticação e acesso a recurso protegido
# ---------------------------------------------------------------------------
def fig06():
    s = cab(900, 560)
    s += texto(450, 28, 'Autenticação e acesso a recurso protegido', 15, '600')

    atores = [('Usuário', 90), ('Frontend', 265), ('Supabase Auth', 440), ('API', 620), ('PostgreSQL', 810)]
    for nome, x in atores:
        s += caixa(x - 78, 50, 156, 34, nome, FUNDO_A, tam=12)
        s += _segmentos_tracejados(x, 84, x, 520, 5, 5)

    msgs = [
        (90, 265, 120, 'e-mail e senha'),
        (265, 440, 155, 'signInWithPassword()'),
        (440, 265, 190, 'access_token (JWT ES256)'),
        (265, 620, 245, 'GET /api/vehicles + Bearer'),
        (620, 440, 285, 'busca chave pública (JWKS)'),
        (440, 620, 320, 'chave pública'),
        (620, 620, 360, 'verifica assinatura, emissor e público'),
        (620, 810, 400, 'busca perfil por authUserId'),
        (810, 620, 435, 'papel e situação atuais'),
        (620, 620, 472, 'rejeita se PENDING ou BLOCKED'),
        (620, 265, 505, '200 OK'),
    ]
    for x1, x2, y, txt in msgs:
        if x1 == x2:
            s += (f'<path d="M{x1},{y-10} h58 v18 h-58" fill="none" stroke="{TINTA}" '
                  f'stroke-width="1.3"/>') + ponta(x1 + 58, y + 8, x1, y + 8, aberta=True)
            s += rotulo_esq(x1 + 66, y + 4, txt, 11)
        else:
            s += linha(x1, y, x2, y, aberta=(x2 < x1))
            s += rotulo((x1 + x2) / 2, y - 7, txt, 11)
    salvar('fig06-sequencia-autenticacao', s)


# ---------------------------------------------------------------------------
# Figura 7 — Sequência: anexo de arquivo a documento
# ---------------------------------------------------------------------------
def fig07():
    s = cab(880, 420)
    s += texto(440, 28, 'Anexo de arquivo ao documento', 15, '600')

    atores = [('Usuário', 90), ('Frontend', 280), ('Supabase Storage', 500), ('API', 700), ('PostgreSQL', 830)]
    for nome, x in atores:
        s += caixa(x - 82, 50, 164, 34, nome, FUNDO_A, tam=12)
        s += _segmentos_tracejados(x, 84, x, 385, 5, 5)

    msgs = [
        (90, 280, 120, 'seleciona arquivo e preenche o formulário'),
        (280, 500, 160, 'upload para documents/{id}/{uuid}.{ext}'),
        (500, 500, 200, 'política de RLS confere a extensão'),
        (500, 280, 240, 'confirmação'),
        (280, 500, 275, 'getPublicUrl()'),
        (500, 280, 310, 'URL pública'),
        (280, 700, 345, 'POST /api/documents { ..., fileUrl }'),
        (700, 830, 378, 'persiste o registro'),
    ]
    for x1, x2, y, txt in msgs:
        if x1 == x2:
            s += (f'<path d="M{x1},{y-10} h58 v18 h-58" fill="none" stroke="{TINTA}" '
                  f'stroke-width="1.3"/>') + ponta(x1 + 58, y + 8, x1, y + 8, aberta=True)
            s += rotulo_esq(x1 + 66, y + 4, txt, 11)
        else:
            s += linha(x1, y, x2, y, aberta=(x2 < x1))
            s += rotulo((x1 + x2) / 2, y - 7, txt, 11)
    salvar('fig07-sequencia-upload', s)


# ---------------------------------------------------------------------------
# Figura 8 — Diagrama de implantação
# ---------------------------------------------------------------------------
def fig08():
    s = cab(860, 470)
    s += texto(430, 30, 'Diagrama de implantação', 15, '600')

    def no(x, y, w, h, titulo, itens, cor):
        t = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="{cor}" '
             f'stroke="{TINTA}" stroke-width="1.4"/>')
        t += texto(x + w / 2, y + 24, titulo, 13, '600')
        for i, it in enumerate(itens):
            t += texto(x + w / 2, y + 48 + i * 18, it, 11.5)
        return t

    s += no(40, 90, 210, 110, '«dispositivo»', ['Navegador do usuário', 'HTTPS'], FUNDO_B)
    s += no(320, 70, 260, 180, '«nó» Vercel', [
        'Projeto único', '— artefatos estáticos (SPA)',
        '— função serverless (API)', '— agendador diário'], FUNDO_A)
    s += no(650, 70, 190, 180, '«nó» Supabase', [
        'PostgreSQL', 'Auth', 'Storage'], FUNDO_C)

    s += linha(250, 145, 318, 145)
    s += rotulo(284, 140, 'HTTPS')
    s += linha(580, 130, 648, 130)
    s += rotulo(614, 125, 'TLS')
    s += linha(250, 175, 648, 200, tracejada=True)
    s += rotulo(430, 196, 'Auth e Storage direto do navegador')

    s += caixa(320, 300, 520, 60,
               ['Mesma origem',
                'interface e API compartilham o domínio — não há requisição entre origens distintas'],
               FUNDO_D, tam=12)
    s += texto(430, 420, 'Publicado em https://pfi-fleet-manager-api.vercel.app', 12, '600')
    salvar('fig08-implantacao', s)


# ---------------------------------------------------------------------------
# Figura 9 — Ciclo de vida da conta de usuário
# ---------------------------------------------------------------------------
def fig09():
    s = cab(880, 300)
    s += texto(440, 30, 'Ciclo de vida da conta de usuário', 15, '600')

    s += f'<circle cx="70" cy="150" r="11" fill="{TINTA}"/>'
    s += caixa(140, 120, 150, 62, ['PENDING', 'aguarda aprovação'], FUNDO_D)
    s += caixa(390, 120, 150, 62, ['ACTIVE', 'acesso liberado'], FUNDO_C)
    s += caixa(650, 120, 150, 62, ['BLOCKED', 'acesso negado'], FUNDO_B)

    s += linha(81, 150, 138, 150)
    s += rotulo(112, 145, 'cadastro')
    s += linha(290, 140, 388, 140)
    s += rotulo(339, 135, 'aprovação')
    s += linha(540, 140, 648, 140)
    s += rotulo(594, 135, 'bloqueio')
    s += (f'<path d="M648,168 q-54,34 -108,0" fill="none" stroke="{TINTA}" '
          f'stroke-width="1.3"/>') + ponta(570, 178, 540, 168)
    s += texto(594, 205, 'reativação', 11)

    s += texto(440, 255,
               'A situação é reconsultada a cada requisição: o bloqueio tem efeito imediato, '
               'sem aguardar a expiração do token.', 11.5, '400', BORDA)
    salvar('fig09-ciclo-usuario', s)


if __name__ == '__main__':
    print('Gerando figuras em', SAIDA)
    for f in (fig01, fig02, fig03, fig04, fig05, fig06, fig07, fig08, fig09):
        f()
    print('Concluído.')
