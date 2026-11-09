"""
Infraestrutura de composição do Documento Técnico em .docx.

O conteúdo descreve o sistema tal como ele existe no repositório: cada
afirmação técnica corresponde a código verificado, e não a intenção de
projeto. Manter a geração em script permite regenerar o documento sempre que
a aplicação evoluir.

A formatação segue o perfil de normalização descrito em
docs/academico/GUIA_ABNT_TCC_PARA_CLAUDE.md (slides da Biblioteca Central da
Unifor: NBR 14724, 10520, 6023, 6024, 6027 e 6028). Reúne o objeto do
documento e as funções de composição — parágrafos, títulos, figuras, quadros,
campos automáticos e seções — usadas por gerar-documento.py.

Marcação aceita nos textos passados a p(), item(), quadro() e referencia():
    *texto*        itálico (estrangeirismos, et al.)
    **texto**      negrito (título da obra nas referências)
    {fig:chave}    número da figura, por referência cruzada automática
    {qua:chave}    número do quadro, por referência cruzada automática
"""

import os
import re

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

FIGURAS = os.path.join('docs', 'academico', 'figuras')
SAIDA = os.path.join('docs', 'academico', 'Documento Tecnico - Fleet Manager (ABNT).docx')

FONTE = 'Times New Roman'
LINHA_15 = Pt(18)  # uma linha de 12 pt com entrelinhas 1,5

doc = Document()


# ---------------------------------------------------------------------------
# Numeração de figuras e quadros
# ---------------------------------------------------------------------------
# A ordem abaixo é a ordem de aparição no texto. Ela fornece o número exibido
# antes da atualização dos campos e permite verificar, na geração, que nenhum
# objeto saiu de sequência. O Word recalcula os números ao atualizar campos.
ORDEM = {
    'fig': ['visao_geral', 'casos_de_uso', 'camadas', 'pacotes', 'modelo_er',
            'autenticacao', 'ciclo_usuario', 'tela_painel', 'tela_alertas', 'upload',
            'implantacao', 'ci_cd'],
    'qua': ['tecnologias', 'camadas_verificacao', 'entidades', 'acesso', 'rf', 'rnf', 'rn',
            'verificacoes', 'e2e_areas', 'objetivos', 'cronograma', 'partes', 'arquitetura'],
    'tab': ['cobertura', 'workload_niveis', 'workload_rotas', 'carga_rotas', 'estresse',
            'volume', 'producao', 'resiliencia'],
}
ROTULO = {'fig': 'Figura', 'qua': 'Quadro', 'tab': 'Tabela'}
_inseridos = {'fig': 0, 'qua': 0, 'tab': 0}
_bookmark_id = [0]


def _numero(tipo, chave):
    return ORDEM[tipo].index(chave) + 1


def _marcador(tipo, chave):
    return f'_Ref_{tipo}_{chave}'


# ---------------------------------------------------------------------------
# Estilos gerais
# ---------------------------------------------------------------------------
def _fonte_fixa(estilo):
    """Fixa Times New Roman, removendo a referência à fonte do tema.

    Definir apenas `font.name` não basta nos estilos que herdam a fonte do
    tema: o Word continua aplicando a do tema enquanto a referência existir.
    """
    rfonts = estilo.element.get_or_add_rPr().get_or_add_rFonts()
    for atributo in ('asciiTheme', 'hAnsiTheme', 'cstheme', 'eastAsiaTheme'):
        chave = qn('w:' + atributo)
        if chave in rfonts.attrib:
            del rfonts.attrib[chave]
    for atributo in ('ascii', 'hAnsi', 'cs', 'eastAsia'):
        rfonts.set(qn('w:' + atributo), FONTE)


def _estilo_nativo(nome, identificador):
    """Declara um estilo nativo do Word (sumário, lista de figuras).

    O python-docx cria todo estilo novo como personalizado; o Word então o
    ignora e recria o seu próprio ao atualizar o campo, descartando a
    formatação. Sem a marca de personalizado e com o identificador interno,
    o Word adota a definição daqui.
    """
    try:
        return doc.styles[nome]
    except KeyError:
        e = doc.styles.add_style(nome, WD_STYLE_TYPE.PARAGRAPH)
        e.element.attrib.pop(qn('w:customStyle'), None)
        e.element.set(qn('w:styleId'), identificador)
        return e


