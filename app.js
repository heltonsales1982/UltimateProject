// Protocolo Helton - Single Page Application
// Firebase-based architecture with AI Coach integration

const APP_CONFIG = {
    version: "2.0.0",
    users: {
        helton: {
            name: "Helton",
            age: 44,
            height_cm: 183,
            initial_weight_kg: 92,
            target_weight_min_kg: 82,
            target_weight_max_kg: 84,
            restrictions: ["placa_tibia", "dor_panturrilha"],
            training_window: "evening"
        },
        esposa: {
            name: "Esposa",
            age: 29,
            initial_weight_kg: 60,
            target_weight_kg: 60,
            goal_type: "recomposition"
        }
    }
};

let activeUser = "helton";
let currentWeek = 1;
let workoutDone = false;
let currentUser = null;
let aiCoach = null;

// Decision Engine
const DECISION_RULES = [
    { code: "PAIN_BLOCKS_PROGRESSION", priority: 1, condition: (d) => d.pain_avg > 6, action: "BLOCK", message: "Dor elevada - Progressão bloqueada" },
    { code: "SLEEP_DEFICIT", priority: 2, condition: (d) => d.sleep_avg < 5.5, action: "RECOVER", message: "Sono insuficiente - Priorize recuperação" },
    { code: "RAPID_WEIGHT_LOSS", priority: 3, condition: (d) => d.weight_delta > 1.5, action: "REVIEW", message: "Perda rápida - Revisar nutrição" },
    { code: "HIGH_ADHERENCE", priority: 10, condition: (d) => d.adherence > 85, action: "PROGRESS", message: "Aderência excelente - Progressão disponível" }
];

function evaluateWeek(data) {
    const triggered = DECISION_RULES.filter(r => r.condition(data)).sort((a,b) => a.priority - b.priority);
    return {
        triggered: triggered.map(r => r.code),
        action: triggered.length > 0 ? triggered[0].action : "MAINTAIN",
        messages: triggered.map(r => r.message)
    };
}

