# Fleet Manager – Sistema de Gestão Inteligente de Frotas

> **Projeto Final Integrador I (PFI) — 2026**
> Universidade de Fortaleza – UNIFOR | Centro de Ciências Tecnológicas | Curso de Ciência da Computação
> Código do Projeto: `FM-PFI-2026`

---

## 📋 Sobre o Projeto

O **Fleet Manager** é um sistema web para gestão inteligente de frotas, desenvolvido como Trabalho de Conclusão de Curso (TCC). O sistema centraliza o controle operacional, financeiro e documental de veículos, proporcionando maior previsibilidade de custos, redução de riscos legais e apoio à tomada de decisão estratégica.

---

## 🎯 Objetivos

- Cadastro de veículos, motoristas e usuários
- Registro de despesas vinculadas aos veículos (combustível, manutenção, multas, IPVA, seguros)
- Controle de manutenções preventivas e corretivas
- Monitoramento de vencimento de documentos com alertas automáticos
- Dashboard com indicadores financeiros (custo por veículo, evolução mensal de despesas)
- Controle de acesso por perfil de usuário (RBAC)

---

## 🏗️ Arquitetura

A solução adota **TypeScript full-stack** com a seguinte estrutura:

| Camada | Tecnologia |
|---|---|
| Frontend | React.js (hospedado na Vercel) |
| Backend | Node.js (API REST) |
| Banco de Dados | PostgreSQL (Supabase) |
| Cache / Filas | Redis |
| Autenticação | JWT próprio + e-mail/senha |
| Deploy Backend | AWS ECS |
| Controle de Acesso | RBAC (Administrador, Gestor, Operador) |

---

## 📁 Documentação

| Arquivo | Descrição | Data |
|---|---|---|
| `Descrição do problema e escopo do projeto (24-02).docx` | Documento de abertura do projeto, objetivos, escopo e justificativa | 24/02/2026 |
| `Levantamento de Requisitos (03-03).docx` | Requisitos funcionais e não funcionais do sistema | 03/03/2026 |
| `Modelagem e Arquitetura (17-03).docx` | Documento de arquitetura de software (modelo 4+1) | 17/03/2026 |
| `Documento Técnico (17-03).docx` | Documento técnico completo no formato UNIFOR/ABNT | 17/03/2026 |

---

## 🚫 Fora do Escopo

- Rastreamento GPS em tempo real
- Telemetria avançada
- Planejamento e otimização de rotas
- Integração automática com sistemas governamentais (DETRAN)
- Aplicativo mobile nativo

---

## 👨‍🎓 Informações Acadêmicas

- **Instituição:** Universidade de Fortaleza – UNIFOR
- **Curso:** Ciência da Computação
- **Orientador:** Prof. Me. Ronaldo Gonçalves Junior
- **Ano:** 2026
