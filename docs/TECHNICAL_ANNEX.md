# ANEXO TÉCNICO — PROTOCOLO HELTON

### Data Model · Rule Engine · Privacy/LGPD Addendum

**Versão:** 1.0  
**Complementa:** PRD Protocolo Helton v1.0  
**Destinatário:** Devin (diretiva de implementação)  
**Autor:** Arquitetura — Helton Sales

---

## 0. COMO USAR ESTE DOCUMENTO

Este anexo NÃO substitui o PRD. Ele fecha as 3 lacunas que impedem o Devin de implementar sem inventar decisões:

1. Modelo de dados (schema explícito)
2. Motor de decisão (regras como dados, não if/else espalhado)
3. Privacidade/LGPD (fotos corporais = dado sensível de saúde)

Devin deve tratar as seções 1, 2 e 3 como **contrato**, não sugestão.

---

## 1. MODELO DE DADOS

### 1.1 Princípio arquitetural

Toda tabela carrega `tenant_id` (= `account_id`) desde a v1, mesmo havendo hoje apenas 2 perfis. Isso evita reescrita na Fase 6 (Marketplace). `tenant_id` aqui = identificador de "household" ou "coach account", não de empresa.

### 1.2 Entidades principais

```
accounts
├── id (uuid, pk)
├── name
├── created_at
└── plan_type (enum: personal | couple | coach_managed)

users
├── id (uuid, pk)
├── account_id (fk → accounts.id)
├── role (enum: athlete | coach | admin)
├── name
├── sex
├── birth_date
├── height_cm
├── created_at
└── status (active | paused | archived)

user_profiles
├── id (uuid, pk)
├── user_id (fk → users.id)
├── current_weight_kg
├── target_weight_kg
├── goal_type (enum: hybrid_athlete | recomposition | fat_loss | hypertrophy)
├── medications (text, encrypted at rest)
├── injuries (text, encrypted at rest)
├── physical_restrictions (text, encrypted at rest)
└── available_training_windows (jsonb)

assessments
├── id (uuid, pk)
├── user_id (fk)
├── assessment_date
├── weight_kg
├── waist_cm
├── chest_cm
├── arm_cm
├── thigh_cm
├── sleep_hours_avg
├── water_liters_avg
├── steps_avg
├── walk_test_time
├── run_test_time
├── resting_hr
└── notes

assessment_photos
├── id (uuid, pk)
├── assessment_id (fk)
├── angle (enum: front | side | back)
├── storage_ref (não é URL pública)
├── uploaded_at
└── deleted_at (nullable, soft delete obrigatório)

training_weeks
├── id (uuid, pk)
├── user_id (fk)
├── week_number (int, sequencial por usuário)
├── start_date
├── end_date
├── weekly_objective (text)
├── status (enum: planned | active | completed)
└── generated_from_week_id (fk nullable → self)

workouts
├── id (uuid, pk)
├── training_week_id (fk)
├── day_of_week
├── workout_type (enum: upper_a | upper_b | upper_c | lower | cardio_z2 | run_walk | recovery | mobility)
├── max_duration_minutes (default 60)
└── status (planned | done | skipped)

exercises
├── id (uuid, pk)
├── workout_id (fk)
├── name
├── video_url
├── muscle_group
├── sets
├── reps
├── rest_seconds
└── notes

daily_checkins
├── id (uuid, pk)
├── user_id (fk)
├── checkin_date
├── workout_completed (bool)
├── energy_level (int 1-10)
├── pain_level (int 1-10)
├── sleep_hours (decimal)
├── water_liters (decimal)
└── free_text_notes

weekly_checkins
├── id (uuid, pk)
├── user_id (fk)
├── training_week_id (fk)
├── checkin_date (domingo)
├── weight_kg
├── waist_cm
├── sleep_avg
├── steps_avg
├── workouts_completed_count
├── cardio_completed_count
└── photos_ref (fk → assessment_photos)

adherence_scores
├── id (uuid, pk)
├── user_id (fk)
├── training_week_id (fk)
├── training_score (0-100, peso 30%)
├── cardio_score (0-100, peso 25%)
├── sleep_score (0-100, peso 20%)
├── nutrition_score (0-100, peso 15%)
├── hydration_score (0-100, peso 10%)
├── total_score (0-100, calculado)
└── calculated_at

ai_recommendations
├── id (uuid, pk)
├── user_id (fk)
├── training_week_id (fk, semana de origem)
├── triggered_rules (jsonb array)
├── recommendation_summary (text, gerado por IA)
├── proposed_next_week_changes (jsonb)
├── approval_status (enum: pending | approved | rejected | modified)
├── approved_by (fk → users.id, nullable)
└── approved_at (nullable)

decision_rules
├── id (uuid, pk)
├── rule_code (string, único)
├── condition_field (enum: adherence_total | pain_level | sleep_avg | weight_delta_kg)
├── operator (enum: gt | gte | lt | lte | eq | between)
├── threshold_value (decimal)
├── threshold_value_secondary (decimal, nullable)
├── action_code (enum: ALLOW_PROGRESSION | BLOCK_PROGRESSION | PRIORITIZE_RECOVERY | SUGGEST_NUTRITION_REVIEW)
├── priority (int)
└── active (bool)

cardio_sessions
├── id (uuid, pk)
├── user_id (fk)
├── source (enum: apple_health | manual)
├── session_date
├── distance_km
├── duration_minutes
├── avg_hr
├── max_hr
└── pace

nutrition_logs
├── id (uuid, pk)
├── user_id (fk)
├── log_date
├── breakfast
├── lunch
├── dinner
├── snacks
├── protein_g
└── calories

sleep_logs
├── id (uuid, pk)
├── user_id (fk)
├── sleep_date
├── bedtime
├── wake_time
└── total_hours

lgpd_consents
├── id (uuid, pk)
├── user_id (fk)
├── consent_type (enum: training | nutrition | photos | cardio | analytics)
├── granted (bool)
├── granted_at
└── revoked_at (nullable)
```