// Workout Templates
const WORKOUTS = {
    helton: {
        1: { 
            type: "Upper A", 
            sub: "Peito + Costas + Core", 
            time: 55,
            exercises: [
                { name: "Supino Reto", sets: 4, reps: 8, rest: 90, execution: "", notes: "Escápulas retraídas", muscle: "Peito" },
                { name: "Supino Inclinado com Halteres", sets: 3, reps: 10, rest: 60, execution: "", notes: "", muscle: "Peito" },
                { name: "Puxada Frontal", sets: 4, reps: 10, rest: 60, execution: "", notes: "", muscle: "Costas" },
                { name: "Remada Curvada", sets: 3, reps: 10, rest: 90, execution: "", notes: "", muscle: "Costas" },
                { name: "Peck Deck", sets: 3, reps: 12, rest: 45, execution: "", notes: "", muscle: "Peito" },
                { name: "Prancha", sets: 3, reps: "30s", rest: 30, execution: "", notes: "", muscle: "Core" }
            ]
        },
        2: { 
            type: "Cardio Base", 
            sub: "Zona 2 - 40 minutos", 
            time: 40, 
            cardio: true,
            exercises: [
                { name: "Caminhada Zona 2", sets: 1, reps: "40min", rest: 0, execution: "Conseguir conversar durante o exercício", notes: "Apple Watch: FC entre 120-140 bpm. Sem corrida.", muscle: "Cardio" }
            ]
        },
        3: { 
            type: "Upper B", 
            sub: "Ombros + Braços", 
            time: 55,
            exercises: [
                { name: "Desenvolvimento com Halteres", sets: 4, reps: 10, rest: 60, execution: "", notes: "", muscle: "Ombros" },
                { name: "Elevação Lateral", sets: 3, reps: 12, rest: 45, execution: "", notes: "", muscle: "Ombros" },
                { name: "Rosca Direta Barra W", sets: 3, reps: 12, rest: 45, execution: "", notes: "", muscle: "Bíceps" },
                { name: "Rosca Martelo", sets: 3, reps: 12, rest: 45, execution: "", notes: "", muscle: "Bíceps" },
                { name: "Tríceps Corda", sets: 3, reps: 12, rest: 45, execution: "", notes: "", muscle: "Tríceps" },
                { name: "Tríceps Pulley", sets: 3, reps: 12, rest: 45, execution: "", notes: "", muscle: "Tríceps" }
            ]
        },
        4: { 
            type: "Lower", 
            sub: "Pernas + Core", 
            time: 60,
            exercises: [
                { name: "Agachamento Smith", sets: 4, reps: 10, rest: 90, execution: "", notes: "", muscle: "Quadríceps" },
                { name: "Leg Press 45°", sets: 4, reps: 12, rest: 60, execution: "", notes: "", muscle: "Quadríceps" },
                { name: "Stiff", sets: 3, reps: 10, rest: 90, execution: "", notes: "", muscle: "Posterior" },
                { name: "Mesa Flexora", sets: 3, reps: 12, rest: 60, execution: "", notes: "", muscle: "Posterior" },
                { name: "Panturrilha em Pé", sets: 4, reps: 15, rest: 45, execution: "2s subindo, 1s segurando, 3s descendo", notes: "", muscle: "Panturrilha" },
                { name: "Prancha", sets: 3, reps: "40s", rest: 30, execution: "", notes: "", muscle: "Core" }
            ]
        },
        5: { 
            type: "Upper C", 
            sub: "Costas + Estabilidade", 
            time: 50,
            exercises: [
                { name: "Puxada Frontal", sets: 4, reps: 10, rest: 60, execution: "", notes: "", muscle: "Costas" },
                { name: "Remada Máquina", sets: 3, reps: 12, rest: 60, execution: "", notes: "", muscle: "Costas" },
                { name: "Face Pull", sets: 3, reps: 15, rest: 45, execution: "", notes: "", muscle: "Ombros" },
                { name: "Farmer Walk", sets: 3, reps: "3 voltas 30m", rest: 60, execution: "", notes: "", muscle: "Estabilidade" },
                { name: "Alongamento", sets: 1, reps: "10min", rest: 0, execution: "", notes: "", muscle: "Mobilidade" }
            ]
        },
        6: { 
            type: "Corrida Iniciante", 
            sub: "Run/Walk - 1min corrida / 2min caminhada (10x)", 
            time: 30, 
            cardio: true,
            exercises: [
                { name: "Run/Walk", sets: 10, reps: "1min corrida + 2min caminhada", rest: 0, execution: "Total: 10min corrida, 20min caminhada", notes: "", muscle: "Cardio" }
            ]
        },
        0: { 
            type: "Recuperação", 
            sub: "Opcional - Caminhada leve, Alongamento, Mobilidade", 
            time: 30,
            exercises: [
                { name: "Caminhada Leve", sets: 1, reps: "Opcional", rest: 0, execution: "", notes: "Sem corrida, sem musculação", muscle: "Recuperação" },
                { name: "Alongamento", sets: 1, reps: "Opcional", rest: 0, execution: "", notes: "", muscle: "Mobilidade" }
            ]
        }
    },
    esposa: {
        1: { 
            type: "Superior Feminino", 
            sub: "", 
            time: 50,
            exercises: [
                { name: "Puxada Frontal", sets: 3, reps: 12, rest: 60, execution: "", notes: "", muscle: "Costas" },
                { name: "Remada Baixa", sets: 3, reps: 12, rest: 60, execution: "", notes: "", muscle: "Costas" },
                { name: "Desenvolvimento", sets: 3, reps: 12, rest: 60, execution: "", notes: "", muscle: "Ombros" },
                { name: "Elevação Lateral", sets: 3, reps: 15, rest: 45, execution: "", notes: "", muscle: "Ombros" },
                { name: "Tríceps Corda", sets: 3, reps: 12, rest: 45, execution: "", notes: "", muscle: "Tríceps" },
                { name: "Rosca Direta", sets: 3, reps: 12, rest: 45, execution: "", notes: "", muscle: "Bíceps" }
            ]
        },
        2: { 
            type: "Caminhada", 
            sub: "", 
            time: 35, 
            cardio: true,
            exercises: [
                { name: "Caminhada", sets: 1, reps: "35min", rest: 0, execution: "", notes: "", muscle: "Cardio" }
            ]
        },
        3: { 
            type: "Glúteos e Posteriores", 
            sub: "", 
            time: 55,
            exercises: [
                { name: "Hip Thrust", sets: 4, reps: 12, rest: 60, execution: "", notes: "", muscle: "Glúteos" },
                { name: "Stiff", sets: 3, reps: 12, rest: 60, execution: "", notes: "", muscle: "Posterior" },
                { name: "Afundo", sets: 3, reps: "12 cada perna", rest: 60, execution: "", notes: "", muscle: "Glúteos" },
                { name: "Mesa Flexora", sets: 3, reps: 12, rest: 60, execution: "", notes: "", muscle: "Posterior" },
                { name: "Abdutora", sets: 3, reps: 15, rest: 45, execution: "", notes: "", muscle: "Glúteos" }
            ]
        },
        4: { 
            type: "Mobilidade + Caminhada", 
            sub: "", 
            time: 40,
            exercises: [
                { name: "Mobilidade", sets: 1, reps: "20min", rest: 0, execution: "", notes: "", muscle: "Mobilidade" },
                { name: "Caminhada", sets: 1, reps: "20min", rest: 0, execution: "", notes: "", muscle: "Cardio" }
            ]
        },
        5: { 
            type: "Inferiores", 
            sub: "", 
            time: 55,
            exercises: [
                { name: "Agachamento", sets: 4, reps: 10, rest: 90, execution: "", notes: "", muscle: "Quadríceps" },
                { name: "Leg Press", sets: 4, reps: 12, rest: 60, execution: "", notes: "", muscle: "Quadríceps" },
                { name: "Extensora", sets: 3, reps: 12, rest: 45, execution: "", notes: "", muscle: "Quadríceps" },
                { name: "Flexora", sets: 3, reps: 12, rest: 45, execution: "", notes: "", muscle: "Posterior" },
                { name: "Panturrilha", sets: 4, reps: 15, rest: 45, execution: "", notes: "", muscle: "Panturrilha" }
            ]
        },
        6: { 
            type: "Cardio Leve", 
            sub: "", 
            time: 30, 
            cardio: true,
            exercises: [
                { name: "Cardio Leve", sets: 1, reps: "30min", rest: 0, execution: "", notes: "", muscle: "Cardio" }
            ]
        },
        0: { 
            type: "Recuperação", 
            sub: "", 
            time: 30,
            exercises: []
        }
    }
};

