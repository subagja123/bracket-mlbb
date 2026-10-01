// GLOBAL STATE
let isAdminLoggedIn = false;
let tournamentData = {
    format: 'single_elimination',
    teams: [],
    matches: [],
    upperMatches: [],
    lowerMatches: [],
    grandFinal: null,
    schedule: []
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    loadFromLocalStorage();
});

function initEvents() {
    // Admin Auth Button
    document.getElementById('btnAdminAuth').addEventListener('click', () => {
        if (isAdminLoggedIn) {
            isAdminLoggedIn = false;
            updateAdminUI();
        } else {
            openLoginModal();
        }
    });

    // Login Form Submit (Direct Handling & preventDefault)
    document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = document.getElementById('adminPassword').value;
        if (pwd === '2528') { // Default Password Admin
            isAdminLoggedIn = true;
            document.getElementById('loginError').classList.add('hidden');
            closeLoginModal();
            updateAdminUI();
        } else {
            document.getElementById('loginError').classList.remove('hidden');
        }
    });

    // Close Modals
    document.getElementById('btnCloseLoginModal').addEventListener('click', closeLoginModal);
    document.getElementById('btnCloseScoreModal').addEventListener('click', closeScoreModal);
    document.getElementById('btnSaveScore').addEventListener('click', saveMatchScore);

    // Generate Button
    document.getElementById('btnGenerate').addEventListener('click', generateTournament);
}

function updateAdminUI() {
    const authText = document.getElementById('adminAuthText');
    const nameInput = document.getElementById('tournamentName');

    if (isAdminLoggedIn) {
        authText.textContent = "Logout Admin";
        nameInput.removeAttribute('readonly');
    } else {
        authText.textContent = "Login Admin";
        nameInput.setAttribute('readonly', 'true');
    }
    renderTournamentView();
}

function openLoginModal() {
    document.getElementById('adminPassword').value = '';
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('loginModal').classList.remove('hidden');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
}

function closeScoreModal() {
    document.getElementById('scoreModal').classList.add('hidden');
}

// GENERATE TOURNAMENT LOGIC
function generateTournament() {
    const rawTeams = document.getElementById('teamsInput').value.trim().split('\n').filter(t => t.trim() !== "");
    if (rawTeams.length < 2) {
        alert("Masukkan minimal 2 tim!");
        return;
    }

    tournamentData.format = document.getElementById('tournamentFormat').value;
    tournamentData.teams = rawTeams;

    if (tournamentData.format === 'single_elimination') {
        generateSingleElimination(rawTeams);
    } else if (tournamentData.format === 'double_elimination') {
        generateDoubleElimination(rawTeams);
    } else if (tournamentData.format === 'round_robin') {
        generateRoundRobin(rawTeams);
    }

    saveToLocalStorage();
    renderTournamentView();
}

// 1. SINGLE ELIMINATION
function generateSingleElimination(teams) {
    let numTeams = teams.length;
    let numRounds = Math.ceil(Math.log2(numTeams));
    let bracketSize = Math.pow(2, numRounds);
    let numByes = bracketSize - numTeams;

    let currentRoundTeams = [...teams];
    for (let i = 0; i < numByes; i++) {
        currentRoundTeams.push("BYE");
    }

    let matchId = 1;
    tournamentData.matches = [];

    for (let r = 0; r < numRounds; r++) {
        let matchCount = Math.pow(2, numRounds - r - 1);
        let roundMatches = [];

        for (let m = 0; m < matchCount; m++) {
            let team1 = (r === 0) ? currentRoundTeams[m * 2] : "TBD";
            let team2 = (r === 0) ? currentRoundTeams[m * 2 + 1] : "TBD";

            let status = "pending";
            let score1 = null, score2 = null;

            if (team2 === "BYE" && team1 !== "TBD") {
                status = "completed";
                score1 = 1;
                score2 = 0;
            }

            roundMatches.push({
                id: matchId++,
                round: r + 1,
                matchIndex: m,
                team1: team1,
                team2: team2,
                score1: score1,
                score2: score2,
                status: status
            });
        }
        tournamentData.matches.push({
            name: r === numRounds - 1 ? "Final" : `Round ${r + 1}`,
            matches: roundMatches
        });
    }

    recalculateSingleElim();
}

