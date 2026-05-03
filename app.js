const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9cqFKQxjTBcRuUVivV8uEK4IQwpFZXbi82FjcaKiY8RXPRnbqmfhg0MdW31qJqtv7P2Fn9loUxYFM/pub?output=csv";
let currentSelectedMatchday = "Alle";

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

function normalizePlatform(platform) {
  const value = String(platform || "").toLowerCase().replace(/\s/g, "");
  if (value.includes("scolia")) return "Scolia";
  if (value.includes("autodarts") || value.includes("auto")) return "AutoDarts";
  return platform || "Unbekannt";
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

function buildGames(rows) {
  if (!rows.length) return [];

  const header = rows[0].map(item => String(item).toLowerCase().trim());

  const index = {
    spieltag: getColumnIndex(header, ["spieltag"]),
    zeitraum: getColumnIndex(header, ["zeitraum"]),
    datum: getColumnIndex(header, ["datum"]),
    plattform: getColumnIndex(header, ["plattform"]),
    spielerA: getColumnIndex(header, ["spieler a", "spielera"]),
    spielerB: getColumnIndex(header, ["spieler b", "spielerb"]),
    legsA: getColumnIndex(header, ["legs a", "legsa"]),
    legsB: getColumnIndex(header, ["legs b", "legsb"]),
    status: getColumnIndex(header, ["status"])
  };

  return rows.slice(1)
    .map(row => {
      const legsA = toNumber(row[index.legsA]);
      const legsB = toNumber(row[index.legsB]);
      const rawStatus = index.status >= 0 ? row[index.status] : "";
      const hasResult = legsA > 0 || legsB > 0;

      return {
        spieltag: index.spieltag >= 0 ? row[index.spieltag] || "" : "",
        zeitraum: index.zeitraum >= 0 ? row[index.zeitraum] || "" : "",
        datum: index.datum >= 0 ? row[index.datum] || "" : "",
        plattform: normalizePlatform(index.plattform >= 0 ? row[index.plattform] || "" : ""),
        spielerA: index.spielerA >= 0 ? row[index.spielerA] || "" : "",
        spielerB: index.spielerB >= 0 ? row[index.spielerB] || "" : "",
        legsA,
        legsB,
        status: rawStatus || (hasResult ? "Gespielt" : "Offen")
      };
    })
    .filter(game => game.spielerA && game.spielerB && game.plattform);
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

function calculateTable(games, platformName) {
  const players = {};
  const platformGames = games.filter(game => game.plattform === platformName && isPlayed(game));

  platformGames.forEach(game => {
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

function renderLeagueTable(tableData, tbodyId, statusId) {
  const tbody = document.getElementById(tbodyId);
  const status = document.getElementById(statusId);
  if (!tbody || !status) return;

  tbody.innerHTML = "";

  if (!tableData.length) {
    status.textContent = "Noch keine Ergebnisse für diese Plattform vorhanden.";
    return;
  }

  status.textContent = `${tableData.length} Spieler in der Tabelle.`;

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

function renderMatchdayButtons(games) {
  const container = document.getElementById("matchdayButtons");
  if (!container) return;

  const matchdays = [...new Set(
    games
      .map(game => String(game.spieltag || "").trim())
      .filter(spieltag => spieltag !== "")
  )].sort((a, b) => Number(a) - Number(b));

  container.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = currentSelectedMatchday === "Alle" ? "matchday-btn active" : "matchday-btn";
  allButton.textContent = "Alle";
  allButton.addEventListener("click", () => {
    currentSelectedMatchday = "Alle";
    renderMatchdays(games);
  });
  container.appendChild(allButton);

  matchdays.forEach(spieltag => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = currentSelectedMatchday === spieltag ? "matchday-btn active" : "matchday-btn";
    button.textContent = `Spieltag ${spieltag}`;
    button.addEventListener("click", () => {
      currentSelectedMatchday = spieltag;
      renderMatchdays(games);
    });
    container.appendChild(button);
  });
}

function renderMatchdays(games) {
  const tbody = document.getElementById("matchdaysTableBody");
  const status = document.getElementById("matchdaysStatus");
  if (!tbody || !status) return;

  renderMatchdayButtons(games);

  const filteredGames = currentSelectedMatchday === "Alle"
    ? games
    : games.filter(game => String(game.spieltag || "").trim() === currentSelectedMatchday);

  tbody.innerHTML = "";

  if (!filteredGames.length) {
    status.textContent = currentSelectedMatchday === "Alle"
      ? "Noch keine Spieltage vorhanden."
      : `Keine Spiele für Spieltag ${currentSelectedMatchday} vorhanden.`;
    return;
  }

  status.textContent = currentSelectedMatchday === "Alle"
    ? `${filteredGames.length} Spiele geladen.`
    : `${filteredGames.length} Spiele für Spieltag ${currentSelectedMatchday} geladen.`;

  filteredGames.forEach(game => {
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
      <td>${game.plattform}</td>
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
    const games = buildGames(rows);

    renderLeagueTable(calculateTable(games, "Scolia"), "scoliaTableBody", "scoliaStatus");
    renderLeagueTable(calculateTable(games, "AutoDarts"), "autodartsTableBody", "autodartsStatus");
    renderMatchdays(games);
  } catch (error) {
    const errorText = "Fehler beim Laden. Prüfe den Google-Sheets-Link und die Spaltennamen.";
    const scoliaStatus = document.getElementById("scoliaStatus");
    const autodartsStatus = document.getElementById("autodartsStatus");
    const matchdaysStatus = document.getElementById("matchdaysStatus");

    if (scoliaStatus) scoliaStatus.textContent = errorText;
    if (autodartsStatus) autodartsStatus.textContent = errorText;
    if (matchdaysStatus) matchdaysStatus.textContent = errorText;

    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", loadData);


/* JPL Tabellen-Auswahl: Scolia + AutoDarts Liga 1-4 */
let selectedLeagueJPL = "Scolia";
let allGamesJPL = [];

const leagueLabelsJPL = {
  "Scolia": "Scolia",
  "DartCounter": "DartCounter",
  "AutoDarts 1": "AutoDarts Liga 1",
  "AutoDarts 2": "AutoDarts Liga 2",
  "AutoDarts 3": "AutoDarts Liga 3",
  "AutoDarts 4": "AutoDarts Liga 4"
};

function getLeagueJPL(game) {
  const platform = String(game.plattform || game.platform || "").toLowerCase().replace(/\s/g, "");
  const ligaRaw = String(game.liga || game.division || game.gruppe || "").toLowerCase().trim();

  if (platform.includes("scolia")) return "Scolia";
  if (platform.includes("dartcounter") || platform.includes("dartcounter")) return "DartCounter";

  if (platform.includes("autodarts") || platform.includes("auto")) {
    if (ligaRaw.includes("4")) return "AutoDarts 4";
    if (ligaRaw.includes("3")) return "AutoDarts 3";
    if (ligaRaw.includes("2")) return "AutoDarts 2";
    return "AutoDarts 1";
  }

  return "Unbekannt";
}

function buildGamesJPL(rows) {
  if (!rows.length) return [];
  const header = rows[0].map(item => String(item).toLowerCase().trim());
  const idx = {
    spieltag: header.indexOf("spieltag"),
    zeitraum: header.indexOf("zeitraum"),
    datum: header.indexOf("datum"),
    plattform: header.indexOf("plattform"),
    liga: header.indexOf("liga"),
    spielerA: header.indexOf("spieler a"),
    spielerB: header.indexOf("spieler b"),
    legsA: header.indexOf("legs a"),
    legsB: header.indexOf("legs b"),
    status: header.indexOf("status")
  };

  return rows.slice(1).map(row => {
    const game = {
      spieltag: idx.spieltag >= 0 ? row[idx.spieltag] || "" : "",
      zeitraum: idx.zeitraum >= 0 ? row[idx.zeitraum] || "" : "",
      datum: idx.datum >= 0 ? row[idx.datum] || "" : "",
      plattform: idx.plattform >= 0 ? row[idx.plattform] || "" : "",
      liga: idx.liga >= 0 ? row[idx.liga] || "" : "",
      spielerA: idx.spielerA >= 0 ? row[idx.spielerA] || "" : "",
      spielerB: idx.spielerB >= 0 ? row[idx.spielerB] || "" : "",
      legsA: idx.legsA >= 0 ? toNumber(row[idx.legsA]) : 0,
      legsB: idx.legsB >= 0 ? toNumber(row[idx.legsB]) : 0,
      status: idx.status >= 0 ? row[idx.status] || "" : ""
    };
    game.league = getLeagueJPL(game);
    if (!game.status) game.status = (game.legsA > 0 || game.legsB > 0) ? "Gespielt" : "Offen";
    return game;
  }).filter(game => game.spielerA && game.spielerB && game.league !== "Unbekannt");
}

function isPlayedJPL(game) {
  const status = String(game.status || "").toLowerCase();
  return status.includes("gespielt") || status.includes("beendet") || game.legsA > 0 || game.legsB > 0;
}

function calculateTableJPL(games, leagueName) {
  const players = {};
  games.filter(game => game.league === leagueName && isPlayedJPL(game)).forEach(game => {
    if (!players[game.spielerA]) players[game.spielerA] = createPlayer(game.spielerA);
    if (!players[game.spielerB]) players[game.spielerB] = createPlayer(game.spielerB);

    const a = players[game.spielerA];
    const b = players[game.spielerB];

    a.spiele++;
    b.spiele++;
    a.legsPlus += game.legsA;
    a.legsMinus += game.legsB;
    b.legsPlus += game.legsB;
    b.legsMinus += game.legsA;

    if (game.legsA > game.legsB) {
      a.siege++;
      b.niederlagen++;
      a.punkte += 2;
    } else if (game.legsB > game.legsA) {
      b.siege++;
      a.niederlagen++;
      b.punkte += 2;
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

function renderSelectedLeagueJPL() {
  const tbody = document.getElementById("leagueTableBody");
  const status = document.getElementById("leagueStatus");
  const title = document.getElementById("leagueTitle");
  if (!tbody || !status || !title) return;

  title.textContent = `${leagueLabelsJPL[selectedLeagueJPL]} Tabelle`;
  const tableData = calculateTableJPL(allGamesJPL, selectedLeagueJPL);
  tbody.innerHTML = "";

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

function initLeagueSwitchJPL() {
  document.querySelectorAll(".switch-btn").forEach(button => {
    button.addEventListener("click", () => {
      selectedLeagueJPL = button.dataset.league;
      document.querySelectorAll(".switch-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      renderSelectedLeagueJPL();
    });
  });
}

async function loadTablesJPL() {
  if (!document.getElementById("leagueTableBody")) return;
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error("CSV konnte nicht geladen werden.");
    const text = await response.text();
    const rows = parseCSV(text);
    allGamesJPL = buildGamesJPL(rows);
    initLeagueSwitchJPL();
    renderSelectedLeagueJPL();
  } catch (error) {
    const status = document.getElementById("leagueStatus");
    if (status) status.textContent = "Fehler beim Laden. Prüfe Google Sheet und Spaltennamen.";
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", loadTablesJPL);