// Weekly Objectives
const WEEKLY_OBJECTIVES = {
    helton: {
        workouts: "4/4",
        cardio: "2/2",
        steps: "9.000/dia",
        sleep: "6h30",
        water: "3L",
        weight_target: "-0,5kg"
    },
    esposa: {
        workouts: "3/3",
        cardio: "3/3",
        sleep: "7h",
        water: "2,5L",
        protein: "Adequada"
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Check Firebase initialization
    if (typeof firebase === 'undefined') {
        console.error('Firebase not initialized. Please configure firebase-config.js');
        alert('Firebase não configurado. Por favor, configure o arquivo firebase-config.js com suas credenciais.');
        return;
    }
    
    // Auth state observer
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            activeUser = localStorage.getItem('ph_user') || 'helton';
            currentWeek = parseInt(localStorage.getItem('ph_week')) || 1;
            
            // Initialize AI Coach
            try {
                const { AICoach } = await import('./ai/coach.js');
                aiCoach = new AICoach(currentUser.uid);
            } catch (error) {
                console.warn('AI Coach module not available:', error);
            }
            
            updateUserSelector();
            loadDashboard();
            renderWeekCalendar();
            renderWorkouts();
            loadCardioHistory();
            loadHistoryWeeks();
        } else {
            // Show login screen
            showLoginScreen();
        }
    });
    
    const savedTheme = localStorage.getItem('ph_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
});