function recalculateSingleElim() {
    tournamentData.matches.forEach((round, rIdx) => {
        round.matches.forEach((m, mIdx) => {
            let winner = null;
            if (m.team2 === 'BYE') {
                winner = m.team1;
            } else if (m.status === 'completed' && m.score1 !== null && m.score2 !== null) {
                let s1 = parseInt(m.score1);
                let s2 = parseInt(m.score2);
                if (s1 > s2) winner = m.team1;
                else if (s2 > s1) winner = m.team2;
            }

            if (winner && rIdx < tournamentData.matches.length - 1) {
                let nextMatchIdx = Math.floor(mIdx / 2);
                let nextMatch = tournamentData.matches[rIdx + 1].matches[nextMatchIdx];
                if (mIdx % 2 === 0) nextMatch.team1 = winner;
                else nextMatch.team2 = winner;
            }
        });
    });
}

// 2. DYNAMIC DOUBLE ELIMINATION
function generateDoubleElimination(teams) {
    let numTeams = teams.length;
    let numRounds = Math.ceil(Math.log2(numTeams));
    let bracketSize = Math.pow(2, numRounds);
    let numByes = bracketSize - numTeams;

    let currentRoundTeams = [...teams];
    for (let i = 0; i < numByes; i++) {
        currentRoundTeams.push("BYE");
    }

    let matchId = 101;
    
    // Upper Bracket
    tournamentData.upperMatches = [];
    let upperRoundTeams = [...currentRoundTeams];

    for (let r = 0; r < numRounds; r++) {
        let matchCount = Math.pow(2, numRounds - r - 1);
        let roundMatches = [];

        for (let m = 0; m < matchCount; m++) {
            let team1 = (r === 0) ? upperRoundTeams[m * 2] : "TBD";
            let team2 = (r === 0) ? upperRoundTeams[m * 2 + 1] : "TBD";
            
            let status = "pending";
            let score1 = null, score2 = null;

            if (team2 === "BYE" && team1 !== "TBD") {
                status = "completed";
                score1 = 1;
                score2 = 0;
            }

            roundMatches.push({
                id: matchId++,
                round: r + 1,
                matchIndex: m,
                team1: team1,
                team2: team2,
                score1: score1,
                score2: score2,
                status: status
            });
        }
        tournamentData.upperMatches.push({
            name: r === numRounds - 1 ? "Upper Final" : `Upper Round ${r + 1}`,
            matches: roundMatches
        });
    }

    // Lower Bracket
    tournamentData.lowerMatches = [];
    let lowerRoundsCount = (numRounds - 1) * 2;
    let currentMatchCount = Math.pow(2, numRounds - 2);

    for (let r = 0; r < lowerRoundsCount; r++) {
        let roundMatches = [];
        for (let m = 0; m < currentMatchCount; m++) {
            roundMatches.push({
                id: matchId++,
                round: r + 1,
                matchIndex: m,
                team1: "TBD",
                team2: "TBD",
                score1: null,
                score2: null,
                status: "pending"
            });
        }
        tournamentData.lowerMatches.push({
            name: r === lowerRoundsCount - 1 ? "Lower Final" : `Lower Round ${r + 1}`,
            matches: roundMatches
        });

        if (r % 2 === 1) {
            currentMatchCount = Math.max(1, Math.floor(currentMatchCount / 2));
        }
    }

    // Grand Final
    tournamentData.grandFinal = {
        id: matchId++,
        round: "Grand Final",
        team1: "TBD (Juara Upper)",
        team2: "TBD (Juara Lower)",
        score1: null,
        score2: null,
        status: "pending"
    };

    recalculateDoubleElim();
}

