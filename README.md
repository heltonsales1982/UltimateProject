# Protocolo Helton - Plataforma de Evolução Física Inteligente

## Visão do Produto

Plataforma centralizada de acompanhamento físico, saúde e performance que funciona como uma clínica digital de alta performance. O sistema evolui conforme os resultados reais do usuário, sem planos fixos ou previsões fictícias.

## Versão

1.0 - Fase 1: Protocolo Helton (Perfil individual)

## Arquitetura

### Stack Tecnológico
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Backend**: Firebase Realtime Database
- **Storage**: Firebase Storage (com signed URLs para privacidade)
- **AI**: Anthropic Claude API via backend proxy

### Estrutura de Diretórios
```
Protocolo_Helton/
├── config/
│   ├── database.rules.json    # Firebase Security Rules
│   ├── seed-data.json         # Dados iniciais (regras, treinos base)
│   └── firebase-config.js     # Configuração Firebase
├── src/
│   ├── index.html             # Aplicação principal
│   ├── styles.css             # Estilos
│   └── app.js                 # Lógica da aplicação
└── docs/
    ├── PRD.md                 # Product Requirements Document
    └── TECHNICAL_ANNEX.md     # Anexo Técnico (Data Model, Rule Engine, LGPD)
```

## Modelo de Dados

### Entidades Principais
- **accounts**: Contas (tenant_id para multi-tenancy)
- **users**: Usuários (athlete, coach, admin)
- **user_profiles**: Perfis com metas e restrições
- **assessments**: Avaliações iniciais e periódicas
- **assessment_photos**: Fotos corporais (privadas, criptografadas)
- **training_weeks**: Semanas de treino
- **workouts**: Treinos específicos
- **exercises**: Exercícios dentro dos treinos
- **daily_checkins**: Check-ins diários
- **weekly_checkins**: Check-ins semanais
- **adherence_scores**: Scores de aderência
- **ai_recommendations**: Recomendações da IA com fluxo de aprovação
- **decision_rules**: Regras configuráveis do motor de decisão
- **cardio_sessions**: Sessões de cardio

## Princípios Fundamentais

1. **Sem evolução futura assumida**: Todas as decisões baseadas em dados reais
2. **Aprovação explícita**: Nenhuma mudança automática sem revisão
3. **Privacidade LGPD**: Dados sensíveis criptografados, consentimento granular
4. **Regras como dados**: Motor de decisão configurável, não hardcoded
5. **Segurança primeiro**: Dor > 6 bloqueia progressão independente de aderência

## Score de Aderência

- Treinos: 30%
- Cardio: 25%
- Sono: 20%
- Nutrição: 15%
- Hidratação: 10%

## Motor de Decisão

Regras configuráveis avaliadas em ordem de prioridade:
- BLOCK_PROGRESSION (prioridade 1): Dor > 6
- PRIORITIZE_RECOVERY (prioridade 2): Sono < 5.5h
- SUGGEST_NUTRITION_REVIEW (prioridade 5): Perda peso > 1.5kg/semana
- ALLOW_PROGRESSION (prioridade 10): Aderência > 85%

## LGPD / Privacidade

- Consentimento explícito e granular no onboarding
- Criptografia em repouso para dados sensíveis
- Storage de fotos com signed URLs (15min expiração)
- Direito de exclusão com hard delete real
- Política de retenção: 90 dias soft-hold, depois purge

## Fora de Escopo (v1.0)

- Integração real-time Apple Watch (usa export/import manual)
- Marketplace de protocolos (Fase 6)
- Geração de cardápio via IA
- Multi-coach com múltiplos atletas

## Roadmap Futuro

- Fase 1: Protocolo Helton ✓
- Fase 2: Protocolo Casal
- Fase 3: Atleta Híbrido
- Fase 4: Emagrecimento
- Fase 5: Hipertrofia
- Fase 6: Marketplace de protocolos

## Setup

1. Configure o Firebase Realtime Database
2. Deploy as security rules: `firebase deploy --only database:rules`
3. Configure o Firebase Storage com regras de privacidade
4. Configure a API key da Anthropic no backend proxy
5. Abra `src/index.html` no navegador

## Checklist Pré-Implementação

- [x] Stack de storage: Firebase Storage com signed URLs
- [x] AI recommendations: Backend proxy (não expor API key no client)
- [x] Decision rules: Seed fixo na v1, UI na v2
- [x] Política de retenção: 90 dias soft-hold, depois purge automático
