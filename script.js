// グローバル変数
let timerState = {
    isRunning: false,
    isPaused: false,
    startTime: null,
    pausedTime: 0,
    elapsedTime: 0,
    currentProject: '',
    currentTask: ''
};

let timerInterval = null;
let sessions = [];
let currentChart = null;
let currentProjectChart = null;
let lastBreakTime = null;
let currentReport = null;

// 設定値
let goals = {
    dailyHours: 8,
    workSessionMinutes: 25,
    breakReminderMinutes: 60
};

// 表示状態管理
let viewStates = {
    projectView: 'table', // 'table' または 'chart'
    historyView: 'table'  // 'table' または 'cards'
};

// DOM要素の取得
const timerDisplay = document.getElementById('timerDisplay');
const timerStatus = document.getElementById('timerStatus');
const categoryNameSelect = document.getElementById('categoryName');
const projectNameInput = document.getElementById('projectName');
const taskNameInput = document.getElementById('taskName');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');

const currentWork = document.getElementById('currentWork');
const currentProject = document.getElementById('currentProject');
const currentTask = document.getElementById('currentTask');
const startTime = document.getElementById('startTime');
const elapsedTime = document.getElementById('elapsedTime');

// 目標設定・進捗要素
const workProgress = document.getElementById('workProgress');
const goalProgress = document.getElementById('goalProgress');
const goalProgressText = document.getElementById('goalProgressText');
const breakSuggestion = document.getElementById('breakSuggestion');
const dailyGoal = document.getElementById('dailyGoal');
const workSession = document.getElementById('workSession');
const breakReminder = document.getElementById('breakReminder');
const saveGoalsBtn = document.getElementById('saveGoalsBtn');
const resetGoalsBtn = document.getElementById('resetGoalsBtn');

// レポート要素
const reportType = document.getElementById('reportType');
const generateReportBtn = document.getElementById('generateReportBtn');
const exportReportBtn = document.getElementById('exportReportBtn');
const reportContent = document.getElementById('reportContent');

// プロジェクト集計要素
const viewToggle = document.getElementById('viewToggle');
const summaryPeriod = document.getElementById('summaryPeriod');
const projectTableContainer = document.getElementById('projectTableContainer');
const projectChartContainer = document.getElementById('projectChartContainer');
const projectTableBody = document.getElementById('projectTableBody');
const projectChart = document.getElementById('projectChart');

// 履歴要素
const filterDate = document.getElementById('filterDate');
const filterProject = document.getElementById('filterProject');
const historyViewToggle = document.getElementById('historyViewToggle');
const historySummary = document.getElementById('historySummary');
const totalTime = document.getElementById('totalTime');
const sessionCount = document.getElementById('sessionCount');
const averageSession = document.getElementById('averageSession');
const historyTableContainer = document.getElementById('historyTableContainer');
const historyTableBody = document.getElementById('historyTableBody');
const historyList = document.getElementById('historyList');

const chartType = document.getElementById('chartType');
const chartPeriod = document.getElementById('chartPeriod');
const statsChart = document.getElementById('statsChart');

// エクスポート要素
const exportBtn = document.getElementById('exportBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportProjectCsvBtn = document.getElementById('exportProjectCsvBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const clearBtn = document.getElementById('clearBtn');
const savedSessions = document.getElementById('savedSessions');
const dataSize = document.getElementById('dataSize');
const lastUpdate = document.getElementById('lastUpdate');

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSessions();
    updateDisplay();
    updateProjectSummary();
    updateHistory();
    updateStats();
    updateDataInfo();
});

