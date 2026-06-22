// Protocolo Helton - Main Application JavaScript

// Firebase Configuration - Replace with your actual config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "protocolo-helton.firebaseapp.com",
  databaseURL: "https://protocolo-helton-default-rtdb.firebaseio.com",
  projectId: "protocolo-helton",
  storageBucket: "protocolo-helton.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Global State
let currentUser = null;
let currentAccount = null;
let userProfile = null;
let userConsents = {};
let currentWeek = null;
let workoutCompleted = false;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();
const auth = firebase.auth();

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  // Check for existing user session
  const savedUserId = localStorage.getItem('protocolo_helton_user_id');
  if (savedUserId) {
    loadUserSession(savedUserId);
  } else {
    showLGPDConsent();
  }
  
  // Setup consent checkboxes
  setupConsentCheckboxes();
}

// ============================================
// LGPD CONSENT FLOW
// ============================================

function setupConsentCheckboxes() {
  const checkboxes = document.querySelectorAll('.consent-checkbox');
  const acceptButton = document.getElementById('btn-accept-consent');
  
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
      acceptButton.disabled = !anyChecked;
      document.querySelector('.consent-required').style.display = anyChecked ? 'none' : 'block';
    });
  });
  
  acceptButton.addEventListener('click', () => {
    const consents = {};
    checkboxes.forEach(checkbox => {
      consents[checkbox.dataset.type] = checkbox.checked;
    });
    userConsents = consents;
    localStorage.setItem('protocolo_helton_consents', JSON.stringify(consents));
    showRegistration();
  });
}

