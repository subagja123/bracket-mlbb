// ==========================================
// STATE UTAMA APLIKASI
// ==========================================
let isAdminLoggedIn = false;
let tournamentData = {
    name: "MLBB TOURNAMENT",
    format: "single_elimination",
    teams: [],
    upperRounds: [],
    lowerRounds: [],
    standings: {}
};

// ==========================================
// EVENT LISTENER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    updateAdminUI();
    loadLocalData();
    listenRealtimeUpdates(); // <-- TAMBAHKAN BARIS INI
});

function initEvents() {
    const btnAdminAuth = document.getElementById('btnAdminAuth');
    const btnCloseLoginModal = document.getElementById('btnCloseLoginModal');
    const adminLoginForm = document.getElementById('adminLoginForm');

    if (btnAdminAuth) {
        btnAdminAuth.addEventListener('click', () => {
            if (isAdminLoggedIn) {
                isAdminLoggedIn = false;
                updateAdminUI();
                alert("Logout Admin Berhasil!");
            } else {
                document.getElementById('loginModal').classList.remove('hidden');
            }
        });
    }

    if (btnCloseLoginModal) {
        btnCloseLoginModal.addEventListener('click', () => {
            document.getElementById('loginModal').classList.add('hidden');
        });
    }

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const pass = document.getElementById('adminPassword').value;
            if (pass === '2528') {
                isAdminLoggedIn = true;
                document.getElementById('adminPassword').value = '';
                document.getElementById('loginError').classList.add('hidden');
                document.getElementById('loginModal').classList.add('hidden');
                updateAdminUI();
                alert("Login Admin Berhasil!");
            } else {
                document.getElementById('loginError').classList.remove('hidden');
            }
        });
    }

    const btnShuffle = document.getElementById('btnShuffleTeams');
    if (btnShuffle) btnShuffle.addEventListener('click', shuffleTeamsInput);

    const btnGenerate = document.getElementById('btnGenerate');
    if (btnGenerate) btnGenerate.addEventListener('click', generateBracket);

    const btnExport = document.getElementById('btnExport');
    if (btnExport) btnExport.addEventListener('click', exportDataJSON);

    const btnArchive = document.getElementById('btnArchive');
    if (btnArchive) btnArchive.addEventListener('click', archiveToFirebase);

    const btnCloseScoreModal = document.getElementById('btnCloseScoreModal');
    const btnSaveScore = document.getElementById('btnSaveScore');

    if (btnCloseScoreModal) {
        btnCloseScoreModal.addEventListener('click', () => {
            document.getElementById('scoreModal').classList.add('hidden');
        });
    }

    if (btnSaveScore) btnSaveScore.addEventListener('click', saveScoreFromModal);
}

function updateAdminUI() {
    const adminAuthText = document.getElementById('adminAuthText');
    const teamsInput = document.getElementById('teamsInput');
    const tournamentFormat = document.getElementById('tournamentFormat');
    const btnGenerate = document.getElementById('btnGenerate');
    const btnShuffle = document.getElementById('btnShuffleTeams');

    if (isAdminLoggedIn) {
        if (adminAuthText) adminAuthText.innerText = "Logout Admin";
        if (teamsInput) teamsInput.removeAttribute('disabled');
        if (tournamentFormat) tournamentFormat.removeAttribute('disabled');
        if (btnGenerate) btnGenerate.removeAttribute('disabled');
        if (btnShuffle) btnShuffle.removeAttribute('disabled');
    } else {
        if (adminAuthText) adminAuthText.innerText = "Login Admin";
        if (teamsInput) teamsInput.setAttribute('disabled', 'true');
        if (tournamentFormat) tournamentFormat.setAttribute('disabled', 'true');
        if (btnGenerate) btnGenerate.setAttribute('disabled', 'true');
        if (btnShuffle) btnShuffle.setAttribute('disabled', 'true');
    }
    renderBracket();
}

