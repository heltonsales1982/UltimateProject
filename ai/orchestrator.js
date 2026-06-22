// Orchestrator for "Finalizei a semana"
// Padrão 2: Orchestrator-Workers
// Coordena 3 workers paralelos e sintetiza resultados

import { runSafetyChecker } from './safety_checker.js';

/**
 * Processa o fim de semana usando Orchestrator-Workers pattern
 * @param {string} userId - ID do usuário
 * @param {number} weekNumber - Número da semana
 * @returns {Promise<Object>} - Recomendação sintetizada
 */
async function processWeekEnd(userId, weekNumber) {
    // Buscar dados
    const weekData = await getWeekData(userId, weekNumber);
    const prevWeekData = await getWeekData(userId, weekNumber - 1);
    const userProfile = await getUserProfile(userId);
    
    // Workers paralelos (Promise.all = execução simultânea)
    const [dataAnalysis, trendAnalysis, safetyCheck] = await Promise.all([
        runDataAnalyst(weekData),
        runTrendAnalyzer(weekData, prevWeekData),
        runSafetyChecker(weekData, userProfile, DECISION_RULES)
    ]);
    
    // Calcular adherence score com dados do Worker 1
    const adherenceScore = calculateAdherenceScore(dataAnalysis);
    await saveAdherenceScore(userId, weekNumber, adherenceScore);
    
    // Orchestrator sintetiza
    const recommendation = await runOrchestrator({
        dataAnalysis,
        trendAnalysis,
        safetyCheck,
        userProfile,
        adherenceScore,
        weekNumber
    });
    
    // Salvar como ai_recommendation com status pending_approval
    return await saveRecommendation(userId, weekNumber, recommendation);
}

/**
 * Worker 1: Data Analyst
 * Extrai métricas brutas dos check-ins
 */
async function runDataAnalyst(weekData) {
    // Calcular métricas localmente (sem IA para performance)
    const dailyCheckins = weekData.daily_checkins || [];
    
    const workoutsCompleted = dailyCheckins.filter(c => c.workout_done).length;
    const workoutsPlanned = weekData.user_profile?.name === 'Helton' ? 4 : 3;
    
    const cardioSessions = weekData.cardio_sessions || [];
    const cardioCompleted = cardioSessions.length;
    const cardioPlanned = weekData.user_profile?.name === 'Helton' ? 2 : 3;
    
    const sleepHours = dailyCheckins.map(c => c.sleep_hours).filter(h => h);
    const sleepAvg = sleepHours.length > 0 ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : 0;
    
    const energyLevels = dailyCheckins.map(c => c.energy_level).filter(e => e);
    const energyAvg = energyLevels.length > 0 ? energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length : 0;
    
    const painLevels = dailyCheckins.map(c => c.pain_level).filter(p => p);
    const painAvg = painLevels.length > 0 ? painLevels.reduce((a, b) => a + b, 0) / painLevels.length : 0;
    const painMax = painLevels.length > 0 ? Math.max(...painLevels) : 0;
    
    const waterLiters = dailyCheckins.map(c => c.water_liters).filter(w => w);
    const waterAvg = waterLiters.length > 0 ? waterLiters.reduce((a, b) => a + b, 0) / waterLiters.length : 0;
    
    return {
        workouts_completed: workoutsCompleted,
        workouts_planned: workoutsPlanned,
        workout_completion_rate: (workoutsCompleted / workoutsPlanned) * 100,
        cardio_completed: cardioCompleted,
        cardio_planned: cardioPlanned,
        cardio_completion_rate: (cardioCompleted / cardioPlanned) * 100,
        sleep_avg: sleepAvg,
        sleep_min: sleepHours.length > 0 ? Math.min(...sleepHours) : 0,
        sleep_max: sleepHours.length > 0 ? Math.max(...sleepHours) : 0,
        energy_avg: energyAvg,
        pain_avg: painAvg,
        pain_max: painMax,
        high_pain_days: painLevels.filter(p => p > 6).length,
        water_avg: waterAvg,
        checkin_days: dailyCheckins.length,
        checkin_rate: (dailyCheckins.length / 7) * 100
    };
}

/**
 * Worker 2: Trend Analyzer
 * Compara semana atual vs anterior
 */
async function runTrendAnalyzer(weekData, prevWeekData) {
    const currentWeight = weekData.weekly_checkin?.weight_kg || 0;
    const prevWeight = prevWeekData?.weekly_checkin?.weight_kg || currentWeight;
    const weightDelta = currentWeight - prevWeight;
    
    const currentAdherence = weekData.adherence_score?.total_score || 0;
    const prevAdherence = prevWeekData?.adherence_score?.total_score || currentAdherence;
    const adherenceDelta = currentAdherence - prevAdherence;
    
    const currentSleep = weekData.data_analysis?.sleep_avg || 0;
    const prevSleep = prevWeekData?.data_analysis?.sleep_avg || currentSleep;
    const sleepDelta = currentSleep - prevSleep;
    
    const currentPain = weekData.data_analysis?.pain_avg || 0;
    const prevPain = prevWeekData?.data_analysis?.pain_avg || currentPain;
    const painDelta = currentPain - prevPain;
    
    const insights = [];
    if (sleepDelta > 0.3) insights.push(`Sono melhorou ${sleepDelta.toFixed(1)}h em média`);
    if (sleepDelta < -0.3) insights.push(`Sono piorou ${Math.abs(sleepDelta).toFixed(1)}h em média`);
    if (painDelta < -0.5) insights.push(`Dor diminuiu ${Math.abs(painDelta).toFixed(1)} pontos (bom sinal)`);
    if (painDelta > 0.5) insights.push(`Dor aumentou ${painDelta.toFixed(1)} pontos (atenção)`);
    
    return {
        weight_delta: weightDelta,
        weight_trend: weightDelta > 0.1 ? 'increasing' : weightDelta < -0.1 ? 'decreasing' : 'stable',
        adherence_delta: adherenceDelta,
        adherence_trend: adherenceDelta > 5 ? 'improving' : adherenceDelta < -5 ? 'declining' : 'stable',
        sleep_delta: sleepDelta,
        sleep_trend: sleepDelta > 0.1 ? 'improving' : sleepDelta < -0.1 ? 'declining' : 'stable',
        pain_delta: painDelta,
        pain_trend: painDelta < -0.1 ? 'improving' : painDelta > 0.1 ? 'worsening' : 'stable',
        insights
    };
}