// イベントリスナーの設定
function setupEventListeners() {
    // タイマーコントロール
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    stopBtn.addEventListener('click', stopTimer);
    resetBtn.addEventListener('click', resetTimer);

    // プロジェクト集計
    viewToggle.addEventListener('click', toggleProjectView);
    summaryPeriod.addEventListener('change', updateProjectSummary);

    // フィルター
    filterDate.addEventListener('change', updateHistory);
    filterProject.addEventListener('change', updateHistory);
    historyViewToggle.addEventListener('click', toggleHistoryView);
    
    // チャート
    chartType.addEventListener('change', updateChart);
    chartPeriod.addEventListener('change', updateChart);

    // データ管理
    exportBtn.addEventListener('click', exportData);
    exportCsvBtn.addEventListener('click', exportCSV);
    exportProjectCsvBtn.addEventListener('click', exportProjectCSV);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importData);
    clearBtn.addEventListener('click', clearData);

    // プロジェクト名とタスク名の入力
    projectNameInput.addEventListener('input', updateProjectFilter);
    taskNameInput.addEventListener('input', updateProjectFilter);
    
    // 新機能のイベントリスナー
    saveGoalsBtn.addEventListener('click', saveGoals);
    resetGoalsBtn.addEventListener('click', resetGoals);
    generateReportBtn.addEventListener('click', generateReport);
    exportReportBtn.addEventListener('click', exportReport);
}

// アプリケーションの初期化
function initializeApp() {
    // localStorageから設定を読み込み
    const savedState = localStorage.getItem('timeTrackerState');
    if (savedState) {
        const state = JSON.parse(savedState);
        projectNameInput.value = state.lastProject || '';
        taskNameInput.value = state.lastTask || '';
        categoryNameSelect.value = state.lastCategory || '開発';
    }
    
    // 目標設定の読み込み
    loadGoals();
    
    // 最後の休憩時間を初期化
    lastBreakTime = Date.now();

    // ページを離れる時の警告
    window.addEventListener('beforeunload', function(e) {
        if (timerState.isRunning && !timerState.isPaused) {
            e.preventDefault();
            e.returnValue = '作業中のタイマーがあります。ページを離れますか？';
            return e.returnValue;
        }
    });

    // ページを閉じる時にセッションを保存
    window.addEventListener('beforeunload', function() {
        if (timerState.isRunning) {
            saveCurrentSession();
        }
        saveAppState();
    });
}

// タイマー開始
function startTimer() {
    const category = categoryNameSelect.value;
    const project = projectNameInput.value.trim();
    const task = taskNameInput.value.trim();

    if (!project || !task) {
        alert('プロジェクト名とタスク名を入力してください。');
        return;
    }

    if (timerState.isPaused) {
        // 一時停止からの再開
        timerState.isRunning = true;
        timerState.isPaused = false;
        timerState.startTime = Date.now() - timerState.pausedTime;
    } else {
        // 新規開始
        timerState = {
            isRunning: true,
            isPaused: false,
            startTime: Date.now(),
            pausedTime: 0,
            elapsedTime: 0,
            currentCategory: category,
            currentProject: project,
            currentTask: task
        };
        
        // 休憩時間をリセット
        lastBreakTime = Date.now();
    }

    updateButtonStates();
    updateCurrentWork();
    startTimerInterval();
    
    timerStatus.textContent = '実行中';
    timerStatus.className = 'timer-status running';
}

// タイマー一時停止
function pauseTimer() {
    if (!timerState.isRunning) return;

    timerState.isRunning = false;
    timerState.isPaused = true;
    timerState.pausedTime = Date.now() - timerState.startTime;

    stopTimerInterval();
    updateButtonStates();
    
    timerStatus.textContent = '一時停止中';
    timerStatus.className = 'timer-status paused';
}

// タイマー停止
function stopTimer() {
    if (!timerState.isRunning && !timerState.isPaused) return;

    // セッションを保存
    saveCurrentSession();
    
    // タイマーをリセット
    resetTimer();
    
    updateProjectSummary();
    updateHistory();
    updateStats();
    updateDataInfo();
}

// タイマーリセット
function resetTimer() {
    timerState = {
        isRunning: false,
        isPaused: false,
        startTime: null,
        pausedTime: 0,
        elapsedTime: 0,
        currentProject: '',
        currentTask: ''
    };

    stopTimerInterval();
    updateButtonStates();
    updateDisplay();
    hideCurrentWork();
    
    timerStatus.textContent = '停止中';
    timerStatus.className = 'timer-status';
}