### 1.3 Regra de integridade não-negociável

Nenhuma tabela de progresso (`training_weeks`, `adherence_scores`, `ai_recommendations`) pode referenciar dados futuros. `generated_from_week_id` sempre aponta para trás.

---

## 2. MOTOR DE DECISÃO — RULE ENGINE SPEC

### 2.1 Por que isso não pode ser if/else no código

O PRD descreve regras em prosa ("se aderência > 85%, permitir progressão"). Se isso for hardcoded, toda mudança de critério exige deploy. Solução: regras como **dados configuráveis**, motor as interpreta.

### 2.2 Schema da tabela de regras

Ver schema acima em `decision_rules`.

### 2.3 Regras iniciais (seed data)

| rule_code | condition | action | priority |
|---|---|---|---|
| PROGRESSION_HIGH_ADHERENCE | adherence_total > 85 | ALLOW_PROGRESSION | 10 |
| PAIN_BLOCKS_PROGRESSION | pain_level > 6 | BLOCK_PROGRESSION | **1** |
| SLEEP_DEFICIT_RECOVERY | sleep_avg < 5.5 | PRIORITIZE_RECOVERY | 2 |
| RAPID_WEIGHT_LOSS_FLAG | weight_delta_kg > 1.5 | SUGGEST_NUTRITION_REVIEW | 5 |

**Regra de precedência:** `BLOCK_PROGRESSION` e `PRIORITIZE_RECOVERY` sempre sobrepõem `ALLOW_PROGRESSION`. Dor > 6 vence aderência de 95%.

### 2.4 Fluxo de execução

1. Weekly checkin é submetido
2. Sistema calcula adherence_scores
3. Motor avalia decision_rules ativas, na ordem de priority
4. Motor gera ai_recommendations.triggered_rules
5. IA Coach usa triggered_rules + dados brutos para gerar recommendation_summary
6. Status = "pending" — NUNCA aplica mudança automaticamente
7. Usuário revisa e muda approval_status para approved/rejected/modified
8. Somente após approval_status = "approved", a próxima training_week é criada

---

## 3. PRIVACY / LGPD ADDENDUM

### 3.1 Classificação de dados

Sob a LGPD (Lei 13.709/2018), **dado de saúde é categoria sensível** (Art. 5º, II). Isso inclui:
- Fotos corporais (frente/lado/costas)
- Medidas corporais associadas a identidade
- Lesões, restrições físicas, medicamentos
- Dados de frequência cardíaca / sono

### 3.2 Requisitos mínimos de implementação

1. **Consentimento explícito e granular** no onboarding
2. **Criptografia em repouso** para assessment_photos, user_profiles.medications, user_profiles.injuries
3. **Storage de fotos isolado** — não usar bucket público com URL previsível. Usar signed URLs com expiração curta (15 min)
4. **Direito de exclusão** — soft delete não basta para fotos; precisa de hard delete real com job de purge
5. **Política de retenção** — 90 dias de soft-hold, depois purge automático
6. **Minimização para Fase 6** — se dados de um usuário forem usados para treinar recomendações de outro, exige novo consentimento específico

### 3.3 Storage técnico de fotos

`storage_ref` NÃO é uma URL pública. Formato sugerido: referência interna (object key em bucket privado) resolvida em tempo de request via endpoint autenticado que:
- valida que o solicitante é o próprio usuário ou seu coach autorizado
- gera signed URL de curtíssima duração
- registra acesso em audit_log

### 3.4 Guardrail do IA Coach

Adicionar ao prompt de sistema do IA Coach:

> "Este sistema não fornece diagnóstico médico, prescrição de suplementação, ou substitui acompanhamento profissional de saúde. Recomendações são baseadas em padrões de dados auto-reportados, não em avaliação clínica."

---

## 4. FORA DE ESCOPO — v1.0

- Integração real-time com Apple Watch (usa export/import manual)
- Marketplace de protocolos (Fase 6)
- Geração de cardápio via IA generativa
- Multi-coach com múltiplos atletas simultâneos

---

## 5. CHECKLIST PRÉ-DEVIN

- [x] Stack de storage: Firebase Storage com signed URLs
- [x] AI recommendations: Backend proxy (não expor API key no client)
- [x] Decision rules: Seed fixo na v1, UI na v2
- [x] Política de retenção: 90 dias soft-hold, depois purge automático