// Login Screen
function showLoginScreen() {
    document.querySelector('.app').innerHTML = `
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px">
            <div class="card" style="max-width:400px;width:100%">
                <h1 style="text-align:center;margin-bottom:20px">Protocolo Helton</h1>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" id="login-email" placeholder="seu@email.com">
                </div>
                <div class="form-group">
                    <label class="form-label">Senha</label>
                    <input type="password" class="form-input" id="login-password" placeholder="••••••••">
                </div>
                <button class="btn" onclick="handleLogin()">Entrar</button>
                <button class="btn btn-secondary" onclick="handleRegister()" style="margin-top:12px">Criar Conta</button>
            </div>
        </div>
    `;
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert('Erro ao fazer login: ' + error.message);
    }
}

async function handleRegister() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Validação básica
    if (!email || !password) {
        return alert('Preencha email e senha');
    }
    if (password.length < 6) {
        return alert('A senha deve ter pelo menos 6 caracteres');
    }
    
    try {
        await auth.createUserWithEmailAndPassword(email, password);
        // Create user profile in database
        const user = auth.currentUser;
        await database.ref('users/' + user.uid).set({
            email: email,
            created_at: new Date().toISOString(),
            active_user: 'helton',
            current_week: 1
        });
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            alert('Este email já está cadastrado. Tente fazer login.');
        } else if (error.code === 'auth/weak-password') {
            alert('A senha é muito fraca. Use pelo menos 6 caracteres.');
        } else if (error.code === 'auth/invalid-email') {
            alert('Email inválido. Verifique o formato.');
        } else {
            alert('Erro ao criar conta: ' + error.message);
        }
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        currentUser = null;
        location.reload();
    } catch (error) {
        alert('Erro ao fazer logout: ' + error.message);
    }
}

// Navigation - Updated for new sidebar system
function nav(page) {
    // Map old page names to new module names
    const moduleMap = {
        'dashboard': 'dashboard',
        'week': 'treinos',
        'workouts': 'treinos',
        'cardio': 'cardio',
        'nutrition': 'nutricao',
        'sleep': 'sono',
        'evolution': 'evolucao',
        'photos': 'fotos',
        'checkin': 'checkin',
        'history': 'historico'
    };
    
    const moduleName = moduleMap[page] || page;
    
    if (window.ProtoNav) {
        window.ProtoNav.go(moduleName);
    }
    
    if (page === 'evolution') loadEvolutionChart();
    if (page === 'checkin') {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('checkin-date').textContent = today.toLocaleDateString('pt-BR', options);
    }
}

// User Switching
function switchUser(user) {
    activeUser = user;
    localStorage.setItem('ph_user', user);
    updateUserSelector();
    loadDashboard();
    renderWorkouts();
}

function updateUserSelector() {
    document.querySelectorAll('.user-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.user === activeUser);
    });
}

// Theme Toggle
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ph_theme', next);
}

// Mobile Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

