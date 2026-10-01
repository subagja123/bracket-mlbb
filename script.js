let isAdmin = false;
let adminPin = localStorage.getItem('tournament_pin') || '2528';

let tournamentData = {
    name: "E-SPORT LPPM RI",
    format: "single_elimination",
    teams: ["Tim A", "Tim B", "Tim C", "Tim D", "Tim E", "Tim F", "Tim G", "Tim H"],
    rounds: [],
    upperMatches: [],
    lowerMatches: [],
    grandFinal: null
};

window.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    updateAdminUI();
    renderTeamList();
    renderBracket();

    document.getElementById('tournamentName').addEventListener('change', (e) => {
        tournamentData.name = e.target.value;
        saveToLocalStorage();
    });
});

function toggleAuthModal() {
    if (isAdmin) {
        isAdmin = false;
        updateAdminUI();
    } else {
        document.getElementById('pinInput').value = '';
        toggleModal('loginModal', true);
    }
}

function handleLogin(e) {
    e.preventDefault();
    const inputPin = document.getElementById('pinInput').value;
    if (inputPin === adminPin) {
        isAdmin = true;
        updateAdminUI();
        toggleModal('loginModal', false);
    } else {
        alert("PIN Salah! Silakan coba lagi.");
    }
}

function updateAdminUI() {
    const badgeDot = document.getElementById('adminBadgeDot');
    const badgeText = document.getElementById('adminBadgeText');
    const authBtnText = document.getElementById('authBtnText');
    const authBtnIcon = document.getElementById('authBtnIcon');
    const titleInput = document.getElementById('tournamentName');
    const formatSelect = document.getElementById('formatSelect');
    const adminOnlyElems = document.querySelectorAll('.admin-only');

    if (isAdmin) {
        badgeDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]";
        badgeText.innerText = "Mode: Admin (Akses Penuh)";
        authBtnText.innerText = "Logout Admin";
        authBtnIcon.className = "fa-solid fa-right-from-bracket";
        titleInput.removeAttribute('readonly');
        formatSelect.removeAttribute('disabled');

        adminOnlyElems.forEach(el => el.classList.remove('hidden'));
    } else {
        badgeDot.className = "w-2.5 h-2.5 rounded-full bg-slate-500";
        badgeText.innerText = "Mode: Pengunjung (Read-Only)";
        authBtnText.innerText = "Login Admin";
        authBtnIcon.className = "fa-solid fa-lock";
        titleInput.setAttribute('readonly', 'true');
        formatSelect.setAttribute('disabled', 'true');

        adminOnlyElems.forEach(el => el.classList.add('hidden'));
    }

    renderBracket();
}

function onFormatChange() {
    tournamentData.format = document.getElementById('formatSelect').value;
    generateTournament();
}

function addTeam() {
    if (!isAdmin) return;
    const input = document.getElementById('teamInput');
    const name = input.value.trim();
    if (name && !tournamentData.teams.includes(name)) {
        tournamentData.teams.push(name);
        input.value = '';
        renderTeamList();
        generateTournament();
    }
}

function removeTeam(index) {
    if (!isAdmin) return;
    tournamentData.teams.splice(index, 1);
    renderTeamList();
    generateTournament();
}

function quickAddTeams(count) {
    if (!isAdmin) return;
    tournamentData.teams = Array.from({ length: count }, (_, i) => `Tim ${i + 1}`);
    renderTeamList();
    generateTournament();
}

function shuffleTeams() {
    if (!isAdmin) return;
    for (let i = tournamentData.teams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tournamentData.teams[i], tournamentData.teams[j]] = [tournamentData.teams[j], tournamentData.teams[i]];
    }
    renderTeamList();
    generateTournament();
}

function renderTeamList() {
    const container = document.getElementById('teamList');
    document.getElementById('teamCount').innerText = tournamentData.teams.length;

    if (tournamentData.teams.length === 0) {
        container.innerHTML = `<span class="text-xs text-slate-500 italic">Belum ada tim yang ditambahkan.</span>`;
        return;
    }

    container.innerHTML = tournamentData.teams.map((team, idx) => `
        <span class="inline-flex items-center gap-1.5 bg-slate-800 text-slate-200 border border-slate-700 text-xs px-2.5 py-1 rounded-md">
            ${team}
            ${isAdmin ? `<button onclick="removeTeam(${idx})" class="text-slate-400 hover:text-rose-400"><i class="fa-solid fa-xmark"></i></button>` : ''}
        </span>
    `).join('');
}

