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
        generateDoubleElimination(teams);
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
        let roundTitle = (r === totalRounds) ? "GRAND FINAL" : ((r === totalRounds - 1) ? "SEMI FINAL" : `ROUND ${r}`);

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

function generateDoubleElimination(teams) {
    generateSingleEliminationTree(teams);

    let lowerMatchCounter = 101;

    // 1. LOWER ROUND 1 (2 Match: Pertemuan 4 tim yang kalah dari Upper Round 1)
    let lowerR1Matches = [
        { id: lowerMatchCounter++, team1: "Kalah Upper R1 #1", team2: "Kalah Upper R1 #2", score1: 0, score2: 0, winner: null, loser: null },
        { id: lowerMatchCounter++, team1: "Kalah Upper R1 #3", team2: "Kalah Upper R1 #4", score1: 0, score2: 0, winner: null, loser: null }
    ];

    // 2. LOWER ROUND 2 (2 Match: Pemenang Lower R1 vs Tim yang Kalah dari Upper Semi Final)
    let lowerR2Matches = [
        { id: lowerMatchCounter++, team1: "Pemenang Lower R1 #1", team2: "Kalah Upper Semi #1", score1: 0, score2: 0, winner: null, loser: null },
        { id: lowerMatchCounter++, team1: "Pemenang Lower R1 #2", team2: "Kalah Upper Semi #2", score1: 0, score2: 0, winner: null, loser: null }
    ];

    // 3. LOWER SEMI FINAL (1 Match: Pertemuan 2 Pemenang dari Lower Round 2)
    let lowerR3Matches = [
        { id: lowerMatchCounter++, team1: "Pemenang Lower R2 #1", team2: "Pemenang Lower R2 #2", score1: 0, score2: 0, winner: null, loser: null }
    ];

    // 4. LOWER FINAL (1 Match: Pemenang Lower Semi Final vs Tim yang Kalah dari Upper Final)
    let lowerFinalMatches = [
        { id: lowerMatchCounter++, team1: "Pemenang Lower Semi", team2: "Kalah Upper Final", score1: 0, score2: 0, winner: null, loser: null }
    ];

    // Masukkan semua babak ke dalam tournamentData.lowerRounds
    tournamentData.lowerRounds = [
        { title: "LOWER ROUND 1", matches: lowerR1Matches },
        { title: "LOWER ROUND 2", matches: lowerR2Matches },
        { title: "LOWER SEMI FINAL", matches: lowerR3Matches },
        { title: "LOWER FINAL", matches: lowerFinalMatches }
    ];
}

