const API_URL = "https://script.google.com/macros/s/AKfycbycRBYARr23G3oH8axqcESyH2NA_2bQnhacKH-YhMjcpyqYV2CA5cnCoxwut_pDvjwt/exec";

const monthFilter = document.getElementById("monthFilter");
const yearFilter = document.getElementById("yearFilter");
const clearFilters = document.getElementById("clearFilters");
const recordsTable = document.getElementById("recordsTable");
const refreshDashboardButton = document.getElementById("refreshDashboard");
const lastUpdate = document.getElementById("lastUpdate");

let allData = [];
let charts = {};

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function loadJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonpCallback_${Date.now()}`;
    const script = document.createElement("script");

    window[callbackName] = (data) => {
      resolve(data);
      delete window[callbackName];
      script.remove();
    };

    script.onerror = () => {
      reject(new Error("Erro ao carregar dados da API."));
      delete window[callbackName];
      script.remove();
    };

    script.src = `${url}?callback=${callbackName}&t=${Date.now()}`;
    document.body.appendChild(script);
  });
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function countBy(data, key) {
  return data.reduce((acc, item) => {
    const value = item[key] || "Não informado";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function topItem(counter) {
  const entries = Object.entries(counter);
  if (!entries.length) return "-";
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function getFilteredData() {
  return allData.filter(item => {
    const date = parseDate(item.dataHora);
    const selectedMonth = monthFilter.value;
    const selectedYear = yearFilter.value;

    if (!date && (selectedMonth !== "all" || selectedYear !== "all")) return false;
    if (selectedMonth !== "all" && date.getMonth() !== Number(selectedMonth)) return false;
    if (selectedYear !== "all" && date.getFullYear() !== Number(selectedYear)) return false;

    return true;
  });
}

function populateFilters() {
  const years = new Set();
  const months = new Set();

  allData.forEach(item => {
    const date = parseDate(item.dataHora);
    if (date) {
      years.add(date.getFullYear());
      months.add(date.getMonth());
    }
  });

  monthFilter.innerHTML = '<option value="all">Todos</option>';
  [...months].sort((a, b) => a - b).forEach(month => {
    monthFilter.innerHTML += `<option value="${month}">${monthNames[month]}</option>`;
  });

  yearFilter.innerHTML = '<option value="all">Todos</option>';
  [...years].sort((a, b) => b - a).forEach(year => {
    yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
  });
}

function updateKpis(data) {
  const desafios = countBy(data, "desafio");
  const ferramentas = countBy(data, "ferramenta");
  const metas = countBy(data, "meta");

  document.getElementById("totalRespostas").textContent = data.length;
  document.getElementById("principalDesafio").textContent = topItem(desafios);
  document.getElementById("principalFerramenta").textContent = topItem(ferramentas);
  document.getElementById("principalMeta").textContent = topItem(metas);
}

function createChart(canvasId, type, labels, values, label) {
  if (charts[canvasId]) charts[canvasId].destroy();

  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type,
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: type === "bar" ? "top" : "bottom"
        }
      },
      scales: type === "bar" ? {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      } : {}
    }
  });
}

function updateCharts(data) {
  const desafios = countBy(data, "desafio");
  const ferramentas = countBy(data, "ferramenta");
  const metas = countBy(data, "meta");

  createChart("desafiosChart", "doughnut", Object.keys(desafios), Object.values(desafios), "Desafios");
  createChart("ferramentasChart", "bar", Object.keys(ferramentas), Object.values(ferramentas), "Ferramentas");
  createChart("metasChart", "bar", Object.keys(metas), Object.values(metas), "Metas 2026");
}

function updateTable(data) {
  const latest = [...data].reverse().slice(0, 20);

  if (!latest.length) {
    recordsTable.innerHTML = '<tr><td colspan="2">Nenhum registro encontrado.</td></tr>';
    return;
  }

  recordsTable.innerHTML = latest.map(item => `
    <tr>
      <td>${formatDate(item.dataHora)}</td>
      <td>${item.nome || "-"}</td>
    </tr>
  `).join("");
}

function renderDashboard() {
  const filteredData = getFilteredData();
  updateKpis(filteredData);
  updateCharts(filteredData);
  updateTable(filteredData);
}

function setLastUpdateStatus(text) {
  if (lastUpdate) lastUpdate.textContent = text;
}

function updateLastUpdateTime() {
  const now = new Date();
  setLastUpdateStatus(now.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }));
}

async function initDashboard() {
  try {
    if (refreshDashboardButton) {
      refreshDashboardButton.disabled = true;
      refreshDashboardButton.textContent = "Atualizando...";
    }

    setLastUpdateStatus("Atualizando...");

    const response = await loadJsonp(API_URL);
    allData = response.dados || [];
    populateFilters();
    renderDashboard();
    updateLastUpdateTime();
  } catch (error) {
    recordsTable.innerHTML = '<tr><td colspan="2">Não foi possível carregar os dados. Verifique o código do Apps Script.</td></tr>';
    setLastUpdateStatus("Erro ao atualizar");
  } finally {
    if (refreshDashboardButton) {
      refreshDashboardButton.disabled = false;
      refreshDashboardButton.textContent = "Atualizar agora";
    }
  }
}

monthFilter.addEventListener("change", renderDashboard);
yearFilter.addEventListener("change", renderDashboard);
clearFilters.addEventListener("click", () => {
  monthFilter.value = "all";
  yearFilter.value = "all";
  renderDashboard();
});

if (refreshDashboardButton) {
  refreshDashboardButton.addEventListener("click", initDashboard);
}

initDashboard();
setInterval(initDashboard, 60000);