// タイマー表示の更新
function updateDisplay() {
    let displayTime = 0;

    if (timerState.isRunning) {
        displayTime = Date.now() - timerState.startTime;
    } else if (timerState.isPaused) {
        displayTime = timerState.pausedTime;
    }

    timerDisplay.textContent = formatTime(displayTime);
    
    if (currentWork.style.display !== 'none') {
        elapsedTime.textContent = formatTime(displayTime);
        
        // 進捗表示の更新
        updateWorkProgress();
        
        // 休憩提案のチェック
        checkBreakSuggestion();
    }
}

// タイマーインターバルの開始
function startTimerInterval() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(updateDisplay, 1000);
}

// タイマーインターバルの停止
function stopTimerInterval() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ボタンの状態更新
function updateButtonStates() {
    // 全ボタンのactiveクラスをリセット
    startBtn.classList.remove('active');
    pauseBtn.classList.remove('active');
    stopBtn.classList.remove('active');
    resetBtn.classList.remove('active');
    
    if (timerState.isRunning) {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        resetBtn.disabled = false;
        
        // 実行中のボタンにactiveクラスを追加
        startBtn.classList.add('active');
        timerStatus.className = 'timer-status running';
    } else if (timerState.isPaused) {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = false;
        resetBtn.disabled = false;
        
        // 一時停止中のボタンにactiveクラスを追加
        pauseBtn.classList.add('active');
        timerStatus.className = 'timer-status paused';
    } else {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        resetBtn.disabled = false;
        
        // 停止中の状態表示
        timerStatus.className = 'timer-status';
    }
}

// 現在の作業状況の表示
function updateCurrentWork() {
    currentProject.textContent = `${timerState.currentCategory} - ${timerState.currentProject}`;
    currentTask.textContent = timerState.currentTask;
    startTime.textContent = new Date(timerState.startTime).toLocaleTimeString();
    currentWork.style.display = 'block';
    workProgress.style.display = 'block';
}

// 現在の作業状況を非表示
function hideCurrentWork() {
    currentWork.style.display = 'none';
    workProgress.style.display = 'none';
    breakSuggestion.style.display = 'none';
}

// 現在のセッションを保存
function saveCurrentSession() {
    if (!timerState.startTime || !timerState.currentProject || !timerState.currentTask) {
        return;
    }

    let endTime = Date.now();
    let duration = timerState.isPaused ? timerState.pausedTime : (endTime - timerState.startTime);

    // 最小時間未満の場合は保存しない
    if (duration < 1000) { // 1秒未満
        return;
    }

    const session = {
        id: generateId(),
        category: timerState.currentCategory || '開発',
        project: timerState.currentProject,
        task: timerState.currentTask,
        startTime: timerState.startTime,
        endTime: endTime,
        duration: duration,
        date: new Date(timerState.startTime).toDateString()
    };

    sessions.push(session);
    saveSessions();
}

// プロジェクト別集計の更新
function updateProjectSummary() {
    const period = summaryPeriod.value;
    const filteredSessions = getFilteredSessionsByPeriod(period);
    
    if (viewStates.projectView === 'table') {
        displayProjectTable(filteredSessions);
    } else {
        displayProjectChart(filteredSessions);
    }
}

// 期間でフィルターされたセッションを取得
function getFilteredSessionsByPeriod(period) {
    const now = new Date();
    let filtered = sessions.slice();
    
    if (period === 'today') {
        const today = new Date().toDateString();
        filtered = filtered.filter(session => session.date === today);
    } else if (period === 'week') {
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(session => new Date(session.startTime) >= weekAgo);
    } else if (period === 'month') {
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(session => new Date(session.startTime) >= monthAgo);
    }
    
    return filtered;
}

// プロジェクト別テーブル表示
function displayProjectTable(sessions) {
    const projectStats = calculateProjectStats(sessions);
    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
    
    if (projectStats.length === 0) {
        projectTableBody.innerHTML = '<tr><td colspan="5" class="no-data">データがありません</td></tr>';
        return;
    }
    
    const html = projectStats.map(stats => {
        const percentage = totalDuration > 0 ? (stats.totalDuration / totalDuration * 100).toFixed(1) : 0;
        return `
            <tr>
                <td class="project-name">${escapeHtml(stats.project)}</td>
                <td class="project-duration">${formatDuration(stats.totalDuration)}</td>
                <td class="project-sessions">${stats.sessionCount}</td>
                <td class="project-duration">${formatDuration(stats.averageDuration)}</td>
                <td class="project-percentage">${percentage}%</td>
            </tr>
        `;
    }).join('');
    
    projectTableBody.innerHTML = html;
}

