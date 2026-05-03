function showLiga(liga) {

  let content = "";

  if (liga === "liga1") {
    content = `
      <h2>🏆 Autodarts Liga 1</h2>

      <h3>📊 Tabelle</h3>
      <table>
        <tr><th>#</th><th>Spieler</th><th>Punkte</th></tr>
        <tr><td>1</td><td>Max</td><td>15</td></tr>
        <tr><td>2</td><td>Leon</td><td>9</td></tr>
      </table>

      <h3>📅 Spieltage</h3>
      <p>Max vs Leon → 3:1</p>
    `;
  }

  if (liga === "liga2") {
    content = `<h2>🏆 Autodarts Liga 2</h2>`;
  }

  if (liga === "liga3") {
    content = `<h2>🏆 Autodarts Liga 3</h2>`;
  }

  if (liga === "liga4") {
    content = `<h2>🏆 Autodarts Liga 4</h2>`;
  }

  document.getElementById("content").innerHTML = content;
}