// Dashboard
async function loadDashboard() {
    if (!currentUser) return;
    
    const user = APP_CONFIG.users[activeUser];
    const container = document.getElementById('metrics-container');
    
    // Load latest weekly checkin from Firebase
    const checkinSnapshot = await database.ref('weekly_checkins')
        .orderByChild('user_id')
        .equalTo(currentUser.uid + '_' + activeUser)
        .limitToLast(1)
        .once('value');
    
    let latestCheckin = null;
    checkinSnapshot.forEach(child => {
        latestCheckin = child.val();
    });
    
    const currentWeight = latestCheckin?.weight_kg || user.initial_weight_kg;
    const weightLost = user.initial_weight_kg - currentWeight;
    
    container.innerHTML = `
        <div class="metric">
            <div class="metric-label">Peso Atual</div>
            <div class="metric-value">${currentWeight} kg</div>
        </div>
        <div class="metric">
            <div class="metric-label">Meta</div>
            <div class="metric-value">${activeUser === 'helton' ? '82-84' : '60'} kg</div>
        </div>
        <div class="metric">
            <div class="metric-label">Semana</div>
            <div class="metric-value">${currentWeek}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Perdido</div>
            <div class="metric-value">${weightLost.toFixed(1)} kg</div>
        </div>
    `;
    
    // Adherence Score from Firebase
    const scoreSnapshot = await database.ref('adherence_scores')
        .orderByChild('user_id')
        .equalTo(currentUser.uid + '_' + activeUser)
        .once('value');
    
    let score = null;
    scoreSnapshot.forEach(child => {
        if (child.val().week_number === currentWeek) {
            score = child.val();
        }
    });
    
    const totalScore = score?.total_score || 0;
    const circumference = 2 * Math.PI * 88; // r=88
    const offset = circumference - (totalScore / 100) * circumference;
    
    // Determine color based on score
    let ringColor = 'var(--color-danger)';
    if (totalScore >= 85) ringColor = 'var(--color-accent)';
    else if (totalScore >= 60) ringColor = 'var(--color-warning)';
    
    document.getElementById('adherence-container').innerHTML = `
        <div class="adherence-ring-container">
            <svg class="adherence-ring-svg" width="200" height="200" viewBox="0 0 200 200">
                <circle class="adherence-ring-bg" cx="100" cy="100" r="88"></circle>
                <circle class="adherence-ring-progress" cx="100" cy="100" r="88"
                    stroke="${ringColor}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"
                    style="--score-offset: ${offset}px"></circle>
            </svg>
            <div class="adherence-ring-center">
                <div class="adherence-ring-score">${totalScore || '--'}</div>
                <div class="adherence-ring-label">Score</div>
            </div>
        </div>
        <div>
            <div style="margin-bottom:8px">
                <span style="color:${score?.training_score >= 85 ? 'var(--color-accent)' : score?.training_score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'}">
                    ${score?.training_score || '--'}%
                </span> Treinos
            </div>
            <div style="margin-bottom:8px">
                <span style="color:${score?.cardio_score >= 85 ? 'var(--color-accent)' : score?.cardio_score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'}">
                    ${score?.cardio_score || '--'}%
                </span> Cardio
            </div>
            <div style="margin-bottom:8px">
                <span style="color:${score?.sleep_score >= 85 ? 'var(--color-accent)' : score?.sleep_score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'}">
                    ${score?.sleep_score || '--'}%
                </span> Sono
            </div>
            <div style="margin-bottom:8px">
                <span style="color:${score?.nutrition_score >= 85 ? 'var(--color-accent)' : score?.nutrition_score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'}">
                    ${score?.nutrition_score || '--'}%
                </span> Nutrição
            </div>
            <div>
                <span style="color:${score?.hydration_score >= 85 ? 'var(--color-accent)' : score?.hydration_score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'}">
                    ${score?.hydration_score || '--'}%
                </span> Hidratação
            </div>
        </div>
    `;
    
    // Weekly Objectives
    const objectives = WEEKLY_OBJECTIVES[activeUser];
    const objectivesContainer = document.getElementById('weekly-objectives-content');
    
    if (activeUser === 'helton') {
        objectivesContainer.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
                <div><strong>Treinos:</strong> ${objectives.workouts}</div>
                <div><strong>Cardio:</strong> ${objectives.cardio}</div>
                <div><strong>Passos:</strong> ${objectives.steps}</div>
                <div><strong>Sono:</strong> ${objectives.sleep}</div>
                <div><strong>Água:</strong> ${objectives.water}</div>
                <div><strong>Meta Peso:</strong> ${objectives.weight_target}</div>
            </div>
        `;
    } else {
        objectivesContainer.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
                <div><strong>Treinos:</strong> ${objectives.workouts}</div>
                <div><strong>Cardio:</strong> ${objectives.cardio}</div>
                <div><strong>Sono:</strong> ${objectives.sleep}</div>
                <div><strong>Água:</strong> ${objectives.water}</div>
                <div><strong>Proteína:</strong> ${objectives.protein}</div>
            </div>
        `;
    }
}

// Week Calendar
function renderWeekCalendar() {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const container = document.getElementById('week-calendar');
    const today = new Date().getDay();
    
    container.innerHTML = days.map((day, i) => {
        const workout = WORKOUTS[activeUser][i];
        return `
            <div class="day-card ${i === today ? 'today' : ''}" onclick="showDayDetails(${i})">
                <div class="day-name">${day}</div>
                <div class="day-workout">${workout.type}</div>
                <div class="day-workout" style="color:var(--text2)">${workout.sub}</div>
                <div style="font-size:10px;color:var(--accent)">${workout.time} min</div>
            </div>
        `;
    }).join('');
}