// プロジェクト統計の計算
function calculateProjectStats(sessions) {
    const projectMap = {};
    
    sessions.forEach(session => {
        if (!projectMap[session.project]) {
            projectMap[session.project] = {
                project: session.project,
                totalDuration: 0,
                sessionCount: 0
            };
        }
        
        projectMap[session.project].totalDuration += session.duration;
        projectMap[session.project].sessionCount += 1;
    });
    
    return Object.values(projectMap)
        .map(stats => ({
            ...stats,
            averageDuration: stats.totalDuration / stats.sessionCount
        }))
        .sort((a, b) => b.totalDuration - a.totalDuration);
}

// プロジェクト別チャート表示
function displayProjectChart(sessions) {
    const projectStats = calculateProjectStats(sessions).slice(0, 10); // 上位10プロジェクト
    
    // 既存のチャートを破棄
    if (currentProjectChart) {
        currentProjectChart.destroy();
    }
    
    const ctx = projectChart.getContext('2d');
    const labels = projectStats.map(stats => stats.project);
    const data = projectStats.map(stats => Math.round(stats.totalDuration / (1000 * 60 * 60) * 10) / 10);
    
    currentProjectChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '作業時間 (時間)',
                data: data,
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '時間'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// プロジェクト表示の切り替え
function toggleProjectView() {
    if (viewStates.projectView === 'table') {
        viewStates.projectView = 'chart';
        projectTableContainer.style.display = 'none';
        projectChartContainer.style.display = 'block';
        viewToggle.textContent = '📋 テーブル表示';
    } else {
        viewStates.projectView = 'table';
        projectTableContainer.style.display = 'block';
        projectChartContainer.style.display = 'none';
        viewToggle.textContent = '📊 グラフ表示';
    }
    updateProjectSummary();
}

// セッション履歴の表示更新
function updateHistory() {
    const filteredSessions = getFilteredSessions();
    displayHistorySummary(filteredSessions);
    
    if (viewStates.historyView === 'table') {
        displayHistoryTable(filteredSessions);
    } else {
        displayHistoryCards(filteredSessions);
    }
    
    updateProjectFilter();
}

// フィルターされたセッションを取得
function getFilteredSessions() {
    const dateFilter = filterDate.value;
    const projectFilter = filterProject.value;
    
    let filtered = sessions.slice();
    
    // 日付フィルター
    const now = new Date();
    if (dateFilter === 'today') {
        const today = new Date().toDateString();
        filtered = filtered.filter(session => session.date === today);
    } else if (dateFilter === 'week') {
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(session => new Date(session.startTime) >= weekAgo);
    } else if (dateFilter === 'month') {
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(session => new Date(session.startTime) >= monthAgo);
    }
    
    // プロジェクトフィルター
    if (projectFilter !== 'all') {
        filtered = filtered.filter(session => session.project === projectFilter);
    }
    
    return filtered.sort((a, b) => b.startTime - a.startTime);
}

// 履歴サマリーの表示
function displayHistorySummary(sessions) {
    const total = sessions.reduce((sum, session) => sum + session.duration, 0);
    const count = sessions.length;
    const average = count > 0 ? total / count : 0;
    
    totalTime.textContent = formatDuration(total);
    sessionCount.textContent = count;
    averageSession.textContent = formatDuration(average);
}

// 履歴テーブル表示
function displayHistoryTable(sessions) {
    if (sessions.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="6" class="no-data">データがありません</td></tr>';
        return;
    }
    
    const html = sessions.map(session => `
        <tr>
            <td class="table-date">${new Date(session.startTime).toLocaleDateString()}</td>
            <td class="table-project">${escapeHtml(session.project)}</td>
            <td class="table-task">${escapeHtml(session.task)}</td>
            <td class="table-time">${new Date(session.startTime).toLocaleTimeString()}</td>
            <td class="table-time">${new Date(session.endTime).toLocaleTimeString()}</td>
            <td class="table-duration">${formatDuration(session.duration)}</td>
        </tr>
    `).join('');
    
    historyTableBody.innerHTML = html;
}

// 履歴カード表示（既存機能）
function displayHistoryCards(sessions) {
    if (sessions.length === 0) {
        historyList.innerHTML = '<div class="no-data">該当する履歴がありません</div>';
        return;
    }
    
    const html = sessions.map(session => `
        <div class="history-item">
            <div class="history-project">${escapeHtml(session.project)}</div>
            <div class="history-task">${escapeHtml(session.task)}</div>
            <div class="history-duration">${formatDuration(session.duration)}</div>
            <div class="history-time">
                ${new Date(session.startTime).toLocaleString()}<br>
                <small>～${new Date(session.endTime).toLocaleTimeString()}</small>
            </div>
        </div>
    `).join('');
    
    historyList.innerHTML = html;
}

// 履歴表示の切り替え
function toggleHistoryView() {
    if (viewStates.historyView === 'table') {
        viewStates.historyView = 'cards';
        historyTableContainer.style.display = 'none';
        historyList.style.display = 'block';
        historyViewToggle.textContent = '📋 テーブル表示';
    } else {
        viewStates.historyView = 'table';
        historyTableContainer.style.display = 'block';
        historyList.style.display = 'none';
        historyViewToggle.textContent = '📊 カード表示';
    }
    updateHistory();
}

// プロジェクトフィルターの更新
function updateProjectFilter() {
    const projects = [...new Set(sessions.map(session => session.project))];
    const currentValue = filterProject.value;
    
    filterProject.innerHTML = '<option value="all">全プロジェクト</option>';
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        filterProject.appendChild(option);
    });
    
    // 現在の値を復元
    if (projects.includes(currentValue)) {
        filterProject.value = currentValue;
    }
}