function generateTournament() {
    const format = document.getElementById('formatSelect').value;
    tournamentData.format = format;
    tournamentData.rounds = [];
    tournamentData.upperMatches = [];
    tournamentData.lowerMatches = [];
    tournamentData.grandFinal = null;

    const teams = [...tournamentData.teams];
    if (teams.length < 2) {
        saveToLocalStorage();
        renderBracket();
        return;
    }

    if (format === 'single_elimination') {
        generateSingleElimination(teams);
    } else if (format === 'double_elimination') {
        generateDoubleElimination(teams);
    } else if (format === 'group_stage') {
        generateGroupStage(teams);
    }

    saveToLocalStorage();
    renderBracket();
}

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
    for (let r = 0; r < numRounds; r++) {
        let roundMatches = [];
        let matchCountInRound = Math.pow(2, numRounds - r - 1);

        for (let m = 0; m < matchCountInRound; m++) {
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
        tournamentData.rounds.push({ name: getRoundName(r + 1, numRounds), matches: roundMatches });
    }
    
    recalculateSingleElim();
}

function generateDoubleElimination(teams) {
    let t = [...teams];
    while (t.length < 4) t.push("TBD");

    tournamentData.upperMatches = [
        { id: 101, round: "Upper Semifinal", team1: t[0], team2: t[1], score1: null, score2: null, status: 'pending' },
        { id: 102, round: "Upper Semifinal", team1: t[2], team2: t[3] || "TBD", score1: null, score2: null, status: 'pending' },
        { id: 103, round: "Upper Final", team1: "TBD", team2: "TBD", score1: null, score2: null, status: 'pending' }
    ];

    tournamentData.lowerMatches = [
        { id: 201, round: "Lower Round 1", team1: "TBD", team2: "TBD", score1: null, score2: null, status: 'pending' },
        { id: 202, round: "Lower Final", team1: "TBD", team2: "TBD", score1: null, score2: null, status: 'pending' }
    ];

    tournamentData.grandFinal = {
        id: 301,
        round: "Grand Final",
        team1: "TBD (Juara Upper)",
        team2: "TBD (Juara Lower)",
        score1: null,
        score2: null,
        status: 'pending'
    };

    recalculateDoubleElim();
}

function generateGroupStage(teams) {
    let matches = [];
    let matchId = 1;
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            matches.push({
                id: matchId++,
                team1: teams[i],
                team2: teams[j],
                score1: null,
                score2: null,
                status: 'pending'
            });
        }
    }
    tournamentData.rounds = [{ name: "Matchdays", matches: matches }];
}

function getRoundName(roundNum, totalRounds) {
    if (roundNum === totalRounds) return "Babak Final";
    if (roundNum === totalRounds - 1) return "Semi Final";
    if (roundNum === totalRounds - 2) return "Perempat Final";
    return `Babak ${roundNum}`;
}

function recalculateSingleElim() {
    if (!tournamentData.rounds || tournamentData.rounds.length < 2) return;

    for (let rI = 0; rI < tournamentData.rounds.length - 1; rI++) {
        const currentRound = tournamentData.rounds[rI].matches;
        const nextRound = tournamentData.rounds[rI + 1].matches;

        currentRound.forEach((m, mI) => {
            let winner = null;

            if (m.team2 === 'BYE') {
                winner = m.team1;
            } else if (m.status === 'completed' && m.score1 !== null && m.score2 !== null) {
                if (parseInt(m.score1) > parseInt(m.score2)) winner = m.team1;
                else if (parseInt(m.score2) > parseInt(m.score1)) winner = m.team2;
            }

            if (winner) {
                const targetMatchIdx = Math.floor(mI / 2);
                if (mI % 2 === 0) {
                    nextRound[targetMatchIdx].team1 = winner;
                } else {
                    nextRound[targetMatchIdx].team2 = winner;
                }
            }
        });
    }
}

