// Safety Checker Worker
// Padrão 2 - Worker 3: Safety Checker
// Aplica decision_rules, retorna triggered_rules[], identifica bloqueios

import { SAFETY_CHECKER_PROMPT } from './prompts/safety_checker.js';

/**
 * Executa o Safety Checker Worker
 * @param {Object} weekData - Dados da semana (check-ins, métricas)
 * @param {Object} userProfile - Perfil do usuário (injuries, restrições)
 * @param {Array} decisionRules - Regras de decisão do sistema
 * @returns {Promise<Object>} - Resultado da verificação de segurança
 */
async function runSafetyChecker(weekData, userProfile, decisionRules) {
    // Calcular métricas agregadas
    const pain_avg = calculateAverage(weekData.daily_checkins?.map(c => c.pain_level) || []);
    const sleep_avg = calculateAverage(weekData.daily_checkins?.map(c => c.sleep_hours) || []);
    const weight_delta = weekData.weight_delta || 0;
    const adherence = weekData.adherence_score || 0;
    
    // Aplicar regras localmente (sem IA para performance)
    const triggeredRules = [];
    let hasBlock = false;
    let blockReason = '';
    
    for (const rule of decisionRules) {
        const context = {
            pain_avg,
            sleep_avg,
            weight_delta,
            adherence
        };
        
        if (rule.condition(context)) {
            triggeredRules.push({
                code: rule.code,
                priority: rule.priority,
                action: rule.action,
                message: rule.message,
                reason: generateReason(rule.code, context)
            });
            
            if (rule.action === 'BLOCK') {
                hasBlock = true;
                blockReason = rule.message;
            }
        }
    }
    
    // Verificar contraindicações com injuries
    const injuryContradictions = checkInjuryContradictions(userProfile.injuries || [], weekData);
    
    const result = {
        triggered_rules: triggeredRules,
        has_block: hasBlock,
        block_reason: blockReason,
        safe_to_progress: !hasBlock && injuryContradictions.length === 0,
        safety_notes: generateSafetyNotes(triggeredRules, injuryContradictions, userProfile),
        metrics: {
            pain_avg,
            sleep_avg,
            weight_delta,
            adherence
        }
    };
    
    return result;
}

function calculateAverage(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function generateReason(ruleCode, context) {
    const reasons = {
        'PAIN_BLOCKS_PROGRESSION': `pain_avg de ${context.pain_avg.toFixed(1)} excede limite de 6`,
        'SLEEP_DEFICIT': `sleep_avg de ${context.sleep_avg.toFixed(1)}h abaixo de 5.5h`,
        'RAPID_WEIGHT_LOSS': `weight_delta de ${context.weight_delta.toFixed(1)}kg excede 1.5kg`,
        'HIGH_ADHERENCE': `aderência de ${context.adherence.toFixed(0)}% acima de 85%`
    };
    return reasons[ruleCode] || 'Regra acionada';
}

function checkInjuryContradictions(injuries, weekData) {
    const contradictions = [];
    
    // Verificar se há exercícios que contraindicam injuries
    if (injuries.includes('placa_tibia') && weekData.workouts?.some(w => w.includes('sprint') || w.includes('salto'))) {
        contradictions.push('Sprints/saltos contraindicados para placa na tíbia');
    }
    
    if (injuries.includes('dor_panturrilha') && weekData.workouts?.some(w => w.includes('corrida'))) {
        contradictions.push('Corrida pode agravar dor na panturrilha');
    }
    
    return contradictions;
}

function generateSafetyNotes(triggeredRules, injuryContradictions, userProfile) {
    const notes = [];
    
    if (triggeredRules.some(r => r.action === 'BLOCK')) {
        notes.push('Progressão bloqueada devido a condições de segurança.');
    }
    
    if (injuryContradictions.length > 0) {
        notes.push(`Atenção: ${injuryContradictions.join('. ')}`);
    }
    
    if (userProfile.injuries && userProfile.injuries.length > 0) {
        notes.push(`Considerar restrições: ${userProfile.injuries.join(', ')}`);
    }
    
    return notes.join(' ');
}

export { runSafetyChecker };
