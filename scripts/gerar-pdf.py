"""
Converte o Documento Técnico de .docx para .pdf.

A conversão usa o próprio Word, por automação COM, o que preserva a
formatação com fidelidade e — diferentemente de conversores externos —
permite atualizar o campo de sumário antes da exportação, de modo que o PDF
saia com os títulos e as páginas já preenchidos.

Requisitos: Windows com Microsoft Word instalado e o pacote pywin32.

Uso:  python scripts/gerar-pdf.py
Saída: docs/academico/Documento Tecnico - Fleet Manager.pdf
"""

import os
import sys

ENTRADA = os.path.join('docs', 'academico', 'Documento Tecnico - Fleet Manager.docx')
SAIDA = os.path.join('docs', 'academico', 'Documento Tecnico - Fleet Manager.pdf')

FORMATO_PDF = 17  # wdFormatPDF


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

        # Preenche o sumário e demais campos. O Word precisa repaginar o
        # documento para conhecer os números de página, o que só ocorre aqui.
        for i in range(1, documento.TablesOfContents.Count + 1):
            documento.TablesOfContents(i).Update()
        documento.Fields.Update()

        # Segunda passagem: a inserção do sumário desloca o conteúdo e altera
        # as páginas dos itens seguintes.
        for i in range(1, documento.TablesOfContents.Count + 1):
            documento.TablesOfContents(i).Update()

        documento.SaveAs(saida, FileFormat=FORMATO_PDF)
        paginas = documento.ComputeStatistics(2)  # wdStatisticPages
        print(f'PDF gerado: {SAIDA}')
        print(f'Páginas: {paginas}')
        print(f'Sumários atualizados: {documento.TablesOfContents.Count}')
    finally:
        if documento is not None:
            documento.Close(SaveChanges=False)
        word.Quit()


if __name__ == '__main__':
    main()
