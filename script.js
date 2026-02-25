// ====================== DATA & STATE ======================
let habits = JSON.parse(localStorage.getItem('habits')) || [];
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let goals = JSON.parse(localStorage.getItem('goals')) || [];
let reflections = JSON.parse(localStorage.getItem('reflections')) || [];

let moneyChart; // Chart.js instance

// ====================== DOM ELEMENTS ======================
const habitListEl = document.getElementById('habitList');
const totalStreakEl = document.getElementById('totalStreak');
const balanceEl = document.getElementById('balance');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const goalListEl = document.getElementById('goalList');
const aiMessageEl = document.getElementById('aiMessage');
const reflectionInput = document.getElementById('reflectionInput');
const pastReflectionsEl = document.getElementById('pastReflections');

// ====================== INIT ======================
document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  setupEventListeners();
  setRandomGreeting();
});

function renderAll() {
  renderHabits();
  renderMoney();
  renderGoals();
  renderReflections();
  updateMoneyChart();
}

// ====================== HABITS ======================
function renderHabits() {
  if (!habitListEl) return;
  habitListEl.innerHTML = '';
  let totalStreak = 0;
  habits.forEach((habit, index) => {
    totalStreak += habit.streak || 0;
    const div = document.createElement('div');
    div.className = 'habit-item';
    div.innerHTML = `
      <input type="checkbox" data-index="${index}" ${habit.completedToday ? 'checked' : ''}>
      <span class="habit-name">${habit.name}</span>
      <span class="streak">🔥 ${habit.streak || 0}</span>
      <button class="delete-habit" data-index="${index}">✖</button>
    `;
    habitListEl.appendChild(div);
  });
  totalStreakEl.textContent = `🔥 ${totalStreak}`;

  // Attach event listeners to checkboxes and delete buttons
  document.querySelectorAll('.habit-item input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', toggleHabit);
  });
  document.querySelectorAll('.delete-habit').forEach(btn => {
    btn.addEventListener('click', deleteHabit);
  });
}

function toggleHabit(e) {
  const index = e.target.dataset.index;
  const habit = habits[index];
  const wasChecked = e.target.checked;

  if (wasChecked) {
    // Check if already completed today (prevent multiple checks)
    if (!habit.completedToday) {
      habit.completedToday = true;
      habit.streak = (habit.streak || 0) + 1;
      // Celebration confetti for milestone streaks (every 7 days)
      if (habit.streak % 7 === 0) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        aiMessageEl.textContent = `🎉 Amazing! You've reached a ${habit.streak}-day streak for "${habit.name}"!`;
      }
    }
  } else {
    // Unchecking – usually we don't allow, but if we do, decrease streak? Better to ignore.
    // For simplicity, we'll just revert the UI by re-rendering.
    // But we'll implement a more robust: if uncheck, ask confirmation? Too complex. We'll skip.
    // Instead, we'll just not allow unchecking by re-checking it.
    e.target.checked = true; // force stay checked
    return;
  }
  saveHabits();
  renderHabits();
}

function deleteHabit(e) {
  const index = e.target.dataset.index;
  habits.splice(index, 1);
  saveHabits();
  renderHabits();
}

document.getElementById('addHabitBtn')?.addEventListener('click', () => {
  const input = document.getElementById('newHabitInput');
  const name = input.value.trim();
  if (name) {
    habits.push({ name, streak: 0, completedToday: false });
    input.value = '';
    saveHabits();
    renderHabits();
  }
});

function saveHabits() {
  localStorage.setItem('habits', JSON.stringify(habits));
}

// ====================== MONEY ======================
function renderMoney() {
  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expense;
  balanceEl.textContent = balance.toFixed(2);
  totalIncomeEl.textContent = income.toFixed(2);
  totalExpenseEl.textContent = expense.toFixed(2);
}

document.getElementById('addTransBtn')?.addEventListener('click', () => {
  const desc = document.getElementById('transDesc').value.trim();
  const amount = parseFloat(document.getElementById('transAmount').value);
  const type = document.getElementById('transType').value;
  if (desc && !isNaN(amount) && amount > 0) {
    transactions.push({ description: desc, amount, type, date: new Date().toISOString() });
    document.getElementById('transDesc').value = '';
    document.getElementById('transAmount').value = '';
    saveTransactions();
    renderMoney();
    updateMoneyChart();
  }
});

function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

function updateMoneyChart() {
  const ctx = document.getElementById('moneyChart')?.getContext('2d');
  if (!ctx) return;
  if (moneyChart) moneyChart.destroy();

  const incomeTotal = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  moneyChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Income', 'Expense'],
      datasets: [{
        data: [incomeTotal, expenseTotal],
        backgroundColor: ['#4fd1c5', '#f687b3'],
        borderColor: 'transparent',
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#f0e9ff' } } }
    }
  });
}

