# PRD - PROTOCOLO HELTON

Plataforma de Evolução Física Inteligente

Version: 1.0

---

## VISÃO DO PRODUTO

Criar uma plataforma centralizada de acompanhamento físico, saúde e performance que substitua a necessidade de múltiplos aplicativos.

O sistema deverá funcionar como uma clínica digital de alta performance, capaz de acompanhar o usuário diariamente, analisar sua evolução semanalmente e gerar recomendações personalizadas para a próxima semana.

O objetivo não é fornecer um plano fixo.

O objetivo é criar um protocolo vivo que evolui conforme os resultados reais do usuário.

---

## OBJETIVOS PRINCIPAIS

### Perfil 1 - Helton

**Objetivo:**
Construção de um atleta híbrido.

**Metas:**
- Peso atual: 92kg
- Peso alvo: 82kg a 84kg
- Redução de gordura corporal
- Preservação de massa muscular
- Desenvolvimento gradual da corrida
- Evolução para 10km contínuos
- Melhoria do sono
- Melhoria da longevidade
- Melhoria da saúde cardiovascular

**Restrições:**
- Placa na tíbia
- Histórico de dor em panturrilhas
- Rotina de trabalho presencial
- Treinos realizados à noite

### Perfil 2 - Esposa

**Objetivo:**
Recomposição corporal.

**Metas:**
- Manter aproximadamente 60kg
- Reduzir percentual de gordura
- Aumentar massa magra
- Melhorar definição muscular
- Melhorar condicionamento físico

---

## PRINCÍPIOS DO SISTEMA

O sistema não deverá:
- Prometer resultados irreais
- Utilizar estratégias extremas
- Aplicar progressões automáticas sem critérios

O sistema deverá:
- Basear decisões em dados
- Evoluir gradualmente
- Priorizar segurança
- Priorizar aderência
- Priorizar saúde de longo prazo

---

## ARQUITETURA

### Módulo de Usuários

**Cadastro:**
- Nome
- Sexo
- Idade
- Altura
- Peso
- Objetivos
- Restrições físicas
- Lesões
- Medicamentos
- Horários disponíveis

### Módulo de Avaliação Inicial

**Coletar:**

**Dados Corporais:**
- Peso
- Abdômen
- Peitoral
- Braço
- Coxa

**Fotos:**
- Frente
- Lado
- Costas

**Hábitos:**
- Sono
- Alimentação
- Água
- Passos

**Performance:**
- Tempo de caminhada
- Tempo de corrida
- Frequência cardíaca
- Treinos realizados

### DASHBOARD PRINCIPAL

**Exibir:**
- Peso atual
- Meta atual
- Semana atual
- Próximo treino
- Último check-in
- Evolução semanal
- Score de aderência

### MÓDULO DE TREINOS

Cada semana possui:
- Objetivos da semana
- Treinos programados
- Cardios programados
- Dias de descanso

Cada exercício deve conter:
- Nome
- Vídeo demonstrativo
- Grupo muscular
- Séries
- Repetições
- Descanso
- Observações

Tempo máximo por treino: 60 minutos

### TREINO BASE - HELTON

**Segunda:** Upper A - Peito + Costas + Core
**Terça:** Cardio Base - Zona 2
**Quarta:** Upper B - Ombros + Braços
**Quinta:** Lower - Pernas + Core
**Sexta:** Upper C - Costas + Estabilidade
**Sábado:** Run / Walk
**Domingo:** Recuperação

### TREINO BASE - ESPOSA

**Segunda:** Upper Feminino
**Terça:** Cardio Leve
**Quarta:** Glúteos + Posteriores
**Quinta:** Mobilidade + Caminhada
**Sexta:** Lower Feminino
**Sábado:** Cardio
**Domingo:** Recuperação

### MÓDULO DE NUTRIÇÃO

Não utilizar dietas radicais.

**Criar:**
- Plano alimentar
- Distribuição de proteínas
- Controle hídrico
- Sugestões de refeições

**Registrar:**
- Café da manhã
- Almoço
- Jantar
- Lanches

**Controle:**
- Proteína diária
- Água diária

### MÓDULO DE SONO

**Registrar:**
- Hora de dormir
- Hora de acordar
- Horas totais

**Gerar:**
- Média semanal
- Tendência de melhora
- Alertas de recuperação

### MÓDULO DE CARDIO

Integração Apple Watch

**Registrar:**
- Distância
- Tempo
- FC média
- FC máxima
- Ritmo

### CHECK-IN DIÁRIO

**Perguntas:**
- Treino concluído? (Sim / Não)
- Energia (1 a 10)
- Dor (1 a 10)
- Sono (Horas)
- Água (Litros)
- Observações (Texto livre)

### CHECK-IN SEMANAL

Executado aos domingos.

**Coletar:**
- Peso
- Circunferência abdominal
- Fotos
- Média de sono
- Média de passos
- Cardios concluídos
- Treinos concluídos

### SCORE DE ADERÊNCIA

**Composição:**
- Treinos: 30%
- Cardio: 25%
- Sono: 20%
- Nutrição: 15%
- Hidratação: 10%

**Resultado:** 0 a 100

### MOTOR DE DECISÃO

**Objetivo:**
Gerar recomendação da próxima semana.

Nunca alterar automaticamente.

**Gerar:**
- Resumo da semana
- Pontos positivos
- Pontos de atenção
- Sugestão da próxima semana

**Exemplos:**
- Se aderência > 85%: Permitir progressão
- Se dor > 6: Bloquear progressão
- Se sono < 5h30: Priorizar recuperação
- Se perda de peso > 1,5kg: Sugerir revisão alimentar

### IA COACH

Chat integrado.

**Capacidade:**
- Analisar check-ins
- Analisar fotos
- Analisar métricas
- Responder dúvidas
- Gerar relatórios

**Comando:** "Finalizei a semana."

**Resultado:**
- Relatório completo da semana
- Sugestão da Semana +1

### HISTÓRICO

**Guardar:**
- Semana 0
- Semana 1
- Semana 2
- Semana N

**Permitir comparação:**
- Fotos
- Peso
- Medidas
- Cardio
- Sono

---

## ROADMAP FUTURO

**Fase 1:** Protocolo Helton
**Fase 2:** Protocolo Casal
**Fase 3:** Atleta Híbrido
**Fase 4:** Emagrecimento
**Fase 5:** Hipertrofia
**Fase 6:** Marketplace de protocolos

---

## REGRA MAIS IMPORTANTE

O sistema nunca deve assumir evolução futura.

Toda semana deverá ser construída utilizando:
- resultados da semana anterior
- métricas reais
- fotos reais
- aderência real

Sem previsões fictícias.
Sem progressões arbitrárias.
Sem promessas irreais.

Toda evolução deve ser baseada em evidências coletadas do próprio usuário.