// 統計・グラフの更新
function updateStats() {
    updateChart();
}

// チャートの更新
function updateChart() {
    const type = chartType.value;
    const period = chartPeriod.value;
    
    // 既存のチャートを破棄
    if (currentChart) {
        currentChart.destroy();
    }
    
    const data = getChartData(type, period);
    createChart(data, type);
}

// チャートデータの取得
function getChartData(type, period) {
    const now = new Date();
    let filteredSessions = sessions;
    
    // 期間フィルター
    if (period === 'week') {
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        filteredSessions = sessions.filter(session => new Date(session.startTime) >= weekAgo);
    } else if (period === 'month') {
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        filteredSessions = sessions.filter(session => new Date(session.startTime) >= monthAgo);
    }
    
    if (type === 'daily') {
        return getDailyData(filteredSessions, period);
    } else if (type === 'project') {
        return getProjectData(filteredSessions);
    } else if (type === 'task') {
        return getTaskData(filteredSessions);
    } else if (type === 'category') {
        return getCategoryData(filteredSessions);
    }
    
    return { labels: [], data: [] };
}

// 日別データの取得
function getDailyData(sessions, period) {
    const days = period === 'week' ? 7 : (period === 'month' ? 30 : 7);
    const labels = [];
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toDateString();
        
        labels.push(date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }));
        
        const dayTotal = sessions
            .filter(session => session.date === dateString)
            .reduce((sum, session) => sum + session.duration, 0);
            
        data.push(Math.round(dayTotal / (1000 * 60 * 60) * 10) / 10); // 時間に変換
    }
    
    return { labels, data };
}

// プロジェクト別データの取得
function getProjectData(sessions) {
    const projectTotals = {};
    
    sessions.forEach(session => {
        if (!projectTotals[session.project]) {
            projectTotals[session.project] = 0;
        }
        projectTotals[session.project] += session.duration;
    });
    
    const sortedProjects = Object.entries(projectTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10); // 上位10プロジェクト
    
    return {
        labels: sortedProjects.map(([project]) => project),
        data: sortedProjects.map(([,duration]) => Math.round(duration / (1000 * 60 * 60) * 10) / 10)
    };
}