function recalculateDoubleElim() {
    if (!tournamentData.upperMatches || tournamentData.upperMatches.length === 0) return;

    tournamentData.upperMatches.forEach((round, rIdx) => {
        round.matches.forEach((m, mIdx) => {
            let winner = null, loser = null;

            if (m.team2 === 'BYE') {
                winner = m.team1;
            } else if (m.status === 'completed' && m.score1 !== null && m.score2 !== null) {
                let s1 = parseInt(m.score1), s2 = parseInt(m.score2);
                if (s1 > s2) { winner = m.team1; loser = m.team2; }
                else if (s2 > s1) { winner = m.team2; loser = m.team1; }
            }

            if (winner && rIdx < tournamentData.upperMatches.length - 1) {
                let nextMatchIdx = Math.floor(mIdx / 2);
                let nextMatch = tournamentData.upperMatches[rIdx + 1].matches[nextMatchIdx];
                if (mIdx % 2 === 0) nextMatch.team1 = winner;
                else nextMatch.team2 = winner;
            }

            if (winner && rIdx === tournamentData.upperMatches.length - 1) {
                tournamentData.grandFinal.team1 = winner;
            }

            if (loser && tournamentData.lowerMatches.length > 0) {
                if (rIdx === 0) {
                    let targetLowerMatch = tournamentData.lowerMatches[0].matches[Math.floor(mIdx / 2)];
                    if (targetLowerMatch) {
                        if (mIdx % 2 === 0) targetLowerMatch.team1 = loser;
                        else targetLowerMatch.team2 = loser;
                    }
                } else {
                    let targetLowerRoundIdx = (rIdx - 1) * 2 + 1;
                    if (tournamentData.lowerMatches[targetLowerRoundIdx]) {
                        let targetLowerMatch = tournamentData.lowerMatches[targetLowerRoundIdx].matches[mIdx];
                        if (targetLowerMatch) targetLowerMatch.team2 = loser;
                    }
                }
            }
        });
    });

    tournamentData.lowerMatches.forEach((round, rIdx) => {
        round.matches.forEach((m, mIdx) => {
            let winner = null;
            if (m.status === 'completed' && m.score1 !== null && m.score2 !== null) {
                let s1 = parseInt(m.score1), s2 = parseInt(m.score2);
                if (s1 > s2) winner = m.team1;
                else if (s2 > s1) winner = m.team2;
            }

            if (winner) {
                if (rIdx < tournamentData.lowerMatches.length - 1) {
                    if (rIdx % 2 === 0) {
                        let nextMatch = tournamentData.lowerMatches[rIdx + 1].matches[mIdx];
                        if (nextMatch) nextMatch.team1 = winner;
                    } else {
                        let nextMatchIdx = Math.floor(mIdx / 2);
                        let nextMatch = tournamentData.lowerMatches[rIdx + 1].matches[nextMatchIdx];
                        if (nextMatch) nextMatch.team1 = winner;
                    }
                } else {
                    tournamentData.grandFinal.team2 = winner;
                }
            }
        });
    });
}

// 3. ROUND ROBIN
function generateRoundRobin(teams) {
    let list = [...teams];
    if (list.length % 2 !== 0) list.push("BYE");

    let n = list.length;
    let rounds = n - 1;
    let matchId = 201;
    tournamentData.schedule = [];

    for (let r = 0; r < rounds; r++) {
        let roundMatches = [];
        for (let i = 0; i < n / 2; i++) {
            let t1 = list[i];
            let t2 = list[n - 1 - i];
            if (t1 !== "BYE" && t2 !== "BYE") {
                roundMatches.push({
                    id: matchId++,
                    round: r + 1,
                    team1: t1,
                    team2: t2,
                    score1: null,
                    score2: null,
                    status: 'pending'
                });
            }
        }
        tournamentData.schedule.push({
            name: `Pekan ${r + 1}`,
            matches: roundMatches
        });
        list.splice(1, 0, list.pop());
    }
}

// RENDER VIEWS
function renderTournamentView() {
    const container = document.getElementById('bracketContainer');
    container.innerHTML = '';

    if (tournamentData.format === 'single_elimination') {
        renderSingleEliminationView(container);
    } else if (tournamentData.format === 'double_elimination') {
        renderDoubleEliminationView(container);
    } else if (tournamentData.format === 'round_robin') {
        renderRoundRobinView(container);
    }
}

function renderMatchCardHTML(m) {
    const isClickable = isAdminLoggedIn && m.team1 !== 'TBD' && m.team2 !== 'TBD' && m.team1 !== 'BYE' && m.team2 !== 'BYE';
    
    return `
        <div onclick="${isClickable ? `openScoreModal(${m.id})` : ''}" 
             class="match-card bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-sm ${isClickable ? 'cursor-pointer hover:border-amber-500' : ''}">
            <div class="flex justify-between items-center mb-1 ${m.score1 > m.score2 ? 'font-bold text-amber-400' : 'text-slate-300'}">
                <span class="truncate max-w-[120px]">${m.team1}</span>
                <span>${m.score1 !== null ? m.score1 : '-'}</span>
            </div>
            <div class="flex justify-between items-center ${m.score2 > m.score1 ? 'font-bold text-amber-400' : 'text-slate-300'}">
                <span class="truncate max-w-[120px]">${m.team2}</span>
                <span>${m.score2 !== null ? m.score2 : '-'}</span>
            </div>
        </div>
    `;
}

