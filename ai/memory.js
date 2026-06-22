// Memory Tool
// Padrão 3: Memory Tool
// Contexto persistente do Coach

import { MEMORY_EXTRACTOR_PROMPT } from './prompts/memory_extractor.js';

/**
 * Extrai e salva memórias do contexto do usuário
 * @param {string} userId - ID do usuário
 * @param {Object} weekSummary - Resumo da semana
 * @param {Array} existingMemories - Memórias existentes
 * @returns {Promise<Array>} - Novas memórias salvas
 */
async function extractAndSaveMemories(userId, weekSummary, existingMemories) {
    // Em produção, chamaria Anthropic API aqui
    // Por enquanto, usa extração local
    const newMemories = extractMemoriesLocal(weekSummary, existingMemories);
    
    // Salvar apenas memórias com confidence > 0.7
    const filtered = newMemories.filter(m => m.confidence > 0.7);
    
    // Salvar no Firebase
    for (const memory of filtered) {
        await saveCoachMemory(userId, memory);
    }
    
    return filtered;
}

/**
 * Constrói o system prompt com contexto de memória
 * @param {string} userId - ID do usuário
 * @returns {Promise<string>} - System prompt com memórias injetadas
 */
async function buildCoachSystemPrompt(userId) {
    const memories = await getCoachMemories(userId);
    
    const memoryContext = memories.length > 0 
        ? `\n\nCONTEXTO PERSISTENTE DO USUÁRIO:\n${memories.map(m => `- [${m.memory_type.toUpperCase()}] ${m.content}`).join('\n')}` 
        : '';
    
    return BASE_COACH_PROMPT + memoryContext;
}

/**
 * Extração local de memórias (placeholder para produção com Anthropic API)
 */
function extractMemoriesLocal(weekSummary, existingMemories) {
    const memories = [];
    const existingContent = existingMemories.map(m => m.content);
    
    // Detectar padrão de pular treino em dia específico
    const workoutDays = weekSummary.daily_checkins?.map(c => ({
        day: new Date(c.date).getDay(),
        completed: c.workout_done
    })) || [];
    
    const thursdaySkipCount = workoutDays.filter(d => d.day === 4 && !d.completed).length;
    if (thursdaySkipCount >= 2) {
        const content = `Usuário consistentemente pula treino na quinta-feira (${thursdaySkipCount}/${workSessions})`;
        if (!existingContent.includes(content)) {
            memories.push({
                memory_type: 'pattern',
                content: content,
                confidence: Math.min(0.9, thursdaySkipCount * 0.2),
                evidence: `Dados mostram ${thursdaySkipCount} quintas-feiras sem treino concluído`
            });
        }
    }
    
    // Detectar padrão de baixa energia em dia específico
    const mondayLowEnergy = workoutDays.filter(d => d.day === 1 && d.energy_level < 4).length;
    if (mondayLowEnergy >= 2) {
        const content = 'Usuário relata baixa energia consistentemente na segunda-feira';
        if (!existingContent.includes(content)) {
            memories.push({
                memory_type: 'pattern',
                content: content,
                confidence: Math.min(0.8, mondayLowEnergy * 0.25),
                evidence: `Dados mostram ${mondayLowEnergy} segundas com energia < 4`
            });
        }
    }
    
    // Detectar episódio de dor significativo
    const highPainDays = workoutDays.filter(d => d.pain_level > 6).length;
    if (highPainDays >= 2) {
        const content = `Episódio de dor elevada na semana atual (${highPainDays} dias com dor > 6)`;
        if (!existingContent.includes('dor elevada')) {
            memories.push({
                memory_type: 'history',
                content: content,
                confidence: 0.85,
                evidence: `${highPainDays} dias com dor > 6/10`
            });
        }
    }
    
    // Adicionar flags permanentes do perfil
    const userProfile = weekSummary.user_profile;
    if (userProfile?.injuries && userProfile.injuries.length > 0) {
        for (const injury of userProfile.injuries) {
            const content = `Atenção: ${injury} — restrição permanente`;
            if (!existingContent.includes(injury)) {
                memories.push({
                    memory_type: 'flag',
                    content: content,
                    confidence: 1.0,
                    evidence: 'Perfil do usuário indica restrição permanente'
                });
            }
        }
    }
    
    return memories;
}

/**
 * Salva memória no Firebase
 */
async function saveCoachMemory(userId, memory) {
    const memoryId = generateUUID();
    
    await database.ref('ph_coach_memory').push({
        memory_id: memoryId,
        user_id: userId,
        account_id: userId,
        memory_type: memory.memory_type,
        content: memory.content,
        confidence: memory.confidence,
        created_at: new Date().toISOString(),
        last_confirmed_at: new Date().toISOString(),
        source_week: currentWeek
    });
}

/**
 * Busca memórias do Firebase
 */
async function getCoachMemories(userId) {
    const snapshot = await database.ref('ph_coach_memory')
        .orderByChild('user_id')
        .equalTo(userId)
        .once('value');
    
    const memories = [];
    snapshot.forEach(child => {
        memories.push(child.val());
    });
    
    // Filtrar por confidence > 0.5
    return memories.filter(m => m.confidence > 0.5);
}

/**
 * Base prompt do Coach
 */
const BASE_COACH_PROMPT = `Você é um Coach de Alta Performance do Protocolo Helton. Sua função é fornecer recomendações personalizadas baseadas em dados de check-in, perfil do usuário e contexto histórico.

DIRETRIZES DO PROTOCOLO HELTON:
1. NUNCA sugerir progressão de carga ou intensidade se pain_level > 6
2. Priorizar recuperação se sleep_avg < 5.5h
3. Respeitar restrições físicas (injuries, limitations)
4. Focar em consistência e hábitos, não apenas números
5. Usar linguagem motivacional mas realista
6. Fornecer ações concretas e específicas
7. Considerar contexto histórico e padrões do usuário`;

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export { extractAndSaveMemories, buildCoachSystemPrompt };