// タスク別データの取得
function getTaskData(sessions) {
    const taskTotals = {};
    
    sessions.forEach(session => {
        const key = `${session.project} - ${session.task}`;
        if (!taskTotals[key]) {
            taskTotals[key] = 0;
        }
        taskTotals[key] += session.duration;
    });
    
    const sortedTasks = Object.entries(taskTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10); // 上位10タスク
    
    return {
        labels: sortedTasks.map(([task]) => task),
        data: sortedTasks.map(([,duration]) => Math.round(duration / (1000 * 60 * 60) * 10) / 10)
    };
}

// チャートの作成
function createChart(chartData, type) {
    const ctx = statsChart.getContext('2d');
    
    const config = {
        type: type === 'daily' ? 'line' : 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: '作業時間 (時間)',
                data: chartData.data,
                backgroundColor: type === 'daily' ? 
                    'rgba(102, 126, 234, 0.1)' : 
                    'rgba(102, 126, 234, 0.6)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                fill: type === 'daily'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '時間'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    };
    
    currentChart = new Chart(ctx, config);
}

// データエクスポート（JSON）
function exportData() {
    const data = {
        sessions: sessions,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `time-tracker-data-${new Date().toISOString().split('T')[0]}.json`);
}

// CSVエクスポート
function exportCSV() {
    if (sessions.length === 0) {
        alert('エクスポートするデータがありません。');
        return;
    }

    const headers = ['日付', 'プロジェクト', 'タスク', '開始時刻', '終了時刻', '作業時間(秒)', '作業時間(時:分:秒)'];
    const rows = sessions.map(session => [
        new Date(session.startTime).toLocaleDateString(),
        session.project,
        session.task,
        new Date(session.startTime).toLocaleTimeString(),
        new Date(session.endTime).toLocaleTimeString(),
        Math.round(session.duration / 1000),
        formatDuration(session.duration)
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `time-tracker-sessions-${new Date().toISOString().split('T')[0]}.csv`);
}

// プロジェクト集計CSVエクスポート
function exportProjectCSV() {
    if (sessions.length === 0) {
        alert('エクスポートするデータがありません。');
        return;
    }

    const projectStats = calculateProjectStats(sessions);
    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);

    const headers = ['プロジェクト', '合計時間(秒)', '合計時間(時:分:秒)', 'セッション数', '平均時間(秒)', '平均時間(時:分:秒)', '割合(%)'];
    const rows = projectStats.map(stats => {
        const percentage = totalDuration > 0 ? (stats.totalDuration / totalDuration * 100).toFixed(1) : 0;
        return [
            stats.project,
            Math.round(stats.totalDuration / 1000),
            formatDuration(stats.totalDuration),
            stats.sessionCount,
            Math.round(stats.averageDuration / 1000),
            formatDuration(stats.averageDuration),
            percentage
        ];
    });

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `time-tracker-projects-${new Date().toISOString().split('T')[0]}.csv`);
}

// Blobダウンロード共通処理
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
}

// データインポート
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.sessions && Array.isArray(data.sessions)) {
                if (confirm('現在のデータに追加しますか？（「キャンセル」で置き換え）')) {
                    // 重複を避けて追加
                    const existingIds = new Set(sessions.map(s => s.id));
                    const newSessions = data.sessions.filter(s => !existingIds.has(s.id));
                    sessions.push(...newSessions);
                } else {
                    // 置き換え
                    sessions = data.sessions;
                }
                
                saveSessions();
                updateProjectSummary();
                updateHistory();
                updateStats();
                updateDataInfo();
                alert('データのインポートが完了しました。');
            } else {
                alert('無効なデータ形式です。');
            }
        } catch (error) {
            alert('ファイルの読み込みに失敗しました。');
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // ファイル選択をクリア
}

// データクリア
function clearData() {
    if (confirm('すべてのデータを削除しますか？この操作は元に戻せません。')) {
        if (confirm('本当に削除しますか？')) {
            sessions = [];
            saveSessions();
            updateProjectSummary();
            updateHistory();
            updateStats();
            updateDataInfo();
            alert('すべてのデータが削除されました。');
        }
    }
}