function showLGPDConsent() {
  document.getElementById('lgpd-consent-screen').style.display = 'flex';
  document.getElementById('registration-screen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
}

function showRegistration() {
  document.getElementById('lgpd-consent-screen').style.display = 'none';
  document.getElementById('registration-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function showApp() {
  document.getElementById('lgpd-consent-screen').style.display = 'none';
  document.getElementById('registration-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
}

// ============================================
// USER REGISTRATION
// ============================================

async function registerUser() {
  const name = document.getElementById('reg-name').value.trim();
  const sex = document.getElementById('reg-sex').value;
  const birthdate = document.getElementById('reg-birthdate').value;
  const height = parseFloat(document.getElementById('reg-height').value);
  const weight = parseFloat(document.getElementById('reg-weight').value);
  const goal = document.getElementById('reg-goal').value;
  const targetWeight = parseFloat(document.getElementById('reg-target-weight').value);
  const restrictions = document.getElementById('reg-restrictions').value.trim();
  const trainingWindow = document.getElementById('reg-training-window').value;
  
  const errorDiv = document.getElementById('reg-error');
  errorDiv.style.display = 'none';
  
  // Validation
  if (!name || !sex || !birthdate || !height || !weight || !goal || !targetWeight) {
    errorDiv.textContent = 'Por favor, preencha todos os campos obrigatórios.';
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    // Create account
    const accountRef = database.ref('accounts').push();
    const accountId = accountRef.key;
    
    await accountRef.set({
      name: name + (goal === 'hybrid_athlete' ? ' + Esposa' : ''),
      plan_type: 'personal',
      created_at: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Create user
    const userRef = database.ref('users').push();
    const userId = userRef.key;
    
    await userRef.set({
      account_id: accountId,
      role: 'athlete',
      name: name,
      sex: sex,
      birth_date: birthdate,
      height_cm: height,
      created_at: firebase.database.ServerValue.TIMESTAMP,
      status: 'active'
    });
    
    // Create user profile
    const profileRef = database.ref('user_profiles').push();
    await profileRef.set({
      user_id: userId,
      current_weight_kg: weight,
      target_weight_kg: targetWeight,
      goal_type: goal,
      medications: '',
      injuries: restrictions,
      physical_restrictions: '',
      available_training_windows: JSON.stringify({ weekday: trainingWindow })
    });
    
    // Save LGPD consents
    for (const [type, granted] of Object.entries(userConsents)) {
      if (granted) {
        await database.ref('lgpd_consents').push({
          user_id: userId,
          consent_type: type,
          granted: true,
          granted_at: firebase.database.ServerValue.TIMESTAMP,
          revoked_at: null
        });
      }
    }
    
    // Create initial training week (Week 0 - Assessment week)
    const weekRef = database.ref('training_weeks').push();
    const today = new Date();
    const startOfWeek = getStartOfWeek(today);
    const endOfWeek = getEndOfWeek(today);
    
    await weekRef.set({
      user_id: userId,
      week_number: 0,
      start_date: startOfWeek.toISOString().split('T')[0],
      end_date: endOfWeek.toISOString().split('T')[0],
      weekly_objective: 'Semana de avaliação inicial - Complete seu check-in semanal',
      status: 'active',
      generated_from_week_id: null
    });
    
    // Save user session
    localStorage.setItem('protocolo_helton_user_id', userId);
    localStorage.setItem('protocolo_helton_account_id', accountId);
    
    currentUser = { id: userId, ...{ name, sex, birthdate, height_cm: height } };
    currentAccount = { id: accountId };
    
    showApp();
    loadDashboard();
    
  } catch (error) {
    console.error('Registration error:', error);
    errorDiv.textContent = 'Erro ao criar conta. Tente novamente.';
    errorDiv.style.display = 'block';
  }
}

async function loadUserSession(userId) {
  try {
    const userSnapshot = await database.ref('users/' + userId).once('value');
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      currentUser = { id: userId, ...userData };
      currentAccount = { id: userData.account_id };
      
      // Load profile
      const profileSnapshot = await database.ref('user_profiles').orderByChild('user_id').equalTo(userId).once('value');
      if (profileSnapshot.exists()) {
        const profiles = profileSnapshot.val();
        userProfile = Object.values(profiles)[0];
      }
      
      // Load consents
      const consentSnapshot = await database.ref('lgpd_consents').orderByChild('user_id').equalTo(userId).once('value');
      if (consentSnapshot.exists()) {
        const consents = consentSnapshot.val();
        Object.values(consents).forEach(consent => {
          userConsents[consent.consent_type] = consent.revoked_at === null;
        });
      }
      
      showApp();
      loadDashboard();
    } else {
      localStorage.removeItem('protocolo_helton_user_id');
      showLGPDConsent();
    }
  } catch (error) {
    console.error('Session load error:', error);
    showLGPDConsent();
  }
}

// ============================================
// NAVIGATION
// ============================================

function navigateTo(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show target page
  const targetPage = document.getElementById('page-' + pageId);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  // Update sidebar
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
  });
  const sidebarItem = document.querySelector(`.sidebar-item[onclick="navigateTo('${pageId}')"]`);
  if (sidebarItem) {
    sidebarItem.classList.add('active');
  }
  
  // Update bottom nav (mobile)
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const navBtn = document.querySelector(`.nav-btn[onclick="navigateTo('${pageId}')"]`);
  if (navBtn) {
    navBtn.classList.add('active');
  }
  
  // Load page-specific data
  loadPageData(pageId);
  
  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    closeSidebar();
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
}

function logout() {
  localStorage.removeItem('protocolo_helton_user_id');
  localStorage.removeItem('protocolo_helton_account_id');
  localStorage.removeItem('protocolo_helton_consents');
  currentUser = null;
  currentAccount = null;
  userProfile = null;
  userConsents = {};
  showLGPDConsent();
}

// ============================================
// PAGE DATA LOADING
// ============================================

async function loadPageData(pageId) {
  switch (pageId) {
    case 'dashboard':
      await loadDashboard();
      break;
    case 'assessment':
      await loadAssessmentData();
      break;
    case 'training':
      await loadTrainingData();
      break;
    case 'checkin':
      await loadDailyCheckinData();
      break;
    case 'weekly-checkin':
      await loadWeeklyCheckinData();
      break;
    case 'nutrition':
      await loadNutritionData();
      break;
    case 'sleep':
      await loadSleepData();
      break;
    case 'cardio':
      await loadCardioData();
      break;
    case 'history':
      await loadHistoryData();
      break;
    case 'profile':
      await loadProfileData();
      break;
  }
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
  if (!currentUser) return;
  
  // Update user display
  document.getElementById('user-name-display').textContent = currentUser.name;
  
  // Load current week
  const weekSnapshot = await database.ref('training_weeks')
    .orderByChild('user_id')
    .equalTo(currentUser.id)
    .once('value');
  
  if (weekSnapshot.exists()) {
    const weeks = weekSnapshot.val();
    const activeWeek = Object.values(weeks).find(w => w.status === 'active') || 
                      Object.values(weeks).sort((a, b) => b.week_number - a.week_number)[0];
    
    if (activeWeek) {
      currentWeek = activeWeek;
      document.getElementById('stat-week').textContent = `Semana ${activeWeek.week_number}`;
    }
  }
  
  // Load profile data
  if (userProfile) {
    document.getElementById('stat-weight').innerHTML = `${userProfile.current_weight_kg} <small>kg</small>`;
    document.getElementById('stat-target').innerHTML = `${userProfile.target_weight_kg} <small>kg</small>`;
  }
  
  // Load adherence score
  await loadAdherenceScore();
  
  // Render week grid
  renderWeekGrid();
  
  // Load next workout
  await loadNextWorkout();
  
  // Load AI recommendation
  await loadAIRecommendation();
}

async function loadAdherenceScore() {
  if (!currentWeek) return;
  
  let weekId = currentWeek.id;
  if (!weekId) {
    const weekSnapshot = await database.ref('training_weeks')
      .orderByChild('user_id')
      .equalTo(currentUser.id)
      .once('value');
    if (weekSnapshot.exists()) {
      const weeks = weekSnapshot.val();
      const activeWeek = Object.values(weeks).find(w => w.status === 'active');
      weekId = activeWeek ? activeWeek.id : null;
    }
  }
  
  if (!weekId) return;
  
  const scoreSnapshot = await database.ref('adherence_scores')
    .orderByChild('training_week_id')
    .equalTo(weekId)
    .once('value');
  
  if (scoreSnapshot.exists()) {
    const scores = scoreSnapshot.val();
    const score = Object.values(scores)[0];
    
    document.getElementById('adherence-total').textContent = score.total_score || '--';
    document.getElementById('score-training').textContent = (score.training_score || 0) + '%';
    document.getElementById('score-cardio').textContent = (score.cardio_score || 0) + '%';
    document.getElementById('score-sleep').textContent = (score.sleep_score || 0) + '%';
    document.getElementById('score-nutrition').textContent = (score.nutrition_score || 0) + '%';
    document.getElementById('score-hydration').textContent = (score.hydration_score || 0) + '%';
  }
}

function renderWeekGrid() {
  const weekGrid = document.getElementById('week-grid');
  weekGrid.innerHTML = '';
  
  const today = new Date();
  const startOfWeek = getStartOfWeek(today);
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    
    const dayDiv = document.createElement('div');
    dayDiv.className = 'week-day';
    
    if (date.toDateString() === today.toDateString()) {
      dayDiv.classList.add('today');
    }
    
    dayDiv.innerHTML = `
      <span class="week-day-label">${days[i]}</span>
      <span>${date.getDate()}</span>
    `;
    
    weekGrid.appendChild(dayDiv);
  }
}

async function loadNextWorkout() {
  if (!currentWeek) return;
  
  const workoutsSnapshot = await database.ref('workouts')
    .orderByChild('training_week_id')
    .equalTo(currentWeek.id)
    .once('value');
  
  if (workoutsSnapshot.exists()) {
    const workouts = workoutsSnapshot.val();
    const today = new Date().getDay();
    const todayWorkout = Object.values(workouts).find(w => w.day_of_week === today && w.status === 'planned');
    
    if (todayWorkout) {
      document.getElementById('next-workout-name').textContent = getWorkoutTypeName(todayWorkout.workout_type);
      document.getElementById('next-workout-details').textContent = 'Planejado para hoje';
    } else {
      document.getElementById('next-workout-name').textContent = 'Descanso';
      document.getElementById('next-workout-details').textContent = 'Nenhum treino programado para hoje';
    }
  }
}

async function loadAIRecommendation() {
  if (!currentWeek) return;
  
  const recSnapshot = await database.ref('ai_recommendations')
    .orderByChild('training_week_id')
    .equalTo(currentWeek.id)
    .once('value');
  
  if (recSnapshot.exists()) {
    const recs = recSnapshot.val();
    const rec = Object.values(recs).find(r => r.approval_status === 'pending');
    
    if (rec) {
      document.getElementById('ai-rec-status').textContent = 'Pendente de Aprovação';
      document.getElementById('ai-rec-status').className = 'ai-status pending';
      document.getElementById('ai-rec-summary').textContent = rec.recommendation_summary;
      document.getElementById('ai-rec-action').style.display = 'block';
      document.getElementById('ai-rec-action').onclick = () => showRecommendationDetails(rec);
    } else {
      document.getElementById('ai-rec-status').textContent = 'Nenhuma recomendação pendente';
      document.getElementById('ai-rec-status').className = 'ai-status';
      document.getElementById('ai-rec-summary').textContent = 'Continue seguindo seu plano atual';
      document.getElementById('ai-rec-action').style.display = 'none';
    }
  }
}

function getWorkoutTypeName(type) {
  const names = {
    'upper_a': 'Upper A - Peito + Costas + Core',
    'upper_b': 'Upper B - Ombros + Braços',
    'upper_c': 'Upper C - Costas + Estabilidade',
    'lower': 'Lower - Pernas + Core',
    'cardio_z2': 'Cardio Zona 2',
    'run_walk': 'Run/Walk',
    'recovery': 'Recuperação',
    'mobility': 'Mobilidade'
  };
  return names[type] || type;
}

// ============================================
// ASSESSMENT MODULE
// ============================================

async function loadAssessmentData() {
  if (!currentUser) return;
  
  // Load latest assessment
  const assessmentSnapshot = await database.ref('assessments')
    .orderByChild('user_id')
    .equalTo(currentUser.id)
    .once('value');
  
  if (assessmentSnapshot.exists()) {
    const assessments = assessmentSnapshot.val();
    const latest = Object.values(assessments).sort((a, b) => 
      new Date(b.assessment_date) - new Date(a.assessment_date)
    )[0];
    
    if (latest) {
      document.getElementById('assess-weight').value = latest.weight_kg || '';
      document.getElementById('assess-waist').value = latest.waist_cm || '';
      document.getElementById('assess-chest').value = latest.chest_cm || '';
      document.getElementById('assess-arm').value = latest.arm_cm || '';
      document.getElementById('assess-thigh').value = latest.thigh_cm || '';
    }
  }
  
  // Load assessment history
  renderAssessmentHistory(assessmentSnapshot);
}

async function saveAssessment() {
  if (!currentUser) return;
  
  const weight = parseFloat(document.getElementById('assess-weight').value);
  const waist = parseFloat(document.getElementById('assess-waist').value);
  const chest = parseFloat(document.getElementById('assess-chest').value);
  const arm = parseFloat(document.getElementById('assess-arm').value);
  const thigh = parseFloat(document.getElementById('assess-thigh').value);
  
  try {
    const assessmentRef = database.ref('assessments').push();
    await assessmentRef.set({
      user_id: currentUser.id,
      assessment_date: new Date().toISOString().split('T')[0],
      weight_kg: weight,
      waist_cm: waist,
      chest_cm: chest,
      arm_cm: arm,
      thigh_cm: thigh,
      sleep_hours_avg: 0,
      water_liters_avg: 0,
      steps_avg: 0,
      walk_test_time: null,
      run_test_time: null,
      resting_hr: null,
      notes: ''
    });
    
    // Update profile weight
    if (userProfile && weight) {
      await database.ref('user_profiles/' + Object.keys((await database.ref('user_profiles').orderByChild('user_id').equalTo(currentUser.id).once('value')).val())[0]).update({
        current_weight_kg: weight
      });
      userProfile.current_weight_kg = weight;
    }
    
    alert('Avaliação salva com sucesso!');
    loadAssessmentData();
    
  } catch (error) {
    console.error('Assessment save error:', error);
    alert('Erro ao salvar avaliação. Tente novamente.');
  }
}

function previewPhoto(input, zoneId) {
  const zone = document.getElementById(zoneId);
  const file = input.files[0];
  
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      zone.innerHTML = '';
      zone.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
}

async function uploadAssessmentPhotos() {
  if (!currentUser || !userConsents.photos) {
    alert('Consentimento de fotos necessário para upload.');
    return;
  }
  
  const frontInput = document.getElementById('photo-front');
  const sideInput = document.getElementById('photo-side');
  const backInput = document.getElementById('photo-back');
  
  if (!frontInput.files[0] && !sideInput.files[0] && !backInput.files[0]) {
    alert('Selecione pelo menos uma foto.');
    return;
  }
  
  try {
    // Create assessment first
    const assessmentRef = database.ref('assessments').push();
    const assessmentId = assessmentRef.key;
    
    await assessmentRef.set({
      user_id: currentUser.id,
      assessment_date: new Date().toISOString().split('T')[0],
      weight_kg: 0,
      waist_cm: 0,
      chest_cm: 0,
      arm_cm: 0,
      thigh_cm: 0,
      sleep_hours_avg: 0,
      water_liters_avg: 0,
      steps_avg: 0,
      walk_test_time: null,
      run_test_time: null,
      resting_hr: null,
      notes: ''
    });
    
    // Upload photos
    const angles = [
      { file: frontInput.files[0], angle: 'front' },
      { file: sideInput.files[0], angle: 'side' },
      { file: backInput.files[0], angle: 'back' }
    ];
    
    for (const { file, angle } of angles) {
      if (file) {
        const photoRef = storage.ref(`assessment_photos/${currentUser.id}/${assessmentId}/${angle}`);
        await photoRef.put(file);
        const downloadURL = await photoRef.getDownloadURL();
        
        await database.ref('assessment_photos').push({
          assessment_id: assessmentId,
          angle: angle,
          storage_ref: downloadURL,
          uploaded_at: firebase.database.ServerValue.TIMESTAMP,
          deleted_at: null
        });
      }
    }
    
    alert('Fotos enviadas com sucesso!');
    
    // Reset upload zones
    ['upload-front', 'upload-side', 'upload-back'].forEach(id => {
      const zone = document.getElementById(id);
      zone.innerHTML = `<i class="ti ti-camera"></i><span>${id.split('-')[1].charAt(0).toUpperCase() + id.split('-')[1].slice(1)}</span>`;
    });
    
  } catch (error) {
    console.error('Photo upload error:', error);
    alert('Erro ao enviar fotos. Tente novamente.');
  }
}

function renderAssessmentHistory(snapshot) {
  const historyDiv = document.getElementById('assessment-history');
  
  if (!snapshot.exists()) {
    historyDiv.innerHTML = '<div class="empty"><i class="ti ti-clipboard-list"></i>Nenhuma avaliação registrada</div>';
    return;
  }
  
  const assessments = snapshot.val();
  const sorted = Object.values(assessments).sort((a, b) => 
    new Date(b.assessment_date) - new Date(a.assessment_date)
  );
  
  historyDiv.innerHTML = sorted.map(a => `
    <div class="workout-card">
      <div class="workout-header">
        <span class="workout-name">${formatDate(a.assessment_date)}</span>
      </div>
      <div class="workout-details">
        Peso: ${a.weight_kg}kg | Abdômen: ${a.waist_cm}cm
      </div>
    </div>
  `).join('');
}

// ============================================
// TRAINING MODULE
// ============================================

async function loadTrainingData() {
  if (!currentUser) return;
  
  // Load current week
  const weekSnapshot = await database.ref('training_weeks')
    .orderByChild('user_id')
    .equalTo(currentUser.id)
    .once('value');
  
  if (weekSnapshot.exists()) {
    const weeks = weekSnapshot.val();
    const activeWeek = Object.values(weeks).find(w => w.status === 'active') || 
                      Object.values(weeks).sort((a, b) => b.week_number - a.week_number)[0];
    
    if (activeWeek) {
      currentWeek = activeWeek;
      document.getElementById('current-week-number').textContent = `Semana ${activeWeek.week_number}`;
      document.getElementById('current-week-dates').textContent = `${formatDate(activeWeek.start_date)} - ${formatDate(activeWeek.end_date)}`;
      document.getElementById('current-week-objective').textContent = activeWeek.weekly_objective;
    }
  }
  
  // Load workouts
  await loadWeeklyWorkouts();
}

async function loadWeeklyWorkouts() {
  if (!currentWeek) return;
  
  const workoutsDiv = document.getElementById('weekly-workouts');
  workoutsDiv.innerHTML = '';
  
  const workoutsSnapshot = await database.ref('workouts')
    .orderByChild('training_week_id')
    .equalTo(currentWeek.id)
    .once('value');
  
  if (!workoutsSnapshot.exists()) {
    workoutsDiv.innerHTML = '<div class="empty"><i class="ti ti-dumbbell"></i>Nenhum treino programado</div>';
    return;
  }
  
  const workouts = workoutsSnapshot.val();
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  
  Object.values(workouts).forEach(workout => {
    const workoutCard = document.createElement('div');
    workoutCard.className = 'workout-card';
    workoutCard.innerHTML = `
      <div class="workout-header">
        <span class="workout-name">${days[workout.day_of_week]} - ${getWorkoutTypeName(workout.workout_type)}</span>
        <span class="workout-status ${workout.status}">${getWorkoutStatusName(workout.status)}</span>
      </div>
      <div class="workout-details">
        Máximo: ${workout.max_duration_minutes} minutos
      </div>
    `;
    workoutsDiv.appendChild(workoutCard);
  });
}

function getWorkoutStatusName(status) {
  const names = {
    'planned': 'Planejado',
    'done': 'Concluído',
    'skipped': 'Pulado'
  };
  return names[status] || status;
}

// ============================================
// DAILY CHECK-IN MODULE
// ============================================

async function loadDailyCheckinData() {
  if (!currentUser) return;
  
  const today = new Date().toISOString().split('T')[0];
  
  const checkinSnapshot = await database.ref('daily_checkins')
    .orderByChild('user_id')
    .equalTo(currentUser.id)
    .once('value');
  
  if (checkinSnapshot.exists()) {
    const checkins = checkinSnapshot.val();
    const todayCheckin = Object.values(checkins).find(c => c.checkin_date === today);
    
    if (todayCheckin) {
      workoutCompleted = todayCheckin.workout_completed;
      document.getElementById('energy-level').value = todayCheckin.energy_level || 5;
      document.getElementById('energy-value').textContent = todayCheckin.energy_level || 5;
      document.getElementById('pain-level').value = todayCheckin.pain_level || 1;
      document.getElementById('pain-value').textContent = todayCheckin.pain_level || 1;
      document.getElementById('sleep-hours').value = todayCheckin.sleep_hours || '';
      document.getElementById('water-liters').value = todayCheckin.water_liters || '';
      document.getElementById('checkin-notes').value = todayCheckin.free_text_notes || '';
      
      updateWorkoutToggle();
    }
  }
}

function toggleWorkout(completed) {
  workoutCompleted = completed;
  updateWorkoutToggle();
}

function updateWorkoutToggle() {
  document.getElementById('workout-yes').classList.toggle('active', workoutCompleted);
  document.getElementById('workout-no').classList.toggle('active', !workoutCompleted);
}

function updateSliderValue(sliderId, valueId) {
  const slider = document.getElementById(sliderId);
  const valueSpan = document.getElementById(valueId);
  valueSpan.textContent = slider.value;
}

async function submitDailyCheckin() {
  if (!currentUser) return;
  
  const today = new Date().toISOString().split('T')[0];
  const energyLevel = parseInt(document.getElementById('energy-level').value);
  const painLevel = parseInt(document.getElementById('pain-level').value);
  const sleepHours = parseFloat(document.getElementById('sleep-hours').value) || 0;
  const waterLiters = parseFloat(document.getElementById('water-liters').value) || 0;
  const notes = document.getElementById('checkin-notes').value.trim();
  
  try {
    // Check if checkin already exists
    const existingSnapshot = await database.ref('daily_checkins')
      .orderByChild('user_id')
      .equalTo(currentUser.id)
      .once('value');
    
    let checkinRef;
    if (existingSnapshot.exists()) {
      const checkins = existingSnapshot.val();
      const existing = Object.values(checkins).find(c => c.checkin_date === today);
      if (existing) {
        checkinRef = database.ref('daily_checkins/' + Object.keys(checkins).find(key => checkins[key].checkin_date === today));
      } else {
        checkinRef = database.ref('daily_checkins').push();
      }
    } else {
      checkinRef = database.ref('daily_checkins').push();
    }
    
    await checkinRef.set({
      user_id: currentUser.id,
      checkin_date: today,
      workout_completed: workoutCompleted,
      energy_level: energyLevel,
      pain_level: painLevel,
      sleep_hours: sleepHours,
      water_liters: waterLiters,
      free_text_notes: notes
    });
    
    alert('Check-in registrado com sucesso!');
    
  } catch (error) {
    console.error('Checkin error:', error);
    alert('Erro ao registrar check-in. Tente novamente.');
  }
}

// ============================================
// WEEKLY CHECK-IN MODULE
// ============================================

async function loadWeeklyCheckinData() {
  if (!currentUser) return;
  
  // Load current week
  const weekSnapshot = await database.ref('training_weeks')
    .orderByChild('user_id')
    .equalTo(currentUser.id)
    .once('value');
  
  if (weekSnapshot.exists()) {
    const weeks = weekSnapshot.val();
    const activeWeek = Object.values(weeks).find(w => w.status === 'active');
    
    if (activeWeek) {
      currentWeek = activeWeek;
    }
  }
}

async function submitWeeklyCheckin() {
  if (!currentUser || !currentWeek) {
    alert('Carregando dados da semana...');
    return;
  }
  
  const weight = parseFloat(document.getElementById('weekly-weight').value);
  const waist = parseFloat(document.getElementById('weekly-waist').value);
  const sleepAvg = parseFloat(document.getElementById('weekly-sleep-avg').value);
  const stepsAvg = parseInt(document.getElementById('weekly-steps-avg').value);
  const workoutsCount = parseInt(document.getElementById('weekly-workouts-count').value);
  const cardioCount = parseInt(document.getElementById('weekly-cardio-count').value);
  
  if (!weight || !waist) {
    alert('Peso e circunferência abdominal são obrigatórios.');
    return;
  }
  
  try {
    // Save weekly checkin
    const checkinRef = database.ref('weekly_checkins').push();
    await checkinRef.set({
      user_id: currentUser.id,
      training_week_id: currentWeek.id,
      checkin_date: new Date().toISOString().split('T')[0],
      weight_kg: weight,
      waist_cm: waist,
      sleep_avg: sleepAvg || 0,
      steps_avg: stepsAvg || 0,
      workouts_completed_count: workoutsCount || 0,
      cardio_completed_count: cardioCount || 0
    });
    
    // Calculate adherence score
    await calculateAdherenceScore(workoutsCount, cardioCount, sleepAvg);
    
    // Trigger decision engine
    await triggerDecisionEngine();
    
    alert('Check-in semanal submetido com sucesso!');
    
    // Show summary
    document.getElementById('weekly-summary-card').style.display = 'block';
    document.getElementById('weekly-summary-content').innerHTML = `
      <p>Peso: ${weight}kg</p>
      <p>Treinos concluídos: ${workoutsCount}</p>
      <p>Cardios concluídos: ${cardioCount}</p>
      <p>Média de sono: ${sleepAvg}h</p>
    `;
    
  } catch (error) {
    console.error('Weekly checkin error:', error);
    alert('Erro ao submeter check-in. Tente novamente.');
  }
}

async function calculateAdherenceScore(workoutsCount, cardioCount, sleepAvg) {
  if (!currentWeek) return;
  
  // Calculate individual scores (simplified for v1)
  const trainingScore = Math.min(100, (workoutsCount / 5) * 100); // Assuming 5 workouts per week
  const cardioScore = Math.min(100, (cardioCount / 2) * 100); // Assuming 2 cardio sessions per week
  const sleepScore = Math.min(100, (sleepAvg / 8) * 100); // 8 hours = 100%
  const nutritionScore = 75; // Placeholder - would be calculated from nutrition logs
  const hydrationScore = 75; // Placeholder - would be calculated from daily checkins
  
  // Calculate weighted total
  const totalScore = (trainingScore * 0.30) + 
                     (cardioScore * 0.25) + 
                     (sleepScore * 0.20) + 
                     (nutritionScore * 0.15) + 
                     (hydrationScore * 0.10);
  
  const scoreRef = database.ref('adherence_scores').push();
  await scoreRef.set({
    user_id: currentUser.id,
    training_week_id: currentWeek.id,
    training_score: Math.round(trainingScore),
    cardio_score: Math.round(cardioScore),
    sleep_score: Math.round(sleepScore),
    nutrition_score: nutritionScore,
    hydration_score: hydrationScore,
    total_score: Math.round(totalScore),
    calculated_at: firebase.database.ServerValue.TIMESTAMP
  });
}

async function triggerDecisionEngine() {
  if (!currentWeek || !currentUser) return;
  
  // Load decision rules
  const rulesSnapshot = await database.ref('decision_rules')
    .orderByChild('active')
    .equalTo(true)
    .once('value');
  
  if (!rulesSnapshot.exists()) return;
  
  const rules = Object.values(rulesSnapshot).sort((a, b) => a.priority - b.priority);
  
  // Load adherence score
  const scoreSnapshot = await database.ref('adherence_scores')
    .orderByChild('training_week_id')
    .equalTo(currentWeek.id)
    .once('value');
  
  let adherenceTotal = 0;
  let painLevel = 1;
  let sleepAvg = 7;
  let weightDelta = 0;
  
  if (scoreSnapshot.exists()) {
    const scores = scoreSnapshot.val();
    const score = Object.values(scores)[0];
    adherenceTotal = score.total_score || 0;
  }
  
  // Load daily checkins for pain and sleep
  const checkinSnapshot = await database.ref('daily_checkins')
    .orderByChild('user_id')
    .equalTo(currentUser.id)
    .once('value');
  
  if (checkinSnapshot.exists()) {
    const checkins = Object.values(checkinSnapshot);
    const weekCheckins = checkins.filter(c => {
      const checkinDate = new Date(c.checkin_date);
      const weekStart = new Date(currentWeek.start_date);
      const weekEnd = new Date(currentWeek.end_date);
      return checkinDate >= weekStart && checkinDate <= weekEnd;
    });
    
    if (weekCheckins.length > 0) {
      painLevel = weekCheckins.reduce((sum, c) => sum + c.pain_level, 0) / weekCheckins.length;
      sleepAvg = weekCheckins.reduce((sum, c) => sum + c.sleep_hours, 0) / weekCheckins.length;
    }
  }
  
  // Evaluate rules
  const triggeredRules = [];
  let action = null;
  
  for (const rule of rules) {
    const conditionMet = evaluateCondition(rule, adherenceTotal, painLevel, sleepAvg, weightDelta);
    
    if (conditionMet) {
      triggeredRules.push(rule.rule_code);
      
      // BLOCK and PRIORITIZE_RECOVERY override ALLOW
      if (rule.action_code === 'BLOCK_PROGRESSION' || rule.action_code === 'PRIORITIZE_RECOVERY') {
        action = rule.action_code;
        break;
      } else if (!action) {
        action = rule.action_code;
      }
    }
  }
  
  // Generate AI recommendation
  await generateAIRecommendation(triggeredRules, action);
}

function evaluateCondition(rule, adherenceTotal, painLevel, sleepAvg, weightDelta) {
  const value = getValueForField(rule.condition_field, adherenceTotal, painLevel, sleepAvg, weightDelta);
  
  switch (rule.operator) {
    case 'gt': return value > rule.threshold_value;
    case 'gte': return value >= rule.threshold_value;
    case 'lt': return value < rule.threshold_value;
    case 'lte': return value <= rule.threshold_value;
    case 'eq': return value === rule.threshold_value;
    case 'between': return value >= rule.threshold_value && value <= rule.threshold_value_secondary;
    default: return false;
  }
}

function getValueForField(field, adherenceTotal, painLevel, sleepAvg, weightDelta) {
  switch (field) {
    case 'adherence_total': return adherenceTotal;
    case 'pain_level': return painLevel;
    case 'sleep_avg': return sleepAvg;
    case 'weight_delta_kg': return weightDelta;
    default: return 0;
  }
}

async function generateAIRecommendation(triggeredRules, action) {
  if (!currentWeek || !currentUser) return;
  
  // In a real implementation, this would call the AI backend
  // For now, we'll create a placeholder recommendation
  
  let summary = 'Análise da semana concluída. ';
  
  if (action === 'BLOCK_PROGRESSION') {
    summary += 'Nível de dor elevado detectado. Progressão de treino bloqueada por segurança. Priorize recuperação e consulte um profissional de saúde se a dor persistir.';
  } else if (action === 'PRIORITIZE_RECOVERY') {
    summary += 'Média de sono abaixo do recomendado. Priorize recuperação nesta semana com foco em melhorar qualidade do sono.';
  } else if (action === 'SUGGEST_NUTRITION_REVIEW') {
    summary += 'Perda de peso rápida detectada. Sugiro revisar ingestão calórica para garantir perda sustentável.';
  } else if (action === 'ALLOW_PROGRESSION') {
    summary += 'Aderência excelente! Progressão permitida para a próxima semana.';
  } else {
    summary += 'Continue seguindo seu plano atual.';
  }
  
  const recRef = database.ref('ai_recommendations').push();
  await recRef.set({
    user_id: currentUser.id,
    training_week_id: currentWeek.id,
    triggered_rules: triggeredRules,
    recommendation_summary: summary,
    proposed_next_week_changes: {},
    approval_status: 'pending',
    approved_by: null,
    approved_at: null
  });
}

// ============================================
// NUTRITION MODULE
// ============================================

async function loadNutritionData() {
  if (!currentUser) return;
  
  const today = new Date().toISOString().split('T')[0];
  
  const logSnapshot = await database.ref('nutrition_logs')
    .orderByChild('user_id')
    .equalTo(currentUser.id)
    .once('value');
  
  if (logSnapshot.exists()) {
    const logs = logSnapshot.val();
    const todayLog = Object.values(logs).find(l => l.log_date === today);
    
    if (todayLog) {
      document.getElementById('nut-breakfast').value = todayLog.breakfast || '';
      document.getElementById('nut-lunch').value = todayLog.lunch || '';
      document.getElementById('nut-dinner').value = todayLog.dinner || '';
      document.getElementById('nut-snacks').value = todayLog.snacks || '';
      document.getElementById('nut-protein').value = todayLog.protein_g || '';
      document.getElementById('nut-calories').value = todayLog.calories || '';
      
      document.getElementById('daily-protein').innerHTML = `${todayLog.protein_g || 0} <small>g</small>`;
      document.getElementById('daily-calories').innerHTML = `${todayLog.calories || 0} <small>kcal</small>`;
    }
  }
}

async function saveNutritionLog() {
  if (!currentUser) return;
  
  const today = new Date().toISOString().split('T')[0];
  const breakfast = document.getElementById('nut-breakfast').value.trim();
  const lunch = document.getElementById('nut-lunch').value.trim();
  const dinner = document.getElementById('nut-dinner').value.trim();
  const snacks = document.getElementById('nut-snacks').value.trim();
  const protein = parseInt(document.getElementById('nut-protein').value) || 0;
  const calories = parseInt(document.getElementById('nut-calories').value) || 0;
  
  try {
    const logRef = database.ref('nutrition_logs').push();
    await logRef.set({
      user_id: currentUser.id,
      log_date: today,
      breakfast: breakfast || null,
      lunch: lunch || null,
      dinner: dinner || null,
      snacks: snacks || null,
      protein_g: protein,
      calories: calories
    });
    
    document.getElementById('daily-protein').innerHTML = `${protein} <small>g</small>`;
    document.getElementById('daily-calories').innerHTML = `${calories} <small>kcal</small>`;
    
    alert('Registro alimentar salvo!');
    
  } catch (error) {
    console.error('Nutrition log error:', error);
    alert('Erro ao salvar registro. Tente novamente.');
  }
}

// ============================================
// SLEEP MODULE
// ============================================

async function loadSleepData() {
  if (!currentUser) return;
  
  const today = new Date().toISOString().split('T')[0];
  
  const logSnapshot = await database.ref('sleep_logs')
    .orderByChild('user_id')
    .equalTo(currentUser.id)
    .once('value');
  
  if (logSnapshot.exists()) {
    const logs = logSnapshot.val();
    const todayLog = Object.values(logs).find(l => l.sleep_date === today);
    
    if (todayLog) {
      document.getElementById('sleep-bedtime').value = todayLog.bedtime || '';
      document.getElementById('sleep-wake').value = todayLog.wake_time || '';
      document.getElementById('sleep-total').value = todayLog.total_hours || '';
    }
    
    // Calculate weekly average
    const weekLogs = Object.values(logs).filter(l => {
      const logDate = new Date(l.sleep_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    });
    
    if (weekLogs.length > 0) {
      const avgSleep = weekLogs.reduce((sum, l) => sum + l.total_hours, 0) / weekLogs.length;
      document.getElementById('weekly-sleep-avg-display').innerHTML = `${avgSleep.toFixed(1)} <small>h</small>`;
      
      if (avgSleep < 5.5) {
        document.getElementById('sleep-alert').style.display = 'block';
      }
    }
  }
}

async function saveSleepLog() {
  if (!currentUser) return;
  
  const today = new Date().toISOString().split('T')[0];
  const bedtime = document.getElementById('sleep-bedtime').value;
  const wakeTime = document.getElementById('sleep-wake').value;
  const totalHours = parseFloat(document.getElementById('sleep-total').value) || 0;
  
  try {
    const logRef = database.ref('sleep_logs').push();
    await logRef.set({
      user_id: currentUser.id,
      sleep_date: today,
      bedtime: bedtime,
      wake_time: wakeTime,
      total_hours: totalHours
    });
    
    alert('Registro de sono salvo!');
    loadSleepData();
    
  } catch (error) {
    console.error('Sleep log error:', error);
    alert('Erro ao salvar registro. Tente novamente.');
  }
}

// ============================================
// CARDIO MODULE
// ============================================

async function loadCardioData() {
  if (!currentUser) return;
  
  const sessionSnapshot = await database.ref('cardio_sessions')
    .orderByChild('user_id')
    .equalTo(currentUser.id)
    .once('value');
  
  if (!sessionSnapshot.exists()) {
    document.getElementById('cardio-history').innerHTML = '<div class="empty"><i class="ti ti-heartbeat"></i>Nenhuma sessão registrada</div>';
    return;
  }
  
  const sessions = Object.values(sessionSnapshot).sort((a, b) => 
    new Date(b.session_date) - new Date(a.session_date)
  ).slice(0, 5);
  
  document.getElementById('cardio-history').innerHTML = sessions.map(s => `
    <div class="workout-card">
      <div class="workout-header">
        <span class="workout-name">${formatDate(s.session_date)}</span>
      </div>
      <div class="workout-details">
        ${s.distance_km}km em ${s.duration_minutes}min
        ${s.avg_hr ? `| FC Média: ${s.avg_hr}bpm` : ''}
      </div>
    </div>
  `).join('');
}

async function saveCardioSession() {
  if (!currentUser) return;
  
  const source = document.getElementById('cardio-source').value;
  const distance = parseFloat(document.getElementById('cardio-distance').value) || 0;
  const duration = parseInt(document.getElementById('cardio-duration').value) || 0;
  const avgHr = parseInt(document.getElementById('cardio-avg-hr').value) || null;
  const maxHr = parseInt(document.getElementById('cardio-max-hr').value) || null;
  const pace = document.getElementById('cardio-pace').value.trim() || null;
  
  try {
    const sessionRef = database.ref('cardio_sessions').push();
    await sessionRef.set({
      user_id: currentUser.id,
      source: source,
      session_date: new Date().toISOString().split('T')[0],
      distance_km: distance,
      duration_minutes: duration,
      avg_hr: avgHr,
      max_hr: maxHr,
      pace: pace
    });
    
    alert('Sessão de cardio registrada!');
    loadCardioData();
    
    // Clear form
    document.getElementById('cardio-distance').value = '';
    document.getElementById('cardio-duration').value = '';
    document.getElementById('cardio-avg-hr').value = '';
    document.getElementById('cardio-max-hr').value = '';
    document.getElementById('cardio-pace').value = '';
    
  } catch (error) {
    console.error('Cardio session error:', error);
    alert('Erro ao registrar sessão. Tente novamente.');
  }
}

// ============================================
// AI COACH MODULE
// ============================================

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message
  addChatMessage(message, 'user');
  input.value = '';
  
  // Process message
  processAIChat(message);
}

function quickChat(message) {
  addChatMessage(message, 'user');
  processAIChat(message);
}

function addChatMessage(message, type) {
  const messagesDiv = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  messageDiv.innerHTML = `<div class="message-content"><p>${message}</p></div>`;
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function processAIChat(message) {
  // Add typing indicator
  const messagesDiv = document.getElementById('chat-messages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message message-ai';
  typingDiv.innerHTML = '<div class="message-content"><p>Analisando...</p></div>';
  messagesDiv.appendChild(typingDiv);
  
  // Simulate AI response (in real implementation, call AI backend)
  setTimeout(() => {
    messagesDiv.removeChild(typingDiv);
    
    let response = '';
    
    if (message.toLowerCase().includes('finalizei a semana')) {
      response = 'Gerando relatório semanal completo...<br><br>' +
                'Baseado nos seus dados:<br>' +
                '- Aderência total: Calculando...<br>' +
                '- Treinos concluídos: Analisando...<br>' +
                '- Média de sono: Processando...<br><br>' +
                'Recomendação da próxima semana será gerada após processamento completo.';
    } else if (message.toLowerCase().includes('evolução')) {
      response = 'Analisando sua evolução...<br><br>' +
                'Para uma análise completa, por favor finalize seu check-in semanal. ' +
                'Assim poderei comparar suas métricas atuais com as semanas anteriores.';
    } else if (message.toLowerCase().includes('recuperação')) {
      response = 'Dicas de recuperação:<br><br>' +
                '1. Priorize 7-8 horas de sono por noite<br>' +
                '2. Mantenha-se hidratado (2-3L de água por dia)<br>' +
                '3. Inclua dias de descanso ativo<br>' +
                '4. Considere alongamento e mobilidade<br>' +
                '5. Nutrição adequada com proteína suficiente';
    } else {
      response = 'Entendi sua pergunta. Para respostas mais específicas, tente:<br>' +
                '- "Finalizei a semana" para relatório semanal<br>' +
                '- "Analisar minha evolução" para análise de progresso<br>' +
                '- "Dicas de recuperação" para orientações';
    }
    
    addChatMessage(response, 'ai');
  }, 1500);
}

// ============================================
// HISTORY MODULE
// ============================================

async function loadHistoryData() {
  if (!currentUser) return;
  
  const weekSelect = document.getElementById('history-week-select');
  weekSelect.innerHTML = '<option value="">Selecione uma semana</option>';
  
  const weekSnapshot = await database.ref('training_weeks')
    .orderByChild('user_id')
    .equalTo(currentUser.id)
    .once('value');
  
  if (weekSnapshot.exists()) {
    const weeks = weekSnapshot.val();
    Object.values(weeks).sort((a, b) => b.week_number - a.week_number).forEach(week => {
      const option = document.createElement('option');
      option.value = week.id;
      option.textContent = `Semana ${week.week_number} - ${formatDate(week.start_date)}`;
      weekSelect.appendChild(option);
    });
  }
}

async function loadHistoryWeek() {
  const weekId = document.getElementById('history-week-select').value;
  
  if (!weekId) {
    document.getElementById('history-content').style.display = 'none';
    return;
  }
  
  document.getElementById('history-content').style.display = 'block';
  
  // Load week data and display
  // This would load assessments, photos, adherence score for the selected week
  // For now, placeholder
  document.getElementById('history-photos').innerHTML = '<div class="empty">Nenhuma foto</div>';
  document.getElementById('history-measurements').innerHTML = '<div class="empty">Nenhuma medida</div>';
  document.getElementById('history-adherence').innerHTML = '<div class="empty">Nenhum score</div>';
}

// ============================================
// PROFILE MODULE
// ============================================

async function loadProfileData() {
  if (!currentUser) return;
  
  document.getElementById('profile-name').value = currentUser.name || '';
  
  // Load consents
  if (userConsents.training) document.getElementById('consent-training-profile').checked = true;
  if (userConsents.nutrition) document.getElementById('consent-nutrition-profile').checked = true;
  if (userConsents.photos) document.getElementById('consent-photos-profile').checked = true;
  if (userConsents.cardio) document.getElementById('consent-cardio-profile').checked = true;
  if (userConsents.analytics) document.getElementById('consent-analytics-profile').checked = true;
}

async function updateProfile() {
  if (!currentUser) return;
  
  const name = document.getElementById('profile-name').value.trim();
  
  if (!name) {
    alert('Nome é obrigatório.');
    return;
  }
  
  try {
    await database.ref('users/' + currentUser.id).update({
      name: name
    });
    
    currentUser.name = name;
    document.getElementById('user-name-display').textContent = name;
    
    alert('Perfil atualizado!');
    
  } catch (error) {
    console.error('Profile update error:', error);
    alert('Erro ao atualizar perfil. Tente novamente.');
  }
}

async function updateConsent(type) {
  if (!currentUser) return;
  
  const checkbox = document.getElementById(`consent-${type}-profile`);
  const granted = checkbox.checked;
  
  try {
    // Find existing consent
    const consentSnapshot = await database.ref('lgpd_consents')
      .orderByChild('user_id')
      .equalTo(currentUser.id)
      .once('value');
    
    if (consentSnapshot.exists()) {
      const consents = consentSnapshot.val();
      const existing = Object.values(consents).find(c => c.consent_type === type);
      
      if (existing) {
        const consentId = Object.keys(consents).find(key => consents[key].conssent_type === type);
        if (granted) {
          await database.ref('lgpd_consents/' + consentId).update({
            granted: true,
            granted_at: firebase.database.ServerValue.TIMESTAMP,
            revoked_at: null
          });
        } else {
          await database.ref('lgpd_consents/' + consentId).update({
            granted: false,
            revoked_at: firebase.database.ServerValue.TIMESTAMP
          });
        }
      } else if (granted) {
        await database.ref('lgpd_consents').push({
          user_id: currentUser.id,
          consent_type: type,
          granted: true,
          granted_at: firebase.database.ServerValue.TIMESTAMP,
          revoked_at: null
        });
      }
    } else if (granted) {
      await database.ref('lgpd_consents').push({
        user_id: currentUser.id,
        consent_type: type,
        granted: true,
        granted_at: firebase.database.ServerValue.TIMESTAMP,
        revoked_at: null
      });
    }
    
    userConsents[type] = granted;
    
  } catch (error) {
    console.error('Consent update error:', error);
    alert('Erro ao atualizar consentimento. Tente novamente.');
  }
}

function requestDataDeletion() {
  if (confirm('Tem certeza que deseja solicitar a exclusão de todos os seus dados? Esta ação não pode ser desfeita.')) {
    alert('Solicitação de exclusão enviada. Um administrador entrará em contato para confirmar.');
    // In real implementation, this would create a deletion request ticket
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function getEndOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + 6;
  return new Date(d.setDate(diff));
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showRecommendationDetails(rec) {
  alert(`Detalhes da Recomendação:\n\n${rec.recommendation_summary}\n\nStatus: ${rec.approval_status}`);
}
