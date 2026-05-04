const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9cqFKQxjTBcRuUVivV8uEK4IQwpFZXbi82FjcaKiY8RXPRnbqmfhg0MdW31qJqtv7P2Fn9loUxYFM/pub?output=csv";

function toNumber(value) {
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function parseCSV(text) {
  return text.split("\n").map(row => row.split(","));
}

async function loadData() {
  const res = await fetch(CSV_URL);
  const text = await res.text();
  const rows = parseCSV(text);

  const tbody = document.getElementById("matchdaysTableBody");
  if (!tbody) return;

  rows.slice(1).forEach(row => {
    const legsA = toNumber(row[6]);
    const legsB = toNumber(row[7]);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row[0]}</td>
      <td>${row[1]}</td>
      <td>${row[2]}</td>
      <td>${row[4]}</td>
      <td>${legsA} : ${legsB}</td>
      <td>${row[5]}</td>
      <td>${row[8]}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", loadData);