function shuffleTeamsInput() {
    if (!isAdminLoggedIn) return;
    const textarea = document.getElementById('teamsInput');
    let teams = textarea.value.trim().split('\n').map(t => t.trim()).filter(t => t !== "");

    if (teams.length < 2) {
        alert("Masukkan minimal 2 tim!");
        return;
    }

    for (let i = teams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teams[i], teams[j]] = [teams[j], teams[i]];
    }

    textarea.value = teams.join('\n');
}

// ==========================================
// LOGIKA GENERATE TURNAMEN
// ==========================================
function generateBracket() {
    if (!isAdminLoggedIn) return;

    const rawTeams = document.getElementById('teamsInput').value;
    const format = document.getElementById('tournamentFormat').value;
    const teams = rawTeams.split('\n').map(t => t.trim()).filter(t => t !== "");

    if (teams.length < 2) {
        alert("Masukkan minimal 2 tim!");
        return;
    }

    tournamentData.format = format;
    tournamentData.teams = teams;
    tournamentData.upperRounds = [];
    tournamentData.lowerRounds = [];
    tournamentData.standings = {};

    if (format === 'round_robin') {
        generateRoundRobin(teams);
    } else if (format === 'double_elimination') {
        generateDoubleEliminationDynamic(teams);
    } else {
        generateSingleEliminationTree(teams);
    }

    saveLocalData();
    renderBracket();
}

function generateSingleEliminationTree(teams) {
    let numTeams = teams.length;
    let powerOfTwo = Math.pow(2, Math.ceil(Math.log2(numTeams)));
    let byes = powerOfTwo - numTeams;

    let paddedTeams = [...teams];
    for (let i = 0; i < byes; i++) paddedTeams.push("BYE");

    let matchCounter = 1;
    let currentMatches = [];

    for (let i = 0; i < paddedTeams.length; i += 2) {
        let t1 = paddedTeams[i];
        let t2 = paddedTeams[i + 1];
        let isBye = (t2 === "BYE");

        currentMatches.push({
            id: matchCounter++,
            team1: t1,
            team2: t2,
            score1: isBye ? 1 : 0,
            score2: 0,
            winner: isBye ? t1 : null,
            loser: isBye ? "BYE" : null
        });
    }

    tournamentData.upperRounds.push({ title: "Round 1", matches: currentMatches });

    let totalRounds = Math.log2(powerOfTwo);
    for (let r = 2; r <= totalRounds; r++) {
        let nextMatches = [];
        let prevMatches = tournamentData.upperRounds[r - 2].matches;
        let roundTitle = (r === totalRounds) ? "FINAL" : ((r === totalRounds - 1) ? "SEMI FINAL" : `ROUND ${r}`);

        for (let i = 0; i < prevMatches.length; i += 2) {
            let prev1 = prevMatches[i];
            let prev2 = prevMatches[i + 1];

            nextMatches.push({
                id: matchCounter++,
                team1: prev1.winner ? prev1.winner : "TBD",
                team2: prev2 ? (prev2.winner ? prev2.winner : "TBD") : "TBD",
                score1: 0,
                score2: 0,
                winner: null,
                loser: null
            });
        }
        tournamentData.upperRounds.push({ title: roundTitle, matches: nextMatches });
    }
}

