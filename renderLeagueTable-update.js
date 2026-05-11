// Nur renderLeagueTable Funktion ersetzt

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

    // SCOLIA + DARTCOUNTER
    if (
      (selectedLeague === "Scolia" ||
       selectedLeague === "DartCounter") &&
      rank === 5
    ) {
      tr.classList.add("cut-top");
    }

    // AUTODARTS 1-3
    if (
      (selectedLeague === "AutoDarts 1" ||
       selectedLeague === "AutoDarts 2" ||
       selectedLeague === "AutoDarts 3")
    ) {
      if (rank === 3) {
        tr.classList.add("cut-top");
      }

      if (rank === tableData.length - 1) {
        tr.classList.add("cut-bottom");
      }
    }

    // AUTODARTS 4
    if (
      selectedLeague === "AutoDarts 4" &&
      rank === 3
    ) {
      tr.classList.add("cut-top");
    }

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
