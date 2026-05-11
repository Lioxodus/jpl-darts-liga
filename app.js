// JPL Darts Liga - app.js

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
  const cleaned = String(value || "")
    .replace("\ufeff", "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
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

  return rows.slice(1)
    .map(row => {
      const legsA = toNumber(row[6]);
      const legsB = toNumber(row[7]);
      const statusRaw = row[8] || "";
      const hasResult = legsA > 0 || legsB > 0;

      const game = {
        spieltag: row[0] || "",
        zeitraum: row[1] || "",
        plattform: row[2] || "",
        liga: row[3] || "",
        spielerA: row[4] || "",
        spielerB: row[5] || "",
        legsA,
        legsB,
        status: statusRaw || (hasResult ? "Gespielt" : "Offen")
      };

      game.league = normalizeLeague(game.plattform, game.liga);

      return game;
    })
    .filter(game => game.spielerA && game.spielerB && game.league !== "Unbekannt");
}

function isPlayed(game) {
  const status = String(game.status || "").toLowerCase();

  return (
    status.includes("gespielt") ||
    status.includes("beendet") ||
    game.legsA > 0 ||
    game.legsB > 0
  );
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

  const leagueGames = games.filter(
    game => game.league === leagueName && isPlayed(game)
  );

  leagueGames.forEach(game => {
    if (!players[game.spielerA]) {
      players[game.spielerA] = createPlayer(game.spielerA);
    }

    if (!players[game.spielerB]) {
      players[game.spielerB] = createPlayer(game.spielerB);
    }

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

    const diffA = a.legsPlus - a.legsMinus;
    const diffB = b.legsPlus - b.legsMinus;

    if (diffB !== diffA) return diffB - diffA;

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
    status.textContent = "Noch keine Ergebnisse vorhanden.";
    return;
  }

  status.textContent = `${tableData.length} Spieler in dieser Tabelle.`;

  tableData.forEach((player, index) => {
    const rank = index + 1;
    const diff = player.legsPlus - player.legsMinus;

    const tr = document.createElement("tr");

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

// SPIELTAG FILTER

function renderMatchdayButtons(games) {
  const container = document.getElementById("matchdayButtons");

  if (!container) return;

  const uniqueMatchdays = [
    ...new Set(games.map(g => g.spieltag).filter(Boolean))
  ].sort((a, b) => Number(b) - Number(a));

  container.innerHTML = "";

  uniqueMatchdays.forEach(day => {
    const btn = document.createElement("button");

    btn.className = "matchday-btn";
    btn.dataset.matchday = day;
    btn.textContent = `Spieltag ${day}`;

    btn.addEventListener("click", () => {
      document.querySelectorAll(".matchday-btn")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");

      renderFilteredMatchdays(day);
    });

    container.appendChild(btn);
  });

  const allBtn = document.querySelector('[data-matchday="all"]');

  if (allBtn) {
    allBtn.addEventListener("click", () => {
      document.querySelectorAll(".matchday-btn")
        .forEach(b => b.classList.remove("active"));

      allBtn.classList.add("active");

      renderFilteredMatchdays("all");
    });
  }
}

function renderFilteredMatchdays(matchday) {
  let filteredGames = allGames;

  if (matchday !== "all") {
    filteredGames = allGames.filter(
      game => String(game.spieltag) === String(matchday)
    );
  }

  renderMatchdays(filteredGames);
}

function getStatusClass(game) {
  return isPlayed(game) ? "done" : "open";
}

function getStatusText(game) {
  return isPlayed(game) ? "Gespielt" : "Offen";
}

function renderMatchdays(games) {
  const tbody = document.getElementById("matchdaysTableBody");
  const status = document.getElementById("matchdaysStatus");

  if (!tbody || !status) return;

  tbody.innerHTML = "";

  if (!games.length) {
    status.textContent = "Keine Spiele gefunden.";
    return;
  }

  status.textContent = `${games.length} Spiele geladen.`;

  games.forEach(game => {
    const played = isPlayed(game);

    const result = played
      ? `${game.legsA} : ${game.legsB}`
      : "-";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${game.spieltag || "-"}</td>
      <td>${game.zeitraum || "-"}</td>
      <td>${leagueLabels[game.league] || game.league}</td>
      <td>${game.spielerA}</td>
      <td>${result}</td>
      <td>${game.spielerB}</td>
      <td>
        <span class="tag ${getStatusClass(game)}">
          ${getStatusText(game)}
        </span>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function loadData() {
  try {
    const response = await fetch(CSV_URL);

    if (!response.ok) {
      throw new Error("CSV konnte nicht geladen werden.");
    }

    const text = await response.text();

    const rows = parseCSV(text);

    allGames = buildGames(rows);

    initLeagueSwitch();

    renderLeagueTable();

    renderMatchdayButtons(allGames);

    renderFilteredMatchdays("all");

  } catch (error) {
    console.error(error);

    const tableStatus = document.getElementById("leagueStatus");
    const matchdaysStatus = document.getElementById("matchdaysStatus");

    if (tableStatus) {
      tableStatus.textContent = "Fehler beim Laden.";
    }

    if (matchdaysStatus) {
      matchdaysStatus.textContent = "Fehler beim Laden.";
    }
  }
}

document.addEventListener("DOMContentLoaded", loadData);