function generateDoubleEliminationDynamic(teams) {
    let numTeams = teams.length;
    let powerOfTwo = Math.pow(2, Math.ceil(Math.log2(numTeams)));
    let byes = powerOfTwo - numTeams;

    let paddedTeams = [...teams];
    for (let i = 0; i < byes; i++) paddedTeams.push("BYE");

    let matchCounter = 1;
    
    let currentMatches = [];
    for (let i = 0; i < paddedTeams.length; i += 2) {
        let t1 = paddedTeams[i];
        let t2 = paddedTeams[i + 1];
        let isBye = (t2 === "BYE");

        currentMatches.push({
            id: matchCounter++,
            team1: t1,
            team2: t2,
            score1: isBye ? 1 : 0,
            score2: 0,
            winner: isBye ? t1 : null,
            loser: isBye ? "BYE" : null
        });
    }

    tournamentData.upperRounds.push({ title: "UPPER ROUND 1", matches: currentMatches });

    let upperRoundsCount = Math.log2(powerOfTwo);
    for (let r = 2; r <= upperRoundsCount; r++) {
        let nextMatches = [];
        let prevMatches = tournamentData.upperRounds[r - 2].matches;
        let roundTitle = (r === upperRoundsCount) ? "UPPER FINAL" : `UPPER ROUND ${r}`;

        for (let i = 0; i < prevMatches.length; i += 2) {
            let prev1 = prevMatches[i];
            let prev2 = prevMatches[i + 1];

            nextMatches.push({
                id: matchCounter++,
                team1: prev1.winner ? prev1.winner : "TBD",
                team2: prev2 ? (prev2.winner ? prev2.winner : "TBD") : "TBD",
                score1: 0,
                score2: 0,
                winner: null,
                loser: null
            });
        }
        tournamentData.upperRounds.push({ title: roundTitle, matches: nextMatches });
    }

    tournamentData.upperRounds.push({
        title: "GRAND FINAL",
        matches: [{
            id: matchCounter++,
            team1: "Juara Upper Bracket",
            team2: "Juara Lower Bracket",
            score1: 0,
            score2: 0,
            winner: null,
            loser: null
        }]
    });

    let lowerMatchCounter = 101;
    let lowerRoundsCount = (upperRoundsCount - 1) * 2;
    let matchCountInRound = powerOfTwo / 4;

    for (let lr = 1; lr <= lowerRoundsCount; lr++) {
        let lMatches = [];
        let count = matchCountInRound;
        
        for (let i = 0; i < count; i++) {
            lMatches.push({
                id: lowerMatchCounter++,
                team1: "TBD",
                team2: "TBD",
                score1: 0,
                score2: 0,
                winner: null,
                loser: null
            });
        }

        let title = (lr === lowerRoundsCount) ? "LOWER FINAL" : `LOWER ROUND ${lr}`;
        tournamentData.lowerRounds.push({ title: title, matches: lMatches });

        if (lr % 2 === 0) {
            matchCountInRound = Math.max(1, matchCountInRound / 2);
        }
    }
}

function generateRoundRobin(teams) {
    let groupMatches = [];
    let matchId = 1;

    // Reset Statistik Klasemen (Format MPL Style)
    teams.forEach(t => {
        tournamentData.standings[t] = { 
            matchPlayed: 0, 
            matchWon: 0, 
            matchLost: 0, 
            gameWon: 0, 
            gameLost: 0, 
            gameNet: 0, 
            points: 0 
        };
    });

    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            groupMatches.push({
                id: matchId++,
                team1: teams[i],
                team2: teams[j],
                score1: 0,
                score2: 0,
                winner: null
            });
        }
    }

    tournamentData.upperRounds = [{
        title: "JADWAL MATCH FASE GRUP",
        matches: groupMatches
    }];
}

// PERHITUNGAN KLASEMEN MODEL LIGA MPL ID
function recalculateGroupStandings() {
    if (tournamentData.format !== 'round_robin') return;

    // Inisialisasi awal statistik setiap tim
    tournamentData.teams.forEach(t => {
        tournamentData.standings[t] = { 
            matchPlayed: 0, 
            matchWon: 0, 
            matchLost: 0, 
            gameWon: 0, 
            gameLost: 0, 
            gameNet: 0, 
            points: 0 
        };
    });

    let matches = tournamentData.upperRounds[0].matches;
    matches.forEach(m => {
        if (m.winner !== null) {
            let t1 = m.team1;
            let t2 = m.team2;
            let s1 = parseInt(m.score1) || 0;
            let s2 = parseInt(m.score2) || 0;

            if (tournamentData.standings[t1] && tournamentData.standings[t2]) {
                // Total Seri Tanding (Match Played)
                tournamentData.standings[t1].matchPlayed += 1;
                tournamentData.standings[t2].matchPlayed += 1;

                // Akumulasi Menang/Kalah Game
                tournamentData.standings[t1].gameWon += s1;
                tournamentData.standings[t1].gameLost += s2;

                tournamentData.standings[t2].gameWon += s2;
                tournamentData.standings[t2].gameLost += s1;

                // Penentuan Menang Seri (Match Winner)
                if (m.winner === t1) {
                    tournamentData.standings[t1].matchWon += 1;
                    tournamentData.standings[t1].points += 1; // 1 Poin Kemenangan Seri
                    tournamentData.standings[t2].matchLost += 1;
                } else if (m.winner === t2) {
                    tournamentData.standings[t2].matchWon += 1;
                    tournamentData.standings[t2].points += 1; // 1 Poin Kemenangan Seri
                    tournamentData.standings[t1].matchLost += 1;
                }

                // Perhitungan Selisih Game (Game Net / Diff)
                tournamentData.standings[t1].gameNet = tournamentData.standings[t1].gameWon - tournamentData.standings[t1].gameLost;
                tournamentData.standings[t2].gameNet = tournamentData.standings[t2].gameWon - tournamentData.standings[t2].gameLost;
            }
        }
    });
}