function recalculateDoubleElim() {
    const u = tournamentData.upperMatches;
    const l = tournamentData.lowerMatches;
    const gf = tournamentData.grandFinal;
    if (!u || u.length < 3) return;

    if (u[0].status === 'completed' && u[0].score1 !== null && u[0].score2 !== null) {
        const w = parseInt(u[0].score1) > parseInt(u[0].score2) ? u[0].team1 : u[0].team2;
        const loser = parseInt(u[0].score1) > parseInt(u[0].score2) ? u[0].team2 : u[0].team1;
        u[2].team1 = w;
        l[0].team1 = loser;
    }

    if (u[1].status === 'completed' && u[1].score1 !== null && u[1].score2 !== null) {
        const w = parseInt(u[1].score1) > parseInt(u[1].score2) ? u[1].team1 : u[1].team2;
        const loser = parseInt(u[1].score1) > parseInt(u[1].score2) ? u[1].team2 : u[1].team1;
        u[2].team2 = w;
        l[0].team2 = loser;
    }

    if (u[2].status === 'completed' && u[2].score1 !== null && u[2].score2 !== null) {
        const w = parseInt(u[2].score1) > parseInt(u[2].score2) ? u[2].team1 : u[2].team2;
        const loser = parseInt(u[2].score1) > parseInt(u[2].score2) ? u[2].team2 : u[2].team1;
        gf.team1 = w;
        l[1].team1 = loser;
    }

    if (l[0].status === 'completed' && l[0].score1 !== null && l[0].score2 !== null) {
        const w = parseInt(l[0].score1) > parseInt(l[0].score2) ? l[0].team1 : l[0].team2;
        l[1].team2 = w;
    }

    if (l[1].status === 'completed' && l[1].score1 !== null && l[1].score2 !== null) {
        const w = parseInt(l[1].score1) > parseInt(l[1].score2) ? l[1].team1 : l[1].team2;
        gf.team2 = w;
    }
}

function renderBracket() {
    const container = document.getElementById('bracketContainer');
    document.getElementById('tournamentName').value = tournamentData.name;
    document.getElementById('formatSelect').value = tournamentData.format;

    if (tournamentData.teams.length < 2) {
        container.innerHTML = `<p class="text-slate-400 text-center py-10">Tambahkan minimal 2 tim untuk menampilkan turnamen.</p>`;
        return;
    }

    if (tournamentData.format === 'single_elimination') {
        renderSingleEliminationView(container);
    } else if (tournamentData.format === 'double_elimination') {
        renderDoubleEliminationView(container);
    } else if (tournamentData.format === 'group_stage') {
        renderGroupStageView(container);
    }
}