def configurar():
    s = doc.sections[0]
    s.page_height, s.page_width = Cm(29.7), Cm(21)
    s.top_margin, s.left_margin = Cm(3), Cm(3)
    s.bottom_margin, s.right_margin = Cm(2), Cm(2)
    # Número da página a 2 cm da borda superior (F, p. 9).
    s.header_distance = Cm(2)

    normal = doc.styles['Normal']
    normal.font.name = FONTE
    normal.font.size = Pt(12)
    normal.font.color.rgb = RGBColor(0, 0, 0)
    _fonte_fixa(normal)
    pf = normal.paragraph_format
    pf.line_spacing = 1.5
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf.widow_control = True

    # Títulos numerados: 12 pt, à esquerda, sem recuo (F, p. 37–41).
    # Primário em maiúsculas e negrito; secundário em negrito; terciário em
    # negrito e itálico. Seção primária abre página nova.
    for nome, italico in (('Heading 1', False), ('Heading 2', False), ('Heading 3', True)):
        e = doc.styles[nome]
        e.font.size = Pt(12)
        e.font.bold = True
        e.font.italic = italico
        e.font.color.rgb = RGBColor(0, 0, 0)
        _fonte_fixa(e)
        f = e.paragraph_format
        f.alignment = WD_ALIGN_PARAGRAPH.LEFT
        f.first_line_indent = Cm(0)
        f.line_spacing = 1.5
        f.space_before = LINHA_15
        f.space_after = LINHA_15
        f.keep_with_next = True
    doc.styles['Heading 1'].paragraph_format.space_before = Pt(0)
    doc.styles['Heading 1'].paragraph_format.page_break_before = True

    # Sumário e listas: 12 pt, entrelinhas 1,5, indicativos alinhados à
    # esquerda e a mesma hierarquia tipográfica dos títulos (F, p. 33–36).
    for nome, ident, negrito, italico in (('toc 1', 'TOC1', True, False),
                                          ('toc 2', 'TOC2', True, False),
                                          ('toc 3', 'TOC3', True, True),
                                          ('table of figures', 'TableofFigures', False, False)):
        e = _estilo_nativo(nome, ident)
        e.base_style = normal
        e.font.size = Pt(12)
        e.font.bold = negrito
        e.font.italic = italico
        f = e.paragraph_format
        f.left_indent = Cm(0)
        f.first_line_indent = Cm(0)
        f.line_spacing = 1.5
        f.space_after = Pt(0)
        f.alignment = WD_ALIGN_PARAGRAPH.LEFT
        f.tab_stops.add_tab_stop(Cm(16), WD_TAB_ALIGNMENT.RIGHT, 1)  # 1 = pontilhado


# ---------------------------------------------------------------------------
# Campos e marcação
# ---------------------------------------------------------------------------
def _campo(par, instrucao, resultado='', tamanho=None):
    """Insere um campo complexo (instrução + resultado provisório)."""
    def run(filho):
        r = par.add_run()
        if tamanho:
            r.font.size = Pt(tamanho)
        r._r.append(filho)
        return r

    inicio = OxmlElement('w:fldChar')
    inicio.set(qn('w:fldCharType'), 'begin')
    run(inicio)
    instr = OxmlElement('w:instrText')
    instr.set(qn('xml:space'), 'preserve')
    instr.text = f' {instrucao} '
    run(instr)
    sep = OxmlElement('w:fldChar')
    sep.set(qn('w:fldCharType'), 'separate')
    run(sep)
    r = par.add_run(resultado)
    if tamanho:
        r.font.size = Pt(tamanho)
    fim = OxmlElement('w:fldChar')
    fim.set(qn('w:fldCharType'), 'end')
    run(fim)


_TOKENS = re.compile(r'(\*\*.+?\*\*|\*.+?\*|\{(?:fig|qua|tab):\w+\})')


def texto_rico(par, texto, tamanho=None, negrito=False):
    """Acrescenta ao parágrafo o texto com a marcação descrita no cabeçalho."""
    for parte in _TOKENS.split(texto):
        if not parte:
            continue
        if parte.startswith('{'):
            tipo, chave = parte[1:-1].split(':')
            # CHARFORMAT: o número assume o corpo do texto em volta, e não o
            # 10 pt da legenda de onde vem.
            _campo(par, f'REF {_marcador(tipo, chave)} \\h \\* CHARFORMAT',
                   str(_numero(tipo, chave)), tamanho)
            continue
        if parte.startswith('**'):
            r = par.add_run(parte[2:-2])
            r.bold = True
        elif parte.startswith('*'):
            r = par.add_run(parte[1:-1])
            r.italic = True
            r.bold = negrito or None
        else:
            r = par.add_run(parte)
            r.bold = negrito or None
        if tamanho:
            r.font.size = Pt(tamanho)