function showDayDetails(dayIndex) {
    const workout = WORKOUTS[activeUser][dayIndex];
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    const exercisesHTML = workout.exercises && workout.exercises.length > 0 
        ? workout.exercises.map(e => `
            <div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                    <strong>${e.name}</strong>
                    <span style="font-size:11px;color:var(--accent)">${e.muscle}</span>
                </div>
                <div style="font-size:13px;color:var(--text2);margin-bottom:4px">
                    ${e.sets}x${e.reps} | Descanso: ${e.rest}s
                </div>
                ${e.execution ? `<div style="font-size:12px;color:var(--text2);margin-bottom:4px"><em>Execução: ${e.execution}</em></div>` : ''}
                ${e.notes ? `<div style="font-size:12px;color:var(--text2)"><em>Obs: ${e.notes}</em></div>` : ''}
            </div>
        `).join('')
        : '<p style="color:var(--text2)">Nenhum exercício específico</p>';
    
    document.getElementById('day-detail-title').textContent = `${days[dayIndex]} - ${workout.type}`;
    document.getElementById('day-detail-content').innerHTML = `
        <p style="color:var(--text2);margin-bottom:16px">${workout.sub}</p>
        <p style="font-size:14px;margin-bottom:16px">Tempo estimado: ${workout.time} minutos</p>
        ${exercisesHTML}
    `;
    document.getElementById('day-details').style.display = 'block';
}