// データ情報の更新
function updateDataInfo() {
    savedSessions.textContent = sessions.length;
    
    const dataString = JSON.stringify(sessions);
    const sizeKB = Math.round(new Blob([dataString]).size / 1024 * 10) / 10;
    dataSize.textContent = `${sizeKB} KB`;
    
    if (sessions.length > 0) {
        const lastSession = sessions[sessions.length - 1];
        lastUpdate.textContent = new Date(lastSession.endTime).toLocaleString();
    } else {
        lastUpdate.textContent = '-';
    }
}

// セッション保存
function saveSessions() {
    localStorage.setItem('timeTrackerSessions', JSON.stringify(sessions));
}

// セッション読み込み
function loadSessions() {
    const saved = localStorage.getItem('timeTrackerSessions');
    if (saved) {
        sessions = JSON.parse(saved);
    }
}

// アプリケーション状態の保存
function saveAppState() {
    const state = {
        lastProject: projectNameInput.value,
        lastTask: taskNameInput.value,
        lastCategory: categoryNameSelect.value
    };
    localStorage.setItem('timeTrackerState', JSON.stringify(state));
}

// カテゴリ別データの取得
function getCategoryData(sessions) {
    const categoryTotals = {};
    
    sessions.forEach(session => {
        const category = session.category || '開発';
        if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
        }
        categoryTotals[category] += session.duration;
    });
    
    const sortedCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a);
    
    return {
        labels: sortedCategories.map(([category]) => category),
        data: sortedCategories.map(([,duration]) => Math.round(duration / (1000 * 60 * 60) * 10) / 10)
    };
}

// 目標設定の保存
function saveGoals() {
    goals.dailyHours = parseFloat(dailyGoal.value);
    goals.workSessionMinutes = parseInt(workSession.value);
    goals.breakReminderMinutes = parseInt(breakReminder.value);
    
    localStorage.setItem('timeTrackerGoals', JSON.stringify(goals));
    alert('目標設定を保存しました！');
}

// 目標設定のリセット
function resetGoals() {
    goals = {
        dailyHours: 8,
        workSessionMinutes: 25,
        breakReminderMinutes: 60
    };
    
    dailyGoal.value = goals.dailyHours;
    workSession.value = goals.workSessionMinutes;
    breakReminder.value = goals.breakReminderMinutes;
    
    localStorage.setItem('timeTrackerGoals', JSON.stringify(goals));
    alert('目標設定をデフォルトに戻しました！');
}

// 目標設定の読み込み
function loadGoals() {
    const saved = localStorage.getItem('timeTrackerGoals');
    if (saved) {
        goals = JSON.parse(saved);
    }
    
    dailyGoal.value = goals.dailyHours;
    workSession.value = goals.workSessionMinutes;
    breakReminder.value = goals.breakReminderMinutes;
}

// 作業進捗の更新
function updateWorkProgress() {
    const todaysSessions = sessions.filter(session => 
        session.date === new Date().toDateString()
    );
    
    const todaysTotal = todaysSessions.reduce((sum, session) => sum + session.duration, 0);
    const todaysHours = todaysTotal / (1000 * 60 * 60);
    
    const progress = Math.min((todaysHours / goals.dailyHours) * 100, 100);
    
    goalProgress.style.width = `${progress}%`;
    goalProgressText.textContent = `${Math.round(progress)}%`;
}

// 休憩提案のチェック
function checkBreakSuggestion() {
    if (!lastBreakTime) return;
    
    const timeSinceBreak = Date.now() - lastBreakTime;
    const breakIntervalMs = goals.breakReminderMinutes * 60 * 1000;
    
    if (timeSinceBreak >= breakIntervalMs) {
        breakSuggestion.style.display = 'flex';
    } else {
        breakSuggestion.style.display = 'none';
    }
}

// レポート生成
function generateReport() {
    const type = reportType.value;
    const now = new Date();
    
    let startDate, endDate, periodName;
    
    if (type === 'weekly') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // 今週の日曜日
        weekStart.setHours(0, 0, 0, 0);
        
        startDate = weekStart;
        endDate = new Date(now);
        periodName = '今週';
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // 今月の1日
        endDate = new Date(now);
        periodName = '今月';
    }
    
    const reportSessions = sessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= startDate && sessionDate <= endDate;
    });
    
    displayReport(reportSessions, periodName);
}