function renderSingleEliminationView(container) {
    if (!tournamentData.rounds || tournamentData.rounds.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-center py-10">Bagan belum di-generate.</p>`;
        return;
    }

    let html = `<div class="flex gap-8 min-w-max p-4 justify-around">`;

    tournamentData.rounds.forEach((round) => {
        html += `
            <div class="flex flex-col justify-around min-w-[220px] max-w-[260px] space-y-6">
                <h4 class="text-xs font-bold uppercase tracking-wider text-amber-500 text-center pb-2 border-b border-slate-800">${round.name}</h4>
                <div class="flex flex-col justify-around flex-1 space-y-4">
        `;

        round.matches.forEach(m => {
            html += renderMatchCardHTML(m);
        });

        html += `</div></div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function renderDoubleEliminationView(container) {
    let html = `
        <!-- UPPER BRACKET -->
        <div>
            <h3 class="text-amber-400 font-bold text-sm uppercase mb-3 flex items-center gap-2">
                <i class="fa-solid fa-arrow-up-right-dots"></i> Upper Bracket (Winners Bracket)
            </h3>
            <div class="flex gap-6 overflow-x-auto pb-2">
                <div class="space-y-4">
                    ${renderMatchCardHTML(tournamentData.upperMatches[0])}
                    ${renderMatchCardHTML(tournamentData.upperMatches[1])}
                </div>
                <div class="flex items-center">
                    ${renderMatchCardHTML(tournamentData.upperMatches[2])}
                </div>
            </div>
        </div>

        <!-- LOWER BRACKET -->
        <div class="pt-4 border-t border-slate-800">
            <h3 class="text-rose-400 font-bold text-sm uppercase mb-3 flex items-center gap-2">
                <i class="fa-solid fa-arrow-down-left-dots"></i> Lower Bracket (Losers Bracket)
            </h3>
            <div class="flex gap-6 overflow-x-auto pb-2">
                <div class="flex items-center">
                    ${renderMatchCardHTML(tournamentData.lowerMatches[0])}
                </div>
                <div class="flex items-center">
                    ${renderMatchCardHTML(tournamentData.lowerMatches[1])}
                </div>
            </div>
        </div>

        <!-- GRAND FINAL -->
        <div class="pt-4 border-t border-slate-800">
            <h3 class="text-emerald-400 font-bold text-sm uppercase mb-3 flex items-center gap-2">
                <i class="fa-solid fa-crown"></i> Grand Final
            </h3>
            <div>
                ${renderMatchCardHTML(tournamentData.grandFinal)}
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function renderGroupStageView(container) {
    let standings = {};
    tournamentData.teams.forEach(t => {
        standings[t] = { name: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    });

    const matches = tournamentData.rounds[0] ? tournamentData.rounds[0].matches : [];
    matches.forEach(m => {
        if (m.status === 'completed' && m.score1 !== null && m.score2 !== null) {
            let s1 = parseInt(m.score1);
            let s2 = parseInt(m.score2);

            if (standings[m.team1] && standings[m.team2]) {
                standings[m.team1].played++;
                standings[m.team2].played++;
                standings[m.team1].gf += s1;
                standings[m.team1].ga += s2;
                standings[m.team2].gf += s2;
                standings[m.team2].ga += s1;

                if (s1 > s2) {
                    standings[m.team1].won++;
                    standings[m.team1].pts += 3;
                    standings[m.team2].lost++;
                } else if (s2 > s1) {
                    standings[m.team2].won++;
                    standings[m.team2].pts += 3;
                    standings[m.team1].lost++;
                } else {
                    standings[m.team1].drawn++;
                    standings[m.team1].pts += 1;
                    standings[m.team2].drawn++;
                    standings[m.team2].pts += 1;
                }

                standings[m.team1].gd = standings[m.team1].gf - standings[m.team1].ga;
                standings[m.team2].gd = standings[m.team2].gf - standings[m.team2].ga;
            }
        }
    });

    let sortedStandings = Object.values(standings).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    let html = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <h4 class="text-sm font-bold uppercase tracking-wider text-amber-500 mb-3">Klasemen Poin</h4>
                <div class="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                            <tr>
                                <th class="p-3">#</th>
                                <th class="p-3">Tim</th>
                                <th class="p-3 text-center">P</th>
                                <th class="p-3 text-center">W</th>
                                <th class="p-3 text-center">D</th>
                                <th class="p-3 text-center">L</th>
                                <th class="p-3 text-center">GD</th>
                                <th class="p-3 text-center font-bold text-amber-400">Pts</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-900">
                            ${sortedStandings.map((t, idx) => `
                                <tr class="hover:bg-slate-900/50">
                                    <td class="p-3 font-bold text-slate-500">${idx + 1}</td>
                                    <td class="p-3 font-semibold text-slate-200">${t.name}</td>
                                    <td class="p-3 text-center text-slate-400">${t.played}</td>
                                    <td class="p-3 text-center text-slate-400">${t.won}</td>
                                    <td class="p-3 text-center text-slate-400">${t.drawn}</td>
                                    <td class="p-3 text-center text-slate-400">${t.lost}</td>
                                    <td class="p-3 text-center font-mono ${t.gd > 0 ? 'text-emerald-400' : t.gd < 0 ? 'text-rose-400' : 'text-slate-400'}">${t.gd > 0 ? '+' + t.gd : t.gd}</td>
                                    <td class="p-3 text-center font-bold text-amber-400 text-sm">${t.pts}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h4 class="text-sm font-bold uppercase tracking-wider text-amber-500 mb-3">Jadwal Matches</h4>
                <div class="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                    ${matches.map(m => `
                        <div onclick="${isAdmin ? `openScoreModal(${m.id})` : ''}" class="${isAdmin ? 'cursor-pointer hover:border-amber-500/80' : 'cursor-default'} bg-slate-950 border border-slate-800 rounded-lg p-3 flex justify-between items-center transition-all">
                            <span class="text-xs font-semibold text-slate-300 w-2/5 truncate text-right">${m.team1}</span>
                            <div class="bg-slate-900 px-3 py-1 rounded-md border border-slate-800 font-mono text-xs font-bold text-amber-400 min-w-[60px] text-center">
                                ${m.score1 !== null ? m.score1 : '-'} : ${m.score2 !== null ? m.score2 : '-'}
                            </div>
                            <span class="text-xs font-semibold text-slate-300 w-2/5 truncate">${m.team2}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function renderMatchCardHTML(m) {
    if (!m) return '';
    const isWinner1 = m.score1 !== null && m.score2 !== null && parseInt(m.score1) > parseInt(m.score2);
    const isWinner2 = m.score1 !== null && m.score2 !== null && parseInt(m.score2) > parseInt(m.score1);

    return `
        <div onclick="${isAdmin ? `openScoreModal(${m.id})` : ''}" class="${isAdmin ? 'cursor-pointer hover:border-amber-500/80 hover:scale-[1.02]' : 'cursor-default'} transition-all bg-slate-950 border border-slate-800 rounded-lg p-3 w-56 shadow-md relative group">
            <div class="flex justify-between items-center text-xs text-slate-500 mb-2">
                <span>Match #${m.id}</span>
                <span class="capitalize text-[10px] px-1.5 py-0.5 rounded ${getStatusBadgeClass(m.status)}">${m.status}</span>
            </div>

            <div class="flex justify-between items-center py-1 ${isWinner1 ? 'font-bold text-amber-400' : 'text-slate-300'}">
                <span class="truncate pr-2">${m.team1}</span>
                <span class="bg-slate-900 px-2 py-0.5 rounded text-xs font-mono border border-slate-800">${m.score1 !== null ? m.score1 : '-'}</span>
            </div>

            <div class="border-t border-slate-900 my-1"></div>

            <div class="flex justify-between items-center py-1 ${isWinner2 ? 'font-bold text-amber-400' : 'text-slate-300'}">
                <span class="truncate pr-2">${m.team2}</span>
                <span class="bg-slate-900 px-2 py-0.5 rounded text-xs font-mono border border-slate-800">${m.score2 !== null ? m.score2 : '-'}</span>
            </div>
        </div>
    `;
}

function getStatusBadgeClass(status) {
    if (status === 'completed') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    return 'bg-slate-800 text-slate-400';
}

function openScoreModal(matchId) {
    if (!isAdmin) return;
    let match = null;

    if (tournamentData.format === 'double_elimination') {
        match = [...tournamentData.upperMatches, ...tournamentData.lowerMatches, tournamentData.grandFinal].find(m => m && m.id === matchId);
    } else {
        for (let r of tournamentData.rounds) {
            match = r.matches.find(m => m.id === matchId);
            if (match) break;
        }
    }

    if (!match || match.team1 === 'TBD' || match.team2 === 'TBD' || match.team1 === 'BYE' || match.team2 === 'BYE') {
        return;
    }

    document.getElementById('modalMatchId').value = match.id;
    document.getElementById('modalTeam1Name').innerText = match.team1;
    document.getElementById('modalTeam2Name').innerText = match.team2;
    document.getElementById('modalTeam1Score').value = match.score1 !== null ? match.score1 : '';
    document.getElementById('modalTeam2Score').value = match.score2 !== null ? match.score2 : '';
    document.getElementById('modalMatchStatus').value = match.status;

    toggleModal('scoreModal', true);
}

function saveMatchScore(e) {
    e.preventDefault();
    if (!isAdmin) return;

    const matchId = parseInt(document.getElementById('modalMatchId').value);
    const score1 = document.getElementById('modalTeam1Score').value;
    const score2 = document.getElementById('modalTeam2Score').value;
    const status = document.getElementById('modalMatchStatus').value;

    let match = null;
    if (tournamentData.format === 'double_elimination') {
        match = [...tournamentData.upperMatches, ...tournamentData.lowerMatches, tournamentData.grandFinal].find(m => m && m.id === matchId);
    } else {
        tournamentData.rounds.forEach((r) => {
            r.matches.forEach((m) => {
                if (m.id === matchId) match = m;
            });
        });
    }

    if (match) {
        match.score1 = score1 !== '' ? parseInt(score1) : null;
        match.score2 = score2 !== '' ? parseInt(score2) : null;
        match.status = status;

        if (tournamentData.format === 'single_elimination') recalculateSingleElim();
        else if (tournamentData.format === 'double_elimination') recalculateDoubleElim();

        saveToLocalStorage();
        renderBracket();
        toggleModal('scoreModal', false);
    }
}

function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
}

function saveToLocalStorage() {
    localStorage.setItem('tournament_data', JSON.stringify(tournamentData));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('tournament_data');
    if (saved) {
        try {
            tournamentData = JSON.parse(saved);
        } catch (e) {
            console.error("Gagal membaca data dari local storage", e);
        }
    }
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tournamentData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${tournamentData.name.toLowerCase().replace(/\s+/g, '_')}_data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported && imported.teams) {
                tournamentData = imported;
                saveToLocalStorage();
                renderTeamList();
                renderBracket();
                alert("Data turnamen berhasil dimuat!");
            } else {
                alert("Format file JSON tidak valid.");
            }
        } catch (err) {
            alert("Gagal membaca file JSON.");
        }
    };
    reader.readAsText(file);
}