function renderSingleEliminationView(container) {
    let html = `<div class="flex gap-8 min-w-max p-2">`;
    tournamentData.matches.forEach(round => {
        html += `
            <div class="flex flex-col justify-around min-w-[200px] space-y-4">
                <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400 text-center pb-2 border-b border-slate-800">${round.name}</h4>
                <div class="flex flex-col justify-around flex-1 space-y-4">
        `;
        round.matches.forEach(m => { html += renderMatchCardHTML(m); });
        html += `</div></div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function renderDoubleEliminationView(container) {
    let html = `
        <div class="mb-6">
            <h3 class="text-amber-400 font-bold text-sm uppercase mb-3"><i class="fa-solid fa-arrow-up-right-dots"></i> Upper Bracket</h3>
            <div class="flex gap-8 min-w-max p-2 overflow-x-auto">
    `;
    tournamentData.upperMatches.forEach(round => {
        html += `
            <div class="flex flex-col justify-around min-w-[200px] space-y-4">
                <h4 class="text-xs font-bold uppercase text-amber-500 text-center pb-2 border-b border-slate-800">${round.name}</h4>
                <div class="flex flex-col justify-around flex-1 space-y-4">
        `;
        round.matches.forEach(m => { html += renderMatchCardHTML(m); });
        html += `</div></div>`;
    });

    html += `</div></div><div class="pt-4 border-t border-slate-800 mb-6">
            <h3 class="text-rose-400 font-bold text-sm uppercase mb-3"><i class="fa-solid fa-arrow-down-left-dots"></i> Lower Bracket</h3>
            <div class="flex gap-8 min-w-max p-2 overflow-x-auto">`;

    tournamentData.lowerMatches.forEach(round => {
        html += `
            <div class="flex flex-col justify-around min-w-[200px] space-y-4">
                <h4 class="text-xs font-bold uppercase text-rose-400 text-center pb-2 border-b border-slate-800">${round.name}</h4>
                <div class="flex flex-col justify-around flex-1 space-y-4">
        `;
        round.matches.forEach(m => { html += renderMatchCardHTML(m); });
        html += `</div></div>`;
    });

    html += `</div></div><div class="pt-4 border-t border-slate-800">
            <h3 class="text-emerald-400 font-bold text-sm uppercase mb-3"><i class="fa-solid fa-crown"></i> Grand Final</h3>
            <div class="flex justify-center p-2">${renderMatchCardHTML(tournamentData.grandFinal)}</div>
        </div>`;

    container.innerHTML = html;
}

function renderRoundRobinView(container) {
    let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">`;
    tournamentData.schedule.forEach(round => {
        html += `
            <div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <h4 class="text-xs font-bold uppercase text-amber-400 mb-3 pb-2 border-b border-slate-800 text-center">${round.name}</h4>
                <div class="space-y-3">
        `;
        round.matches.forEach(m => { html += renderMatchCardHTML(m); });
        html += `</div></div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

// SCORE MODAL LOGIC
function openScoreModal(matchId) {
    let match = findMatchById(matchId);
    if (!match) return;

    document.getElementById('modalMatchId').value = match.id;
    document.getElementById('modalTeam1Name').textContent = match.team1;
    document.getElementById('modalTeam2Name').textContent = match.team2;
    document.getElementById('scoreTeam1').value = match.score1 !== null ? match.score1 : '';
    document.getElementById('scoreTeam2').value = match.score2 !== null ? match.score2 : '';

    document.getElementById('scoreModal').classList.remove('hidden');
}

function saveMatchScore() {
    let matchId = parseInt(document.getElementById('modalMatchId').value);
    let match = findMatchById(matchId);

    if (match) {
        let s1 = document.getElementById('scoreTeam1').value;
        let s2 = document.getElementById('scoreTeam2').value;

        match.score1 = s1 !== "" ? parseInt(s1) : null;
        match.score2 = s2 !== "" ? parseInt(s2) : null;
        match.status = 'completed';

        if (tournamentData.format === 'double_elimination') {
            recalculateDoubleElim();
        } else if (tournamentData.format === 'single_elimination') {
            recalculateSingleElim();
        }

        saveToLocalStorage();
        renderTournamentView();
        closeScoreModal();
    }
}

function findMatchById(matchId) {
    if (tournamentData.format === 'single_elimination') {
        return tournamentData.matches.flatMap(r => r.matches).find(m => m.id === matchId);
    } else if (tournamentData.format === 'double_elimination') {
        let allUpper = tournamentData.upperMatches.flatMap(r => r.matches);
        let allLower = tournamentData.lowerMatches.flatMap(r => r.matches);
        return [...allUpper, ...allLower, tournamentData.grandFinal].find(m => m && m.id === matchId);
    } else if (tournamentData.format === 'round_robin') {
        return tournamentData.schedule.flatMap(r => r.matches).find(m => m.id === matchId);
    }
    return null;
}

// LOCAL STORAGE
function saveToLocalStorage() {
    localStorage.setItem('tournamentData', JSON.stringify(tournamentData));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('tournamentData');
    if (saved) {
        tournamentData = JSON.parse(saved);
        if (tournamentData.teams && tournamentData.teams.length > 0) {
            document.getElementById('teamsInput').value = tournamentData.teams.join('\n');
            document.getElementById('tournamentFormat').value = tournamentData.format;
            renderTournamentView();
        }
    }
}