// ==========================================
// RENDER BAGAN & LAYOUT
// ==========================================
function renderBracket() {
    const container = document.getElementById('bracketContainer');
    if (!container) return;

    if (!tournamentData.upperRounds || tournamentData.upperRounds.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-sitemap"></i>
                <p>Silakan login admin dan klik "Generate Bagan" untuk membuat skema pertandingan.</p>
            </div>`;
        return;
    }

    if (tournamentData.format === 'round_robin') {
        recalculateGroupStandings();
        let html = `<div class="group-stage-container">`;
        html += renderStandingsTable();
        
        html += `<div class="group-matches-box">`;
        html += `<h3 class="standings-title"><i class="fa-solid fa-fire"></i> Jadwal Pertandingan</h3>`;
        html += renderGroupMatchListVertical(tournamentData.upperRounds[0].matches);
        html += `</div>`;
        
        html += `</div>`;
        container.innerHTML = html;
        return;
    }

    let html = `<div class="bracket-wrapper">`;
    
    html += `<div>`;
    if (tournamentData.format === 'double_elimination') {
        html += `<div class="bracket-section-title"><i class="fa-solid fa-angles-up"></i> UPPER BRACKET</div>`;
    } else {
        html += `<div class="bracket-section-title"><i class="fa-solid fa-trophy"></i> BAGAN PERTANDINGAN</div>`;
    }
    html += renderRoundsTree(tournamentData.upperRounds);
    html += `</div>`;

    if (tournamentData.format === 'double_elimination' && tournamentData.lowerRounds.length > 0) {
        html += `<div style="margin-top: 1.5rem;">`;
        html += `<div class="bracket-section-title" style="color: #0d9488;"><i class="fa-solid fa-angles-down"></i> LOWER BRACKET</div>`;
        html += renderRoundsTree(tournamentData.lowerRounds);
        html += `</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

// RENDERING TABEL KLASEMEN MODEL MPL ID
function renderStandingsTable() {
    let sortedTeams = [...tournamentData.teams].sort((a, b) => {
        let stA = tournamentData.standings[a] || { points: 0, gameNet: 0, gameWon: 0 };
        let stB = tournamentData.standings[b] || { points: 0, gameNet: 0, gameWon: 0 };

        // 1. Urutkan berdasarkan Poin Match Menang
        if (stB.points !== stA.points) return stB.points - stA.points;
        // 2. Jika Poin Sama, Urutkan berdasarkan Selisih Game (Game Net)
        if (stB.gameNet !== stA.gameNet) return stB.gameNet - stA.gameNet;
        // 3. Jika Masih Sama, Urutkan berdasarkan Total Game Menang
        return stB.gameWon - stA.gameWon;
    });

    let html = `
        <div class="standings-box">
            <h3 class="standings-title"><i class="fa-solid fa-trophy"></i> Klasemen Liga MPL Style</h3>
            <table class="standings-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th style="text-align: left;">Tim</th>
                        <th>Match (W-L)</th>
                        <th>Game (W-L)</th>
                        <th>Net</th>
                        <th>PTS</th>
                    </tr>
                </thead>
                <tbody>`;

    sortedTeams.forEach((t, idx) => {
        let stat = tournamentData.standings[t] || { matchPlayed: 0, matchWon: 0, matchLost: 0, gameWon: 0, gameLost: 0, gameNet: 0, points: 0 };
        let rankBadge = `<span class="rank-badge rank-other">${idx + 1}</span>`;
        if (idx === 0) rankBadge = `<span class="rank-badge rank-1">1</span>`;
        else if (idx === 1) rankBadge = `<span class="rank-badge rank-2">2</span>`;
        else if (idx === 2) rankBadge = `<span class="rank-badge rank-3">3</span>`;

        let netSign = stat.gameNet > 0 ? `+${stat.gameNet}` : `${stat.gameNet}`;

        html += `
            <tr>
                <td>${rankBadge}</td>
                <td class="team-cell"><i class="fa-solid fa-shield-halved team-icon"></i> ${t}</td>
                <td><span class="stat-badge stat-p">${stat.matchWon}-${stat.matchLost}</span></td>
                <td><span class="stat-badge stat-w">${stat.gameWon}-${stat.gameLost}</span></td>
                <td><span class="stat-badge ${stat.gameNet >= 0 ? 'stat-w' : 'stat-l'}">${netSign}</span></td>
                <td><span class="stat-badge stat-pts">${stat.points}</span></td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
}

function renderGroupMatchListVertical(matches) {
    let html = `<div class="group-matches-vertical-list">`;
    matches.forEach(match => {
        let isCompleted = match.winner !== null;

        html += `
            <div class="group-match-row-card ${isCompleted ? 'is-done' : ''}">
                <div class="match-info-meta">
                    <span class="match-badge">Match #${match.id}</span>
                    <span class="status-pill ${isCompleted ? 'status-done' : 'status-pending'}">
                        ${isCompleted ? 'Selesai' : 'Pending'}
                    </span>
                </div>

                <div class="match-teams-versus">
                    <div class="row-team-box team-left ${match.winner === match.team1 ? 'is-winner' : ''}">
                        <span class="row-team-name">${match.team1}</span>
                        <span class="row-team-score">${match.score1}</span>
                    </div>

                    <span class="vs-badge-row">VS</span>

                    <div class="row-team-box team-right ${match.winner === match.team2 ? 'is-winner' : ''}">
                        <span class="row-team-score">${match.score2}</span>
                        <span class="row-team-name">${match.team2}</span>
                    </div>
                </div>

                ${isAdminLoggedIn ? `
                    <button onclick="openScoreModal(${match.id})" class="btn-row-edit">
                        <i class="fa-solid fa-pen-to-square"></i> Skor
                    </button>
                ` : ''}
            </div>
        `;
    });
    html += `</div>`;
    return html;
}

function renderRoundsTree(rounds) {
    let html = `<div class="bracket-tree">`;
    rounds.forEach(round => {
        html += `<div class="bracket-round">`;
        html += `<div class="round-header-title">${round.title}</div>`;

        round.matches.forEach(match => {
            let isCompleted = match.winner !== null;

            html += `
                <div class="tree-match-card ${isCompleted ? 'completed' : ''}">
                    <div class="tree-match-header">
                        <span>Match #${match.id}</span>
                        <span>${isCompleted ? 'SELESAI' : 'PENDING'}</span>
                    </div>

                    <div class="tree-team-item ${match.winner === match.team1 && match.team1 !== 'BYE' && match.team1 !== 'TBD' ? 'winner' : ''}">
                        <span class="tree-team-name">${match.team1}</span>
                        <span class="tree-team-score">${match.score1}</span>
                    </div>

                    <div class="tree-team-item ${match.winner === match.team2 && match.team2 !== 'BYE' && match.team2 !== 'TBD' ? 'winner' : ''}">
                        <span class="tree-team-name">${match.team2}</span>
                        <span class="tree-team-score">${match.score2}</span>
                    </div>

                    ${isAdminLoggedIn && match.team2 !== 'BYE' && match.team1 !== 'TBD' && match.team2 !== 'TBD' ? `
                        <button onclick="openScoreModal(${match.id})" class="btn-tree-edit">
                            <i class="fa-solid fa-pen"></i> Edit Skor
                        </button>
                    ` : ''}
                </div>
            `;
        });
        html += `</div>`;
    });
    html += `</div>`;
    return html;
}

// ==========================================
// EDIT SKOR MODAL & UPDATE HASIL
// ==========================================
window.openScoreModal = function(matchId) {
    if (!isAdminLoggedIn) return;

    let targetMatch = null;
    let allRounds = [...tournamentData.upperRounds, ...tournamentData.lowerRounds];

    for (let r of allRounds) {
        let found = r.matches.find(m => m.id === matchId);
        if (found) { targetMatch = found; break; }
    }

    if (!targetMatch) return;

    document.getElementById('modalMatchId').value = targetMatch.id;
    document.getElementById('modalTeam1Name').innerText = targetMatch.team1;
    document.getElementById('modalTeam2Name').innerText = targetMatch.team2;
    document.getElementById('scoreTeam1').value = targetMatch.score1;
    document.getElementById('scoreTeam2').value = targetMatch.score2;

    document.getElementById('scoreModal').classList.remove('hidden');
};

function saveScoreFromModal() {
    const matchId = parseInt(document.getElementById('modalMatchId').value);
    const score1 = parseInt(document.getElementById('scoreTeam1').value) || 0;
    const score2 = parseInt(document.getElementById('scoreTeam2').value) || 0;

    let currentMatch = null;
    let isUpper = false;
    let roundIndex = -1;
    let matchIndex = -1;

    for (let r = 0; r < tournamentData.upperRounds.length; r++) {
        let idx = tournamentData.upperRounds[r].matches.findIndex(m => m.id === matchId);
        if (idx !== -1) {
            currentMatch = tournamentData.upperRounds[r].matches[idx];
            isUpper = true;
            roundIndex = r;
            matchIndex = idx;
            break;
        }
    }

    if (!currentMatch) {
        for (let r = 0; r < tournamentData.lowerRounds.length; r++) {
            let idx = tournamentData.lowerRounds[r].matches.findIndex(m => m.id === matchId);
            if (idx !== -1) {
                currentMatch = tournamentData.lowerRounds[r].matches[idx];
                isUpper = false;
                roundIndex = r;
                matchIndex = idx;
                break;
            }
        }
    }

    if (currentMatch) {
        currentMatch.score1 = score1;
        currentMatch.score2 = score2;

        if (score1 > score2) {
            currentMatch.winner = currentMatch.team1;
            currentMatch.loser = currentMatch.team2;
        } else if (score2 > score1) {
            currentMatch.winner = currentMatch.team2;
            currentMatch.loser = currentMatch.team1;
        } else {
            currentMatch.winner = null;
            currentMatch.loser = null;
        }

        if (tournamentData.format === 'double_elimination') {
            updateDoubleEliminationFlowDynamic(isUpper, roundIndex, matchIndex, currentMatch);
        } else if (isUpper && tournamentData.format === 'single_elimination') {
            if (roundIndex + 1 < tournamentData.upperRounds.length) {
                let nextMatches = tournamentData.upperRounds[roundIndex + 1].matches;
                let nextMatchIndex = Math.floor(matchIndex / 2);
                let nextMatch = nextMatches[nextMatchIndex];

                if (nextMatch) {
                    if (matchIndex % 2 === 0) nextMatch.team1 = currentMatch.winner || "TBD";
                    else nextMatch.team2 = currentMatch.winner || "TBD";
                }
            }
        }

        saveLocalData();
        renderBracket();
        document.getElementById('scoreModal').classList.add('hidden');
    }
}

function updateDoubleEliminationFlowDynamic(isUpper, roundIndex, matchIndex, currentMatch) {
    const winner = currentMatch.winner || "TBD";
    const loser = currentMatch.loser || "TBD";
    const totalUpperRounds = tournamentData.upperRounds.length;

    if (isUpper) {
        if (roundIndex < totalUpperRounds - 2) {
            let nextMatch = tournamentData.upperRounds[roundIndex + 1].matches[Math.floor(matchIndex / 2)];
            if (nextMatch) {
                if (matchIndex % 2 === 0) nextMatch.team1 = winner;
                else nextMatch.team2 = winner;
            }
        } else if (roundIndex === totalUpperRounds - 2) { 
            let grandFinal = tournamentData.upperRounds[totalUpperRounds - 1].matches[0];
            if (grandFinal) grandFinal.team1 = winner;
        }

        if (roundIndex === 0) { 
            let targetLower = tournamentData.lowerRounds[0]?.matches[Math.floor(matchIndex / 2)];
            if (targetLower) {
                if (matchIndex % 2 === 0) targetLower.team1 = loser;
                else targetLower.team2 = loser;
            }
        } else {
            let targetLowerRoundIdx = roundIndex * 2 - 1;
            if (tournamentData.lowerRounds[targetLowerRoundIdx]) {
                let targetLower = tournamentData.lowerRounds[targetLowerRoundIdx].matches[matchIndex];
                if (targetLower) targetLower.team2 = loser;
            }
        }
    } else {
        const totalLowerRounds = tournamentData.lowerRounds.length;
        if (roundIndex < totalLowerRounds - 1) {
            let isEvenRound = (roundIndex % 2 === 0);
            let nextLowerRound = tournamentData.lowerRounds[roundIndex + 1];
            
            if (isEvenRound) {
                let nextMatch = nextLowerRound.matches[matchIndex];
                if (nextMatch) nextMatch.team1 = winner;
            } else {
                let nextMatch = nextLowerRound.matches[Math.floor(matchIndex / 2)];
                if (nextMatch) {
                    if (matchIndex % 2 === 0) nextMatch.team1 = winner;
                    else nextMatch.team2 = winner;
                }
            }
        } else if (roundIndex === totalLowerRounds - 1) {
            let grandFinal = tournamentData.upperRounds[totalUpperRounds - 1].matches[0];
            if (grandFinal) grandFinal.team2 = winner;
        }
    }
}

// ==========================================
// STORAGE & EXPORT
// ==========================================
// Tambahkan fungsi baru ini di atas saveLocalData
function listenRealtimeUpdates() {
    if (window.fbDB) {
        window.fbDB.ref('live_tournament').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                tournamentData = data;
                renderBracket(); // Otomatis update tampilan di HP tanpa perlu refresh
            }
        });
    }
}

// Ubah fungsi saveLocalData menjadi seperti ini
function saveLocalData() {
    // 1. Simpan ke browser lokal
    localStorage.setItem('mlbb_bracket_data', JSON.stringify(tournamentData));

    // 2. Kirim otomatis ke cloud Firebase agar HP & Laptop langsung sinkron
    if (window.fbDB) {
        window.fbDB.ref('live_tournament').set(tournamentData);
    }
}
function loadLocalData() {
    const saved = localStorage.getItem('mlbb_bracket_data');
    if (saved) {
        try {
            tournamentData = JSON.parse(saved);
            if (tournamentData.teams && tournamentData.teams.length > 0) {
                document.getElementById('teamsInput').value = tournamentData.teams.join('\n');
            }
            if (tournamentData.format) {
                document.getElementById('tournamentFormat').value = tournamentData.format;
            }
            renderBracket();
        } catch (e) {
            console.error(e);
        }
    }
}

function exportDataJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tournamentData, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `mlbb_bracket_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function archiveToFirebase() {
    if (!isAdminLoggedIn) {
        alert("Akses Ditolak! Silakan Login Admin terlebih dahulu.");
        return;
    }

    if (window.fbDB && window.fbRef && window.fbPush) {
        const archiveRef = window.fbRef(window.fbDB, 'mlbb_archives');
        window.fbPush(archiveRef, {
            ...tournamentData,
            archivedAt: new Date().toISOString()
        }).then(() => {
            alert("Data berhasil diarsipkan ke Firebase!");
        }).catch((err) => {
            alert("Gagal mengarsipkan: " + err.message);
        });
    } else {
        alert("Konfigurasi Firebase belum diisi.");
    }
}