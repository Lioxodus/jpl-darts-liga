const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9cqFKQxjTBcRuUVivV8uEK4IQwpFZXbi82FjcaKiY8RXPRnbqmfhg0MdW31qJqtv7P2Fn9loUxYFM/pub?output=csv";

let allGames = [];
let selectedLeague = "Scolia";

const leagueLabels = {
  "Scolia": "Scolia",
  "DartCounter": "DartCounter",
  "AutoDarts 1": "AutoDarts Liga 1",
  "AutoDarts 2": "AutoDarts Liga 2",
  "AutoDarts 3": "AutoDarts Liga 3",
  "AutoDarts 4": "AutoDarts Liga 4"
};

function parseCSV(text) {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (current || row.length) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = "";
      }
      if (char === "\r" && nextChar === "\n") i++;
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows.filter(row => row.some(cell => String(cell).trim() !== ""));
}

function toNumber(value) {
  const number = Number(String(value || "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function getColumnIndex(header, names) {
  for (const name of names) {
    const index = header.indexOf(name.toLowerCase());
    if (index !== -1) return index;
  }
  return -1;
}

function normalizeLeague(platform, liga) {
  const platformValue = String(platform || "").toLowerCase().replace(/\s/g, "");
  const ligaValue = String(liga || "").toLowerCase().trim();

  if (platformValue.includes("scolia")) return "Scolia";
  if (platformValue.includes("dartcounter")) return "DartCounter";

  if (platformValue.includes("autodarts") || platformValue.includes("auto")) {
    if (ligaValue.includes("4")) return "AutoDarts 4";
    if (ligaValue.includes("3")) return "AutoDarts 3";
    if (ligaValue.includes("2")) return "AutoDarts 2";
    return "AutoDarts 1";
  }

  return "Unbekannt";
}

function buildGames(rows) {
  if (!rows.length) return [];

  const header = rows[0].map(item => String(item).toLowerCase().trim());

  const index = {
    spieltag: getColumnIndex(header, ["spieltag"]),
    zeitraum: getColumnIndex(header, ["zeitraum"]),
    datum: getColumnIndex(header, ["datum"]),
    plattform: getColumnIndex(header, ["plattform"]),
    liga: getColumnIndex(header, ["liga", "division", "gruppe"]),
    spielerA: getColumnIndex(header, ["spieler a", "spielera"]),
    spielerB: getColumnIndex(header, ["spieler b", "spielerb"]),
    legsA: getColumnIndex(header, ["legs a", "legsa"]),
    legsB: getColumnIndex(header, ["legs b", "legsb"]),
    status: getColumnIndex(header, ["status"])
  };

  return rows.slice(1)
    .map(row => {
      const legsA = index.legsA >= 0 ? toNumber(row[index.legsA]) : 0;
      const legsB = index.legsB >= 0 ? toNumber(row[index.legsB]) : 0;
      const rawStatus = index.status >= 0 ? row[index.status] || "" : "";
      const hasResult = legsA > 0 || legsB > 0;

      return {
        spieltag: index.spieltag >= 0 ? row[index.spieltag] || "" : "",
        zeitraum: index.zeitraum >= 0 ? row[index.zeitraum] || "" : "",
        datum: index.datum >= 0 ? row[index.datum] || "" : "",
        plattform: index.plattform >= 0 ? row[index.plattform] || "" : "",
        liga: index.liga >= 0 ? row[index.liga] || "" : "",
        spielerA: index.spielerA >= 0 ? row[index.spielerA] || "" : "",
        spielerB: index.spielerB >= 0 ? row[index.spielerB] || "" : "",
        legsA,
        legsB,
        status: rawStatus || (hasResult ? "Gespielt" : "Offen")
      };
    })
    .map(game => ({
      ...game,
      league: normalizeLeague(game.plattform, game.liga)
    }))
    .filter(game => game.spielerA && game.spielerB && game.league !== "Unbekannt");
}

function isPlayed(game) {
  const status = String(game.status || "").toLowerCase();
  return status.includes("gespielt") || status.includes("beendet") || game.legsA > 0 || game.legsB > 0;
}

function createPlayer(name) {
  return {
    name,
    spiele: 0,
    siege: 0,
    niederlagen: 0,
    legsPlus: 0,
    legsMinus: 0,
    punkte: 0
  };
}

function calculateTable(games, leagueName) {
  const players = {};
  const leagueGames = games.filter(game => game.league === leagueName && isPlayed(game));

  leagueGames.forEach(game => {
    if (!players[game.spielerA]) players[game.spielerA] = createPlayer(game.spielerA);
    if (!players[game.spielerB]) players[game.spielerB] = createPlayer(game.spielerB);

    const playerA = players[game.spielerA];
    const playerB = players[game.spielerB];

    playerA.spiele++;
    playerB.spiele++;

    playerA.legsPlus += game.legsA;
    playerA.legsMinus += game.legsB;
    playerB.legsPlus += game.legsB;
    playerB.legsMinus += game.legsA;

    if (game.legsA > game.legsB) {
      playerA.siege++;
      playerB.niederlagen++;
      playerA.punkte += 2;
    } else if (game.legsB > game.legsA) {
      playerB.siege++;
      playerA.niederlagen++;
      playerB.punkte += 2;
    }
  });

  return Object.values(players).sort((a, b) => {
    if (b.punkte !== a.punkte) return b.punkte - a.punkte;
    if (b.siege !== a.siege) return b.siege - a.siege;
    if ((b.legsPlus - b.legsMinus) !== (a.legsPlus - a.legsMinus)) {
      return (b.legsPlus - b.legsMinus) - (a.legsPlus - a.legsMinus);
    }
    return b.legsPlus - a.legsPlus;
  });
}

function renderLeagueTable() {
  const tbody = document.getElementById("leagueTableBody");
  const status = document.getElementById("leagueStatus");
  const title = document.getElementById("leagueTitle");

  if (!tbody || !status || !title) return;

  const tableData = calculateTable(allGames, selectedLeague);
  tbody.innerHTML = "";
  title.textContent = `${leagueLabels[selectedLeague]} Tabelle`;

  if (!tableData.length) {
    status.textContent = "Noch keine Ergebnisse für diese Liga vorhanden.";
    return;
  }

  status.textContent = `${tableData.length} Spieler in dieser Tabelle.`;

  tableData.forEach((player, index) => {
    const rank = index + 1;
    const diff = player.legsPlus - player.legsMinus;
    const tr = document.createElement("tr");

    if (rank === 3) tr.classList.add("cut-top");
    if (tableData.length >= 4 && rank === tableData.length - 1) tr.classList.add("cut-bottom");

    tr.innerHTML = `
      <td class="rank">${rank}</td>
      <td>${player.name}</td>
      <td>${player.spiele}</td>
      <td>${player.siege}</td>
      <td>${player.niederlagen}</td>
      <td>${player.legsPlus}</td>
      <td>${player.legsMinus}</td>
      <td>${diff > 0 ? "+" + diff : diff}</td>
      <td>${player.punkte}</td>
    `;

    tbody.appendChild(tr);
  });
}

function initLeagueSwitch() {
  const buttons = document.querySelectorAll(".switch-btn");
  buttons.forEach(button => {
    button.addEventListener("click", () => {
      selectedLeague = button.dataset.league;
      buttons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      renderLeagueTable();
    });
  });
}

function renderMatchdays(games) {
  const tbody = document.getElementById("matchdaysTableBody");
  const status = document.getElementById("matchdaysStatus");

  if (!tbody || !status) return;

  tbody.innerHTML = "";

  if (!games.length) {
    status.textContent = "Noch keine Spieltage vorhanden.";
    return;
  }

  status.textContent = `${games.length} Spiele geladen.`;

  games.forEach(game => {
    const played = isPlayed(game);
    const aWon = played && game.legsA > game.legsB;
    const bWon = played && game.legsB > game.legsA;
    const result = played ? `${game.legsA} : ${game.legsB}` : "-";
    const statusClass = played ? "done" : "open";
    const statusText = played ? "Gespielt" : (game.status || "Offen");

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${game.spieltag || "-"}</td>
      <td>${game.zeitraum || game.datum || "-"}</td>
      <td>${leagueLabels[game.league] || game.league}</td>
      <td class="${aWon ? "winner" : ""}">${game.spielerA}</td>
      <td>${result}</td>
      <td class="${bWon ? "winner" : ""}">${game.spielerB}</td>
      <td><span class="tag ${statusClass}">${statusText}</span></td>
    `;

    tbody.appendChild(tr);
  });
}

async function loadData() {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error("CSV konnte nicht geladen werden.");

    const text = await response.text();
    const rows = parseCSV(text);
    allGames = buildGames(rows);

    initLeagueSwitch();
    renderLeagueTable();
    renderMatchdays(allGames);
  } catch (error) {
    const tableStatus = document.getElementById("leagueStatus");
    const matchdaysStatus = document.getElementById("matchdaysStatus");

    if (tableStatus) tableStatus.textContent = "Fehler beim Laden. Prüfe Google Sheet und Spaltennamen.";
    if (matchdaysStatus) matchdaysStatus.textContent = "Fehler beim Laden. Prüfe Google Sheet und Spaltennamen.";

    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", loadData);
