// Evaluator-Optimizer
// Padrão 1: Evaluator-Optimizer
// Auto-avaliação de 3 passos para garantir segurança

import { GENERATOR_PROMPT } from './prompts/generator.js';
import { EVALUATOR_PROMPT } from './prompts/evaluator.js';

/**
 * Gera recomendação semanal com Evaluator-Optimizer de 3 passos
 * @param {Object} context - Contexto com dados da semana, perfil, regras
 * @returns {Promise<Object>} - Recomendação avaliada e formatada
 */
async function generateWeeklyRecommendation(context) {
    const MAX_ITERATIONS = 3;
    let draft = null;
    let evaluation = null;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
        // Passo 1: Generator
        draft = await callGenerator(context, evaluation?.feedback || null);
        
        // Passo 2: Evaluator
        evaluation = await callEvaluator(draft, context.user_profile, context.triggered_rules);
        
        const evalResult = JSON.parse(evaluation);
        
        if (evalResult.score >= 85 && evalResult.violations.length === 0) {
            break; // Aprovado
        }
        
        iteration++;
    }

    // Passo 3: Formatar para o banco
    return formatRecommendation(draft, evaluation, iteration);
}

/**
 * Passo 1: Generator
 * Gera rascunho de recomendação
 */
async function callGenerator(context, feedback) {
    const systemPrompt = GENERATOR_PROMPT;
    
    const userPrompt = buildGeneratorPrompt(context, feedback);
    
    // Em produção, chamaria Anthropic API aqui
    // Por enquanto, retorna rascunho local
    return generateLocalDraft(context, feedback);
}

/**
 * Passo 2: Evaluator
 * Avalia rascunho contra critérios de segurança
 */
async function callEvaluator(draft, userProfile, triggeredRules) {
    const systemPrompt = EVALUATOR_PROMPT;
    
    const userPrompt = buildEvaluatorPrompt(draft, userProfile, triggeredRules);
    
    // Em produção, chamaria Anthropic API aqui
    // Por enquanto, retorna avaliação local
    return evaluateLocalDraft(draft, userProfile, triggeredRules);
}

/**
 * Passo 3: Formatter
 * Formata recomendação aprovada para armazenamento
 */
function formatRecommendation(draft, evaluation, iteration) {
    const evalResult = JSON.parse(evaluation);
    
    return {
        recommendation_text: draft,
        evaluation_score: evalResult.score,
        violations: evalResult.violations,
        approved: evalResult.approved,
        iterations: iteration + 1,
        evaluation_complete: iteration < 3 || evalResult.approved,
        created_at: new Date().toISOString()
    };
}

function buildGeneratorPrompt(context, feedback) {
    let prompt = JSON.stringify({
        weekly_summary: context.weekData,
        user_profile: context.userProfile,
        triggered_rules: context.triggered_rules
    });
    
    if (feedback) {
        prompt += `\n\nFEEDBACK DO AVALIADOR ANTERIOR:\n${feedback}`;
    }
    
    return prompt;
}

function buildEvaluatorPrompt(draft, userProfile, triggeredRules) {
    return JSON.stringify({
        draft: draft,
        user_profile: userProfile,
        triggered_rules: triggeredRules,
        safety_criteria: {
            PAIN_SAFETY: { weight: 30, check: 'pain_level > 6' },
            SLEEP_SAFETY: { weight: 25, check: 'sleep_avg < 5.5' },
            INJURY_RESPECT: { weight: 25, check: 'injuries contraindication' },
            NO_MEDICAL_ADVICE: { weight: 10, check: 'no medical advice' },
            DATA_BASED: { weight: 10, check: 'data-based suggestions' }
        }
    });
}

