// AI Coach - Main Integration
// Integra todos os padrões: Evaluator-Optimizer, Orchestrator-Workers, Memory Tool

import { generateWeeklyRecommendation } from './evaluator.js';
import { processWeekEnd } from './orchestrator.js';
import { extractAndSaveMemories, buildCoachSystemPrompt } from './memory.js';

/**
 * AI Coach - Sistema completo de recomendações
 * Integra Evaluator-Optimizer, Orchestrator-Workers e Memory Tool
 */
class AICoach {
    constructor(userId) {
        this.userId = userId;
    }

    /**
     * Processa o fim de semana e gera recomendação completa
     * Usa Orchestrator-Workers pattern
     */
    async processWeekEnd(weekNumber) {
        try {
            // Passo 1: Processar dados com Orchestrator-Workers
            const recommendation = await processWeekEnd(this.userId, weekNumber);
            
            // Passo 2: Extrair e salvar memórias (Memory Tool)
            const existingMemories = await this.getMemories();
            await extractAndSaveMemories(this.userId, recommendation, existingMemories);
            
            return recommendation;
        } catch (error) {
            console.error('Erro ao processar fim de semana:', error);
            throw error;
        }
    }

    /**
     * Gera recomendação semanal com Evaluator-Optimizer
     * Usa auto-avaliação de 3 passos
     */
    async generateRecommendation(context) {
        try {
            // Passo 1: Buscar contexto completo
            const fullContext = await this.buildFullContext(context);
            
            // Passo 2: Gerar com Evaluator-Optimizer
            const recommendation = await generateWeeklyRecommendation(fullContext);
            
            // Passo 3: Salvar recomendação
            await this.saveRecommendation(recommendation);
            
            return recommendation;
        } catch (error) {
            console.error('Erro ao gerar recomendação:', error);
            throw error;
        }
    }

    /**
     * Gera prompt do Coach com contexto de memória
     * Usa Memory Tool para contexto persistente
     */
    async getSystemPrompt() {
        return await buildCoachSystemPrompt(this.userId);
    }

    /**
     * Busca memórias do usuário
     */
    async getMemories() {
        const snapshot = await database.ref('ph_coach_memory')
            .orderByChild('user_id')
            .equalTo(this.userId)
            .once('value');
        
        const memories = [];
        snapshot.forEach(child => {
            memories.push(child.val());
        });
        
        return memories.filter(m => m.confidence > 0.5);
    }

    /**
     * Constrói contexto completo para geração de recomendação
     */
    async buildFullContext(context) {
        const userProfile = await this.getUserProfile();
        const memories = await this.getMemories();
        const triggeredRules = await this.evaluateRules(context.weekData);
        
        return {
            ...context,
            userProfile,
            memories,
            triggeredRules,
            userId: this.userId
        };
    }

    /**
     * Avalia regras de decisão
     */
    async evaluateRules(weekData) {
        const rules = DECISION_RULES;
        const triggered = [];
        
        // Calcular métricas
        const painAvg = this.calculateAverage(weekData.daily_checkins?.map(c => c.pain_level) || []);
        const sleepAvg = this.calculateAverage(weekData.daily_checkins?.map(c => c.sleep_hours) || []);
        const weightDelta = weekData.weight_delta || 0;
        const adherence = weekData.adherence_score || 0;
        
        const context = { pain_avg: painAvg, sleep_avg: sleepAvg, weight_delta: weightDelta, adherence };
        
        for (const rule of rules) {
            if (rule.condition(context)) {
                triggered.push({
                    code: rule.code,
                    priority: rule.priority,
                    action: rule.action,
                    message: rule.message
                });
            }
        }
        
        return triggered;
    }

    /**
     * Salva recomendação no Firebase
     */
    async saveRecommendation(recommendation) {
        await database.ref('ai_recommendations').push({
            user_id: this.userId,
            ...recommendation,
            created_at: new Date().toISOString()
        });
    }

    /**
     * Busca perfil do usuário
     */
    async getUserProfile() {
        const snapshot = await database.ref('users').child(this.userId).once('value');
        return snapshot.val();
    }

    /**
     * Calcula média de array
     */
    calculateAverage(values) {
        if (!values || values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
}

// Exportar para uso no app.js
export { AICoach };