/**
 * Orchestrator: Sintetiza resultados dos workers
 */
async function runOrchestrator(context) {
    const { dataAnalysis, trendAnalysis, safetyCheck, userProfile, adherenceScore, weekNumber } = context;
    
    // Gerar recomendação baseada nos dados
    let recommendation = {
        week_number: weekNumber,
        status: safetyCheck.has_block ? 'blocked' : 'pending_approval',
        adherence_score: adherenceScore,
        safety_check: safetyCheck,
        data_analysis: dataAnalysis,
        trend_analysis: trendAnalysis,
        recommendation_text: generateRecommendationText(context),
        created_at: new Date().toISOString()
    };
    
    return recommendation;
}

function generateRecommendationText(context) {
    const { dataAnalysis, trendAnalysis, safetyCheck, userProfile } = context;
    
    let text = `=== REVISÃO SEMANAL - SEMANA ${context.weekNumber} ===\n\n`;
    
    // Adherence Score
    text += `Score de Aderência: ${context.adherenceScore.total_score || '--'} / 100\n`;
    text += `Treinos: ${dataAnalysis.workout_completion_rate.toFixed(0)}% (${dataAnalysis.workouts_completed}/${dataAnalysis.workouts_planned})\n`;
    text += `Cardio: ${dataAnalysis.cardio_completion_rate.toFixed(0)}% (${dataAnalysis.cardio_completed}/${dataAnalysis.cardio_planned})\n`;
    text += `Sono: ${dataAnalysis.sleep_avg.toFixed(1)}h média\n`;
    text += `Dor: ${dataAnalysis.pain_avg.toFixed(1)} média\n\n`;
    
    // Tendências
    text += `=== TENDÊNCIAS ===\n`;
    text += `Peso: ${trendAnalysis.weight_delta > 0 ? '+' : ''}${trendAnalysis.weight_delta.toFixed(1)}kg (${trendAnalysis.weight_trend})\n`;
    text += `Aderência: ${trendAnalysis.adherence_trend}\n`;
    text += `Sono: ${trendAnalysis.sleep_trend}\n`;
    text += `Dor: ${trendAnalysis.pain_trend}\n\n`;
    
    // Safety Check
    if (safetyCheck.has_block) {
        text += `⚠️ BLOQUEIO DE PROGRESSÃO: ${safetyCheck.block_reason}\n`;
        text += `Motivo: ${safetyCheck.safety_notes}\n\n`;
    }
    
    // Insights
    if (trendAnalysis.insights.length > 0) {
        text += `=== INSIGHTS ===\n`;
        text += trendAnalysis.insights.map(i => `- ${i}`).join('\n');
        text += '\n\n';
    }
    
    return text;
}

function calculateAdherenceScore(dataAnalysis) {
    const weights = {
        training: 30,
        cardio: 15,
        sleep: 20,
        nutrition: 15,
        hydration: 10,
        consistency: 10
    };
    
    const trainingScore = dataAnalysis.workout_completion_rate;
    const cardioScore = dataAnalysis.cardio_completion_rate;
    const sleepScore = Math.min(dataAnalysis.sleep_avg / 7 * 100, 100);
    const hydrationScore = Math.min(dataAnalysis.water_avg / 3 * 100, 100);
    const consistencyScore = dataAnalysis.checkin_rate;
    
    const totalScore = 
        (trainingScore * weights.training / 100) +
        (cardioScore * weights.cardio / 100) +
        (sleepScore * weights.sleep / 100) +
        (hydrationScore * weights.hydration / 100) +
        (consistencyScore * weights.consistency / 100);
    
    return {
        total_score: Math.round(totalScore),
        training_score: Math.round(trainingScore),
        cardio_score: Math.round(cardioScore),
        sleep_score: Math.round(sleepScore),
        hydration_score: Math.round(hydrationScore),
        consistency_score: Math.round(consistencyScore)
    };
}

// Funções auxiliares para Firebase (serão implementadas)
async function getWeekData(userId, weekNumber) {
    // Implementação para buscar dados do Firebase
    return {};
}

async function getUserProfile(userId) {
    // Implementação para buscar perfil do Firebase
    return {};
}

async function saveAdherenceScore(userId, weekNumber, score) {
    // Implementação para salvar no Firebase
}

async function saveRecommendation(userId, weekNumber, recommendation) {
    // Implementação para salvar no Firebase
}

export { processWeekEnd };
