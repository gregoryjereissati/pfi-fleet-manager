"""
Converte o Documento Técnico de .docx para .pdf.

A conversão precisa atualizar os campos antes de exportar: números de
figuras, quadros e tabelas, referências cruzadas, listas, sumário e números
de página. Há dois caminhos, escolhidos sozinhos:

  * **Windows com Word** — automação COM (pacote pywin32). É o de maior
    fidelidade, e grava também o .docx com os campos preenchidos.
  * **macOS ou Linux com LibreOffice** — o LibreOffice roda sem interface,
    atualiza campos e índices por uma macro e exporta o PDF.
    O .docx não é regravado: continua sendo o que gerar-documento.py
    produziu, para quem for abri-lo no Word.

`--libreoffice` força o segundo caminho também no Windows.

Uso:  python scripts/gerar-pdf.py
Saída: docs/academico/Documento Tecnico - Fleet Manager (ABNT).pdf
"""

import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request

ENTRADA = os.path.join('docs', 'academico', 'Documento Tecnico - Fleet Manager (ABNT).docx')
SAIDA = os.path.join('docs', 'academico', 'Documento Tecnico - Fleet Manager (ABNT).pdf')

FORMATO_PDF = 17  # wdFormatPDF


def atualizar_indices(documento):
    for i in range(1, documento.TablesOfFigures.Count + 1):
        documento.TablesOfFigures(i).Update()
    for i in range(1, documento.TablesOfContents.Count + 1):
        documento.TablesOfContents(i).Update()


# Onde procurar o LibreOffice.
CANDIDATOS_SOFFICE = (
    os.environ.get('SOFFICE', ''),
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    shutil.which('soffice') or '',
    shutil.which('libreoffice') or '',
)

# Macro em Basic, executada dentro do próprio LibreOffice: abre o .docx sem
# janela, atualiza campos e índices duas vezes — a primeira preenche números e
# títulos, a segunda corrige as páginas que as listas e o sumário deslocaram —
# e exporta o PDF. Em Basic, e não em Python, para não depender do Python que
# acompanha o LibreOffice, que nem sempre pode ser executado fora dele.
MACRO = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE script:module PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "module.dtd">
<script:module xmlns:script="http://openoffice.org/2000/script" script:name="Module1" script:language="StarBasic">
Sub Exportar(entrada As String, saida As String)
  Dim abrir(0) As New com.sun.star.beans.PropertyValue
  abrir(0).Name = &quot;Hidden&quot;
  abrir(0).Value = True
  doc = StarDesktop.loadComponentFromURL(ConvertToURL(entrada), &quot;_blank&quot;, 0, abrir())
  For passagem = 1 To 2
    doc.getTextFields().refresh()
    indices = doc.getDocumentIndexes()
    For i = 0 To indices.getCount() - 1
      indices.getByIndex(i).update()
    Next i
  Next passagem
  doc.getTextFields().refresh()
  Dim gravar(0) As New com.sun.star.beans.PropertyValue
  gravar(0).Name = &quot;FilterName&quot;
  gravar(0).Value = &quot;writer_pdf_Export&quot;
  doc.storeToURL(ConvertToURL(saida), gravar())
  doc.close(True)
End Sub
</script:module>
"""


def via_libreoffice():
    soffice = next((c for c in CANDIDATOS_SOFFICE if c and os.path.exists(c)), None)
    if not soffice:
        sys.exit('LibreOffice não encontrado. No macOS: brew install --cask libreoffice. '
                 'No Linux: instale o pacote libreoffice. Ou indique o caminho em SOFFICE.')

    # Perfil próprio e temporário: não esbarra numa janela aberta pelo usuário
    # nem nas telas de primeiro uso, e a macro fica em "Minhas macros", que
    # rodam sem pedido de confirmação.
    perfil = tempfile.mkdtemp(prefix='fm-lo-')
    perfil_url = 'file://' + urllib.request.pathname2url(perfil)
    base = [soffice, f'-env:UserInstallation={perfil_url}', '--headless', '--norestore',
            '--nologo', '--nodefault']
    try:
        subprocess.run(base + ['--terminate_after_init'], check=True, timeout=180,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        modulo = os.path.join(perfil, 'user', 'basic', 'Standard', 'Module1.xba')
        if not os.path.exists(os.path.dirname(modulo)):
            sys.exit('O LibreOffice não criou o perfil temporário.')
        with open(modulo, 'w', encoding='utf-8') as arquivo:
            arquivo.write(MACRO)

        if os.path.exists(SAIDA):
            os.remove(SAIDA)
        entrada = os.path.abspath(ENTRADA).replace('"', '')
        saida = os.path.abspath(SAIDA).replace('"', '')
        subprocess.run(base + [f'macro:///Standard.Module1.Exportar("{entrada}","{saida}")'],
                       check=True, timeout=600,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    finally:
        shutil.rmtree(perfil, ignore_errors=True)

    if not os.path.exists(SAIDA):
        sys.exit('O LibreOffice terminou sem gravar o PDF.')
    print(f'PDF gerado: {SAIDA} (LibreOffice)')


def main():
    if not os.path.exists(ENTRADA):
        sys.exit(f'Documento não encontrado: {ENTRADA}\n'
                 'Execute antes: python scripts/gerar-documento.py')

    usar_word = sys.platform == 'win32' and '--libreoffice' not in sys.argv
    if not usar_word:
        via_libreoffice()
        return

    try:
        import win32com.client as com
    except ImportError:
        sys.exit('pywin32 ausente. Instale com: python -m pip install pywin32, '
                 'ou use --libreoffice.')

    entrada = os.path.abspath(ENTRADA)
    saida = os.path.abspath(SAIDA)

    word = com.Dispatch('Word.Application')
    word.Visible = False
    word.DisplayAlerts = 0
    documento = None

    try:
        documento = word.Documents.Open(entrada, ReadOnly=False)

        # Numeração das legendas e referências cruzadas primeiro; depois as
        # listas e o sumário, que dependem delas e da paginação.
        documento.Fields.Update()
        atualizar_indices(documento)

        # Segunda passagem: as listas e o sumário ocupam páginas e deslocam
        # o conteúdo seguinte, alterando os números já calculados.
        documento.Fields.Update()
        atualizar_indices(documento)

        documento.Save()
        documento.SaveAs(saida, FileFormat=FORMATO_PDF)
        paginas = documento.ComputeStatistics(2)  # wdStatisticPages
        print(f'PDF gerado: {SAIDA}')
        print(f'Páginas: {paginas}')
        print(f'Listas atualizadas: {documento.TablesOfFigures.Count} | '
              f'Sumários: {documento.TablesOfContents.Count}')
    finally:
        if documento is not None:
            documento.Close(SaveChanges=False)
        word.Quit()


if __name__ == '__main__':
    main()