# ---------------------------------------------------------------------------
# Parágrafos e títulos
# ---------------------------------------------------------------------------
def p(texto='', alinhamento=None, negrito=False, tamanho=None,
      espaco_antes=None, espaco_depois=None, recuo=True):
    par = doc.add_paragraph()
    texto_rico(par, texto, tamanho, negrito)
    if alinhamento is not None:
        par.alignment = alinhamento
    if recuo and par.alignment in (None, WD_ALIGN_PARAGRAPH.JUSTIFY):
        par.paragraph_format.first_line_indent = Cm(1.25)
    if espaco_antes is not None:
        par.paragraph_format.space_before = Pt(espaco_antes)
    if espaco_depois is not None:
        par.paragraph_format.space_after = Pt(espaco_depois)
    return par


def centro(texto='', negrito=False, tamanho=None, espaco_antes=None, espaco_depois=None):
    return p(texto, WD_ALIGN_PARAGRAPH.CENTER, negrito, tamanho,
             espaco_antes=espaco_antes, espaco_depois=espaco_depois, recuo=False)


def titulo_pretextual(texto):
    """Título sem indicativo numérico e fora do sumário (resumo, listas...)."""
    par = centro(texto, negrito=True, espaco_depois=18)
    par.paragraph_format.page_break_before = True
    par.paragraph_format.keep_with_next = True
    return par


def h1(texto, nova_pagina=True):
    par = doc.add_heading(texto, 1)
    if not nova_pagina:
        # Início de seção do documento: a página nova já vem da quebra de seção.
        par.paragraph_format.page_break_before = False
    return par


def h1_centralizado(texto):
    """Título pós-textual: centralizado, sem número, mas presente no sumário."""
    par = doc.add_heading(texto, 1)
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    return par


def h2(texto):
    return doc.add_heading(texto, 2)


def item(texto, nivel=0):
    par = doc.add_paragraph(style='List Bullet' if nivel == 0 else 'List Bullet 2')
    texto_rico(par, texto)
    par.paragraph_format.line_spacing = 1.5
    par.paragraph_format.space_after = Pt(0)
    par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    return par


def natureza(texto, espaco_antes=None):
    """Bloco de natureza do trabalho: recuo de 8 cm, 10 pt, espaço simples."""
    par = doc.add_paragraph()
    texto_rico(par, texto, tamanho=10)
    par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    par.paragraph_format.left_indent = Cm(8)
    par.paragraph_format.line_spacing = 1.0
    if espaco_antes is not None:
        par.paragraph_format.space_before = Pt(espaco_antes)
    return par


def moldura(par, posicao):
    """Fixa o parágrafo numa moldura ancorada à margem ('center' ou 'bottom').

    Posiciona blocos da capa e da folha de rosto sem parágrafos vazios.
    Parágrafos consecutivos com a mesma moldura formam um único bloco.
    """
    fp = OxmlElement('w:framePr')
    fp.set(qn('w:w'), str(int(Cm(16).twips)))
    fp.set(qn('w:wrap'), 'around')
    fp.set(qn('w:vAnchor'), 'margin')
    fp.set(qn('w:hAnchor'), 'margin')
    fp.set(qn('w:xAlign'), 'center')
    fp.set(qn('w:yAlign'), posicao)
    ppr = par._p.get_or_add_pPr()
    ppr.insert(0, fp)
    return par


# ---------------------------------------------------------------------------
# Figuras e quadros
# ---------------------------------------------------------------------------
def _legenda(tipo, chave, titulo):
    """Identificação acima do objeto: tipo, número automático, travessão, título."""
    _inseridos[tipo] += 1
    numero = _numero(tipo, chave)
    if numero != _inseridos[tipo]:
        raise ValueError(f'{ROTULO[tipo]} "{chave}" fora de ordem: é a {_inseridos[tipo]}ª '
                         f'no texto, mas ORDEM a numera como {numero}.')
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    f = par.paragraph_format
    f.line_spacing = 1.0
    f.space_before = Pt(12)
    f.space_after = Pt(6)
    f.keep_with_next = True
    r = par.add_run(f'{ROTULO[tipo]} ')
    r.font.size = Pt(10)

    ident = _bookmark_id[0]
    _bookmark_id[0] += 1
    inicio = OxmlElement('w:bookmarkStart')
    inicio.set(qn('w:id'), str(ident))
    inicio.set(qn('w:name'), _marcador(tipo, chave))
    par._p.append(inicio)
    _campo(par, f'SEQ {ROTULO[tipo]} \\* ARABIC', str(numero), tamanho=10)
    fim = OxmlElement('w:bookmarkEnd')
    fim.set(qn('w:id'), str(ident))
    par._p.append(fim)

    texto_rico(par, f' — {titulo}', tamanho=10)


