"""
Gera o Documento Técnico do Fleet Manager em formato .docx.

O conteúdo descreve o sistema tal como ele existe no repositório: cada
afirmação técnica corresponde a código verificado, e não a intenção de
projeto. Manter a geração em script permite regenerar o documento sempre que a
aplicação evoluir.

A apresentação segue o perfil ABNT de docs/academico/GUIA_ABNT_TCC_PARA_CLAUDE.md.

Uso:
    python scripts/gerar-diagramas.py
    python scripts/gerar-documento.py
    python scripts/gerar-pdf.py

Saída: docs/academico/Documento Tecnico - Fleet Manager (ABNT).docx
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from docx_base import (  # noqa: E402
    SAIDA, WD_ALIGN_PARAGRAPH, Cm, Pt, alineas, capa_fora_da_contagem, centro, configurar, doc,
    figura, h1, h1_centralizado, h2, lista_automatica, moldura, natureza,
    nova_secao, numerar_paginas, p, quadro, referencia, sigla, sumario_automatico,
    tabela, texto_rico, titulo_pretextual, verificar_objetos, verificar_referencias,
)

# Fontes das tabelas que trazem números de cada rodada de testes.
FONTE_RELATORIO = ('Fonte: Elaborado pelos autores com base no Relatório de Testes do '
                   'Fleet Manager (2026), rodada de 20 out. 2026.')
FONTE_WORKLOAD = ('Fonte: Elaborado pelos autores (2026), rodada de 9 nov. 2026, '
                  'registrada em docs/testes/workload-misto.json.')

AUTORES = ('André Luiz Cavalcante da Silva', 'Luiz Eduardo Pacheco',
           'Gregory Figueiredo de M. P. Jereissati')
MATRICULAS = ('2310287', '2310314', '2320425')
TITULO = 'FLEET MANAGER: SISTEMA WEB DE GESTÃO DE FROTAS'
NATUREZA = ('Trabalho apresentado ao Curso de Ciência da Computação do Centro de Ciências '
            'Tecnológicas da Universidade de Fortaleza, como requisito do Projeto Final '
            'Integrador II.')
ORIENTADOR = 'Prof. Me. Ronaldo Gonçalves Junior'


# ===========================================================================
# Elementos pré-textuais
# ===========================================================================
def capa():
    # Arranjo do modelo da Unifor: instituição no alto, título ao centro com
    # os autores abaixo, cidade e ano ao pé (F, p. 13). A capa não é contada.
    for t in ('FUNDAÇÃO EDSON QUEIROZ', 'UNIVERSIDADE DE FORTALEZA — UNIFOR',
              'CENTRO DE CIÊNCIAS TECNOLÓGICAS', 'CURSO DE CIÊNCIA DA COMPUTAÇÃO'):
        centro(t, negrito=True)
    moldura(centro(TITULO, negrito=True), 'center')
    for i, (nome, matricula) in enumerate(zip(AUTORES, MATRICULAS)):
        moldura(centro(f'{nome} ({matricula})', espaco_antes=72 if i == 0 else None),
                'center')
    moldura(centro('Fortaleza'), 'bottom')
    moldura(centro('2026'), 'bottom')


def folha_rosto():
    # Autor, título, natureza, orientador, cidade e ano (F, p. 14).
    for nome in AUTORES:
        centro(nome)
    moldura(centro(TITULO, negrito=True, espaco_depois=48), 'center')
    moldura(natureza(NATUREZA), 'center')
    moldura(natureza(f'Orientador: {ORIENTADOR}.', espaco_antes=12), 'center')
    moldura(centro('Fortaleza'), 'bottom')
    moldura(centro('2026'), 'bottom')
    # Parágrafo-âncora: sem ele, as molduras acima se prendem ao primeiro
    # parágrafo da página seguinte e o LibreOffice as desenha lá.
    p('', recuo=False, tamanho=1)


def folha_aprovacao():
    # Elementos da folha de aprovação (F, p. 17). Data, avaliadores e
    # assinaturas ficam em branco: não se inventam dados da banca.
    primeiro = centro(AUTORES[0])
    primeiro.paragraph_format.page_break_before = True
    for nome in AUTORES[1:]:
        centro(nome)
    centro(TITULO, negrito=True, espaco_antes=36, espaco_depois=36)
    natureza(NATUREZA)
    p('Aprovado em: ____/____/________.', recuo=False, espaco_antes=36)
    centro('BANCA EXAMINADORA', negrito=True, espaco_antes=36, espaco_depois=12)
    for nome, instituicao in ((f'{ORIENTADOR} (Orientador)', 'Universidade de Fortaleza'),
                              ('', ''), ('', '')):
        centro('_' * 48, espaco_antes=30)
        linha = centro(nome or 'Avaliador(a)')
        linha.paragraph_format.line_spacing = 1.0
        if instituicao:
            centro(instituicao).paragraph_format.line_spacing = 1.0


RESUMO = (
    'Empresas que dependem de veículos precisam acompanhar, ao mesmo tempo, o estado de cada '
    'unidade, o que ela custa e os prazos dos documentos. Em organizações de pequeno e médio '
    'porte, essas informações costumam ficar em planilhas e controles separados, sem '
    'apuração do custo por veículo e sem aviso de vencimento. Este trabalho teve como '
    'objetivo desenvolver um sistema web para gestão de frotas, com foco no controle '
    'operacional, financeiro e documental dos veículos. Trata-se de pesquisa aplicada, '
    'conduzida em ciclos incrementais entre fevereiro e novembro de 2026, do levantamento de '
    'requisitos à publicação. A comparação com seis trabalhos relacionados mostrou soluções '
    'voltadas a entregas, viagens, rastreamento ou manutenção, e nenhuma que reunisse custo '
    'por veículo, manutenção com prazo, vencimento de documentos e separação de dados entre '
    'empresas. O sistema resultante, o Fleet Manager, tem interface em React e interface de '
    'programação REST em Node.js com Express, organizada em camadas, ambas em TypeScript, '
    'com dados em PostgreSQL acessado por SQL parametrizado. A autenticação é delegada ao '
    'Supabase Auth, e a autorização, baseada em papéis e restrita à empresa do usuário, é '
    'feita pela própria aplicação. As situações de prazo, que incluem documento vencido, '
    'manutenção atrasada e habilitação vencida, são calculadas a cada consulta e reunidas em '
    'uma central de alertas. A verificação reuniu 402 testes automatizados, nos níveis '
    'unitário, de integração com o banco e de ponta a ponta, executados em integração '
    'contínua e com cobertura de 88,4% das linhas do servidor. Em um cenário de carga com '
    'leituras e escritas simultâneas, a aplicação atendeu de 790 a 1.452 requisições por '
    'segundo, com até cem conexões e sem erro. Os dez requisitos funcionais foram atendidos, '
    'e o sistema está publicado em ambiente de produção. O grupo ouviu proprietários de '
    'empresas com frota e usou bases delas em parte dos testes; como esses dados são '
    'confidenciais, os resultados apresentados vêm de uma base fictícia, e a adoção por uma '
    'frota em operação, com medição dos benefícios, fica indicada como continuidade.')

ABSTRACT = (
    'Companies that depend on vehicles need to keep track, at the same time, of the '
    'condition of each unit, what it costs and the deadlines of its documents. In small and '
    'medium-sized organizations, this information is usually kept in separate spreadsheets '
    'and records, with no calculation of the cost per vehicle and no warning of expiry '
    'dates. This work aimed to develop a web system for fleet management, focused on the '
    'operational, financial and documentary control of vehicles. It is an applied research '
    'project, carried out in incremental cycles between February and November 2026, from '
    'requirements elicitation to deployment. The comparison with six related works showed '
    'solutions aimed at deliveries, trips, tracking or maintenance, and none that brought '
    'together cost per vehicle, scheduled maintenance, document expiry and data separation '
    'between companies. The resulting system, Fleet Manager, has a React interface and a '
    'REST application programming interface in Node.js with Express, organized in layers, '
    'both written in TypeScript, with data in PostgreSQL accessed through parameterized SQL. '
    'Authentication is delegated to Supabase Auth, while authorization, based on roles and '
    'restricted to the user\'s company, is performed by the application itself. Deadline '
    'situations, which include expired documents, overdue maintenance and expired driver '
    'licenses, are computed on every query and gathered in an alert center. Verification '
    'comprised 402 automated tests at the unit, database integration and end-to-end levels, '
    'run in continuous integration and covering 88.4% of the server lines. In a load '
    'scenario with simultaneous reads and writes, the application served from 790 to 1,452 '
    'requests per second, with up to one hundred connections and no errors. The ten '
    'functional requirements were met, and the system is deployed in a production '
    'environment. The group talked with owners of companies that operate fleets and used '
    'their databases in part of the tests; as this information is confidential, the results '
    'presented come from a fictitious database, and adoption by a fleet in operation, with '
    'measurement of the benefits, is indicated as future work.')


def _resumo(titulo, texto, rotulo, termos):
    # Bloco único, 12 pt, justificado, entrelinhas 1,5, sem recuo (F, p. 21–27).
    titulo_pretextual(titulo)
    p(texto, recuo=False)
    par = p('', recuo=False, espaco_antes=18)
    r = par.add_run(f'{rotulo}: ')
    r.bold = True
    texto_rico(par, termos)


def resumo():
    _resumo('RESUMO', RESUMO, 'Palavras-chave',
            'gestão de frotas; arquitetura de software; aplicações web; controle de acesso '
            'baseado em papéis; computação em nuvem.')


def abstract():
    _resumo('ABSTRACT', ABSTRACT, 'Keywords',
            'fleet management; software architecture; web applications; role-based access '
            'control; cloud computing.')


def listas():
    titulo_pretextual('LISTA DE FIGURAS')
    lista_automatica('fig')

    titulo_pretextual('LISTA DE QUADROS')
    lista_automatica('qua')

    titulo_pretextual('LISTA DE TABELAS')
    lista_automatica('tab')

    # Apenas siglas empregadas no texto, em ordem alfabética; a forma por
    # extenso em língua estrangeira vai em itálico (F, p. 31 e 42).
    titulo_pretextual('LISTA DE ABREVIATURAS E SIGLAS')
    for s, significado in (
        ('API', '*Application Programming Interface* (interface de programação de '
                'aplicações)'),
        ('CD', '*Continuous Delivery* (entrega contínua)'),
        ('CI', '*Continuous Integration* (integração contínua)'),
        ('CNH', 'Carteira Nacional de Habilitação'),
        ('CORS', '*Cross-Origin Resource Sharing*'),
        ('CPF', 'Cadastro de Pessoas Físicas'),
        ('CRLV', 'Certificado de Registro e Licenciamento de Veículo'),
        ('CTB', 'Código de Trânsito Brasileiro'),
        ('E2E', '*End-to-End* (de ponta a ponta)'),
        ('ES256', 'ECDSA sobre a curva P-256 com SHA-256'),
        ('GPS', '*Global Positioning System*'),
        ('GSM', '*Global System for Mobile Communications*'),
        ('HTTP', '*HyperText Transfer Protocol*'),
        ('IPVA', 'Imposto sobre a Propriedade de Veículos Automotores'),
        ('JSON', '*JavaScript Object Notation*'),
        ('JWKS', '*JSON Web Key Set*'),
        ('JWT', '*JSON Web Token*'),
        ('ORM', '*Object-Relational Mapper* (mapeador objeto-relacional)'),
        ('OWASP', '*Open Worldwide Application Security Project*'),
        ('RBAC', '*Role-Based Access Control*'),
        ('Renainf', 'Registro Nacional de Infrações de Trânsito'),
        ('REST', '*Representational State Transfer*'),
        ('RF', 'Requisito Funcional'),
        ('RLS', '*Row Level Security* (segurança em nível de linha)'),
        ('RN', 'Regra de Negócio'),
        ('RNF', 'Requisito Não Funcional'),
        ('SaaS', '*Software as a Service* (software como serviço)'),
        ('SPA', '*Single Page Application*'),
        ('SQL', '*Structured Query Language*'),
        ('URL', '*Uniform Resource Locator*'),
    ):
        sigla(s, significado)

    titulo_pretextual('SUMÁRIO')
    sumario_automatico()


# ===========================================================================
# 1 INTRODUÇÃO
# ===========================================================================
def cap1():
    h1('1 INTRODUÇÃO', nova_pagina=False)
    p('Empresas que fazem entregas, prestam serviço em campo ou transportam pessoas dependem '
      'de veículos todos os dias. Em outubro de 2026, a frota registrada no país somava '
      '133,8 milhões de veículos, dos quais 4,3 milhões eram caminhões e caminhões-tratores '
      '(Brasil, 2026). Manter um desses veículos em operação exige acompanhar três dimensões '
      'ao mesmo tempo. A operacional trata do estado do veículo e das manutenções feitas ou '
      'previstas. A financeira apura o que ele consome em combustível, peças, serviços, '
      'multas, tributos e seguro. A documental acompanha os documentos obrigatórios do '
      'veículo e do condutor, com suas datas de vencimento.')
    p('Embora descrevam o mesmo ativo, essas dimensões costumam ficar com pessoas diferentes '
      'e em ferramentas diferentes. Trabalhos que partiram da observação de organizações '
      'reais mostram esse quadro. Na Prefeitura de Capitólio, em Minas Gerais, a manutenção '
      'de veículos e máquinas era acompanhada por controles simples e registros manuais '
      '(Rodrigues *et al.*, 2019). Em uma transportadora indonésia, operação, finanças e '
      'manutenção mantinham registros próprios, e 18 de 150 lançamentos examinados divergiam '
      'de um setor para outro (Lubis; Suendri, 2025). Silva (2018) descreve situação '
      'parecida em pequenas transportadoras, que controlam a frota por planilhas e gastam '
      'tempo preenchendo e somando dados à mão.')
    p('Os dados, portanto, existem. O que falta é reuni-los e acompanhar os prazos. Uma '
      'planilha registra que o licenciamento vence em determinado dia, mas não avisa ninguém '
      'quando esse dia se aproxima, e o atraso só aparece depois de produzir efeito. O efeito '
      'pode ser uma autuação: o Código de Trânsito Brasileiro (CTB) classifica como infração '
      'gravíssima conduzir veículo sem licenciamento, com multa e remoção, e atribui ao '
      'proprietário a responsabilidade pela regularização do veículo e pela habilitação de '
      'quem o conduz (Brasil, 1997). Entre janeiro e maio de 2026, o Registro Nacional de '
      'Infrações de Trânsito (Renainf) registrou 1.211.844 infrações por veículo não '
      'licenciado (Vargas, 2026).')
    p('Diante desse problema, o trabalho parte da seguinte questão: como reunir em um único '
      'sistema as informações operacionais, financeiras e documentais de uma frota, de modo '
      'que o gestor saiba quanto cada veículo custa e seja avisado antes que um prazo vença? '
      'A resposta proposta é o Fleet Manager, uma aplicação web que organiza despesas, '
      'manutenções, documentos e motoristas em torno do veículo e atende várias empresas na '
      'mesma base de dados, cada uma com acesso apenas ao que lhe pertence.')

    h2('1.1 Justificativa')
    p('O ganho de acompanhar a manutenção por prazo já foi medido. Em uma frota de caminhões '
      'de carga pesada, a adoção da manutenção preventiva reduziu em 47,11% o tempo médio de '
      'reparo e elevou a disponibilidade dos veículos de 55,95% para 75,36% (Menezes, 2022). '
      'O mesmo vale para o controle de custos: ao estudar a frota de uma indústria de '
      'alimentos, Santos *et al.* (2012) concluíram que os indicadores de desempenho são '
      'fundamentais para o controle e a melhoria dos resultados. Os dois casos supõem dados '
      'registrados, ligados ao veículo certo e disponíveis no momento da decisão.')
    p('Os sistemas descritos na literatura resolvem partes desse problema. Os seis trabalhos '
      'examinados no capítulo 3 tratam de entregas, viagens, rastreamento ou manutenção, e '
      'nenhum deles reúne custo por veículo, manutenção com prazo, vencimento de documentos '
      'e separação de dados entre empresas. É nessa combinação que este trabalho se '
      'concentra, com atenção a '
      'organizações de pequeno e médio porte.')
    p('Do ponto de vista acadêmico, o desenvolvimento exigiu aplicar em um mesmo produto '
      'conteúdos vistos separadamente ao longo do curso, entre eles arquitetura de software, '
      'modelagem de dados, segurança, teste e publicação de aplicações.')

    h2('1.2 Objetivo geral')
    p('Desenvolver um sistema web para gestão de frotas, com foco no controle operacional, '
      'financeiro e documental de veículos, promovendo transparência e rastreabilidade dos '
      'custos por ativo, classificação automática de vencimentos e redução de riscos legais.')
    p('O sistema consolida e classifica os dados registrados. Os indicadores apuram o '
      'histórico lançado, e a classificação de vencimentos aplica uma regra declarada sobre '
      'a data de validade. Projeção financeira e recomendação automática ficam fora do '
      'alcance do trabalho.')

    h2('1.3 Objetivos específicos')
    p('Para alcançar o objetivo geral, definiram-se os seguintes objetivos específicos:')
    alineas((
        'desenvolver funcionalidades de cadastro, edição e gerenciamento de veículos, '
        'motoristas e usuários do sistema, incluindo o vínculo entre motoristas e veículos',
        'permitir o registro de despesas obrigatoriamente vinculadas a um veículo, '
        'contemplando as categorias combustível, manutenção, multa, IPVA, seguro e outras',
        'implementar o controle de manutenções preventivas e corretivas, com acompanhamento '
        'dos estados programada, realizada, atrasada e cancelada, sendo o atraso apurado '
        'automaticamente a partir da data prevista',
        'registrar documentos obrigatórios de veículos e motoristas, com data de vencimento, '
        'classificação automática da situação e anexo do arquivo digital correspondente, e '
        'reunir em uma central de alertas os prazos que exigem ação: documentos, manutenções '
        'e habilitações',
        'disponibilizar painel de indicadores que apresente custo total, custo médio, custo '
        'por veículo, evolução mensal das despesas e distribuição por categoria',
        'implementar autenticação de usuários e controle de acesso baseado em papéis, '
        'assegurando segregação de responsabilidades no uso do sistema',
        'verificar a qualidade do software por meio de testes automatizados em três níveis '
        '(unitário, integração com o banco e ponta a ponta), executados em integração '
        'contínua, e avaliar a segurança, o desempenho e a resiliência do sistema',
    ))

    h2('1.4 Estrutura do trabalho')
    p('O trabalho está organizado em sete capítulos, sendo este o primeiro. O capítulo 2 '
      'apresenta a fundamentação teórica. O capítulo 3 examina trabalhos relacionados e '
      'situa o Fleet Manager em relação a eles. O capítulo 4 descreve a metodologia, das '
      'etapas de desenvolvimento à estratégia de verificação. O capítulo 5 detalha a '
      'construção do sistema, com arquitetura, modelo de dados, segurança e publicação. O '
      'capítulo 6 expõe os resultados e discute as limitações, e o capítulo 7 conclui o '
      'trabalho. Depois das referências, o glossário define os termos técnicos de uso '
      'restrito, e os apêndices trazem o termo de abertura do projeto, o documento de '
      'arquitetura de software e o roteiro para reproduzir os testes.')


# ===========================================================================
# 2 FUNDAMENTAÇÃO TEÓRICA
# ===========================================================================
def cap2():
    h1('2 FUNDAMENTAÇÃO TEÓRICA')
    p('Este capítulo reúne os conceitos que sustentam as decisões do trabalho. As duas '
      'primeiras seções tratam do domínio, com a gestão de frotas e as obrigações legais que '
      'geram prazos. As seguintes tratam da solução: aplicações web oferecidas como serviço, '
      'arquitetura, dados, controle de acesso e verificação da qualidade.')

    h2('2.1 Gestão de frotas')
    p('Gestão de frotas "representa a atividade de reger, administrar ou gerenciar um '
      'conjunto de veículos pertencentes a uma mesma empresa" (Valente; Passaglia; Novaes, '
      '1997 *apud* Resende, 2014, p. 32). Segundo os autores, a tarefa é ampla e envolve '
      'dimensionamento, especificação de equipamentos, roteirização, custos, manutenção e '
      'renovação de veículos. Este trabalho se concentra em custos e manutenção e acrescenta '
      'o controle dos documentos. Roteirização e dimensionamento não fazem parte do escopo, '
      'delimitado na seção 5.13.')
    p('O controle de custos depende de indicadores. Eles servem ao planejamento, ao permitir '
      'estabelecer metas quantificadas, e ao controle, ao permitir a análise crítica do '
      'desempenho e a tomada de decisão (Takashina; Flores, 1996 *apud* Santos *et al.*, '
      '2012, p. 5). Para que um indicador como o custo por veículo seja confiável, cada '
      'gasto precisa estar associado ao veículo que o gerou, e a ausência dessa associação '
      'inviabiliza a comparação entre unidades da mesma frota. Essa exigência orientou uma '
      'das restrições centrais do modelo de dados, a obrigatoriedade do vínculo entre '
      'despesa e veículo, descrita na seção 5.4.')
    p('A manutenção, por sua vez, reúne as medidas destinadas a manter os veículos em '
      'condições adequadas de uso (Valente; Passaglia; Novaes, 1997 *apud* Resende, 2014, p. '
      '33). A corretiva repara a avaria depois que ela acontece; a preventiva é planejada, e '
      'seu efeito sobre a operação foi medido por Menezes (2022), que registrou, além do '
      'ganho de disponibilidade citado na introdução, queda de 21,47% na taxa de falhas. '
      'Planejar a manutenção preventiva significa trabalhar com datas previstas e saber '
      'quando elas foram ultrapassadas, o que explica o tratamento dado ao atraso no sistema.')

    h2('2.2 Obrigações legais e prazos')
    p('Parte dos prazos de uma frota decorre da lei. O CTB determina que todo veículo '
      'automotor seja licenciado anualmente para transitar na via (art. 130) e vincula a '
      'validade da Carteira Nacional de Habilitação (CNH) à vigência do exame de aptidão '
      'física e mental (art. 159, § 10). Conduzir veículo que não esteja registrado e '
      'devidamente licenciado é infração gravíssima, sujeita a multa e remoção (art. 230, '
      'V), e também é gravíssima a condução com a habilitação vencida há mais de trinta '
      'dias, que leva à retenção do veículo até a apresentação de condutor habilitado (art. '
      '162, V) (Brasil, 1997).')
    p('A responsabilidade alcança a empresa. Cabe sempre ao proprietário responder pela '
      'infração referente à prévia regularização do veículo e à habilitação legal de seus '
      'condutores (art. 257, § 2º), e o código pune também quem entrega a direção a pessoa '
      'nessas condições (art. 163) (Brasil, 1997). No Fleet Manager, essas obrigações '
      'aparecem em duas regras: a central de alertas avisa com trinta dias de antecedência o '
      'vencimento de documentos e habilitações, e um motorista com a habilitação vencida não '
      'pode ser vinculado a um novo veículo. A segunda regra é mais estrita do que a lei, '
      'que admite trinta dias de tolerância, porque o vínculo é uma decisão da empresa e '
      'pode esperar a renovação.')

    h2('2.3 Aplicações web e software como serviço')
    p('Sistemas web seguem a arquitetura cliente-servidor: o cliente responde pela interface, '
      'executada no navegador, e o servidor, pelo processamento das requisições e pela gestão '
      'dos dados. A separação entre a interface e o armazenamento de dados permite que as duas '
      'partes evoluam de forma independente e simplifica o servidor (Fielding, 2000). Uma '
      'forma corrente de construir o cliente é a *Single Page Application* (SPA), que carrega '
      'uma única página e atualiza o conteúdo sem recarregá-la por inteiro. A interface do '
      'Fleet Manager é uma SPA escrita em TypeScript (Microsoft, [2026]) com a biblioteca '
      'React (Meta, [2026]), construída com o Vite (Vite Team, [2026]) e estilizada com o '
      'Tailwind CSS (Tailwind Labs, [2026]). A tipagem estática do TypeScript antecipa para a '
      'compilação erros que só apareceriam em execução.')
    p('Quando a aplicação é executada em infraestrutura de nuvem e acessada pelo navegador, '
      'sem que o consumidor administre servidores, ela se enquadra no modelo de software '
      'como serviço, ou *Software as a Service* (SaaS) (Mell; Grance, 2011). Nesse modelo é '
      'comum a arquitetura multi-inquilino, em que vários clientes compartilham a mesma '
      'instância da aplicação e do banco de dados, o que melhora o aproveitamento dos '
      'recursos e simplifica a manutenção, mas exige garantir que um cliente não alcance os '
      'dados do outro (Bezemer; Zaidman, 2010). O Fleet Manager adota essa arquitetura: '
      'todas as empresas usam a mesma aplicação e o mesmo banco, e o isolamento é feito pelo '
      'identificador da empresa, presente em toda consulta, conforme as seções 5.4 e 5.5. A '
      'publicação usa duas plataformas gerenciadas, a Vercel ([2026]), para a aplicação, e o '
      'Supabase ([2026]), para banco de dados, autenticação e arquivos.')

    h2('2.4 Arquitetura em camadas e interface REST')
    p('Na arquitetura em camadas, cada camada oferece serviços à que está acima e usa apenas '
      'os da que está abaixo, de modo que uma delas pode ser alterada ou substituída sem '
      'afetar as demais, desde que sua interface seja mantida (Sommerville, 2011). O '
      'servidor do Fleet Manager, escrito em Node.js (OpenJS Foundation, [2026]) com o '
      '*framework* Express, segue essa organização em rotas, *middlewares*, controladores, '
      'serviços e repositórios. Como os serviços não conhecem o protocolo HTTP, as regras de '
      'negócio podem ser testadas sem iniciar servidor nem banco de dados.')
    p('A comunicação entre cliente e servidor segue o estilo arquitetural *Representational '
      'State Transfer* (REST), proposto por Fielding (2000) como um conjunto de restrições: '
      'cliente-servidor, ausência de estado, *cache*, interface uniforme, sistema em camadas '
      'e, opcionalmente, código sob demanda. A ausência de estado determina que cada '
      'requisição traga toda a informação necessária para ser compreendida. No sistema, isso '
      'se traduz no envio do *token* a cada chamada e na possibilidade de atendê-la em '
      'qualquer instância do servidor, condição para a execução em funções sem servidor '
      'dedicado, descrita na seção 5.10.')

    h2('2.5 Banco de dados relacional e acesso a dados')
    p('Os dados de uma frota são fortemente relacionados: uma despesa pertence a um veículo, '
      'que pertence a uma empresa, e um documento se liga a um veículo ou a um motorista. Um '
      'banco relacional expressa essas dependências como restrições e as verifica a cada '
      'gravação. O sistema usa o PostgreSQL, gerenciador relacional de código aberto com '
      'suporte a transações e a integridade referencial (PostgreSQL Global Development '
      'Group, [2026]).')
    p('Há duas formas usuais de acessar o banco a partir da aplicação. O mapeador '
      'objeto-relacional (ORM) gera as consultas a partir de um esquema declarado e dispensa '
      'a escrita das rotineiras. O SQL parametrizado mantém a consulta na linguagem do banco '
      'e envia os valores separados do texto dela, prática que a OWASP Foundation ([2026]) '
      'indica como primeira defesa contra a injeção de SQL. O projeto começou com um ORM e '
      'migrou para o SQL parametrizado, com a biblioteca postgres.js (Porsager, [2026]). O '
      'custo da troca é escrever mais código. Em compensação, a condição que isola cada '
      'empresa fica visível na própria consulta, o que facilita conferi-la em uma revisão.')
    p('A estrutura do banco evolui por *migrations*: arquivos SQL numerados, cada um com uma '
      'alteração do esquema, aplicados em ordem por um executor que registra quais já '
      'rodaram. O mesmo conjunto de arquivos reconstrói o banco do zero nos ambientes de '
      'desenvolvimento, de testes e de produção, o que torna o esquema parte do código '
      'versionado.')

    h2('2.6 Autenticação e controle de acesso')
    p('Autenticar é verificar a identidade de um usuário; autorizar é decidir o que ele pode '
      'acessar. As duas responsabilidades podem ficar com agentes diferentes. Um serviço '
      'especializado verifica a identidade e emite uma credencial assinada, e a aplicação '
      'confere a assinatura e decide sobre as permissões. Um formato difundido para essa '
      'credencial é o JSON Web Token (JWT), que representa declarações a serem transferidas '
      'entre duas partes e permite assiná-las digitalmente (Jones; Bradley; Sakimura, 2015).')
    p('A assinatura pode usar uma chave secreta compartilhada ou um par de chaves '
      'assimétricas. No Fleet Manager, o Supabase Auth assina os *tokens* com chave '
      'assimétrica, pelo algoritmo ES256, e publica a chave pública correspondente em um '
      '*JSON Web Key Set* (JWKS). A aplicação usa essa chave para conferir a assinatura, o '
      'emissor e o público de cada *token*, sem guardar senha nem segredo do serviço de '
      'identidade.')
    p('Para a autorização, o sistema adota o controle de acesso baseado em papéis, ou '
      '*Role-Based Access Control* (RBAC). Nesse modelo, as permissões são associadas a '
      'papéis e os usuários são associados aos papéis, o que simplifica a administração, '
      'pois mudar a função de uma pessoa na organização equivale a mudar o papel atribuído a '
      'ela (Sandhu *et al.*, 1996). São três os papéis do sistema: administrador, com acesso '
      'a toda a empresa; gestor, que administra a frota; e operador, restrito ao registro da '
      'própria rotina. O papel e a situação da conta ficam no banco da aplicação e são '
      'consultados a cada requisição. Assim, o bloqueio de uma conta vale na requisição '
      'seguinte, mesmo que o *token* em posse do usuário ainda não tenha expirado.')
    p('A esses mecanismos soma-se a validação dos dados de entrada, que rejeita requisições '
      'malformadas antes que alcancem as regras de negócio. O projeto declara o formato '
      'esperado de cada entrada com a biblioteca Zod ([2026]), aplicada em um *middleware* '
      'anterior ao controlador.')

    h2('2.7 Teste de software e integração contínua')
    p('Sommerville (2011) organiza o teste de desenvolvimento em três níveis: o de unidade, '
      'que exercita uma parte isolada; o de componente, que verifica a integração entre '
      'partes; e o de sistema, que verifica o conjunto montado. Cada nível encontra defeitos '
      'que os outros não alcançam. O teste de unidade aponta a regra que mudou, mas não '
      'percebe uma consulta errada no banco; o de sistema confirma o comportamento final, '
      'mas não diz em que parte está a falha. No Fleet Manager, esses níveis correspondem '
      'aos testes unitários dos serviços, aos de integração com o PostgreSQL e aos de ponta '
      'a ponta, que enviam requisições HTTP à aplicação montada. Todos usam o *framework* '
      'Vitest ([2026]).')
    p('Na integração contínua, os membros de uma equipe reúnem suas alterações no mesmo código '
      'com frequência, ao menos diária, e cada integração é verificada por uma construção '
      'automatizada, com testes (Fowler, 2024). A entrega contínua é a disciplina de construir '
      'o software de modo que ele possa ser publicado a qualquer momento (Fowler, 2013). O '
      'projeto implementa as duas com o GitHub Actions (GitHub, [2026]), e a produção só '
      'recebe a versão aprovada em todos os testes, conforme a seção 5.11.')

    h2('2.8 Desempenho e confiabilidade')
    p('A norma ISO/IEC 25010 inclui a eficiência de desempenho e a confiabilidade entre as '
      'características de qualidade de um produto de software, e a segunda abrange a '
      'capacidade de recuperação após uma falha (International Organization for '
      'Standardization, 2023). Essas duas características foram avaliadas no sistema, com os '
      'resultados apresentados nas seções 6.4 e 6.5.')
    p('O desempenho costuma ser descrito por duas grandezas: a vazão, quantidade de '
      'requisições atendidas por segundo, e o tempo de resposta. A média do tempo de '
      'resposta esconde os casos ruins, e por isso se usam percentis. A mediana (p50) é o '
      'tempo dentro do qual metade das respostas chegou, e o p99 é aquele dentro do qual '
      'chegaram 99% delas. Dean e Barroso (2013) mostram que essa cauda da distribuição '
      'ganha importância à medida que o sistema cresce, porque respostas lentas que seriam '
      'raras passam a atingir boa parte dos usuários. Como critério de adequação, adotou-se '
      'o limite de um segundo indicado por Nielsen (1993), até o qual o fluxo de pensamento '
      'do usuário não é interrompido.')


# ===========================================================================
# 3 TRABALHOS RELACIONADOS
# ===========================================================================
def cap3():
    h1('3 TRABALHOS RELACIONADOS')
    p('Este capítulo examina trabalhos que construíram sistemas para frotas de veículos, '
      'cada um voltado a uma necessidade específica, e os compara com o Fleet Manager.')

    h2('3.1 Busca e seleção')
    p('A busca foi feita em novembro de 2026, na web aberta, e alcançou repositórios '
      'institucionais de universidades brasileiras, anais de eventos e periódicos de acesso '
      'aberto. Os termos usados combinaram "gestão de frotas", "controle de frota", '
      '"manutenção de veículos", "entregas", "rastreamento" e "*fleet management system*". '
      'Foram considerados os trabalhos com texto integral disponível que descrevem um '
      'sistema construído para frotas. Entre eles, escolheram-se seis, publicados de 2017 a '
      '2025, de modo que cada um representasse uma especialização diferente: entregas, '
      'transporte de carga, frota pública, rastreamento embarcado, fretamento de ônibus e '
      'projeto centrado no usuário. Trata-se de uma seleção por pertinência, sem a pretensão '
      'de uma revisão sistemática. As características atribuídas a cada trabalho são as '
      'descritas em seu texto.')

    h2('3.2 Trabalhos examinados')
    p('Ferreira e Prazeres (2017) desenvolveram um sistema para acompanhar as entregas de '
      'uma transportadora. Na plataforma web, a empresa cadastra notas, monta cargas e '
      'acompanha os veículos em um mapa; no aplicativo Android, o motorista consulta as '
      'entregas, altera a situação de cada uma e envia sua posição. O sistema foi avaliado '
      'por questionário em uma empresa de distribuição de alimentos da Grande Florianópolis, '
      'com nota geral de 4,60 em 5. As delimitações do trabalho excluem o controle de '
      'manutenção de veículos e a parte financeira, justamente as dimensões que este '
      'trabalho aborda.')
    p('Silva (2018) construiu um sistema para pequenas transportadoras, com módulos de '
      'motoristas, veículos, viagens, abastecimentos, multas e manutenções, e integração com '
      'o Google Maps para definir o trajeto e enviá-lo ao celular do motorista. É o trabalho '
      'mais próximo deste no conteúdo administrativo: um painel avisa as multas a pagar e as '
      'CNHs que vencem em até trinta dias. O programa, porém, é uma aplicação para '
      'computador, que gerencia uma empresa, e o autor indica a migração para a web '
      'como evolução. A manutenção é registrada depois de executada, com peças e serviços.')
    p('Rodrigues *et al.* (2019) desenvolveram, por pesquisa-ação, um sistema web para a '
      'frota da Prefeitura de Capitólio. O sistema registra manutenções, trocas de óleo, '
      'lubrificação e limpeza, emite relatórios por período e por veículo e alerta sobre '
      'revisões periódicas. Foi implantado na própria prefeitura, o que o distingue dos '
      'demais, e seu alcance é a manutenção da frota pública, sem tratar documentos de '
      'veículos ou de condutores.')
    p('Roders (2024) seguiu outro caminho e projetou um sistema embarcado de rastreamento. '
      'Um microcontrolador Arduino, com módulos GPS e GSM, envia posição e velocidade a uma '
      'plataforma em nuvem, e o responsável recebe uma mensagem eletrônica quando o veículo '
      'ultrapassa o limite definido. O protótipo foi verificado em bancada e em trajetos '
      'reais de automóvel. O foco é o comportamento do veículo em movimento, sem dados '
      'administrativos da frota.')
    p('Silva, Peralba e Silva (2024) apresentaram o DriveSync, voltado a empresas de '
      'fretamento de ônibus. A versão web registra veículos, multas e manutenções realizadas '
      'e exibe um painel de gastos; o aplicativo permite ao motorista iniciar e encerrar '
      'viagens, com uma lista de verificação do veículo. O trabalho relaciona a gestão da '
      'frota à redução de emissões e documenta casos de teste executados manualmente. A '
      'verificação do vencimento de documentos e habilitações não aparece entre os '
      'requisitos.')
    p('Lubis e Suendri (2025) projetaram um sistema web para uma transportadora da '
      'Indonésia, com ênfase na participação dos usuários. O levantamento ouviu doze pessoas '
      'da empresa, entre gestão, administração, motoristas e manutenção, e o sistema oferece '
      'dados da frota, agenda de manutenção com lembretes, despesas operacionais, relatórios '
      'e perfis de acesso. A avaliação combinou testes de usabilidade e testes de '
      'caixa-preta.')
    p('O Quadro {qua:relacionados} resume o foco, a plataforma e a avaliação de cada '
      'trabalho.')
    quadro('relacionados', 'Trabalhos relacionados: foco, plataforma e avaliação',
           ['Trabalho', 'Foco', 'Plataforma', 'Avaliação relatada'],
           [['Ferreira e Prazeres (2017)', 'Rotas e entregas de uma transportadora',
             'Web e aplicativo Android', 'Questionário com usuários de uma distribuidora'],
            ['Silva (2018)', 'Viagens e custos de pequenas transportadoras',
             'Computador, com banco SQL Server', 'Não relatada'],
            ['Rodrigues *et al.* (2019)', 'Manutenção da frota de uma prefeitura', 'Web',
             'Implantação na organização estudada'],
            ['Roders (2024)', 'Rastreamento e velocidade',
             'Dispositivo embarcado e plataforma em nuvem',
             'Ensaios em bancada e em trajetos reais'],
            ['Silva, Peralba e Silva (2024)', 'Viagens, multas e manutenções de ônibus '
                                              'fretados',
             'Web e aplicativo móvel', 'Casos de teste manuais'],
            ['Lubis e Suendri (2025)', 'Frota de uma transportadora, com projeto centrado no '
                                       'usuário',
             'Web', 'Testes de usabilidade e de caixa-preta'],
            ['Fleet Manager (2026)', 'Custos, manutenções e prazos de documentos, para várias '
                                     'empresas',
             'Web', 'Testes automatizados, carga e resiliência']],
           larguras=[3.5, 4.7, 3.6, 4.2])

    h2('3.3 Comparação com o Fleet Manager')
    p('O Quadro {qua:comparacao} compara os trabalhos pelas funcionalidades ligadas ao '
      'problema definido na introdução. "Parcial" indica que o trabalho trata de parte do '
      'critério.')
    quadro('comparacao', 'Comparação funcional entre os trabalhos',
           ['Critério', 'Ferreira e Prazeres (2017)', 'Silva (2018)',
            'Rodrigues *et al.* (2019)', 'Roders (2024)', 'Silva, Peralba e Silva (2024)',
            'Lubis e Suendri (2025)', 'Fleet Manager'],
           [['Despesas por veículo', 'Não', 'Sim', 'Parcial', 'Não', 'Sim', 'Sim', 'Sim'],
            ['Manutenção com data prevista e aviso', 'Não', 'Parcial', 'Sim', 'Não',
             'Parcial', 'Sim', 'Sim'],
            ['Aviso de vencimento de documentos ou CNH', 'Não', 'Sim', 'Não', 'Não', 'Não',
             'Não', 'Sim'],
            ['Rota, viagem ou rastreamento', 'Sim', 'Sim', 'Não', 'Sim', 'Sim', 'Não', 'Não'],
            ['Aplicativo ou dispositivo no veículo', 'Sim', 'Não', 'Não', 'Sim', 'Sim', 'Não',
             'Não'],
            ['Dados de várias empresas isolados na mesma base', 'Não', 'Não', 'Não', 'Não',
             'Parcial', 'Não', 'Sim'],
            ['Testes automatizados', 'Não', 'Não', 'Não', 'Não', 'Não', 'Não', 'Sim'],
            ['Uso ou avaliação por usuários relatados', 'Sim', 'Não', 'Sim', 'Não', 'Não',
             'Sim', 'Não']],
           larguras=[3.4, 2.0, 1.5, 2.0, 1.6, 1.9, 1.8, 1.8],
           nota='"Não" significa que a característica não é descrita no texto do trabalho. No '
                'DriveSync (Silva; Peralba; Silva, 2024), usuários e assinaturas são '
                'associados a uma empresa, mas o isolamento dos demais dados não é descrito.')
    p('A comparação mostra três diferenças. A primeira está no objeto. Quatro dos seis '
      'trabalhos acompanham o veículo em movimento, com rotas, viagens ou posição, enquanto '
      'o Fleet Manager acompanha o veículo como ativo: quanto custou, o que precisa de '
      'manutenção e que prazo está por vencer. São problemas complementares, e o '
      'rastreamento ficou fora do escopo por exigir equipamento ou aplicativo em cada '
      'veículo.')
    p('A segunda está na reunião das dimensões. Silva (2018) avisa o vencimento da CNH, mas '
      'trata a manutenção depois de executada; Lubis e Suendri (2025) programam a '
      'manutenção, mas não tratam documentos. No Fleet Manager, documentos, manutenções e '
      'habilitações aparecem na mesma central, e o atraso decorre da data prevista, sem '
      'depender de alguém marcá-lo. Além disso, o motorista com habilitação vencida é '
      'recusado em um vínculo novo, de modo que o prazo passa a condicionar a operação.')
    p('A terceira está na forma de oferta e de verificação. Os sistemas de Rodrigues *et '
      'al.* (2019) e de Lubis e Suendri (2025) atendem a uma única organização, e o de Silva '
      '(2018) gerencia uma empresa. O Fleet Manager atende várias empresas na mesma base e '
      'verifica o isolamento por testes automatizados contra o banco real, executados a cada '
      'alteração do código.')
    p('A comparação também evidencia um ponto em que os demais avançaram mais. Ferreira e '
      'Prazeres (2017), Rodrigues *et al.* (2019) e Lubis e Suendri (2025) submeteram seus '
      'sistemas a pessoas da área e relataram o resultado. Este trabalho ouviu proprietários '
      'de empresas com frota e usou bases delas em parte dos testes, mas não realizou uma '
      'avaliação estruturada com usuários. A limitação é discutida na seção 6.7.')


# ===========================================================================
# 4 METODOLOGIA
# ===========================================================================
def cap4():
    h1('4 METODOLOGIA')
    p('Este capítulo descreve como o trabalho foi conduzido: a natureza da pesquisa, as '
      'etapas percorridas, as decisões revistas no caminho, as ferramentas e a forma de '
      'verificar o resultado.')

    h2('4.1 Caracterização da pesquisa')
    p('Quanto à natureza, a pesquisa é aplicada, pois busca gerar conhecimento para aplicação '
      'prática, dirigido à solução de um problema específico (Prodanov; Freitas, 2013). O '
      'problema é o descrito na introdução, e a solução é o próprio sistema, construído e '
      'verificado ao longo do ano de 2026. A avaliação do resultado é técnica: compara o que '
      'foi entregue com os requisitos definidos no início e mede o comportamento do sistema '
      'por testes funcionais, de segurança, de carga e de resiliência.')
    p('Durante o trabalho, o grupo conversou com proprietários de empresas com frota e usou '
      'bases de dados dessas empresas em parte dos testes. Como as informações são '
      'confidenciais, as empresas não são identificadas e os dados delas não aparecem neste '
      'documento. Todos os números '
      'e telas apresentados vêm de dados fictícios, conforme a seção 4.5.')
    p('O desenvolvimento seguiu o modelo iterativo e incremental, em que o software cresce '
      'por versões sucessivas e cada ciclo aproveita o que se aprendeu no anterior (Larman; '
      'Basili, 2003). Da abordagem ágil, o grupo adotou a divisão em *sprints* e a '
      'prioridade de "responder a mudanças mais que seguir um plano" (Beck *et al.*, 2001). '
      'Essa prioridade se mostrou necessária, porque várias das decisões iniciais precisaram '
      'ser revistas, conforme a seção 4.3.')

    h2('4.2 Etapas do desenvolvimento')
    p('O trabalho começou em fevereiro, com a descrição do problema e a definição do escopo, '
      'registradas em um termo de abertura. Em março, o levantamento fixou dez requisitos '
      'funcionais e sete não funcionais, que serviram de referência até o final. Ainda em '
      'março foram elaborados os casos de uso, o modelo entidade-relacionamento e os fluxos '
      'de autenticação e de autorização.')
    p('A construção teve início em abril. Uma etapa preparatória montou o repositório, o '
      'padrão de código e o primeiro esquema do banco, e as *sprints* seguintes entregaram, '
      'nessa ordem, a autenticação e a base da interface, os cadastros de veículos e '
      'motoristas, as despesas e manutenções e, por fim, os documentos. As principais '
      '*sprints* partiram de um documento de projeto, com as decisões e seus motivos, e de '
      'um plano de implementação dividido em tarefas. Os testes unitários acompanharam o '
      'código desde o começo: ao fim da quarta *sprint*, o servidor tinha 58. A quinta, '
      'concluída em maio, substituiu os dados fictícios do painel por indicadores calculados '
      'e acrescentou a administração de usuários. No mesmo mês vieram o anexo de arquivos '
      'aos documentos e, em junho, a verificação do produto mínimo viável.')
    p('O segundo semestre foi dedicado a levar o sistema à produção e a torná-lo confiável. '
      'Em agosto, a autenticação passou para o Supabase Auth e a aplicação foi publicada. Em '
      'setembro, os dados foram separados por empresa, criou-se a administração da '
      'plataforma e os anexos passaram a ser servidos pela aplicação. Em outubro, uma etapa '
      'exclusiva de testes verificou o sistema por inteiro e expôs problemas que levaram à '
      'paginação das listagens, ao tratamento das falhas do banco, ao registro de '
      'requisições e à integração contínua. Em novembro, o grupo revisou as regras de '
      'negócio e mediu o desempenho em um cenário de uso misto. O Quadro {qua:cronograma}, '
      'no Apêndice A, apresenta o cronograma.')

    h2('4.3 Decisões revistas')
    p('Três decisões de arquitetura mudaram durante o projeto, cada uma por um motivo '
      'encontrado na prática. A autenticação foi planejada com um provedor externo, depois '
      'implementada pela própria aplicação e, por fim, entregue ao Supabase Auth. A última '
      'mudança reuniu autenticação, banco e arquivos em um único serviço e retirou da '
      'aplicação a guarda de senhas. O acesso a dados deixou de usar um ORM e passou ao SQL '
      'parametrizado, para que a condição de empresa ficasse explícita em cada consulta. A '
      'publicação mudou de plataforma quando a prevista deixou de oferecer camada gratuita '
      'permanente, como detalha a seção 5.10. Em setembro, o controle de acesso aos anexos '
      'também saiu das políticas do armazenamento e passou para a aplicação, conforme a seção '
      '5.7.')
    p('Em novembro, a revisão das regras de negócio comparou, item a item, o que este '
      'documento afirmava e o que o código fazia. Os dois haviam se distanciado, e em cada '
      'ponto prevaleceu a versão mais completa. Três funcionalidades que só constavam do '
      'documento foram implementadas: o atraso da manutenção passou a ser apurado pela data '
      'prevista; a central de alertas, antes restrita a documentos, passou a reunir '
      'manutenções e habilitações; e a rotina diária passou a registrar quando sinalizou '
      'cada documento. A mesma revisão avaliou o benefício de cada regra para quem usa o '
      'sistema, e dela resultaram três regras novas, identificadas na seção 6.1.')

    h2('4.4 Versionamento e ferramentas')
    p('O código foi versionado com Git e hospedado no GitHub. O esquema do banco acompanha o '
      'código em sete *migrations* que só acrescentam alterações: o executor guarda uma soma '
      'de verificação de cada arquivo aplicado e interrompe a execução se algum deles for '
      'modificado depois, pois o banco e o histórico teriam divergido. Toda mudança de '
      'esquema entra como um arquivo novo.')
    p('As duas aplicações, servidor e interface, e um pacote de tipos compartilhados ficam '
      'no mesmo repositório, um *monorepo* gerenciado por npm workspaces. A escolha '
      'considerou o porte do projeto, já que o recurso faz parte do gerenciador de pacotes e '
      'dispensa outra ferramenta de orquestração. ESLint e Prettier padronizam o código. O '
      'Quadro {qua:tecnologias} relaciona as tecnologias adotadas em cada camada.')
    quadro('tecnologias', 'Tecnologias adotadas por camada',
           ['Camada', 'Tecnologia'],
           [['Linguagem', 'TypeScript, no servidor e na interface'],
            ['Interface', 'React 18, Vite, React Router 7, Tailwind CSS 4, Recharts, i18next'],
            ['Servidor', 'Node.js com Express 4, em arquitetura de camadas'],
            ['Acesso a dados', 'postgres.js, com SQL parametrizado e sem ORM'],
            ['Banco de dados', 'PostgreSQL gerenciado pelo Supabase'],
            ['Autenticação', 'Supabase Auth, com verificação de *token* por JWKS'],
            ['Armazenamento de arquivos', 'Supabase Storage'],
            ['Validação', 'Zod 4'],
            ['Agendamento', 'node-cron em ambiente local; agendador da plataforma em produção'],
            ['Testes', 'Vitest e Supertest; gerador de carga próprio, versionado no '
                       'repositório'],
            ['Integração e entrega contínuas', 'GitHub Actions, com publicação na Vercel pela '
                                               'interface de linha de comando'],
            ['Organização do repositório', '*Monorepo* com npm workspaces'],
            ['Publicação', 'Vercel, em projeto único']],
           larguras=[5.0, 11.0])

    h2('4.5 Estratégia de verificação')
    p('A verificação foi organizada em camadas, da mais barata e rápida à mais próxima do '
      'uso real. Cada camada responde a uma pergunta sobre o sistema, conforme o Quadro '
      '{qua:camadas_verificacao}, e os resultados estão no capítulo 6.')
    quadro('camadas_verificacao', 'Camadas de verificação do sistema',
           ['Camada', 'Pergunta que responde', 'Como'],
           [['Análise estática', 'O código está correto antes de rodar?',
             'Compilação TypeScript, ESLint, construção e auditoria de dependências'],
            ['Unitária', 'Cada regra de negócio faz o que deveria?',
             'Vitest, com os repositórios substituídos por dublês'],
            ['Integração', 'As consultas fazem no banco o que se espera?',
             'Vitest contra o PostgreSQL, em transações revertidas'],
            ['Ponta a ponta', 'As peças funcionam montadas, pelo protocolo HTTP?',
             'Vitest e Supertest, com *tokens* reais do Supabase Auth'],
            ['Integração contínua', 'Tudo isso roda sozinho a cada mudança?',
             'GitHub Actions, com banco criado do zero'],
            ['Carga e volume', 'O sistema aguenta muitos acessos e muitos dados?',
             'Gerador de carga, com até 200 conexões e 50 mil despesas'],
            ['Resiliência', 'Como o sistema reage se o banco cair?',
             'Banco pausado com a interface de programação no ar'],
            ['Produção', 'O sistema publicado responde como o testado?',
             'Rotas, permissões, telas e carga moderada na Vercel']],
           larguras=[3.4, 6.0, 6.6])
    p('Os testes que gravam dados, de ponta a ponta e de carga, só executam contra o '
      'ambiente local, um Supabase completo em contêineres e isolado da produção; a suíte '
      'recusa iniciar se o endereço configurado não for local. Na produção, a verificação se '
      'limitou a leituras e a uma carga moderada, para não alterar dados nem consumir a cota '
      'do plano gratuito.')
    p('A demonstração e os testes de interface precisavam de um volume próximo ao de uma '
      'operação real. Para isso, um *script* acrescenta às duas empresas fictícias um ano de '
      'operação, com datas relativas ao dia da execução. Cada empresa recebe dezoito '
      'veículos, catorze motoristas, solicitações de acesso pendentes e cerca de 1.250 '
      'despesas, cem manutenções e sessenta documentos, com uma parte vencida ou atrasada. O '
      '*script* usa semente fixa, de modo que repetir a execução gera os mesmos dados, e '
      'pode ser desfeito por completo.')


# ===========================================================================
# 5 DESENVOLVIMENTO
# ===========================================================================
def cap5():
    h1('5 DESENVOLVIMENTO')
    p('Este capítulo descreve a construção do sistema. A Figura {fig:visao_geral} apresenta a visão geral da '
      'solução e situa os componentes descritos nas seções seguintes.')
    figura('visao_geral', 'fig01-visao-geral.png', 'Visão geral da solução')
    p('O Supabase cumpre três papéis independentes: autentica os usuários, hospeda o banco '
      'relacional e armazena os arquivos anexados aos documentos. O login acontece entre a '
      'interface e o Supabase Auth. O conteúdo dos arquivos segue do navegador para o '
      'armazenamento, mas só com um endereço assinado que a aplicação emite depois de '
      'verificar a permissão. As seções 5.5 e 5.7 detalham os dois fluxos.')

    h2('5.1 Casos de uso')
    p('A Figura {fig:casos_de_uso} apresenta os casos de uso significativos para a arquitetura, organizados por '
      'papel. Os papéis são cumulativos: o gestor exerce os casos do operador, e o administrador '
      'exerce os do gestor, acrescidos da administração de usuários.')
    figura('casos_de_uso', 'fig02-casos-de-uso.png',
           'Casos de uso significativos para a arquitetura')

    h2('5.2 Arquitetura em camadas')
    p('O servidor adota arquitetura em camadas com dependência unidirecional: cada camada '
      'conhece apenas a imediatamente inferior. A Figura {fig:camadas} apresenta essa organização.')
    figura('camadas', 'fig03-camadas.png', 'Camadas da aplicação e sentido das dependências')
    p('A responsabilidade de cada camada é delimitada de forma estrita. As rotas declaram os '
      'caminhos, definem o esquema de validação e encadeiam os *middlewares*, sem conter lógica. '
      'Os controladores traduzem a requisição HTTP em chamada de serviço e o retorno em resposta '
      'HTTP, sem conter regra de negócio. Os serviços concentram as regras de negócio e não '
      'conhecem o Express: não recebem os objetos de requisição e resposta. Os repositórios '
      'encapsulam todo o acesso ao banco e constituem a única camada em que há SQL.')
    p('O isolamento da camada de serviços em relação ao protocolo HTTP é o que viabiliza os '
      'testes automatizados descritos na seção 6.2: os serviços são exercitados com repositórios '
      'substituídos por dublês, sem necessidade de servidor ou banco em execução.')

    h2('5.3 Organização do repositório')
    p('O código é organizado em *monorepo*, conforme a Figura {fig:pacotes}. A escolha justifica-se pelo '
      'compartilhamento de tipos entre a interface e o servidor: uma alteração em uma '
      'enumeração provoca erro de compilação em ambos os lados, o que impede a divergência '
      'silenciosa do contrato de dados.')
    figura('pacotes', 'fig04-pacotes.png', 'Organização em pacotes do *monorepo*')
    p('O pacote compartilhado publica suas definições em dois formatos. A exigência decorre dos '
      'consumidores: o ambiente de execução do servidor requer módulos CommonJS, ao passo que o '
      'empacotador da interface exige módulos ECMAScript para resolver importações nomeadas. A '
      'compilação ocorre automaticamente após a instalação das dependências.')

    h2('5.4 Modelo de dados')
    p('O modelo é composto por nove entidades, organizadas em torno de duas fronteiras: a '
      'entidade Empresa, que delimita o alcance de todo dado operacional, e a entidade Veículo, '
      'que concentra as três dimensões da gestão de frota. A Figura {fig:modelo_er} apresenta o modelo '
      'entidade-relacionamento, e o Quadro {qua:entidades} descreve a finalidade de cada '
      'entidade.')
    figura('modelo_er', 'fig05-modelo-er.png', 'Modelo entidade-relacionamento',
           largura=14)
    quadro('entidades', 'Entidades do modelo de dados',
           ['Entidade', 'Finalidade e observações'],
           [['Company', 'Organização cliente. Fronteira de isolamento: seu identificador '
                        'participa da condição de toda consulta operacional. Possui código de '
                        'adesão próprio, apresentado no cadastro.'],
            ['User', 'Perfil de acesso: dados cadastrais, papel efetivo, papel solicitado e '
                     'situação de aprovação. As credenciais residem no serviço de '
                     'autenticação.'],
            ['Vehicle', 'Veículo da frota. Entidade central da operação; a placa é única '
                        'dentro da empresa.'],
            ['Driver', 'Ficha de motorista, com número e validade da habilitação. Quando '
                       'vinculada a um usuário, nome e CPF ficam nulos: a identidade pertence '
                       'ao perfil, e não é duplicada.'],
            ['VehicleDriverAssignment', 'Vínculo entre veículo e motorista, com data de início '
                                        'e de término. Encerrar não apaga: o período '
                                        'permanece consultável.'],
            ['Expense', 'Despesa operacional, obrigatoriamente vinculada a um veículo. '
                        'O valor usa tipo decimal, evitando erro de arredondamento. Pode ser '
                        'cancelada com motivo, sem deixar de existir.'],
            ['Maintenance', 'Manutenção preventiva ou corretiva, com data prevista e de '
                            'conclusão. A situação "atrasada" não é gravada: decorre da '
                            'data prevista.'],
            ['Document', 'Documento obrigatório com data de vencimento e anexo digital '
                         'opcional. Vincula-se a um veículo ou a um motorista. Registra se e '
                         'quando a rotina diária o sinalizou.'],
            ['ChangeLog', 'Histórico de alterações: entidade afetada, ação, campos alterados, '
                          'autor e motivo. Grava o nome do autor por cópia.']],
           larguras=[4.4, 11.6])
    p('Cinco aspectos do modelo orientaram a implementação.')
    p('Primeiro, o identificador da empresa está presente em cada entidade operacional, e não '
      'é derivado percorrendo relacionamentos. Obter a empresa por caminho indireto tornaria o '
      'isolamento dependente da correção de cada junção, ao passo que a coluna própria permite '
      'que toda consulta a declare diretamente na condição.')
    p('Segundo, a obrigatoriedade do vínculo entre despesa e veículo, garantida por restrição no '
      'banco, é o que torna confiável a apuração do custo por ativo.')
    p('Terceiro, nenhuma situação de prazo é armazenada. A de vencimento do documento e a da '
      'habilitação são calculadas a cada consulta a partir da data de validade; a manutenção '
      'programada cuja data prevista ficou para trás é devolvida como atrasada. Como ninguém '
      'precisa lembrar de atualizar uma situação, o dado não fica defasado. As datas de '
      'vencimento empregam tipo de data civil, sem hora nem fuso horário, de modo que o dia '
      'exibido não dependa da localização de quem consulta.')
    p('Quarto, a relação entre veículo e motorista é de muitos para muitos com período, '
      'representada por entidade própria. Substituição e compartilhamento são operação '
      'corriqueira em uma frota, e registrar apenas o vínculo vigente impediria responder quem '
      'conduzia determinado veículo em uma data passada.')
    p('Quinto, a autoria dos lançamentos não possui relacionamento declarado com a entidade de '
      'usuário: é um identificador simples. Assim, remover um usuário não altera nem apaga os '
      'lançamentos que ele registrou. O nome legível do autor é obtido do histórico de '
      'alterações, que o grava por cópia no momento da ação.')
    p('A ficha de motorista e o perfil de usuário podem ser vinculados: aprovar alguém como '
      'operador cria a ficha correspondente, de forma idempotente. As colunas de nome e '
      'documento na ficha permanecem no modelo para as fichas anteriores à integração, que não '
      'possuem usuário associado.')

    h2('5.5 Autenticação e controle de acesso')
    p('A Figura {fig:autenticacao} apresenta o fluxo de autenticação e o acesso subsequente a um recurso '
      'protegido.')
    figura('autenticacao', 'fig06-sequencia-autenticacao.png',
           'Autenticação e acesso a recurso protegido')
    p('O cadastro ocorre em duas etapas. A interface cria a conta no serviço de autenticação e '
      'obtém a sessão; de posse do *token*, envia os dados cadastrais à aplicação, que cria o '
      'perfil com situação pendente. Quando já existe perfil com o mesmo endereço de correio '
      'eletrônico e sem conta vinculada, a aplicação associa o perfil existente em vez de criar '
      'outro, preservando papel e situação. Caso a conta esteja autenticada mas ainda não '
      'possua perfil, a aplicação responde com código específico e a interface conduz o usuário '
      'à conclusão do cadastro.')
    p('A Figura {fig:ciclo_usuario} apresenta o ciclo de vida da conta. Contas recém-criadas '
      'permanecem pendentes até que um administrador as aprove ou recuse, e o bloqueio produz '
      'efeito imediato, pois o perfil é reconsultado a cada requisição.')
    figura('ciclo_usuario', 'fig09-ciclo-usuario.png', 'Ciclo de vida da conta de usuário',
           largura=14)
    p('O controle de acesso opera dentro de uma organização. Cada perfil pertence a uma '
      'empresa, e o identificador dessa empresa participa da condição de toda consulta e de '
      'toda escrita. Esse identificador é obtido do perfil reconsultado no banco a cada '
      'requisição, e nunca de dado enviado pelo cliente. Nem o *token*, que poderia '
      'carregá-lo, serve de fonte. O ingresso em uma organização ocorre por código de adesão '
      'informado no cadastro.')
    p('Acima das organizações existe um perfil de administração da plataforma, que não '
      'pertence a nenhuma delas e escolhe, a cada sessão, em qual vai operar. Duas decisões '
      'sustentam essa condição. A primeira é guardá-la em coluna própria da entidade de '
      'usuário, fora da enumeração de papéis. O papel é dado de entrada no cadastro, que '
      'registra o solicitado, e na aprovação, que registra o efetivo; um valor a mais na '
      'enumeração permitiria pedir ou conceder a condição por esses caminhos. A segunda é que '
      'a empresa escolhida trafega em cabeçalho próprio, e é aceita somente após o servidor '
      'confirmar, no banco, que o perfil autenticado possui aquela condição; para qualquer '
      'outro perfil o cabeçalho é ignorado.')
    p('O recorte do operador é mais estreito que o da organização. Ele alcança os lançamentos '
      'de sua própria autoria, os veículos a que está vinculado no momento e os próprios '
      'documentos pessoais. Compartilhar um veículo com outro motorista não concede acesso aos '
      'lançamentos nem aos documentos pessoais dele. A verificação é do servidor: restringir '
      'apenas o que a interface oferece deixaria a regra a cargo da tela, e uma requisição '
      'construída manualmente a contornaria.')
    p('O Quadro {qua:acesso} apresenta a matriz de controle de acesso efetivamente aplicada, extraída da '
      'configuração das rotas e dos serviços. Onde o operador tem acesso parcial, a célula '
      'indica o recorte.')
    p('Duas proteções completam a matriz. Ninguém altera a situação da própria conta nem a '
      'exclui. E a empresa nunca fica sem administrador ativo: rebaixar, bloquear ou excluir o '
      'último deles é recusado, pois só o administrador aprova contas e altera papéis, e sem '
      'ele a empresa ficaria impedida de administrar o próprio acesso. A verificação trava as '
      'linhas dos administradores ativos durante a alteração, para que dois administradores '
      'que se rebaixem ao mesmo tempo não deixem a empresa sem nenhum. A regra substituiu uma '
      'proteção anterior, que valia apenas para uma conta de demonstração identificada pelo '
      'endereço de correio eletrônico.')
    p('O perfil de administração da plataforma não aparece na matriz porque não é um papel: ao '
      'escolher uma empresa, ele opera dentro dela como administrador, e fora dela apenas '
      'cadastra empresas e altera a situação delas.')
    quadro('acesso', 'Matriz de controle de acesso por papel',
           ['Recurso ou operação', 'Administrador', 'Gestor', 'Operador'],
           [['Aprovar, recusar e bloquear contas; alterar papéis', 'Sim', 'Não', 'Não'],
            ['Listar os usuários da empresa', 'Sim', 'Sim', 'Não'],
            ['Editar o próprio perfil', 'Sim', 'Sim', 'Sim'],
            ['Consultar veículos e motoristas', 'Empresa', 'Empresa', 'Só os vinculados a si'],
            ['Cadastrar e editar veículos, motoristas e documentos', 'Sim', 'Sim', 'Não'],
            ['Abrir e encerrar vínculos entre motorista e veículo', 'Sim', 'Sim', 'Não'],
            ['Registrar despesas e manutenções', 'Empresa', 'Empresa',
             'Só em veículo vinculado'],
            ['Consultar lançamentos, painel e central de alertas', 'Empresa', 'Empresa',
             'Só os próprios'],
            ['Corrigir e cancelar lançamento, com motivo', 'Qualquer', 'Qualquer',
             'Só os próprios'],
            ['Excluir lançamento em definitivo', 'Sim', 'Sim', 'Não'],
            ['Desativar veículo ou motorista', 'Sim', 'Sim', 'Não'],
            ['Excluir veículo ou motorista em definitivo', 'Sim', 'Não', 'Não']],
           larguras=[7.0, 2.9, 2.6, 3.5])

    h2('5.6 Módulos funcionais e interface')
    p('Os módulos do sistema são descritos a seguir. O de veículos oferece cadastro, edição, consulta com '
      'filtros, desativação, reativação e exclusão permanente. O de motoristas segue estrutura '
      'equivalente e acrescenta a validade da habilitação. O vínculo entre ambos é de muitos '
      'para muitos, com tela dedicada; um motorista com habilitação vencida não pode ser '
      'vinculado a um veículo novo.')
    p('O módulo de despesas registra lançamentos obrigatoriamente vinculados a um veículo, '
      'distribuídos em seis categorias (combustível, manutenção, multa, IPVA, seguro e '
      'outras), com filtros por veículo, categoria e período, e não aceita data posterior ao '
      'dia corrente. O de manutenções distingue as preventivas das corretivas e acompanha '
      'quatro situações: programada, realizada, atrasada e cancelada. O de documentos registra '
      'a data de vencimento, classifica automaticamente a situação e permite anexar o arquivo '
      'digital. Uma despesa ou manutenção lançada por engano é cancelada com motivo, sem ser '
      'apagada: permanece na lista, marcada, sai dos totais e pode ser reativada. Nos três '
      'módulos, cada alteração fica no histórico com autor, data, campos alterados e motivo, e '
      'o de despesas e manutenções pode ser consultado pela opção Histórico de cada linha. As '
      'listagens de despesas e manutenções são paginadas, cinquenta registros por vez, com o '
      'total informado no cabeçalho X-Total-Count da resposta.')
    p('O painel de indicadores, apresentado na Figura {fig:tela_painel}, apura custo total, '
      'custo médio, quantidade de lançamentos, evolução mensal, distribuição por categoria, os '
      'veículos de maior custo e os lançamentos mais recentes, com filtros por período, '
      'veículo e categoria. Cada indicador financeiro vem acompanhado da variação em relação '
      'ao período imediatamente anterior, de mesma duração, o que mostra se o custo subiu ou '
      'caiu sem exigir outra consulta. Todas as somas são feitas no banco, que devolve apenas '
      'os totais.')
    # Capturas da interface, feitas no ambiente local com os dados fictícios do
    # seed. Ficam em docs/academico/telas/, versionadas: não são geradas por
    # script, ao contrário dos diagramas.
    figura('tela_painel', os.path.join('..', 'telas', 'tela-painel.png'),
           'Painel de indicadores com um ano de operação fictícia')
    p('A central de alertas, apresentada na Figura {fig:tela_alertas}, responde à pergunta '
      '"o que precisa ser resolvido agora" em três frentes: documentos vencidos ou que vencem '
      'em até trinta dias; manutenções atrasadas ou previstas para os próximos sete dias; e '
      'habilitações vencidas ou que vencem em até trinta dias. A janela de manutenção é menor '
      'porque a data é escolhida pela própria empresa, com antecedência curta; a de documentos '
      'e habilitações é maior porque a renovação depende de terceiros. Quando a mesma '
      'habilitação existe como documento anexado e como validade na ficha do motorista, ela '
      'aparece uma única vez. O menu lateral exibe o total de alertas e o de documentos.')
    p('O sino do cabeçalho abre, por cima da tela em que se está, um painel de notificações '
      'com a contagem de cada frente e os três alertas mais urgentes, primeiro o que já venceu '
      'ou atrasou e depois o prazo mais próximo. Cada item leva à tela correspondente, e o '
      'rodapé leva à central completa. O painel mostra o mais urgente sem tirar o usuário da '
      'tela em que está, e a central mostra tudo.')
    figura('tela_alertas', os.path.join('..', 'telas', 'tela-central-alertas.png'),
           'Central de alertas, com o painel de notificações do cabeçalho aberto')
    p('A administração de usuários permite aprovar e recusar solicitações, alterar papel e '
      'situação e excluir contas; o perfil de administração da plataforma dispõe ainda de tela '
      'para cadastrar empresas. A interface segue o *design system* Ledger, de fundo escuro e '
      'um único destaque de cor, e está disponível em português brasileiro e em inglês. As '
      'listas de seleção dos filtros e formulários são componentes do próprio sistema, porque '
      'a lista nativa do navegador é desenhada pelo sistema operacional e destoava da '
      'interface. O componente mantém o uso por teclado (setas, Enter, Esc e a busca pela '
      'primeira letra) e a validação de campo obrigatório. Trocar de tela pelo menu é '
      'imediato; a animação de entrada fica restrita à primeira tela depois do login.')

    h2('5.7 Armazenamento de arquivos')
    p('O anexo de arquivos aos documentos utiliza o serviço de armazenamento do Supabase. O '
      'repositório é privado e não possui política de acesso alguma, de modo que as '
      'credenciais do navegador não o alcançam: só o servidor, com a chave de serviço, '
      'autoriza a leitura ou o envio de um arquivo. A Figura {fig:upload} apresenta o fluxo.')
    figura('upload', 'fig07-sequencia-upload.png', 'Anexo de arquivo ao documento')
    p('Tanto a leitura quanto o envio dependem da aplicação, que verifica a permissão e emite '
      'endereços assinados de validade curta. Para ler, o cliente informa apenas o '
      'identificador do documento; a aplicação recupera o documento pelo mesmo procedimento '
      'usado na consulta comum e, se ele não estiver ao alcance de quem pede, responde como se '
      'não existisse, sem assinar endereço algum. Para enviar, a aplicação decide o caminho de '
      'destino e devolve um endereço de gravação; o caminho começa pelo identificador da '
      'empresa, obtido do perfil autenticado.')
    p('A decisão é consequência de uma verificação. A alternativa, adotada em versão anterior, '
      'era o envio direto do navegador ao serviço de armazenamento, com o controle de acesso '
      'expresso nas políticas do repositório. Esse desenho reduz a carga sobre o servidor, mas '
      'obriga a reescrever a regra de autorização na linguagem do armazenamento. A regra da '
      'aplicação é mais estreita do que a pertinência à mesma organização: um operador alcança '
      'os próprios documentos pessoais e os dos veículos a que está vinculado no momento, sem '
      'alcançar o documento pessoal de um colega. Uma política capaz de distinguir isso '
      'duplicaria, em outra linguagem, lógica que a camada de serviços já aplica, com o risco '
      'de as duas versões divergirem. Concentrar a decisão em um único ponto elimina a '
      'duplicação, ao custo de uma requisição adicional para obter o endereço assinado.')
    p('Três consequências acompanham o desenho. A validação do tipo de arquivo passa a ser '
      'responsabilidade da aplicação, que aceita apenas imagens nos formatos correntes e '
      'documentos em PDF. A substituição de um anexo e a exclusão de um documento removem o '
      'arquivo correspondente do repositório, operação realizada após a confirmação da '
      'transação e cuja eventual falha é registrada sem interromper a resposta. E o endereço de '
      'leitura expira, de modo que sua divulgação acidental não concede acesso permanente.')

    h2('5.8 Rotina automatizada de vencimentos')
    p('Uma rotina diária identifica os documentos que entram na janela de trinta dias e '
      'registra a data em que os sinalizou, de forma idempotente: documentos já sinalizados '
      'não são reprocessados, e execuções repetidas no mesmo dia não produzem efeito '
      'colateral. A central de alertas exibe essa data em cada documento, o que mostra quando '
      'o sistema detectou o prazo. Renovar o documento, gravando uma nova data de vencimento, '
      'limpa a sinalização, para que a rotina volte a avisar quando o novo prazo se aproximar.')
    p('A rotina não envia notificação para fora do sistema. O acompanhamento de prazos é '
      'realizado dentro da aplicação, pela central de alertas e pelos indicadores de '
      'vencimento. A notificação por canais externos foi avaliada e excluída do escopo, '
      'conforme a seção 5.13. A situação exibida na central não depende da rotina: ela é '
      'calculada a cada consulta, e a rotina apenas registra quando o documento entrou na '
      'janela.')

    h2('5.9 Proteção do banco de dados')
    p('A autorização é aplicada na camada de aplicação, e o banco é acessado exclusivamente '
      'pelo servidor. A plataforma de hospedagem, porém, expõe automaticamente o esquema '
      'público por uma interface REST gerada, acessível com a chave pública do projeto, que é '
      'distribuída junto com a interface. Sem proteção, as tabelas seriam legíveis e graváveis '
      'por quem a obtivesse, contornando integralmente a aplicação e o controle de acesso por '
      'papel.')
    p('Por isso, adotaram-se duas camadas de proteção. A primeira habilita a segurança em '
      'nível de linha em todas as tabelas, sem criar política alguma, o que nega acesso aos '
      'papéis públicos; o papel proprietário das tabelas não é submetido a essa restrição, de '
      'modo que a aplicação opera normalmente. A segunda revoga os privilégios desses papéis '
      'sobre o esquema, inclusive para tabelas criadas futuramente. Sem política declarada, o '
      'PostgreSQL nega por padrão a leitura e a alteração das linhas (PostgreSQL Global '
      'Development Group, [2026]). As políticas só seriam necessárias se o cliente consultasse '
      'o banco diretamente, o que esta arquitetura não faz.')

    h2('5.10 Publicação em produção')
    p('O sistema é publicado como projeto único, com a interface estática e a camada de serviço '
      'atendidas pelo mesmo domínio, conforme a Figura {fig:implantacao}.')
    figura('implantacao', 'fig08-implantacao.png', 'Diagrama de implantação')
    p('Com o domínio compartilhado, a interface e a camada de serviço não trocam requisições '
      'entre origens distintas, o que dispensa a configuração de CORS em produção. A '
      'plataforma inicialmente prevista para o servidor foi substituída após verificar-se que '
      'não oferece mais camada gratuita permanente, condição necessária à continuidade do '
      'projeto até a apresentação.')
    p('A adaptação ao modelo de execução sem servidor dedicado impôs dois ajustes ao código. O '
      'primeiro decorre da ausência de processo persistente entre requisições: o agendamento '
      'interno da rotina de vencimentos é desativado em produção, e a execução passa a ser '
      'disparada pelo agendador da plataforma, por meio de rota protegida por segredo. O segundo '
      'refere-se ao pacote compartilhado, cuja publicação em código-fonte TypeScript não é '
      'carregável pelo ambiente de execução, o que motivou a compilação descrita na seção 5.3.')

    h2('5.11 Integração e entrega contínuas')
    p('A Figura {fig:ci_cd} apresenta o fluxo que se segue a cada alteração enviada ao '
      'repositório.')
    figura('ci_cd', 'fig10-ci-cd.png', 'Integração e entrega contínuas')
    p('A integração contínua roda no GitHub Actions a cada *pull request* e a cada envio à '
      'ramificação principal, em nove etapas executadas em ordem: instalação das dependências, '
      'verificação de tipos da interface de programação e da interface, análise estática, '
      'construção da interface, criação de um Supabase local dentro da própria máquina de '
      'execução, aplicação das *migrations* e da carga de dados fictícios, suíte padrão, suíte '
      'de ponta a ponta e auditoria de dependências. O banco é criado do zero e descartado ao '
      'fim, e nenhuma credencial de produção é usada. A execução completa leva cerca de dois '
      'minutos.')
    p('A entrega contínua é o segundo trabalho do mesmo fluxo, chamado publicar. Ele existe '
      'apenas nos envios à ramificação principal e só começa depois que a validação termina '
      'com sucesso: se qualquer etapa falhar, a produção não muda. A publicação automática da '
      'Vercel na ramificação principal foi desligada na configuração do projeto, de modo que '
      'esse trabalho é o único caminho até a produção. Ele aplica as *migrations* pendentes ao '
      'banco de produção, quando a credencial correspondente está cadastrada, e só então '
      'constrói e publica a versão, de modo que o código nunca chegue antes da estrutura de '
      'que depende. As demais ramificações continuam recebendo da Vercel uma prévia com '
      'endereço próprio, sem tocar na produção, e qualquer versão anterior pode voltar ao ar '
      'sem nova construção.')
    p('A versão anterior do fluxo publicava a cada envio, em paralelo com os testes, e um '
      'teste reprovado não impedia a publicação. A correção foi identificada na revisão '
      'descrita na seção 4.3.')

    h2('5.12 Observabilidade e tratamento de falhas')
    p('Observabilidade é a capacidade de saber, de fora, se o sistema está no ar, onde falha e '
      'em quanto tempo responde. O endereço /health consulta o banco com prazo de três '
      'segundos e responde 200 quando ele atende e 503 quando não, o que permite a um monitor '
      'externo detectar a queda. Cada requisição atendida gera uma linha de registro com '
      'método, caminho, situação e duração. Uma requisição que ultrapassa dez segundos recebe '
      '503 e fica registrada, em vez de prender a conexão. Na produção, a plataforma agrupa os '
      'erros por tipo e mantém um *firewall* à frente da aplicação. A falha de uma consulta ao '
      'banco é tratada na própria promessa, de modo que uma resposta tardia não derrube o '
      'processo.')

    h2('5.13 Delimitação do escopo')
    p('Não integram o escopo deste trabalho o rastreamento por satélite em tempo real, a '
      'telemetria avançada, o planejamento e a otimização de rotas, a integração automática com '
      'sistemas governamentais e o desenvolvimento de aplicativo móvel nativo. A solução é '
      'entregue como aplicação web responsiva, acessível por navegador em dispositivos móveis.')
    p('Excluiu-se igualmente a notificação de vencimentos por correio eletrônico, mensagem de '
      'texto ou canal equivalente. Tal recurso exigiria a contratação e a configuração de '
      'serviço externo de envio, com custo e dependência operacional não justificáveis no '
      'contexto do trabalho. O acompanhamento de prazos é feito dentro da aplicação, pela '
      'central de alertas. Como consequência dessa exclusão, não se implementou a recuperação '
      'autônoma de senha, que depende do mesmo canal; a alteração de senha permanece '
      'disponível ao usuário autenticado.')


# ===========================================================================
# 6 RESULTADOS E DISCUSSÕES
# ===========================================================================
def cap6():
    h1('6 RESULTADOS E DISCUSSÕES')
    p('Este capítulo apresenta o que foi entregue, a verificação realizada sobre o sistema e '
      'as limitações identificadas. Os resultados de teste vêm de duas rodadas: a de 20 de '
      'outubro de 2026, documentada no Relatório de Testes do projeto, e a de 9 de novembro de '
      '2026, executada após a revisão das regras de negócio. Cada tabela indica a rodada de '
      'origem. Os testes com bases de empresas, citados na seção 4.1, não integram esses '
      'resultados, por serem confidenciais.')

    h2('6.1 Requisitos e regras de negócio')
    p('Os dez requisitos funcionais definidos no levantamento de março foram atendidos. O '
      'Quadro {qua:rf} relaciona cada requisito à sua situação.')
    quadro('rf', 'Requisitos funcionais e situação de atendimento',
           ['Código', 'Requisito', 'Situação'],
           [['RF01', 'Cadastro, edição e exclusão de veículos', 'Atendido'],
            ['RF02', 'Cadastro e gerenciamento de motoristas', 'Atendido'],
            ['RF03', 'Despesas vinculadas obrigatoriamente a um veículo', 'Atendido'],
            ['RF04', 'Registro de diferentes categorias de despesa', 'Atendido'],
            ['RF05', 'Controle de manutenções preventivas e corretivas', 'Atendido'],
            ['RF06', 'Registro de documentos com data de vencimento', 'Atendido'],
            ['RF07', 'Emissão de alertas de vencimento', 'Atendido dentro da aplicação'],
            ['RF08', 'Indicadores financeiros por veículo e por período', 'Atendido'],
            ['RF09', 'Autenticação de usuários', 'Atendido'],
            ['RF10', 'Controle de acesso por papel', 'Atendido']],
           larguras=[1.8, 9.4, 4.8])
    p('No RF07, o canal de emissão é a própria aplicação. O sistema classifica automaticamente '
      'documentos, manutenções e habilitações por situação de prazo, consolida-os na central '
      'de alertas, exibe contadores no menu e executa diariamente a rotina de sinalização. A '
      'notificação por canais externos foi excluída do escopo, conforme a seção 5.13, de modo '
      'que o requisito é atendido pela exibição dos alertas a quem usa o sistema.')
    p('Além dos requisitos previstos no levantamento inicial, o desenvolvimento incorporou '
      'funcionalidades identificadas durante o trabalho: segregação de dados por organização, '
      'com ingresso por código de adesão e perfil de administração da plataforma acima das '
      'organizações; vínculo de muitos para muitos entre veículos e motoristas, com registro '
      'do período de vigência; anexo de arquivo digital aos documentos, servido pela aplicação '
      'com endereço assinado de validade curta; cancelamento de lançamentos com motivo, sem '
      'apagá-los; histórico de alterações com autor, campos modificados e motivo; fluxo de '
      'aprovação de contas por administrador; bloqueio e reativação de contas; edição do '
      'perfil próprio; distinção entre desativação e exclusão permanente; listagens paginadas; '
      'e interface em português brasileiro e inglês.')
    p('O Quadro {qua:rnf} apresenta a situação de atendimento dos requisitos não funcionais.')
    quadro('rnf', 'Requisitos não funcionais e situação de atendimento',
           ['Código', 'Requisito', 'Situação'],
           [['RNF01', 'Aplicação web responsiva', 'Atendido'],
            ['RNF02', 'Armazenamento seguro em banco relacional', 'Atendido'],
            ['RNF03', 'Controle de autenticação e autorização', 'Atendido'],
            ['RNF04', 'Tempo de resposta adequado nas operações comuns',
             'Atendido, com medição (seção 6.4)'],
            ['RNF05', 'Arquitetura cliente-servidor', 'Atendido'],
            ['RNF06', 'Escalabilidade para novas funcionalidades', 'Atendido'],
            ['RNF07', 'Integridade e consistência das informações', 'Atendido']],
           larguras=[1.8, 9.4, 4.8])
    p('O levantamento inicial fixava, para o RNF04, até três segundos nas operações comuns. Na '
      'verificação adotou-se uma meta mais rigorosa, o limite de um segundo de Nielsen (1993), '
      'aplicado ao percentil 99 das respostas da interface de programação: 99 de cada 100 '
      'respostas devem chegar em menos de um segundo. A seção 6.4 mostra que o limite foi '
      'atendido em todos os cenários medidos.')
    p('O Quadro {qua:rn} relaciona as regras de negócio implementadas. Para cada uma, '
      'indica-se o problema que ela evita para quem usa o sistema. A revisão descrita na seção '
      '4.3 manteve as regras cujo benefício é claro e proporcional ao esforço que exigem do '
      'usuário, substituiu a proteção de uma conta fixa pela RN22 e acrescentou a RN14, a RN15 '
      'e a RN22.')
    quadro('rn', 'Regras de negócio implementadas e motivo de cada uma',
           ['Código', 'Regra', 'Por que existe'],
           [['RN01', 'Toda despesa pertence a um veículo.',
             'Sem isso, o custo por veículo, que é a pergunta central do gestor, não fecha.'],
            ['RN02', 'Toda manutenção pertence a um veículo.',
             'O histórico de manutenção é o prontuário do veículo e apoia a decisão de '
             'revisar, manter ou vender.'],
            ['RN03', 'Um documento pertence a um veículo ou a um motorista, nunca a ambos e '
                     'nunca a nenhum.',
             'CRLV e seguro são do veículo; CNH é da pessoa. Misturar impediria saber quem '
             'deve renovar.'],
            ['RN04', 'Conta nova fica pendente até um administrador aprovar; o papel pedido no '
                     'cadastro não vira permissão sozinho.',
             'Qualquer pessoa pode criar conta no serviço de autenticação; quem entra na '
             'frota é decisão da empresa.'],
            ['RN05', 'Conta bloqueada perde o acesso na requisição seguinte, mesmo com '
                     '*token* válido.',
             'Desligamentos têm efeito imediato, sem esperar o *token* expirar.'],
            ['RN06', 'Placa, CPF e CNH do motorista são únicos dentro da empresa; CPF e '
                     'endereço de correio eletrônico da conta, em todo o sistema.',
             'Evita o mesmo veículo ou a mesma pessoa em duas fichas, com o histórico '
             'dividido entre elas.'],
            ['RN07', 'A exclusão definitiva de veículo ou motorista é do administrador, exige '
                     'desativação prévia, mostra antes o que será apagado e remove em cascata '
                     'os registros dependentes.',
             'Ação sem volta pede duas etapas e quem responde pela empresa.'],
            ['RN08', 'Desativar preserva o registro e o histórico e encerra os vínculos '
                     'vigentes do veículo.',
             'O veículo vendido sai da operação, mas o custo que teve continua nos '
             'indicadores do período.'],
            ['RN09', 'Concluir a manutenção grava a data de conclusão; reabri-la a apaga.',
             'A data de conclusão é o registro de que o serviço foi feito.'],
            ['RN10', 'As situações de prazo (documento e habilitação vencidos ou a vencer, '
                     'manutenção atrasada) são calculadas a cada consulta, nunca gravadas.',
             'Ninguém precisa lembrar de atualizar uma situação; o dado não fica defasado.'],
            ['RN11', 'A manutenção programada cuja data prevista passou é apresentada como '
                     'atrasada; essa situação não pode ser escolhida manualmente.',
             'O atraso aparece sem depender de alguém marcá-lo.'],
            ['RN12', 'A central de alertas reúne documentos vencidos ou que vencem em até 30 '
                     'dias, manutenções atrasadas ou previstas para os próximos 7 dias e CNH '
                     'vencida ou que vence em até 30 dias, sem repetir a mesma CNH.',
             'Uma única tela responde ao que precisa ser resolvido agora.'],
            ['RN13', 'A rotina diária registra quando sinalizou cada documento na janela de 30 '
                     'dias; renovar o documento limpa a sinalização.',
             'Mostra que o prazo foi detectado pelo sistema e reinicia o ciclo para o novo '
             'vencimento.'],
            ['RN14', 'Motorista com CNH vencida não pode ser vinculado a um veículo novo; o '
                     'vínculo existente não é desfeito.',
             'Evita entregar veículo a quem não pode dirigir. Desfazer vínculos sozinho '
             'tiraria do gestor uma decisão que é dele.'],
            ['RN15', 'Despesa não pode ter data posterior ao dia corrente.',
             'Despesa é gasto realizado; gasto previsto é manutenção programada. Evita '
             'indicadores com custo que ainda não existe.'],
            ['RN16', 'Cancelar um lançamento exige motivo; ele permanece visível, sai dos '
                     'totais e pode ser reativado. A exclusão definitiva é do gestor e do '
                     'administrador.',
             'Corrige o erro sem apagar o rastro de quem lançou, quem cancelou e por quê.'],
            ['RN17', 'Toda criação, alteração, cancelamento e exclusão grava autor, campos '
                     'alterados e motivo, quando houver.',
             'Responde a "quem mudou isto?" sem depender de memória.'],
            ['RN18', 'Todo dado operacional pertence a uma empresa, identificada pelo perfil '
                     'consultado no banco e nunca por dado enviado pelo cliente.',
             'É o que permite atender várias frotas na mesma base sem que uma veja a outra.'],
            ['RN19', 'O operador alcança os lançamentos que fez, os veículos a que está '
                     'vinculado agora e os próprios documentos; compartilhar veículo não dá '
                     'acesso aos dados do colega.',
             'Privacidade entre colegas e menor chance de alterar o que não é seu.'],
            ['RN20', 'O operador só registra despesa ou manutenção em veículo a que está '
                     'vinculado.',
             'Evita lançar custo no veículo errado.'],
            ['RN21', 'O arquivo anexado segue o alcance do documento; o endereço de leitura '
                     'vale sessenta segundos.',
             'Um endereço divulgado por engano não vira acesso permanente.'],
            ['RN22', 'A empresa nunca fica sem administrador ativo.',
             'Sem administrador, ninguém aprova contas nem corrige papéis.'],
            ['RN23', 'Os dados de identificação do veículo são gravados em maiúsculas.',
             'A mesma placa digitada de dois jeitos continua sendo um só veículo.']],
           larguras=[1.5, 7.6, 6.9])

    h2('6.2 Verificação funcional')
    p('O Quadro {qua:verificacoes} resume as verificações executadas sobre o código em 9 de '
      'novembro de 2026.')
    quadro('verificacoes', 'Verificações executadas sobre o código',
           ['Verificação', 'Resultado'],
           [['Compilação TypeScript do servidor e da interface', 'Sem erros'],
            ['Análise estática com ESLint', 'Sem erros nem avisos'],
            ['Testes unitários', '213 aprovados'],
            ['Testes de integração com o banco', '52 aprovados'],
            ['Testes de ponta a ponta', '137 aprovados'],
            ['Construção do pacote de produção', 'Concluída'],
            ['Auditoria de dependências', 'Nenhuma vulnerabilidade conhecida'],
            ['Integração contínua', 'Nove etapas, cerca de dois minutos; a publicação só '
                                    'ocorre depois delas']],
           larguras=[8.0, 8.0])
    p('Os testes unitários exercitam as regras de negócio sem banco de dados, substituindo os '
      'repositórios por dublês: cobrem os serviços de veículos, motoristas, vínculos, '
      'despesas, manutenções, documentos, indicadores, usuários e autenticação, além dos '
      '*middlewares* de autenticação, autorização, validação, tratamento de erros, '
      'tempo-limite e registro. Os de integração executam contra o banco real e verificam o '
      'que somente ele pode responder: se as consultas de fato isolam organizações, se os '
      'totais ignoram lançamentos cancelados, se a precisão monetária sobrevive ao percurso '
      'completo, se a situação de atraso e a central de alertas usam o mesmo critério das '
      'listas e do painel, e se as restrições do esquema recusam o que deveriam. As escritas '
      'desse conjunto ocorrem em transações revertidas ao final.')
    p('Os testes de ponta a ponta enviam requisições HTTP reais à aplicação montada e conferem '
      'a resposta final, passando por rota, autenticação, autorização, controlador, serviço, '
      'repositório e banco. Os *tokens* são emitidos pelo próprio Supabase Auth local: o login '
      'não é simulado. Cada caso tem um identificador, por área, que aparece no nome do teste; '
      'o Quadro {qua:e2e_areas} apresenta as áreas.')
    quadro('e2e_areas', 'Testes de ponta a ponta por área',
           ['Área', 'O que verifica', 'Casos'],
           [['Infraestrutura', 'Saúde da aplicação e do banco, CORS, rotina protegida por '
                               'segredo', '5'],
            ['Autenticação', '*Token* ausente, malformado, forjado, com algoritmo trocado ou '
                             'sem assinatura; contas pendente e recusada', '13'],
            ['Permissões', 'Vinte ações negadas e sete permitidas, por papel', '27'],
            ['Isolamento', 'Dados de outra empresa respondem como inexistentes', '8'],
            ['Recorte do operador', 'Só os próprios veículos, ficha e lançamentos', '6'],
            ['Veículos', 'Validação, placa única, vínculo, desativar antes de excluir', '7'],
            ['Despesas', 'Valor, categoria, data futura, precisão monetária, cancelamento, '
                         'reativação, histórico', '12'],
            ['Manutenções', 'Agendar, concluir, cancelar, reativar, atraso calculado', '6'],
            ['Documentos', 'Anexo por endereço assinado, extensões aceitas, armazenamento '
                           'fechado', '11'],
            ['Central de alertas', 'Três frentes, contagem, recorte do operador, sinalização da '
                                   'rotina, CNH vencida no vínculo', '5'],
            ['Cadastro', 'Empresa nova, cadastro, aprovação, empresa inativa, último '
                         'administrador', '15'],
            ['Validação', 'Ordenação fechada, injeção de SQL, identificador inválido, JSON '
                          'malformado, corpo acima do limite', '12'],
            ['Paginação', 'Tamanho de página, total no cabeçalho, páginas sem repetição', '10'],
            ['Total', '', '137']],
           larguras=[3.4, 10.6, 2.0])
    p('A cobertura de código mede quanto do servidor os testes executam. Foi medida com as '
      'duas suítes juntas, pois a camada HTTP só é percorrida pela de ponta a ponta. A Tabela '
      '{tab:cobertura} apresenta o resultado; as camadas que concentram regras de segurança e '
      'de negócio (*middlewares*, rotas e serviços) ficaram acima de 92%.')
    tabela('cobertura', 'Cobertura de código do servidor',
           ['Medida', 'Cobertura (%)'],
           [['Linhas', '88,4'], ['Funções', '89,9'], ['Instruções', '86,2'],
            ['Ramos de decisão', '75,9'], ['Linhas em *middlewares*', '99,2'],
            ['Linhas em rotas', '98,5'], ['Linhas em serviços', '92,3'],
            ['Linhas em repositórios', '85,3'], ['Linhas em controladores', '76,5']],
           larguras=[8.0, 4.0],
           fonte='Fonte: Elaborado pelos autores (2026), rodada de 9 nov. 2026.')
    p('Na rodada de 20 de outubro, a interface compilada foi aberta em navegador automatizado '
      'por cinco perfis (administrador, gestor, motorista, administrador da plataforma e conta '
      'pendente), com o critério de nenhum erro de tela, de console ou de requisição; as 30 '
      'aberturas passaram, cada tela estável entre 0,61 e 0,73 segundo. Em produção, 25 '
      'aberturas de tela por quatro perfis passaram sem erro.')

    h2('6.3 Segurança')
    p('Os testes de segurança tentam os ataques conhecidos contra a autenticação e a '
      'autorização e verificam que todos são recusados. Treze casos atacam a autenticação: '
      'assinatura com outra chave e o mesmo identificador de chave; troca do algoritmo para '
      'HS256 com o segredo antigo do serviço, conhecida como confusão de algoritmo; *token* '
      'sem assinatura; a chave pública usada como se fosse credencial de usuário; e contas '
      'pendentes ou recusadas. As credenciais forjadas recebem 401, e as contas sem aprovação, '
      '403. Vinte e sete casos percorrem a matriz de permissões: cada papel tenta o que não '
      'pode e recebe 403. Oito casos tentam ler, alterar e excluir dados de outra empresa e '
      'recebem 404, sem revelar que o registro existe. Onze casos enviam entradas hostis, como '
      'injeção de SQL nos filtros e na ordenação, identificadores inválidos, JSON malformado e '
      'corpo grande demais, e recebem 400, 404 ou 413.')
    p('Em produção, a verificação repetiu as recusas principais com contas de demonstração e '
      'apenas leituras: o motorista recebeu 403 na lista de usuários, o administrador recebeu '
      '404 ao ler veículo de outra empresa e os *tokens* inválidos receberam 401. O *token* sem '
      'assinatura sequer chegou à aplicação: o *firewall* da plataforma o recusou com 403.')

    h2('6.4 Desempenho')
    p('Os testes de carga usam modelo fechado: um número fixo de conexões envia requisições '
      'sem pausa entre a resposta e o pedido seguinte. Dez conexões contínuas equivalem a '
      'muito mais do que dez pessoas, porque uma pessoa real lê a tela entre um clique e '
      'outro. Em todos os cenários, a aplicação foi a versão compilada, com *tokens* reais de '
      'cada perfil.')
    p('O cenário principal é o *workload* misto, executado em 9 de novembro: todas as rotas '
      'disputam a aplicação e o banco ao mesmo tempo, na proporção de um uso realista: 60% de '
      'consultas à lista de despesas, 15% de lançamentos de despesa, 8% de consultas a '
      'documentos, 8% de verificações de saúde, como faria um monitor externo, 5% de aberturas '
      'do painel e 4% de consultas a veículos. Cada requisição sorteia a rota pelo peso e o '
      'perfil que a faz. O gerador é um *script* do próprio repositório, que mede o tempo de '
      'cada rota dentro do cenário. A máquina tinha processador Apple M5 de dez núcleos e 16 '
      'GB de memória, e o gerador, a aplicação e o banco rodaram nela ao mesmo tempo. A Tabela '
      '{tab:workload_niveis} apresenta o resultado por nível de concorrência.')
    tabela('workload_niveis', '*Workload* misto por nível de concorrência',
           ['Conexões', 'Requisições', 'Req/s', 'Mediana (ms)', 'p90 (ms)', 'p99 (ms)',
            'Erros'],
           [['10', '43.574', '1.452', '6,2', '11,3', '17,2', '0'],
            ['50', '30.796', '1.027', '44,2', '73,0', '109,6', '0'],
            ['100', '23.697', '790', '117,5', '189,9', '285,0', '0'],
            ['100, base limpa', '26.686', '890', '102,1', '168,4', '230,1', '0']],
           larguras=[3.2, 2.4, 1.8, 2.3, 1.9, 1.9, 1.5],
           fonte=FONTE_WORKLOAD,
           nota='Cada nível durou 30 s, após 3 s de aquecimento. Os três primeiros níveis '
                'rodaram em sequência, na mesma base; a última linha repete o nível de 100 '
                'conexões numa base sem as despesas gravadas pelos níveis anteriores.')
    p('Nenhuma das 124.753 requisições falhou. A vazão cai à medida que a concorrência sobe, por '
      'dois motivos. O primeiro é a fila: a aplicação mantém dez conexões com o banco, e acima '
      'disso as requisições esperam a vez, o que transforma concorrência em tempo de resposta '
      'sem aumentar a vazão. O segundo é o próprio cenário: os lançamentos gravaram 16.374 '
      'despesas durante a rodada, e as consultas seguintes percorreram uma base maior. Repetido '
      'numa base limpa, o nível de 100 conexões atendeu 890 requisições por segundo, contra '
      '790 na sequência; a diferença é o efeito do volume, e o restante, o da fila. A Tabela '
      '{tab:workload_rotas} detalha cada rota.')
    tabela('workload_rotas', '*Workload* misto por rota',
           ['Rota', 'Participação (%)', 'Mediana, 10 con. (ms)', 'p99, 10 con. (ms)',
            'Mediana, 100 con. (ms)', 'p99, 100 con. (ms)'],
           [['GET /api/expenses', '60,3', '6,0', '11,6', '112,4', '188,3'],
            ['POST /api/expenses', '14,8', '11,9', '20,5', '194,2', '342,5'],
            ['GET /api/documents', '7,9', '5,7', '12,0', '124,2', '248,8'],
            ['GET /health', '8,0', '1,5', '4,9', '53,0', '93,8'],
            ['GET /api/dashboard/indicators', '4,9', '7,4', '14,8', '130,8', '259,4'],
            ['GET /api/vehicles', '4,1', '5,5', '11,8', '121,4', '251,5']],
           larguras=[5.0, 2.6, 2.1, 2.0, 2.2, 2.1],
           fonte=FONTE_WORKLOAD,
           nota='A participação é a do nível de 10 conexões; nos demais, ficou a menos de um '
                'ponto percentual do peso definido.')
    p('O lançamento de despesa é a operação mais lenta do cenário, porque grava a despesa e o '
      'registro de histórico na mesma transação. O painel, que soma despesas, manutenções e '
      'documentos do período, ficou próximo das consultas simples, porque as somas são feitas '
      'no banco. Mesmo com cem conexões, o pior p99 foi de 342,5 ms, abaixo do limite de um '
      'segundo do RNF04.')
    p('A rodada de 20 de outubro mediu cada rota isolada, com dez conexões por dez segundos, '
      'conforme a Tabela {tab:carga_rotas}. Os números não são comparáveis aos do *workload* '
      'misto: a máquina era outra, e a rota testada isolada não disputa recursos com as '
      'demais.')
    tabela('carga_rotas', 'Carga por rota isolada',
           ['Rota', 'Conexões', 'Req/s', 'Mediana (ms)', 'p99 (ms)', 'Erros'],
           [['GET /health', '50', '4.677', '9', '24', '0'],
            ['GET /api/documents', '10', '899', '10', '20', '0'],
            ['GET /api/vehicles', '10', '874', '10', '21', '0'],
            ['GET /api/expenses, motorista', '10', '718', '13', '25', '0'],
            ['GET /api/users/me', '10', '648', '14', '26', '0'],
            ['GET /api/expenses, administrador', '10', '533', '17', '38', '0'],
            ['POST /api/expenses', '10', '506', '18', '34', '0'],
            ['GET /api/dashboard/indicators', '10', '408', '23', '38', '0']],
           larguras=[5.6, 2.0, 1.8, 2.4, 1.8, 1.4],
           fonte=FONTE_RELATORIO)
    p('O painel, a rota mais cara, foi também submetido a estresse, com a concorrência subindo '
      'de 10 a 200 conexões, conforme a Tabela {tab:estresse}. Trata-se de uma única rota em '
      'quatro níveis de carga, e não de rotas diferentes. A vazão permaneceu em torno de 400 '
      'painéis por segundo, e o aumento de conexões se converteu em tempo de espera, sem erro.')
    tabela('estresse', 'Estresse do painel de indicadores',
           ['Conexões', 'Req/s', 'Mediana (ms)', 'Erros'],
           [['10', '408', '23', '0'], ['50', '421', '117', '0'], ['100', '427', '230', '0'],
            ['200', '402', '473', '0']],
           larguras=[3.0, 3.0, 3.0, 3.0],
           fonte=FONTE_RELATORIO,
           nota='Com 200 conexões, o p99 foi de 601 ms.')
    p('O teste de volume verificou se o tempo de resposta depende de quanto a empresa '
      'acumulou, com 50 mil despesas em uma única empresa, distribuídas por um ano. A Tabela '
      '{tab:volume} mostra que não: a lista é paginada, de modo que a resposta tem tamanho fixo, '
      'cerca de 28 KB, com 500 ou com 50 mil lançamentos, e o painel devolve só os totais.')
    tabela('volume', 'Tempos com 50 mil despesas em uma empresa',
           ['Operação', 'Tempo'],
           [['Lista de despesas, primeira página', '17 ms'],
            ['Lista de despesas, última página', '30 ms'],
            ['Lista com filtro dos últimos 30 dias', '11 ms'],
            ['Painel, período padrão de 180 dias', '21 ms'],
            ['Tela de despesas aberta no navegador', '0,69 s'],
            ['Painel aberto no navegador', '0,75 s']],
           larguras=[9.0, 3.0],
           fonte=FONTE_RELATORIO)
    p('Em produção, a carga foi moderada, para não consumir a cota do plano gratuito, e se '
      'limitou a leituras. A Tabela {tab:producao} apresenta o resultado. Cerca de 70 ms da '
      'mediana de 90 ms correspondem ao trajeto de rede. Ao passar de 10 para 25 conexões no '
      'painel, a vazão subiu de 103 para 244 requisições por segundo e a mediana não mudou: a '
      'plataforma abre novas instâncias conforme a demanda, em vez de enfileirar as '
      'requisições.')
    tabela('producao', 'Carga em produção',
           ['Rota', 'Conexões', 'Req/s', 'Mediana (ms)', 'p99 (ms)', 'Erros'],
           [['GET /api/vehicles', '10', '105', '90', '228', '0'],
            ['GET /api/expenses', '10', '106', '89', '227', '0'],
            ['GET /api/dashboard/indicators', '10', '103', '91', '268', '0'],
            ['GET /api/dashboard/indicators', '25', '244', '91', '396', '0']],
           larguras=[5.4, 2.0, 1.8, 2.4, 1.8, 1.4],
           fonte=FONTE_RELATORIO,
           nota='Total de 11.840 requisições, todas com resposta 200.')

    h2('6.5 Resiliência')
    p('O teste de resiliência pausou o banco de dados com a aplicação no ar e depois o '
      'retomou, para observar o comportamento diante de uma dependência fora do ar. A Tabela '
      '{tab:resiliencia} apresenta as respostas.')
    tabela('resiliencia', 'Comportamento com o banco fora do ar e na volta',
           ['Momento e requisição', 'Resposta', 'Tempo'],
           [['Banco fora, GET /health', '503, banco indisponível', '3,0 s'],
            ['Banco fora, GET /api/vehicles', '503, serviço indisponível', '10,0 s'],
            ['Banco fora, GET /api/vehicles sem *token*', '401', '1 ms'],
            ['Banco de volta, GET /health', '200', '4 ms'],
            ['Banco de volta, GET /api/vehicles', '200', '7 ms']],
           larguras=[7.0, 5.0, 2.0],
           fonte=FONTE_RELATORIO)
    p('O cliente recebe 503, o código padrão para serviço temporariamente indisponível, em vez '
      'de um erro genérico ou de uma conexão presa; o processo continua atendendo o que não '
      'depende do banco, como a recusa de quem não tem credencial; e, quando o banco volta, a '
      'primeira requisição já é atendida, sem reiniciar nada. Um monitor externo consultando o '
      '/health detecta a queda em três segundos.')

    h2('6.6 Atendimento dos objetivos específicos')
    p('O Quadro {qua:objetivos} relaciona cada objetivo específico ao que foi entregue e à '
      'evidência que o comprova.')
    quadro('objetivos', 'Objetivos específicos, entregas e evidências',
           ['Objetivo', 'Entrega', 'Evidência'],
           [['Cadastro de veículos, motoristas e usuários, com vínculo',
             'Módulos de veículos e motoristas; vínculo com período; aprovação de contas',
             'Testes de ponta a ponta de veículos e de cadastro; seções 5.4 a 5.6'],
            ['Despesas vinculadas a veículo, em seis categorias',
             'Módulo de despesas, com cancelamento e paginação',
             'Testes de despesas e de integração (precisão monetária); RN01, RN15, RN16'],
            ['Manutenções preventivas e corretivas, com seus estados',
             'Quatro situações, com o atraso calculado pela data prevista',
             'Testes de manutenção; RN09 a RN11'],
            ['Documentos com vencimento, situação automática, anexo e central de alertas',
             'Módulo de documentos; central com três frentes; rotina diária',
             'Testes de documentos e da central; Figura {fig:tela_alertas}; RN12 e RN13'],
            ['Painel de indicadores',
             'Custo total, médio, por veículo, mensal e por categoria',
             'Figura {fig:tela_painel}; Tabelas {tab:estresse} e {tab:volume}'],
            ['Autenticação e controle de acesso por papel',
             'Supabase Auth com ES256; RBAC por empresa; recorte do operador',
             'Seção 6.3; Quadro {qua:acesso}'],
            ['Verificação da qualidade em três níveis, em integração contínua, e avaliação de '
             'segurança, desempenho e resiliência',
             '402 testes automatizados; integração contínua; carga, volume e resiliência',
             'Seções 6.2 a 6.5']],
           larguras=[5.0, 5.4, 5.6])

    h2('6.7 Limitações e discussão')
    p('A principal limitação do trabalho é metodológica: o sistema não foi adotado na operação '
      'de uma organização. O grupo conversou com proprietários de empresas com frota e usou '
      'bases de dados delas em parte dos testes, mas a confidencialidade impede apresentar '
      'esses dados. Os resultados deste documento vêm de uma base fictícia, gerada por rotina '
      'automatizada, com volume de um ano de operação. Em consequência, os benefícios '
      'pretendidos (redução de sanções por documentação vencida, migração da manutenção '
      'corretiva para a preventiva e visibilidade do custo por veículo) permanecem como '
      'expectativas fundamentadas, ainda sem medição. Três dos trabalhos examinados no '
      'capítulo 3 submeteram seus sistemas a pessoas da área e relataram o resultado, o que '
      'ainda falta a este. A comprovação empírica demandaria adoção por uma frota real, com '
      'medição comparativa antes e depois, o que se situa fora do escopo temporal deste '
      'trabalho.')
    p('Também não foi realizada uma validação estruturada das funcionalidades com '
      'especialistas do domínio. O procedimento previsto consiste em demonstração guiada do '
      'sistema seguida de roteiro estruturado de perguntas, aplicado a gestores de frota e '
      'proprietários de operações de transporte, com registro do perfil de cada respondente e '
      'sem coleta de dado pessoal identificável. As conversas com as empresas não substituem '
      'essa validação, que permanece como etapa futura.')
    p('Quanto aos testes, três limites devem ser considerados na leitura dos resultados. '
      'Primeiro, a verificação das telas no navegador foi executada, mas o *script* que a '
      'realiza não está no repositório nem na integração contínua: a verificação automatizada '
      'permanente alcança apenas o servidor. Segundo, nos testes de carga locais, o gerador, a '
      'aplicação e o banco dividiram a mesma máquina, de modo que os números absolutos '
      'dependem do equipamento e servem para comparar cenários, sem prever a capacidade da '
      'produção. Terceiro, a produção só recebeu carga moderada e de leitura.')
    p('Dois problemas encontrados na revisão foram corrigidos antes do fechamento deste texto. '
      'O primeiro era a publicação em paralelo com os testes, tratada na seção 5.11. O segundo '
      'foi uma vulnerabilidade alta publicada para a biblioteca de validação depois da rodada '
      'de outubro, com consumo excessivo de memória ao validar coleções muito grandes. Ela foi '
      'corrigida pela migração do Zod para a versão 4, com os 402 testes aprovados após a '
      'troca; na mesma ocasião, as vulnerabilidades moderadas em ferramentas de '
      'desenvolvimento foram eliminadas, e a auditoria passou a não apontar nenhuma.')
    p('Do ponto de vista funcional, há quatro limitações. A verificação de posse do endereço '
      'de correio eletrônico está desativada no cadastro, decorrência da exclusão do envio de '
      'mensagens do escopo; o risco é mitigado pela aprovação manual exigida antes de qualquer '
      'acesso, e a mesma dependência impede a recuperação autônoma de senha. A validade da '
      'habilitação existe em dois lugares, na ficha do motorista e no documento do tipo CNH, e '
      'o sistema não as sincroniza; a central de alertas evita o aviso em dobro, mas a '
      'unificação é evolução natural do modelo. A integração com sistemas governamentais, como '
      'a consulta de pontuação da habilitação, não foi implementada, por depender de acesso '
      'não disponível publicamente. E não há planejamento nem otimização de rotas, recurso '
      'deliberadamente fora do escopo.')
    p('A escolha de acesso a dados também tem um custo: prescindir de mapeador '
      'objeto-relacional aumenta a verbosidade das operações rotineiras e transfere ao '
      'desenvolvedor a responsabilidade de declarar, em cada consulta, a condição de '
      'isolamento por organização. A verificação automatizada contra o banco real cobre esse '
      'risco.')


# ===========================================================================
# 7 CONCLUSÃO
# ===========================================================================
def cap7():
    h1('7 CONCLUSÃO')
    p('Este trabalho apresentou o Fleet Manager, sistema web para gestão de frotas que '
      'centraliza o controle operacional, financeiro e documental de veículos em uma base de '
      'dados relacional única. O objetivo geral foi alcançado: o sistema foi desenvolvido, '
      'verificado e publicado em ambiente de produção, e os dez requisitos funcionais '
      'definidos no levantamento foram atendidos. Em relação aos trabalhos examinados no '
      'capítulo 3, o sistema reúne em um só produto o custo por veículo, a manutenção com '
      'prazo, o vencimento de documentos e o isolamento entre empresas.')
    p('Os objetivos específicos foram cumpridos conforme o Quadro {qua:objetivos}. O cadastro '
      'de veículos, motoristas e usuários, com vínculo de período, as despesas em seis '
      'categorias e o painel de indicadores estão em produção. O controle de manutenções '
      'acompanha quatro situações, e o atraso é apurado pela data prevista, sem depender de '
      'alguém marcá-lo. Os documentos têm situação calculada, anexo e uma central de alertas '
      'que reúne, numa só tela, documentos, manutenções e habilitações que exigem ação. O '
      'controle de acesso separa empresas e papéis no servidor, e os ataques testados foram '
      'recusados. A qualidade foi verificada por 402 testes automatizados em três níveis, '
      'executados em integração contínua, e por testes de carga, volume e resiliência que '
      'mantiveram o percentil 99 abaixo de um segundo em todos os cenários e não registraram '
      'erro.')
    p('A contribuição técnica do trabalho concentra-se em cinco decisões. A primeira é a '
      'organização do servidor em camadas com dependência unidirecional: isoladas do protocolo '
      'HTTP, as regras de negócio puderam ser exercitadas por testes sem infraestrutura de '
      'apoio. A segunda é a delegação da autenticação a serviço especializado com verificação '
      'por chave pública, mantendo a autorização sob controle da aplicação, o que retira do '
      'sistema a responsabilidade de guardar senhas sem transferir a terceiros a autoridade '
      'sobre permissões. A terceira é o compartilhamento de tipos entre interface e servidor, '
      'que converte divergências de contrato em erros de compilação. A quarta é a segregação '
      'de dados por organização aplicada na camada de aplicação, com o identificador da '
      'empresa presente em cada entidade operacional e derivado sempre do perfil autenticado. '
      'A quinta é o cálculo das situações de prazo a cada consulta, em vez de gravá-las: '
      'documentos, manutenções e habilitações não ficam com situação defasada, pois nenhuma '
      'depende de atualização manual.')
    p('Duas exigências só apareceram na publicação: o pacote compartilhado precisou passar a '
      'emitir código compilado, e a rotina agendada precisou migrar para o agendador da '
      'plataforma. A revisão de novembro também ensinou que documento e sistema precisam ser '
      'conferidos um contra o outro ao longo de todo o projeto, pois os dois '
      'haviam se distanciado e foram realinhados ponto a ponto.')
    p('O sistema ainda não foi adotado na operação de uma organização, e por isso os '
      'benefícios pretendidos não foram medidos. Os próximos passos são validar o sistema com '
      'uma frota em operação, comparando indicadores antes e depois; incluir os testes de tela '
      'na integração contínua; e unificar a validade da habilitação, hoje registrada na ficha '
      'do motorista e no documento.')


# ===========================================================================
# REFERÊNCIAS
# ===========================================================================
def referencias():
    # Ordem alfabética pela entrada; título da obra ou do periódico em
    # negrito; et al. em itálico (C, p. 22–36; F, p. 54). Cada par traz a
    # chamada usada no texto e a entrada: a geração falha se uma referência
    # não for citada ou sair da ordem alfabética.
    # [2026] é a data certa não indicada no item, caso das documentações
    # mantidas em linha (NBR 6023).
    entradas = (
        ('Beck et al., 2001',
         'BECK, Kent *et al.* **Manifesto para desenvolvimento ágil de software**. [*S. l.*: '
         '*s. n.*], 2001. Disponível em: https://agilemanifesto.org/iso/ptbr/manifesto.html. '
         'Acesso em: 23 nov. 2026.'),

        ('Bezemer; Zaidman, 2010',
         'BEZEMER, Cor-Paul; ZAIDMAN, Andy. Multi-tenant SaaS applications: maintenance dream '
         'or nightmare? *In*: JOINT ERCIM WORKSHOP ON SOFTWARE EVOLUTION AND INTERNATIONAL '
         'WORKSHOP ON PRINCIPLES OF SOFTWARE EVOLUTION, 2010, Antwerp. **Proceedings** [...]. '
         'New York: ACM, 2010. p. 88-92. DOI: 10.1145/1862372.1862393.'),

        ('Brasil, 1997',
         'BRASIL. **Lei nº 9.503, de 23 de setembro de 1997**. Institui o Código de Trânsito '
         'Brasileiro. Brasília, DF: Presidência da República, 1997. Disponível em: '
         'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm. Acesso em: 23 nov. '
         '2026.'),

        ('Brasil, 2026',
         'BRASIL. Ministério dos Transportes. Secretaria Nacional de Trânsito. **Frota de '
         'veículos**: 2026: frota por unidade da federação e tipo de veículo, outubro de '
         '2026. Brasília, DF: Senatran, 2026. Disponível em: '
         'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/frota-de-veiculos-2026. '
         'Acesso em: 23 nov. 2026.'),

        ('Dean e Barroso (2013)',
         'DEAN, Jeffrey; BARROSO, Luiz André. The tail at scale. **Communications of the '
         'ACM**, New York, v. 56, n. 2, p. 74-80, fev. 2013. DOI: 10.1145/2408776.2408794.'),

        ('Ferreira e Prazeres (2017)',
         'FERREIRA, Alberto Saulo; PRAZERES, Pablo. **Sistema móvel para acompanhamento de '
         'rotas e entregas de uma empresa de transporte**. 2017. Trabalho de Conclusão de '
         'Curso (Bacharelado em Sistemas de Informação) — Universidade do Sul de Santa '
         'Catarina, Palhoça, 2017. Disponível em: '
         'https://repositorio-api.animaeducacao.com.br/server/api/core/bitstreams/66e9eb11-674f-4468-8382-73550fa5e260/content. '
         'Acesso em: 23 nov. 2026.'),

        ('Fielding (2000)',
         'FIELDING, Roy Thomas. **Architectural styles and the design of network-based '
         'software architectures**. 2000. Tese (Doutorado em Information and Computer '
         'Science) — University of California, Irvine, 2000. Disponível em: '
         'https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm. Acesso em: 23 nov. '
         '2026.'),

        ('Fowler, 2013',
         'FOWLER, Martin. **Continuous delivery**. [*S. l.*: *s. n.*], 2013. Disponível em: '
         'https://martinfowler.com/bliki/ContinuousDelivery.html. Acesso em: 23 nov. 2026.'),

        ('Fowler, 2024',
         'FOWLER, Martin. **Continuous integration**. [*S. l.*: *s. n.*], 2024. Disponível em: '
         'https://martinfowler.com/articles/continuousIntegration.html. Acesso em: 23 nov. '
         '2026.'),

        ('GitHub, [2026]',
         'GITHUB. **GitHub Actions documentation**. [*S. l.*]: GitHub, [2026]. Disponível em: '
         'https://docs.github.com/actions. Acesso em: 9 nov. 2026.'),

        ('International Organization for Standardization, 2023',
         'INTERNATIONAL ORGANIZATION FOR STANDARDIZATION. **ISO/IEC 25010**: systems and '
         'software engineering: systems and software quality requirements and evaluation '
         '(SQuaRE): product quality model. 2. ed. Geneva: ISO, 2023.'),

        ('Jones; Bradley; Sakimura, 2015',
         'JONES, Michael B.; BRADLEY, John; SAKIMURA, Nat. **RFC 7519**: JSON Web Token '
         '(JWT). [*S. l.*]: Internet Engineering Task Force, maio 2015. Disponível em: '
         'https://datatracker.ietf.org/doc/html/rfc7519. Acesso em: 26 ago. 2026.'),

        ('Kruchten, 1995',
         'KRUCHTEN, Philippe. The 4+1 view model of architecture. **IEEE Software**, Los '
         'Alamitos, v. 12, n. 6, p. 42-50, nov. 1995. DOI: 10.1109/52.469759.'),

        ('Larman; Basili, 2003',
         'LARMAN, Craig; BASILI, Victor R. Iterative and incremental development: a brief '
         'history. **Computer**, Los Alamitos, v. 36, n. 6, p. 47-56, jun. 2003. DOI: '
         '10.1109/MC.2003.1204375.'),

        ('Lubis; Suendri, 2025',
         'LUBIS, Bagus Rizki; SUENDRI. Fleet management information system design PT. Bagus '
         'Amelia Jaya uses the user method web-based centered design. **Journal of Electrical '
         'Engineering and Computer (JEECOM)**, [*s. l.*], v. 7, n. 2, p. 537-547, out. 2025. '
         'DOI: 10.33650/jeecom.v7i2.13084. Disponível em: '
         'https://ejournal.unuja.ac.id/index.php/jeecom/article/download/13084/pdf. Acesso '
         'em: 23 nov. 2026.'),

        ('Mell; Grance, 2011',
         'MELL, Peter; GRANCE, Timothy. **The NIST definition of cloud computing**. '
         'Gaithersburg: National Institute of Standards and Technology, 2011. (Special '
         'Publication, 800-145). DOI: 10.6028/NIST.SP.800-145.'),

        ('Menezes, 2022',
         'MENEZES, Felipe Augusto Brito de Lara. **Efeitos da manutenção preventiva em uma '
         'frota de caminhões para transporte de cargas pesadas**. 2022. 56 p. Trabalho de '
         'Conclusão de Curso (Graduação em Engenharia Mecânica) — Universidade Federal do Rio '
         'Grande do Norte, Natal, 2022. Disponível em: '
         'https://repositorio.ufrn.br/server/api/core/bitstreams/fb88120c-d1da-4407-866d-ae4b620f89c7/content. '
         'Acesso em: 23 nov. 2026.'),

        ('Meta, [2026]',
         'META. **React**: the library for web and native user interfaces. [*S. l.*]: Meta '
         'Open Source, [2026]. Disponível em: https://react.dev. Acesso em: 26 ago. 2026.'),

        ('Microsoft, [2026]',
         'MICROSOFT. **TypeScript documentation**. [*S. l.*]: Microsoft, [2026]. Disponível '
         'em: https://www.typescriptlang.org/docs. Acesso em: 26 ago. 2026.'),

        ('Nielsen (1993)',
         'NIELSEN, Jakob. Response times: the 3 important limits. **Nielsen Norman Group**, '
         '[*s. l.*], 1 jan. 1993. Disponível em: '
         'https://www.nngroup.com/articles/response-times-3-important-limits/. Acesso em: '
         '23 nov. 2026.'),

        ('OpenJS Foundation, [2026]',
         'OPENJS FOUNDATION. **Node.js documentation**. [*S. l.*]: OpenJS Foundation, [2026]. '
         'Disponível em: https://nodejs.org/docs. Acesso em: 26 ago. 2026.'),

        ('OWASP Foundation ([2026])',
         'OWASP FOUNDATION. **SQL injection prevention cheat sheet**. [*S. l.*]: OWASP '
         'Foundation, [2026]. Disponível em: '
         'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html. '
         'Acesso em: 23 nov. 2026.'),

        ('Porsager, [2026]',
         'PORSAGER, Rasmus. **postgres**: PostgreSQL client for Node.js. [*S. l.*: *s. n.*], '
         '[2026]. Disponível em: https://github.com/porsager/postgres. Acesso em: 21 set. '
         '2026.'),

        ('PostgreSQL Global Development Group, [2026]',
         'POSTGRESQL GLOBAL DEVELOPMENT GROUP. **PostgreSQL documentation**. [*S. l.*]: '
         'PostgreSQL Global Development Group, [2026]. Disponível em: '
         'https://www.postgresql.org/docs. Acesso em: 26 ago. 2026.'),

        ('Prodanov; Freitas, 2013',
         'PRODANOV, Cleber Cristiano; FREITAS, Ernani Cesar de. **Metodologia do trabalho '
         'científico**: métodos e técnicas da pesquisa e do trabalho acadêmico. 2. ed. Novo '
         'Hamburgo: Feevale, 2013. E-book. Disponível em: '
         'https://fenix.isa.ulisboa.pt/downloadFile/563022967868490/E-book%20Metodologia%20do%20Trabalho%20Cientifico.pdf. '
         'Acesso em: 23 nov. 2026.'),

        ('Resende, 2014',
         'RESENDE, Patrícia. **Gestão de unidade de transporte**: estudo de caso em uma '
         'organização pública. 2014. 84 f. Monografia (Especialização em Logística '
         'Estratégica e Sistemas de Transporte) — Universidade Federal de Minas Gerais, Belo '
         'Horizonte, 2014. Disponível em: '
         'https://repositorio.ufmg.br/server/api/core/bitstreams/1e796a5d-5104-4641-878a-b9f43a264f36/content. '
         'Acesso em: 23 nov. 2026.'),

        ('Roders (2024)',
         'RODERS, Arthur Fellipe. **Sistema de monitoramento via GPS para frotas**. 2024. 50 '
         'p. Trabalho de Conclusão de Curso (Graduação em Engenharia de Controle e Automação) '
         '— Universidade Federal de Santa Catarina, Blumenau, 2024. Disponível em: '
         'https://repositorio.ufsc.br/xmlui/bitstream/handle/123456789/256014/TCC.pdf?sequence=1&isAllowed=y. '
         'Acesso em: 23 nov. 2026.'),

        ('Rodrigues et al., 2019',
         'RODRIGUES, Thales Volpe *et al.* Sistema de informações para gestão e manutenção de '
         'frota de veículos. *In*: CONGRESSO BRASILEIRO DE ENGENHARIA DE PRODUÇÃO, 9., 2019, '
         'Ponta Grossa. **Anais** [...]. Ponta Grossa: APREPRO, 2019. Disponível em: '
         'https://aprepro.org.br/conbrepro/2019/anais/arquivos/09252019_130906_5d8b928a0857b.pdf. '
         'Acesso em: 23 nov. 2026.'),

        ('Sandhu et al., 1996',
         'SANDHU, Ravi S. *et al.* Role-based access control models. **Computer**, Los '
         'Alamitos, v. 29, n. 2, p. 38-47, fev. 1996. DOI: 10.1109/2.485845.'),

        ('Santos et al. (2012)',
         'SANTOS, Greyciane Passos dos *et al.* Os benefícios da utilização de indicadores de '
         'desempenho na gestão de frota para controle de custos logísticos de transporte: o '
         'caso de uma indústria de alimentos. *In*: ENCONTRO NACIONAL DE ENGENHARIA DE '
         'PRODUÇÃO, 32., 2012, Bento Gonçalves. **Anais** [...]. Rio de Janeiro: ABEPRO, '
         '2012. Disponível em: '
         'https://abepro.org.br/biblioteca/ENEGEP2012_TN_STO_159_930_20081.pdf. Acesso em: 23 '
         'nov. 2026.'),

        ('Silva, Peralba e Silva (2024)',
         'SILVA, Gustavo Souza Duarte da; PERALBA, Daniel Campos; SILVA, Mateus Santos Gama. '
         '**Sistema de gerência de frotas**: DriveSync. 2024. 146 f. Trabalho de Conclusão de '
         'Curso (Bacharelado em Sistemas de Informação) — Centro Universitário Dom Bosco do '
         'Rio de Janeiro, Resende, 2024. Disponível em: '
         'https://repositorio.aedb.br/jspui/handle/123456789/170. Acesso em: 23 nov. 2026.'),

        ('Silva (2018)',
         'SILVA, Lucas Matheus Gomes da. **Sistema de controle de frota de veículos**. 2018. '
         '71 f. Trabalho de Conclusão de Curso (Tecnologia em Análise e Desenvolvimento de '
         'Sistemas) — Instituto Federal de Educação, Ciência e Tecnologia de São Paulo, '
         'Catanduva, 2018. Disponível em: '
         'https://repositorio.ifsp.edu.br/items/4ca54464-e800-4c4a-a797-e7d29410f5f2/full. '
         'Acesso em: 23 nov. 2026.'),

        ('Sommerville (2011)',
         'SOMMERVILLE, Ian. **Engenharia de software**. 9. ed. São Paulo: Pearson Prentice '
         'Hall, 2011.'),

        ('Supabase ([2026])',
         'SUPABASE. **Supabase documentation**. [*S. l.*]: Supabase, [2026]. Disponível em: '
         'https://supabase.com/docs. Acesso em: 26 ago. 2026.'),

        ('Tailwind Labs, [2026]',
         'TAILWIND LABS. **Tailwind CSS documentation**. [*S. l.*]: Tailwind Labs, [2026]. '
         'Disponível em: https://tailwindcss.com/docs. Acesso em: 26 ago. 2026.'),

        ('Vargas, 2026',
         'VARGAS, Julia. Infrações de trânsito em 2026: excesso de velocidade lidera com 19 '
         'milhões de multas; confira resto do ranking. **AutoPapo**, [*s. l.*], 21 jul. 2026. '
         'Disponível em: '
         'https://autopapo.com.br/noticia/infracoes-de-transito-2026-excesso-de-velocidade/. '
         'Acesso em: 23 nov. 2026.'),

        ('Vercel ([2026])',
         'VERCEL. **Vercel documentation**. [*S. l.*]: Vercel, [2026]. Disponível em: '
         'https://vercel.com/docs. Acesso em: 26 ago. 2026.'),

        ('Vite Team, [2026]',
         'VITE TEAM. **Vite documentation**. [*S. l.*]: Vite, [2026]. Disponível em: '
         'https://vite.dev. Acesso em: 26 ago. 2026.'),

        ('Vitest ([2026])',
         'VITEST. **Vitest**: a Vite-native testing framework. [*S. l.*]: Vitest, [2026]. '
         'Disponível em: https://vitest.dev. Acesso em: 26 ago. 2026.'),

        ('Zod ([2026])',
         'ZOD. **Zod**: TypeScript-first schema validation with static type inference. [*S. '
         'l.*]: Zod, [2026]. Disponível em: https://zod.dev. Acesso em: 26 ago. 2026.'),
    )
    h1_centralizado('REFERÊNCIAS')
    for _, texto in entradas:
        referencia(texto)
    return entradas


# ===========================================================================
# GLOSSÁRIO
# ===========================================================================
def glossario():
    # Termos técnicos de uso restrito, em ordem alfabética (F, p. 57).
    h1_centralizado('GLOSSÁRIO')
    for termo, definicao in (
        ('Dublê de teste', 'objeto que substitui uma dependência real durante o teste, '
                           'como um repositório que devolve dados fixos em vez de consultar o '
                           'banco.'),
        ('Entrega contínua', 'prática de manter toda versão aprovada pronta para publicação, '
                             'com a publicação automatizada.'),
        ('*Firewall*', 'filtro de rede posicionado à frente da aplicação, que recusa '
                       'requisições suspeitas antes que cheguem a ela.'),
        ('Idempotente', 'operação que, executada mais de uma vez, produz o mesmo efeito que '
                        'executada uma só vez.'),
        ('Integração contínua', 'prática de compilar e testar automaticamente cada alteração '
                                'enviada ao repositório.'),
        ('*Middleware*', 'função que intercepta a requisição antes do controlador, para '
                         'autenticar, autorizar, validar ou registrar.'),
        ('*Migration*', 'arquivo que descreve uma alteração do esquema do banco, aplicado em '
                        'ordem e uma única vez.'),
        ('Modelo de carga fechado', 'teste de carga em que um número fixo de conexões envia '
                                    'requisições sem pausa entre uma resposta e o pedido '
                                    'seguinte.'),
        ('Percentil', 'valor abaixo do qual está uma fração das medidas: o p50, ou mediana, '
                      'deixa metade abaixo; o p90, 90%; o p99, 99%.'),
        ('Recorte', 'conjunto de registros que um perfil alcança: a empresa inteira, para '
                    'administrador e gestor; os próprios lançamentos e veículos vinculados, '
                    'para o operador.'),
        ('*Token*', 'credencial assinada que o cliente apresenta a cada requisição para '
                    'provar quem é.'),
        ('Vazão', 'quantidade de requisições atendidas por segundo.'),
        ('*Workload*', 'proporção entre os tipos de requisição de um teste de carga, que '
                       'reproduz um padrão de uso.'),
    ):
        p(f'**{termo}**: {definicao}', recuo=False)


# ===========================================================================
# APÊNDICE A — Termo de abertura
# ===========================================================================
def apendice_a():
    h1_centralizado('APÊNDICE A — Termo de abertura do projeto')
    h2('A.1 Identificação do projeto')
    p('Nome do projeto: Fleet Manager: sistema web de gestão de frotas. '
      'Código do projeto: FM-PFI-2026.')

    h2('A.2 Objetivos')
    p('Desenvolver um sistema web para gestão de frotas, com foco no controle operacional, '
      'financeiro e documental de veículos, permitindo transparência dos custos por ativo, '
      'redução de riscos legais e apoio à tomada de decisão.')

    h2('A.3 Escopo')
    p('O projeto contempla o cadastro e a gestão de veículos e motoristas; o registro de '
      'despesas operacionais vinculadas a cada veículo; o controle de manutenções preventivas e '
      'corretivas, com acompanhamento de estado; o controle de documentos obrigatórios, com '
      'classificação de vencimentos; o painel de indicadores financeiros; e os mecanismos de '
      'autenticação e controle de acesso por papel.')
    p('Não fazem parte do escopo o rastreamento por satélite em tempo real, a telemetria '
      'avançada, o planejamento e a otimização de rotas, a integração automática com sistemas '
      'governamentais, o desenvolvimento de aplicativo móvel nativo e a notificação de '
      'vencimentos por canais externos.')

    h2('A.4 Cronograma resumido')
    p('O Quadro {qua:cronograma} apresenta o cronograma resumido do projeto.')
    quadro('cronograma', 'Cronograma resumido',
           ['Fase', 'Marco', 'Período'],
           [['Iniciação', 'Projeto aprovado', 'Fevereiro de 2026'],
            ['Planejamento', 'Requisitos e arquitetura definidos', 'Março de 2026'],
            ['Execução', 'Servidor e modelo de dados concluídos', 'Abril de 2026'],
            ['Execução', 'Interface e módulos funcionais concluídos', 'Maio de 2026'],
            ['Execução', 'Painel de indicadores e gestão de usuários', 'Junho de 2026'],
            ['Monitoramento', 'Produto mínimo viável verificado', 'Junho de 2026'],
            ['Execução', 'Migração da autenticação e publicação em produção',
             'Agosto de 2026'],
            ['Execução', 'Segregação por organização, administração da plataforma e anexos '
                         'servidos pela aplicação', 'Setembro de 2026'],
            ['Monitoramento', 'Testes de ponta a ponta, integração contínua, carga e '
                              'resiliência', 'Outubro de 2026'],
            ['Monitoramento', 'Revisão das regras de negócio e *workload* misto',
             'Novembro de 2026'],
            ['Encerramento', 'Entrega do documento revisado e defesa', 'Novembro de 2026']],
           larguras=[3.6, 8.0, 4.4])

    h2('A.5 Partes interessadas')
    p('O Quadro {qua:partes} relaciona as partes interessadas e suas responsabilidades.')
    quadro('partes', 'Partes interessadas do projeto',
           ['Participante', 'Responsabilidade', 'Autoridade'],
           [['Professor orientador',
             'Orientação, acompanhamento e avaliação do projeto', 'Alta'],
            ['André Luiz Cavalcante da Silva',
             'Desenvolvimento, modelagem e documentação', 'Alta'],
            ['Luiz Eduardo Pacheco',
             'Desenvolvimento, modelagem e documentação', 'Alta'],
            ['Gregory Figueiredo de M. P. Jereissati',
             'Desenvolvimento, modelagem e documentação', 'Alta'],
            ['Gestores de frota (usuários finais)',
             'Utilização estratégica e validação do sistema', 'Média'],
            ['Operadores (usuários finais)',
             'Registro e atualização das informações operacionais', 'Baixa']],
           larguras=[5.4, 8.0, 2.6])

    h2('A.6 Restrições')
    p('O projeto foi conduzido sob as seguintes restrições:')
    alineas((
        'orçamento nulo, que limita o projeto a serviços com camada gratuita permanente e '
        'determinou a escolha das plataformas de hospedagem',
        'equipe de três integrantes, em regime acadêmico, com dedicação parcial',
        'prazo delimitado pelo calendário acadêmico',
        'confidencialidade dos dados das empresas ouvidas, que impede apresentá-los',
    ))

    h2('A.7 Riscos e mitigação')
    p('Foram identificados quatro riscos, três dos quais se materializaram:')
    alineas((
        'dependência de plataformas de terceiros: materializou-se quando o ambiente de banco '
        'de dados foi perdido e precisou ser recriado; a mitigação foi versionar o esquema '
        'por *migrations* e os *scripts* de configuração, o que permite reconstruir o '
        'ambiente a partir do repositório',
        'alteração das condições comerciais dos serviços: materializou-se quando a plataforma '
        'prevista para o servidor deixou de oferecer camada gratuita permanente; a mitigação '
        'foi substituí-la por alternativa gratuita',
        'divergência entre a documentação e o sistema: materializou-se entre setembro e '
        'novembro, quando o sistema evoluiu além do documento; a mitigação foi conferir cada '
        'afirmação técnica com o código e os testes, na revisão descrita na seção 4.3',
        'concentração de conhecimento em um integrante: a mitigação foi a revisão conjunta e '
        'a documentação das decisões de arquitetura',
    ))

    h2('A.8 Critérios de sucesso')
    p('O projeto seria considerado bem-sucedido com:')
    alineas((
        'atendimento dos dez requisitos funcionais definidos no levantamento',
        'sistema publicado e operante em ambiente de produção, acessível por navegador',
        'compilação sem erros e aprovação integral dos testes automatizados das regras de '
        'negócio',
        'ambiente reconstruível a partir do repositório, sem dependência de configuração não '
        'documentada',
        'documentação técnica correspondente ao sistema implementado',
    ))


# ===========================================================================
# APÊNDICE B — Documento de arquitetura
# ===========================================================================
def apendice_b():
    h1_centralizado('APÊNDICE B — Documento de arquitetura de software')
    p('Este apêndice descreve as decisões arquiteturais do Fleet Manager segundo o modelo de visões '
      '"4+1" (Kruchten, 1995), que organiza a descrição de uma arquitetura em visões '
      'complementares, cada uma dirigida a um público distinto.')

    h2('B.1 Requisitos e restrições arquiteturais')
    p('O Quadro {qua:arquitetura} relaciona os requisitos e as restrições arquiteturais e a '
      'solução adotada para cada um.')
    quadro('arquitetura', 'Requisitos e restrições arquiteturais',
           ['Requisito', 'Solução adotada'],
           [['Linguagem',
             'TypeScript no servidor e na interface, com tipos compartilhados entre ambos.'],
            ['Plataforma',
             'Interface estática e camada de serviço publicadas em projeto único na Vercel, '
             'no mesmo domínio.'],
            ['Segurança',
             'Autenticação delegada ao Supabase Auth, com *token* ES256 verificado pela chave '
             'pública do serviço; autorização por papéis aplicada na aplicação.'],
            ['Persistência',
             'PostgreSQL gerenciado pelo Supabase, acessado por SQL parametrizado a partir da '
             'camada de repositórios.'],
            ['Armazenamento de arquivos',
             'Supabase Storage, alcançado apenas pelo servidor, que emite endereços assinados '
             'de validade curta após aplicar o controle de acesso.'],
            ['Internacionalização',
             'Português brasileiro e inglês, com preferência persistida no navegador.'],
            ['Qualidade',
             'Testes em três níveis executados em integração contínua no GitHub Actions; '
             'publicação na Vercel apenas após a aprovação de todos eles.'],
            ['Custo',
             'Restrição a serviços com camada gratuita permanente.']],
           larguras=[4.2, 11.8])

    h2('B.2 Visão de casos de uso')
    p('Apresentada na Figura {fig:casos_de_uso}, seção 5.1. Os casos significativos para a arquitetura são a '
      'autenticação, que atravessa todas as rotas protegidas, e a gestão de usuários, que '
      'determina o papel aplicado nas demais operações.')

    h2('B.3 Visão lógica')
    p('Apresentada na Figura {fig:camadas}, seção 5.2. A aplicação organiza-se em camadas com dependência '
      'unidirecional. As classes mais significativas concentram-se na camada de serviços, que '
      'materializa as regras de negócio descritas no Quadro {qua:rn}, e na de repositórios, que isola '
      'o acesso ao banco. Os *middlewares* de autenticação, autorização e validação atuam de '
      'forma transversal às rotas protegidas.')

    h2('B.4 Visão de implementação')
    p('Apresentada na Figura {fig:pacotes}, seção 5.3. O código distribui-se em duas aplicações e um pacote '
      'compartilhado, este último contendo as enumerações e os objetos de transferência de dados '
      'utilizados por ambas. A Figura {fig:autenticacao} detalha a realização do caso de uso de autenticação, e a '
      'Figura {fig:upload}, a do anexo de arquivo a documento.')

    h2('B.5 Visão de processo')
    p('O sistema apresenta dois fluxos de execução distintos. O primeiro é síncrono e orientado '
      'a requisição: cada chamada é atendida de forma independente, sem estado compartilhado '
      'entre requisições, o que se coaduna com o modelo de execução sem servidor dedicado '
      'adotado na publicação. Cada requisição tem tempo-limite de dez segundos e gera uma '
      'linha de registro. O segundo é a rotina diária de sinalização de vencimentos, '
      'disparada pelo agendador da plataforma e projetada para ser idempotente, de modo que '
      'execuções repetidas não produzam efeito colateral; ela registra a data da sinalização, '
      'exibida na central de alertas.')

    h2('B.6 Visão de implantação')
    p('Apresentada na Figura {fig:implantacao}, seção 5.10. A topologia compreende três nós: o dispositivo do '
      'usuário, executando o navegador; o projeto na plataforma de nuvem, que atende tanto os '
      'artefatos estáticos quanto a camada de serviço; e a plataforma de dados, que provê banco '
      'relacional, autenticação e armazenamento de arquivos.')

    h2('B.7 Visão de dados')
    p('Apresentada na Figura {fig:modelo_er}, seção 5.4, e detalhada no Quadro {qua:entidades}. O esquema é versionado por '
      'migrações incrementais, o que permite reconstruir integralmente a estrutura relacional a '
      'partir do repositório. A proteção do banco contra acesso externo é descrita na '
      'seção 5.9.')


# ===========================================================================
# APÊNDICE C — Reprodução dos testes
# ===========================================================================
def apendice_c():
    h1_centralizado('APÊNDICE C — Roteiro para reproduzir os testes')
    p('Os testes podem ser repetidos em qualquer máquina com Node.js e um ambiente de '
      'contêineres, a partir da raiz do repositório. O Supabase local é criado do zero e fica '
      'isolado da produção. Os passos, em ordem, são:')
    alineas((
        'gerar a chave de assinatura local: npx supabase gen signing-key --algorithm ES256 '
        '--append, sobre um arquivo supabase/signing_keys.json vazio',
        'subir o Supabase local: npx supabase start',
        'criar o banco e os dados fictícios: npm run db:migrate e npm run db:seed',
        'rodar a suíte padrão, com os testes unitários e de integração: npm run test:api',
        'rodar a suíte de ponta a ponta: npm run test:e2e',
        'criar o volume de demonstração, com um ano de operação: npm run db:popular, desfeito '
        'por npm run db:popular -- --remover',
        'medir a cobertura das duas suítes juntas: npx vitest run --config '
        'vitest.cobertura.config.mts --coverage, na pasta apps/api',
        'executar o *workload* misto, com a aplicação compilada no ar: npm run '
        'carga:workload, na pasta apps/api, que apaga ao final as despesas que criou',
        'executar a análise estática: npm run lint e npx tsc --noEmit em cada aplicação',
    ))
    p('A integração contínua executa os mesmos passos, na mesma ordem, no arquivo '
      '.github/workflows/testes.yml. Os resultados do *workload* ficam gravados em '
      'docs/testes/, um arquivo por rodada, com data, máquina, pesos das rotas e medidas de '
      'cada nível.')


# ===========================================================================
def main():
    configurar()
    capa()
    nova_secao()
    capa_fora_da_contagem()
    folha_rosto()
    folha_aprovacao()
    resumo()
    abstract()
    listas()
    numerar_paginas(nova_secao())
    cap1()
    cap2()
    cap3()
    cap4()
    cap5()
    cap6()
    cap7()
    entradas = referencias()
    glossario()
    apendice_a()
    apendice_b()
    apendice_c()
    verificar_objetos()
    verificar_referencias(entradas)

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    doc.save(SAIDA)
    print(f'Documento gerado: {SAIDA}')
    print(f'Parágrafos: {len(doc.paragraphs)} | Tabelas: {len(doc.tables)}')
    print('Para preencher sumário, listas e referências cruzadas: python scripts/gerar-pdf.py')


if __name__ == '__main__':
    main()