// Workouts
function renderWorkouts() {
    const container = document.getElementById('workouts-list');
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    container.innerHTML = Object.entries(WORKOUTS[activeUser]).map(([day, w]) => {
        const exercisesHTML = w.exercises && w.exercises.length > 0 
            ? w.exercises.map(e => `
                <div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:8px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                        <strong>${e.name}</strong>
                        <span style="font-size:var(--text-xs);color:var(--accent)">${e.muscle}</span>
                    </div>
                    <div style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:4px">
                        ${e.sets}x${e.reps} | Descanso: ${e.rest}s
                    </div>
                    ${e.execution ? `<div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px"><em>Execução: ${e.execution}</em></div>` : ''}
                    ${e.notes ? `<div style="font-size:var(--text-xs);color:var(--color-text-secondary)"><em>Obs: ${e.notes}</em></div>` : ''}
                </div>
            `).join('')
            : '<p style="color:var(--color-text-secondary)">Nenhum exercício específico</p>';
        
        return `
            <div class="card workout-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                    <h3 style="font-size:var(--text-lg);margin:0">${days[parseInt(day)]} - ${w.type}</h3>
                    <span style="font-size:var(--text-sm);color:var(--color-accent);font-family:var(--font-mono)">${w.time} min</span>
                </div>
                <p style="color:var(--color-text-secondary);margin-bottom:16px;font-size:var(--text-sm)">${w.sub}</p>
                ${exercisesHTML}
            </div>
        `;
    }).join('');
}

// Cardio
async function saveCardio() {
    if (!currentUser) return alert('Faça login primeiro');
    
    const dist = parseFloat(document.getElementById('cardio-dist').value);
    const time = parseInt(document.getElementById('cardio-time').value);
    
    if (!dist || !time) return alert('Preencha todos os campos');
    
    await database.ref('cardio_sessions').push({
        user_id: currentUser.uid + '_' + activeUser,
        date: new Date().toISOString().split('T')[0],
        distance_km: dist,
        duration_min: time
    });
    
    document.getElementById('cardio-dist').value = '';
    document.getElementById('cardio-time').value = '';
    loadCardioHistory();
    alert('Sessão salva!');
}

async function loadCardioHistory() {
    if (!currentUser) return;
    
    const snapshot = await database.ref('cardio_sessions')
        .orderByChild('user_id')
        .equalTo(currentUser.uid + '_' + activeUser)
        .limitToLast(5)
        .once('value');
    
    const sessions = [];
    snapshot.forEach(child => {
        sessions.push(child.val());
    });
    sessions.reverse();
    
    document.getElementById('cardio-list').innerHTML = sessions.length 
        ? sessions.map(s => `
            <div class="card">
                <p>${s.date}: ${s.distance_km}km em ${s.duration_min}min</p>
            </div>
        `).join('')
        : '<p style="color:var(--text2)">Nenhuma sessão registrada</p>';
}

// Nutrition
async function saveNutrition() {
    if (!currentUser) return alert('Faça login primeiro');
    
    const log = document.getElementById('nut-log').value;
    const water = parseFloat(document.getElementById('nut-water').value);
    
    await database.ref('nutrition_logs').push({
        user_id: currentUser.uid + '_' + activeUser,
        date: new Date().toISOString().split('T')[0],
        log: log,
        water_liters: water
    });
    
    document.getElementById('nut-log').value = '';
    document.getElementById('nut-water').value = '';
    alert('Registro salvo!');
}

// Sleep
async function saveSleep() {
    if (!currentUser) return alert('Faça login primeiro');
    
    const hours = parseFloat(document.getElementById('sleep-hours').value);
    
    await database.ref('sleep_logs').push({
        user_id: currentUser.uid + '_' + activeUser,
        date: new Date().toISOString().split('T')[0],
        total_hours: hours
    });
    
    document.getElementById('sleep-hours').value = '';
    alert('Registro salvo!');
}

// Check-in
function setWorkout(done) {
    workoutDone = done;
    document.getElementById('workout-yes').classList.toggle('active', done);
    document.getElementById('workout-no').classList.toggle('active', !done);
}

async function submitCheckin() {
    if (!currentUser) return alert('Faça login primeiro');
    
    const energy = parseInt(document.getElementById('energy').value);
    const pain = parseInt(document.getElementById('pain').value);
    const sleep = parseFloat(document.getElementById('checkin-sleep').value);
    const water = parseFloat(document.getElementById('checkin-water').value);
    
    await database.ref('daily_checkins').push({
        user_id: currentUser.uid + '_' + activeUser,
        date: new Date().toISOString().split('T')[0],
        workout_done: workoutDone,
        energy_level: energy,
        pain_level: pain,
        sleep_hours: sleep,
        water_liters: water
    });
    
    alert('Check-in registrado!');
}

// Photos
async function uploadPhoto() {
    if (!currentUser) return alert('Faça login primeiro');
    
    const input = document.getElementById('photo-input');
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        await database.ref('body_photos').push({
            user_id: currentUser.uid + '_' + activeUser,
            week_number: currentWeek,
            angle: document.getElementById('photo-angle')?.value || 'front',
            blob: e.target.result,
            uploaded_at: new Date().toISOString()
        });
        alert('Foto salva!');
        loadPhotoGallery();
    };
    reader.readAsDataURL(file);
}

async function loadPhotoGallery() {
    if (!currentUser) return;
    
    const snapshot = await database.ref('body_photos')
        .orderByChild('user_id')
        .equalTo(currentUser.uid + '_' + activeUser)
        .once('value');
    
    const photos = [];
    snapshot.forEach(child => {
        photos.push(child.val());
    });
    
    const gallery = document.getElementById('photo-gallery');
    
    gallery.innerHTML = photos.map(p => `
        <img src="${p.blob}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;margin:4px">
    `).join('');
}

// Evolution Chart
async function loadEvolutionChart() {
    if (!currentUser) return;
    
    const ctx = document.getElementById('chart-weight');
    if (!ctx) return;
    
    const snapshot = await database.ref('weekly_checkins')
        .orderByChild('user_id')
        .equalTo(currentUser.uid + '_' + activeUser)
        .once('value');
    
    const checkins = [];
    snapshot.forEach(child => {
        checkins.push(child.val());
    });
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: checkins.map(c => c.week_number),
            datasets: [{
                label: 'Peso (kg)',
                data: checkins.map(c => c.weight_kg),
                borderColor: '#0a84ff',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#ffffff' } } },
            scales: {
                x: { ticks: { color: '#8e8e93' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: '#8e8e93' }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    });
}

// History
async function loadHistoryWeeks() {
    if (!currentUser) return;
    
    const snapshot = await database.ref('weekly_checkins')
        .orderByChild('user_id')
        .equalTo(currentUser.uid + '_' + activeUser)
        .once('value');
    
    const checkins = [];
    snapshot.forEach(child => {
        checkins.push(child.val());
    });
    
    const select = document.getElementById('history-select');
    
    select.innerHTML = '<option>Selecione</option>' + 
        checkins.map(c => `<option value="${c.week_number}">Semana ${c.week_number}</option>`).join('');
}

async function loadHistoryWeek() {
    if (!currentUser) return;
    
    const week = parseInt(document.getElementById('history-select').value);
    if (!week) return;
    
    const snapshot = await database.ref('weekly_checkins')
        .orderByChild('user_id')
        .equalTo(currentUser.uid + '_' + activeUser)
        .once('value');
    
    let checkin = null;
    snapshot.forEach(child => {
        if (child.val().week_number === week) {
            checkin = child.val();
        }
    });
    
    document.getElementById('history-content').innerHTML = checkin ? `
        <div class="card">
            <p>Peso: ${checkin.weight_kg} kg</p>
            <p>Abdômen: ${checkin.waist_cm} cm</p>
            <p>Treinos: ${checkin.workouts_completed}</p>
            <p>Cardios: ${checkin.cardio_completed}</p>
        </div>
    ` : '<p>Dados não encontrados</p>';
}

// AI Export
async function exportForAI() {
    if (!currentUser) return alert('Faça login primeiro');
    
    const snapshot = await database.ref('weekly_checkins')
        .orderByChild('user_id')
        .equalTo(currentUser.uid + '_' + activeUser)
        .once('value');
    
    let checkin = null;
    snapshot.forEach(child => {
        if (child.val().week_number === currentWeek) {
            checkin = child.val();
        }
    });
    
    const user = APP_CONFIG.users[activeUser];
    
    const text = `=== REVISÃO SEMANAL - PROTOCOLO HELTON ===
Usuário: ${user.name}
Semana: ${currentWeek}

--- COMPOSIÇÃO CORPORAL ---
Peso: ${checkin?.weight_kg || '--'} kg
Meta: ${activeUser === 'helton' ? '82-84' : '60'} kg

--- TREINOS ---
Concluídos: ${checkin?.workouts_completed || '--'}

--- CARDIO ---
Concluídos: ${checkin?.cardio_completed || '--'}

--- SONO ---
Média: ${checkin?.sleep_avg || '--'} h

--- SCORE DE ADERÊNCIA ---
Total: ${checkin?.adherence_total || '--'} / 100

=== FIM DO RELATÓRIO ===`;

    document.getElementById('ai-text').value = text;
    document.getElementById('ai-modal').style.display = 'flex';
}

function copyAI() {
    navigator.clipboard.writeText(document.getElementById('ai-text').value);
    alert('Copiado!');
}

// Backup Export
async function exportBackup() {
    if (!currentUser) return alert('Faça login primeiro');
    
    const backup = {
        version: APP_CONFIG.version,
        exported_at: new Date().toISOString(),
        users: APP_CONFIG.users,
        daily_checkins: await database.ref('daily_checkins').once('value').then(s => s.val() || {}),
        weekly_checkins: await database.ref('weekly_checkins').once('value').then(s => s.val() || {}),
        cardio_sessions: await database.ref('cardio_sessions').once('value').then(s => s.val() || {}),
        adherence_scores: await database.ref('adherence_scores').once('value').then(s => s.val() || {}),
        sleep_logs: await database.ref('sleep_logs').once('value').then(s => s.val() || {}),
        body_photos: await database.ref('body_photos').once('value').then(s => s.val() || {}),
        nutrition_logs: await database.ref('nutrition_logs').once('value').then(s => s.val() || {})
    };
    
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `protocolo_helton_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

// AI Coach - Process Week End
async function processWeekEndWithAI() {
    if (!currentUser) return alert('Faça login primeiro');
    if (!aiCoach) return alert('AI Coach não disponível');
    
    try {
        alert('Processando fim de semana com AI Coach...');
        const recommendation = await aiCoach.processWeekEnd(currentWeek);
        alert('Recomendação gerada com sucesso!');
        
        // Show recommendation
        document.getElementById('ai-text').value = recommendation.recommendation_text;
        document.getElementById('ai-modal').style.display = 'flex';
    } catch (error) {
        console.error('Erro ao processar fim de semana:', error);
        alert('Erro ao processar fim de semana: ' + error.message);
    }
}