def _fonte_objeto(fonte='Fonte: Elaborado pelos autores (2026).',
                  alinhamento=WD_ALIGN_PARAGRAPH.CENTER, nota=None):
    par = doc.add_paragraph()
    par.alignment = alinhamento
    par.paragraph_format.line_spacing = 1.0
    par.paragraph_format.space_before = Pt(6)
    par.paragraph_format.space_after = Pt(0 if nota else 12)
    par.paragraph_format.first_line_indent = Cm(0)
    texto_rico(par, fonte, tamanho=10)
    if nota:
        n = doc.add_paragraph()
        n.alignment = alinhamento
        n.paragraph_format.line_spacing = 1.0
        n.paragraph_format.space_after = Pt(12)
        n.paragraph_format.first_line_indent = Cm(0)
        texto_rico(n, f'Nota: {nota}', tamanho=10)


def figura(chave, arquivo, titulo, largura=15.5):
    caminho = os.path.join(FIGURAS, arquivo)
    if not os.path.exists(caminho):
        raise FileNotFoundError(f'Figura ausente: {caminho}. Execute gerar-diagramas.py antes.')
    _legenda('fig', chave, titulo)
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.paragraph_format.line_spacing = 1.0
    par.paragraph_format.keep_with_next = True
    par.add_run().add_picture(caminho, width=Cm(largura))
    _fonte_objeto()


def quadro(chave, titulo, cabecalho, linhas, larguras=None):
    """Quadro: informação textual, com grade fechada (F, p. 49–50)."""
    _legenda('qua', chave, titulo)

    t = doc.add_table(rows=1, cols=len(cabecalho))
    t.style = 'Table Grid'
    t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    # Repete a linha de cabeçalho quando o quadro continua na página seguinte.
    tr_pr = t.rows[0]._tr.get_or_add_trPr()
    repetir = OxmlElement('w:tblHeader')
    repetir.set(qn('w:val'), 'true')
    tr_pr.append(repetir)

    def celula(cel, valor, negrito=False, alinhamento=WD_ALIGN_PARAGRAPH.LEFT):
        cel.text = ''
        par = cel.paragraphs[0]
        par.alignment = alinhamento
        par.paragraph_format.line_spacing = 1.0
        par.paragraph_format.first_line_indent = Cm(0)
        texto_rico(par, str(valor), tamanho=10, negrito=negrito)

    for i, c in enumerate(cabecalho):
        celula(t.rows[0].cells[i], c, negrito=True, alinhamento=WD_ALIGN_PARAGRAPH.CENTER)
    for ln in linhas:
        cels = t.add_row().cells
        for i, v in enumerate(ln):
            celula(cels[i], v)
    if larguras:
        for row in t.rows:
            for i, w in enumerate(larguras):
                row.cells[i].width = Cm(w)

    _fonte_objeto()
    return t


def _borda(elemento, lado, tipo='single', espessura='8'):
    b = OxmlElement(f'w:{lado}')
    b.set(qn('w:val'), tipo)
    b.set(qn('w:sz'), espessura)
    b.set(qn('w:space'), '0')
    b.set(qn('w:color'), '000000' if tipo != 'nil' else 'auto')
    elemento.append(b)