// レポート表示
function displayReport(sessions, periodName) {
    if (sessions.length === 0) {
        reportContent.innerHTML = '<div class="no-data">該当期間にデータがありません</div>';
        return;
    }
    
    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
    const totalHours = totalDuration / (1000 * 60 * 60);
    const avgSessionDuration = totalDuration / sessions.length;
    
    // プロジェクト別集計
    const projectStats = calculateProjectStats(sessions);
    
    // カテゴリ別集計
    const categoryStats = {};
    sessions.forEach(session => {
        const category = session.category || '開発';
        if (!categoryStats[category]) {
            categoryStats[category] = { duration: 0, sessions: 0 };
        }
        categoryStats[category].duration += session.duration;
        categoryStats[category].sessions += 1;
    });
    
    currentReport = {
        period: periodName,
        sessions: sessions,
        totalHours: totalHours,
        avgSessionDuration: avgSessionDuration,
        projectStats: projectStats,
        categoryStats: categoryStats
    };
    
    const html = `
        <div class="report-summary">
            <div class="report-metric">
                <div class="metric-value">${Math.round(totalHours * 10) / 10}</div>
                <div class="metric-label">総作業時間（時間）</div>
            </div>
            <div class="report-metric">
                <div class="metric-value">${sessions.length}</div>
                <div class="metric-label">セッション数</div>
            </div>
            <div class="report-metric">
                <div class="metric-value">${Math.round(avgSessionDuration / (1000 * 60))}</div>
                <div class="metric-label">平均セッション（分）</div>
            </div>
            <div class="report-metric">
                <div class="metric-value">${Object.keys(categoryStats).length}</div>
                <div class="metric-label">カテゴリ数</div>
            </div>
        </div>
        
        <h4>📊 カテゴリ別作業時間</h4>
        <table class="report-table">
            <thead>
                <tr>
                    <th>カテゴリ</th>
                    <th>作業時間</th>
                    <th>セッション数</th>
                    <th>割合</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(categoryStats)
                    .sort(([,a], [,b]) => b.duration - a.duration)
                    .map(([category, stats]) => {
                        const percentage = ((stats.duration / totalDuration) * 100).toFixed(1);
                        return `
                            <tr>
                                <td>${escapeHtml(category)}</td>
                                <td>${formatDuration(stats.duration)}</td>
                                <td>${stats.sessions}</td>
                                <td>${percentage}%</td>
                            </tr>
                        `;
                    }).join('')}
            </tbody>
        </table>
        
        <h4>📁 上位プロジェクト</h4>
        <table class="report-table">
            <thead>
                <tr>
                    <th>プロジェクト</th>
                    <th>作業時間</th>
                    <th>セッション数</th>
                    <th>平均時間</th>
                </tr>
            </thead>
            <tbody>
                ${projectStats.slice(0, 10).map(stats => `
                    <tr>
                        <td>${escapeHtml(stats.project)}</td>
                        <td>${formatDuration(stats.totalDuration)}</td>
                        <td>${stats.sessionCount}</td>
                        <td>${formatDuration(stats.averageDuration)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    reportContent.innerHTML = html;
}

// レポートのエクスポート
function exportReport() {
    if (!currentReport) {
        alert('まずレポートを生成してください。');
        return;
    }
    
    const csvHeaders = ['期間', 'カテゴリ', 'プロジェクト', 'タスク', '日付', '開始時刻', '終了時刻', '作業時間(秒)'];
    const csvRows = currentReport.sessions.map(session => [
        currentReport.period,
        session.category || '開発',
        session.project,
        session.task,
        new Date(session.startTime).toLocaleDateString(),
        new Date(session.startTime).toLocaleTimeString(),
        new Date(session.endTime).toLocaleTimeString(),
        Math.round(session.duration / 1000)
    ]);
    
    const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `time-tracker-report-${currentReport.period}-${new Date().toISOString().split('T')[0]}.csv`);
}

// ユーティリティ関数

// 時間のフォーマット (HH:MM:SS)
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 期間のフォーマット (1h 30m 15s)
function formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        if (seconds > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${hours}h`;
        }
    } else if (minutes > 0) {
        if (seconds > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${minutes}m`;
        }
    } else {
        return `${seconds}s`;
    }
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ID生成
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}