// ====================== GOALS ======================
function renderGoals() {
  if (!goalListEl) return;
  goalListEl.innerHTML = '';
  goals.forEach((goal, index) => {
    const div = document.createElement('div');
    div.className = 'goal-item';
    div.innerHTML = `
      <div class="goal-header">
        <strong>${goal.name}</strong>
        <span>${goal.progress}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${goal.progress}%;"></div>
      </div>
      <div class="goal-actions">
        <button class="update-goal" data-index="${index}" data-inc="10">+10%</button>
        <button class="update-goal" data-index="${index}" data-inc="-10">-10%</button>
        <button class="delete-goal" data-index="${index}">🗑️</button>
      </div>
    `;
    goalListEl.appendChild(div);
  });

  document.querySelectorAll('.update-goal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      const inc = parseInt(e.target.dataset.inc);
      const goal = goals[index];
      let newProgress = Math.min(100, Math.max(0, (goal.progress || 0) + inc));
      if (newProgress === 100 && goal.progress !== 100) {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
        aiMessageEl.textContent = `🎯 Goal "${goal.name}" completed! You're amazing!`;
      }
      goal.progress = newProgress;
      saveGoals();
      renderGoals();
    });
  });

  document.querySelectorAll('.delete-goal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      goals.splice(index, 1);
      saveGoals();
      renderGoals();
    });
  });
}

document.getElementById('addGoalBtn')?.addEventListener('click', () => {
  const name = document.getElementById('goalName').value.trim();
  const progress = parseInt(document.getElementById('goalProgress').value) || 0;
  if (name) {
    goals.push({ name, progress: Math.min(100, Math.max(0, progress)) });
    document.getElementById('goalName').value = '';
    document.getElementById('goalProgress').value = '';
    saveGoals();
    renderGoals();
  }
});

function saveGoals() {
  localStorage.setItem('goals', JSON.stringify(goals));
}

// ====================== REFLECTIONS ======================
function renderReflections() {
  if (!pastReflectionsEl) return;
  pastReflectionsEl.innerHTML = reflections.slice(-5).reverse().map(r => 
    `<div class="past-reflection-item">${r.text} <br><small>${new Date(r.date).toLocaleDateString()}</small></div>`
  ).join('');
}

document.getElementById('saveReflectionBtn')?.addEventListener('click', () => {
  const text = reflectionInput.value.trim();
  if (text) {
    reflections.push({ text, date: new Date().toISOString() });
    localStorage.setItem('reflections', JSON.stringify(reflections));
    reflectionInput.value = '';
    renderReflections();
  }
});

// ====================== AI COMPANION (calls serverless function) ======================
async function fetchAIMessage(promptType, extraData = {}) {
  aiMessageEl.textContent = '🤔 Thinking...';
  try {
    // Gather relevant data from localStorage to send context
    const payload = {
      type: promptType,
      habits: habits,
      transactions: transactions,
      goals: goals,
      reflections: reflections.slice(-3),
      ...extraData
    };

    const response = await fetch('/api/ai-companion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    aiMessageEl.textContent = data.message || '✨ No response';
  } catch (err) {
    aiMessageEl.textContent = '⚠️ Failed to get AI response. Check your API key.';
    console.error(err);
  }
}

// Attach AI tip buttons
document.querySelectorAll('.ai-tip-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const topic = e.target.dataset.topic;
    fetchAIMessage(topic);
  });
});

document.getElementById('weeklySummaryBtn')?.addEventListener('click', () => {
  fetchAIMessage('weeklySummary');
});

document.getElementById('dailyMotivationBtn')?.addEventListener('click', () => {
  fetchAIMessage('dailyMotivation');
});

document.getElementById('aiPromptBtn')?.addEventListener('click', () => {
  fetchAIMessage('reflectionPrompt');
});

// ====================== EXPORT CSV ======================
document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
  let csv = 'Type,Description,Amount,Date\n';
  transactions.forEach(t => {
    csv += `${t.type},${t.description},${t.amount},${t.date}\n`;
  });
  csv += '\nHabits,Streak,CompletedToday\n';
  habits.forEach(h => {
    csv += `${h.name},${h.streak},${h.completedToday}\n`;
  });
  csv += '\nGoals,Progress\n';
  goals.forEach(g => {
    csv += `${g.name},${g.progress}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lifemate_data.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// ====================== UTILS ======================
function setRandomGreeting() {
  const greetings = [
    'Ready to conquer the day?',
    'Your life, beautifully tracked.',
    'Let\'s make today amazing!',
    'I\'m here to help you grow.'
  ];
  document.getElementById('aiGreeting').textContent = greetings[Math.floor(Math.random() * greetings.length)];
}

function setupEventListeners() {
  // Any additional global listeners can go here
}