def tabela(chave, titulo, cabecalho, linhas, larguras=None, fonte=None, nota=None):
    """Tabela: dado numérico, à maneira do IBGE (F, p. 45–48).

    Só linhas horizontais — acima do cabeçalho, abaixo dele e no fecho —, sem
    grade lateral. Fonte e nota abaixo, em 10 pt, alinhadas à esquerda.
    """
    _legenda('tab', chave, titulo)

    t = doc.add_table(rows=1, cols=len(cabecalho))
    t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    tbl_pr = t._tbl.tblPr
    bordas = OxmlElement('w:tblBorders')
    _borda(bordas, 'top')
    _borda(bordas, 'left', 'nil')
    _borda(bordas, 'bottom')
    _borda(bordas, 'right', 'nil')
    _borda(bordas, 'insideH', 'nil')
    _borda(bordas, 'insideV', 'nil')
    tbl_pr.append(bordas)

    tr_pr = t.rows[0]._tr.get_or_add_trPr()
    repetir = OxmlElement('w:tblHeader')
    repetir.set(qn('w:val'), 'true')
    tr_pr.append(repetir)

    def celula(cel, valor, negrito=False, primeira=False):
        cel.text = ''
        par = cel.paragraphs[0]
        par.alignment = WD_ALIGN_PARAGRAPH.LEFT if primeira else WD_ALIGN_PARAGRAPH.CENTER
        par.paragraph_format.line_spacing = 1.0
        par.paragraph_format.first_line_indent = Cm(0)
        texto_rico(par, str(valor), tamanho=10, negrito=negrito)

    for i, c in enumerate(cabecalho):
        cel = t.rows[0].cells[i]
        celula(cel, c, negrito=True, primeira=(i == 0))
        tc_pr = cel._tc.get_or_add_tcPr()
        borda_cel = OxmlElement('w:tcBorders')
        _borda(borda_cel, 'bottom')
        tc_pr.append(borda_cel)
    for ln in linhas:
        cels = t.add_row().cells
        for i, v in enumerate(ln):
            celula(cels[i], v, primeira=(i == 0))
    if larguras:
        for row in t.rows:
            for i, w in enumerate(larguras):
                row.cells[i].width = Cm(w)

    _fonte_objeto(fonte or 'Fonte: Elaborado pelos autores (2026).',
                  WD_ALIGN_PARAGRAPH.LEFT, nota)
    return t


# ---------------------------------------------------------------------------
# Referências, listas, sumário e paginação
# ---------------------------------------------------------------------------
def referencia(texto):
    """Entrada de referência: 10 pt, simples, à esquerda, sem recuo, com uma
    linha em branco de espaço simples entre as entradas (F, p. 8 e 54)."""
    par = doc.add_paragraph()
    texto_rico(par, texto, tamanho=10)
    par.alignment = WD_ALIGN_PARAGRAPH.LEFT
    f = par.paragraph_format
    f.line_spacing = 1.0
    f.first_line_indent = Cm(0)
    f.space_after = Pt(12)
    return par


def sigla(abreviatura, extenso):
    par = doc.add_paragraph()
    par.paragraph_format.tab_stops.add_tab_stop(Cm(3))
    par.paragraph_format.first_line_indent = Cm(0)
    par.add_run(f'{abreviatura}\t')
    texto_rico(par, extenso)
    return par


def _campo_indice(instrucao, aviso):
    par = doc.add_paragraph()
    par.paragraph_format.first_line_indent = Cm(0)
    _campo(par, instrucao, aviso)


def sumario_automatico():
    _campo_indice('TOC \\o "1-3" \\h \\z \\u',
                  'Para exibir o sumário: clique com o botão direito aqui e escolha '
                  '"Atualizar campo".')


def lista_automatica(tipo):
    rotulo = ROTULO[tipo]
    _campo_indice(f'TOC \\h \\z \\c "{rotulo}"',
                  f'Para exibir a lista: clique com o botão direito aqui e escolha '
                  f'"Atualizar campo".')


def nova_secao():
    """Encerra a seção corrente e abre outra em página nova."""
    return doc.add_section(WD_SECTION.NEW_PAGE)


def capa_fora_da_contagem():
    """Numera a capa como 0, para que a folha de rosto seja a página 1.

    Chamada logo após encerrar a seção da capa: o atributo vai para a seção
    encerrada, e as seguintes apenas continuam a contagem.
    """
    pg = OxmlElement('w:pgNumType')
    pg.set(qn('w:start'), '0')
    doc.sections[0]._sectPr.append(pg)


def numerar_paginas(secao):
    """Número no canto superior direito, 10 pt, a partir desta seção.

    As seções anteriores permanecem sem cabeçalho: a capa não conta e os
    elementos pré-textuais contam sem exibir o número (F, p. 9).
    """
    cab = secao.header
    cab.is_linked_to_previous = False
    par = cab.paragraphs[0]
    par.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    par.paragraph_format.line_spacing = 1.0
    par.paragraph_format.first_line_indent = Cm(0)
    _campo(par, 'PAGE', '', tamanho=10)


def verificar_objetos():
    for tipo, chaves in ORDEM.items():
        if _inseridos[tipo] != len(chaves):
            raise ValueError(f'{ROTULO[tipo]}: {_inseridos[tipo]} inseridos, '
                             f'{len(chaves)} previstos em ORDEM.')