function generateRoundRobin(teams) {
    let groupMatches = [];
    let matchId = 1;

    teams.forEach(t => {
        tournamentData.standings[t] = { played: 0, won: 0, lost: 0, points: 0 };
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

function recalculateGroupStandings() {
    if (tournamentData.format !== 'round_robin') return;

    tournamentData.teams.forEach(t => {
        tournamentData.standings[t] = { played: 0, won: 0, lost: 0, points: 0 };
    });

    let matches = tournamentData.upperRounds[0].matches;
    matches.forEach(m => {
        if (m.winner) {
            let t1 = m.team1;
            let t2 = m.team2;

            if (tournamentData.standings[t1]) {
                tournamentData.standings[t1].played += 1;
                if (m.winner === t1) {
                    tournamentData.standings[t1].won += 1;
                    tournamentData.standings[t1].points += 3;
                } else {
                    tournamentData.standings[t1].lost += 1;
                }
            }

            if (tournamentData.standings[t2]) {
                tournamentData.standings[t2].played += 1;
                if (m.winner === t2) {
                    tournamentData.standings[t2].won += 1;
                    tournamentData.standings[t2].points += 3;
                } else {
                    tournamentData.standings[t2].lost += 1;
                }
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
    
    // UPPER BRACKET / SINGLE ELIMINATION
    html += `<div>`;
    if (tournamentData.format === 'double_elimination') {
        html += `<div class="bracket-section-title"><i class="fa-solid fa-angles-up"></i> UPPER BRACKET</div>`;
    } else {
        html += `<div class="bracket-section-title"><i class="fa-solid fa-trophy"></i> BAGAN PERTANDINGAN</div>`;
    }
    html += renderRoundsTree(tournamentData.upperRounds);
    html += `</div>`;

    // LOWER BRACKET
    if (tournamentData.format === 'double_elimination' && tournamentData.lowerRounds.length > 0) {
        html += `<div style="margin-top: 1.5rem;">`;
        html += `<div class="bracket-section-title" style="color: #0d9488;"><i class="fa-solid fa-angles-down"></i> LOWER BRACKET</div>`;
        html += renderRoundsTree(tournamentData.lowerRounds);
        html += `</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

function renderStandingsTable() {
    let sortedTeams = [...tournamentData.teams].sort((a, b) => {
        let pA = tournamentData.standings[a] ? tournamentData.standings[a].points : 0;
        let pB = tournamentData.standings[b] ? tournamentData.standings[b].points : 0;
        return pB - pA;
    });

    let html = `
        <div class="standings-box">
            <h3 class="standings-title"><i class="fa-solid fa-trophy"></i> Klasemen Sementara</h3>
            <table class="standings-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th style="text-align: left;">Tim</th>
                        <th>P</th>
                        <th>W</th>
                        <th>L</th>
                        <th>PTS</th>
                    </tr>
                </thead>
                <tbody>`;

    sortedTeams.forEach((t, idx) => {
        let stat = tournamentData.standings[t] || { played: 0, won: 0, lost: 0, points: 0 };
        let rankBadge = `<span class="rank-badge rank-other">${idx + 1}</span>`;
        if (idx === 0) rankBadge = `<span class="rank-badge rank-1">1</span>`;
        else if (idx === 1) rankBadge = `<span class="rank-badge rank-2">2</span>`;
        else if (idx === 2) rankBadge = `<span class="rank-badge rank-3">3</span>`;

        html += `
            <tr>
                <td>${rankBadge}</td>
                <td class="team-cell"><i class="fa-solid fa-shield-halved team-icon"></i> ${t}</td>
                <td><span class="stat-badge stat-p">${stat.played}</span></td>
                <td><span class="stat-badge stat-w">${stat.won}</span></td>
                <td><span class="stat-badge stat-l">${stat.lost}</span></td>
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

// RENDER MATCH FASE GRUP VERTIKAL
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

// RENDER BRACKET TREE
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

        if (isUpper && tournamentData.format !== 'round_robin') {
            if (roundIndex + 1 < tournamentData.upperRounds.length) {
                let nextMatches = tournamentData.upperRounds[roundIndex + 1].matches;
                let nextMatchIndex = Math.floor(matchIndex / 2);
                let nextMatch = nextMatches[nextMatchIndex];

                if (nextMatch) {
                    if (matchIndex % 2 === 0) nextMatch.team1 = currentMatch.winner || "TBD";
                    else nextMatch.team2 = currentMatch.winner || "TBD";
                }
            }

            if (tournamentData.format === 'double_elimination' && roundIndex === 0 && tournamentData.lowerRounds.length > 0) {
                let lowerR1Matches = tournamentData.lowerRounds[0].matches;
                let targetLowerMatchIndex = Math.floor(matchIndex / 2);
                let targetLowerMatch = lowerR1Matches[targetLowerMatchIndex];

                if (targetLowerMatch) {
                    if (matchIndex % 2 === 0) targetLowerMatch.team1 = currentMatch.loser || "Kalah Upper #1";
                    else targetLowerMatch.team2 = currentMatch.loser || "Kalah Upper #2";
                }
            }
        }

        saveLocalData();
        renderBracket();
        document.getElementById('scoreModal').classList.add('hidden');
    }
}

// ==========================================
// STORAGE & EXPORT
// ==========================================
function saveLocalData() {
    localStorage.setItem('mlbb_bracket_data', JSON.stringify(tournamentData));
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