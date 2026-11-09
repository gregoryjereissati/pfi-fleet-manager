"""
Converte o Documento Técnico de .docx para .pdf.

A conversão usa o próprio Word, por automação COM, o que preserva a
formatação com fidelidade e — diferentemente de conversores externos —
permite atualizar os campos antes da exportação: números de figuras e
quadros, referências cruzadas, listas de figuras e de quadros, sumário e
números de página. O .docx é gravado com os campos já preenchidos.

Requisitos: Windows com Microsoft Word instalado e o pacote pywin32.

Uso:  python scripts/gerar-pdf.py
Saída: docs/academico/Documento Tecnico - Fleet Manager (ABNT).pdf
"""

import os
import sys

ENTRADA = os.path.join('docs', 'academico', 'Documento Tecnico - Fleet Manager (ABNT).docx')
SAIDA = os.path.join('docs', 'academico', 'Documento Tecnico - Fleet Manager (ABNT).pdf')

FORMATO_PDF = 17  # wdFormatPDF


def atualizar_indices(documento):
    for i in range(1, documento.TablesOfFigures.Count + 1):
        documento.TablesOfFigures(i).Update()
    for i in range(1, documento.TablesOfContents.Count + 1):
        documento.TablesOfContents(i).Update()


def main():
    if not os.path.exists(ENTRADA):
        sys.exit(f'Documento não encontrado: {ENTRADA}\n'
                 'Execute antes: python scripts/gerar-documento.py')

    try:
        import win32com.client as com
    except ImportError:
        sys.exit('pywin32 ausente. Instale com: python -m pip install pywin32')

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