// Implementações locais (placeholder para produção com Anthropic API)
function generateLocalDraft(context, feedback) {
    const { weekData, userProfile, triggeredRules } = context;
    
    let draft = `=== REVISÃO SEMANAL - SEMANA ${context.weekNumber} ===\n\n`;
    
    draft += `RESUMO DA SEMANA\n`;
    draft += `Score de Aderência: ${weekData.adherence_score?.total_score || '--'} / 100\n`;
    draft += `Treinos: ${weekData.data_analysis?.workouts_completed || 0}/${weekData.data_analysis?.workouts_planned || 4} concluídos\n`;
    draft += `Cardio: ${weekData.data_analysis?.cardio_completed || 0}/${weekData.data_analysis?.cardio_planned || 2} concluídos\n`;
    draft += `Sono: ${weekData.data_analysis?.sleep_avg?.toFixed(1) || '--'}h média\n`;
    draft += `Dor: ${weekData.data_analysis?.pain_avg?.toFixed(1) || '--'} média\n\n`;
    
    draft += `PONTOS FORTES\n`;
    if (weekData.data_analysis?.workout_completion_rate >= 75) {
        draft += `- Excelente aderência aos treinos (${weekData.data_analysis.workout_completion_rate.toFixed(0)}%)\n`;
    }
    if (weekData.data_analysis?.sleep_avg >= 6) {
        draft += `- Sono consistente acima de 6h\n`;
    }
    if (weekData.data_analysis?.pain_avg <= 3) {
        draft += `- Nível de dor baixo e controlado\n`;
    }
    
    draft += `\nÁREAS DE MELHORIA\n`;
    if (weekData.data_analysis?.workout_completion_rate < 75) {
        draft += `- Aderência aos treinos abaixo da meta (${weekData.data_analysis.workout_completion_rate.toFixed(0)}%)\n`;
    }
    if (weekData.data_analysis?.sleep_avg < 6) {
        draft += `- Sono abaixo do ideal (${weekData.data_analysis.sleep_avg.toFixed(1)}h)\n`;
    }
    if (weekData.data_analysis?.pain_avg > 4) {
        draft += `- Nível de dor elevado (${weekData.data_analysis.pain_avg.toFixed(1)})\n`;
    }
    
    draft += `\nRECOMENDAÇÕES PARA PRÓXIMA SEMANA\n`;
    
    // Verificar bloqueios de segurança
    const hasPainBlock = triggeredRules?.some(r => r.code === 'PAIN_BLOCKS_PROGRESSION');
    const hasSleepDeficit = triggeredRules?.some(r => r.code === 'SLEEP_DEFICIT');
    
    if (hasPainBlock) {
        draft += `- Priorizar recuperação e redução de dor. NÃO aumentar carga ou intensidade.\n`;
        draft += `- Considerar sessões de mobilidade e alongamento.\n`;
    } else if (hasSleepDeficit) {
        draft += `- Priorizar sono e recuperação. Ajustar horário de treino se necessário.\n`;
        draft += `- Manter carga atual, focar em qualidade de execução.\n`;
    } else {
        draft += `- Manter consistência nos treinos e cardio.\n`;
        draft += `- Focar em qualidade de execução e controle de tempo de descanso.\n`;
    }
    
    draft += `- Garantir hidratação adequada (meta: ${userProfile.name === 'Helton' ? '3L' : '2.5L'} por dia).\n`;
    
    draft += `\nNOTAS DE SEGURANÇA\n`;
    if (hasPainBlock) {
        draft += `⚠️ BLOQUEIO DE PROGRESSÃO: Dor elevada detectada. Priorizar recuperação.\n`;
    }
    if (hasSleepDeficit) {
        draft += `⚠️ Sono insuficiente. Priorizar descanso.\n`;
    }
    if (userProfile.injuries && userProfile.injuries.length > 0) {
        draft += `⚠️ Restrições físicas: ${userProfile.injuries.join(', ')}. Respeitar limitações.\n`;
    }
    
    draft += `\n=== FIM DA REVISÃO ===`;
    
    return draft;
}

function evaluateLocalDraft(draft, userProfile, triggeredRules) {
    let score = 100;
    const violations = [];
    
    // Verificar PAIN_SAFETY
    const hasPainBlock = triggeredRules?.some(r => r.code === 'PAIN_BLOCKS_PROGRESSION');
    if (hasPainBlock) {
        if (draft.toLowerCase().includes('aumentar') || draft.toLowerCase().includes('progressão') || draft.toLowerCase().includes('carga')) {
            score -= 30;
            violations.push({
                criterion: 'PAIN_SAFETY',
                severity: 'critical',
                description: 'Recomendação sugere progressão mas há bloqueio por dor elevada',
                feedback: 'Remover sugestão de progressão. Priorizar recuperação.'
            });
        }
    }
    
    // Verificar SLEEP_SAFETY
    const hasSleepDeficit = triggeredRules?.some(r => r.code === 'SLEEP_DEFICIT');
    if (hasSleepDeficit) {
        if (draft.toLowerCase().includes('intens') || draft.toLowerCase().includes('pesado')) {
            score -= 25;
            violations.push({
                criterion: 'SLEEP_SAFETY',
                severity: 'critical',
                description: 'Recomendação sugere treino intenso mas há déficit de sono',
                feedback: 'Priorizar sono e recuperação. Reduzir intensidade.'
            });
        }
    }
    
    // Verificar INJURY_RESPECT
    if (userProfile.injuries && userProfile.injuries.length > 0) {
        const injuries = userProfile.injuries.join(' ').toLowerCase();
        if (injuries.includes('placa') && (draft.toLowerCase().includes('sprint') || draft.toLowerCase().includes('salto'))) {
            score -= 25;
            violations.push({
                criterion: 'INJURY_RESPECT',
                severity: 'critical',
                description: 'Recomendação sugere sprints/saltos mas usuário tem placa na tíbia',
                feedback: 'Remover exercícios de alto impacto. Respeitar restrição.'
            });
        }
    }
    
    // Verificar NO_MEDICAL_ADVICE
    if (draft.toLowerCase().includes('ibuprofeno') || draft.toLowerCase().includes('medicamento') || draft.toLowerCase().includes('suplemento')) {
        score -= 10;
        violations.push({
            criterion: 'NO_MEDICAL_ADVICE',
            severity: 'moderate',
            description: 'Recomendação contém sugestão médica',
            feedback: 'Remover sugestões de medicamentos ou suplementos.'
        });
    }
    
    const approved = score >= 85 && violations.filter(v => v.severity === 'critical').length === 0;
    
    return JSON.stringify({
        score: Math.max(0, score),
        violations: violations,
        approved: approved,
        feedback: approved ? 'Recomendação aprovada.' : 'Correções necessárias antes da aprovação.'
    });
}

export { generateWeeklyRecommendation };
