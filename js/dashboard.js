const API_URL = "https://script.google.com/macros/s/AKfycbycRBYARr23G3oH8axqcESyH2NA_2bQnhacKH-YhMjcpyqYV2CA5cnCoxwut_pDvjwt/exec";

const monthFilter = document.getElementById("monthFilter");
const yearFilter = document.getElementById("yearFilter");
const clearFilters = document.getElementById("clearFilters");
const recordsTable = document.getElementById("recordsTable");
const refreshDashboardButton = document.getElementById("refreshDashboard");
const lastUpdate = document.getElementById("lastUpdate");
const refreshProgressBar = document.getElementById("refreshProgressBar");

let allData = [];
let charts = {};
let secondsToRefresh = 60;
const REFRESH_INTERVAL_SECONDS = 60;
let isLoading = false;

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const monthShortNames = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

const bluePalette = [
  "#0B3C5D", "#0E5A8A", "#1178B3", "#169BD5", "#38BDF8",
  "#67D5FF", "#93E5FF", "#BDEFFF"
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

function getMonthlyBaseData() {
  const selectedYear = yearFilter.value;

  return allData.filter(item => {
    const date = parseDate(item.dataHora);
    if (!date) return false;
    if (selectedYear !== "all" && date.getFullYear() !== Number(selectedYear)) return false;
    return true;
  });
}

function populateFilters() {
  const currentMonth = monthFilter.value;
  const currentYear = yearFilter.value;
  const years = new Set();

  allData.forEach(item => {
    const date = parseDate(item.dataHora);
    if (date) years.add(date.getFullYear());
  });

  monthFilter.innerHTML = '<option value="all">Todos</option>';
  monthNames.forEach((month, index) => {
    monthFilter.innerHTML += `<option value="${index}">${month}</option>`;
  });

  yearFilter.innerHTML = '<option value="all">Todos</option>';
  [...years].sort((a, b) => b - a).forEach(year => {
    yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
  });

  if ([...monthFilter.options].some(option => option.value === currentMonth)) {
    monthFilter.value = currentMonth;
  }

  if ([...yearFilter.options].some(option => option.value === currentYear)) {
    yearFilter.value = currentYear;
  }
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

function getDefaultOptions(type) {
  const textColor = "rgba(255, 255, 255, 0.84)";
  const gridColor = "rgba(255, 255, 255, 0.10)";

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: type === "doughnut" ? "bottom" : "top",
        labels: { color: textColor }
      }
    }
  };

  if (type === "bar" || type === "line") {
    options.scales = {
      x: {
        ticks: { color: textColor },
        grid: { color: gridColor }
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: textColor },
        grid: { color: gridColor }
      }
    };
  }

  return options;
}

function createChart(canvasId, type, labels, values, label, extraDataset = {}, extraOptions = {}) {
  if (charts[canvasId]) charts[canvasId].destroy();

  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type,
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderWidth: 2,
        ...extraDataset
      }]
    },
    options: {
      ...getDefaultOptions(type),
      ...extraOptions
    }
  });
}

function updateCharts(data) {
  const desafios = countBy(data, "desafio");
  const ferramentas = countBy(data, "ferramenta");
  const metas = countBy(data, "meta");

  createChart(
    "desafiosChart",
    "bar",
    Object.keys(desafios),
    Object.values(desafios),
    "Desafios",
    {
      backgroundColor: "rgba(56, 189, 248, 0.55)",
      borderColor: "rgba(125, 211, 252, 1)",
      borderRadius: 10
    }
  );

  createChart(
    "ferramentasChart",
    "doughnut",
    Object.keys(ferramentas),
    Object.values(ferramentas),
    "Ferramentas",
    {
      backgroundColor: Object.keys(ferramentas).map((_, index) => bluePalette[index % bluePalette.length]),
      borderColor: "rgba(255, 255, 255, 0.75)",
      hoverOffset: 8
    }
  );

  createChart(
    "metasChart",
    "bar",
    Object.keys(metas),
    Object.values(metas),
    "Metas 2026",
    {
      backgroundColor: "rgba(14, 165, 233, 0.45)",
      borderColor: "rgba(125, 211, 252, 1)",
      borderRadius: 10
    }
  );

  updateMonthlyChart();
}

function updateMonthlyChart() {
  const data = getMonthlyBaseData();
  const monthlyTotals = Array(12).fill(0);
  const selectedMonth = monthFilter.value;

  data.forEach(item => {
    const date = parseDate(item.dataHora);
    if (date) monthlyTotals[date.getMonth()] += 1;
  });

  const pointBackgroundColor = monthShortNames.map((_, index) => (
    selectedMonth !== "all" && index === Number(selectedMonth)
      ? "#FFFFFF"
      : "#38BDF8"
  ));

  const pointBorderColor = monthShortNames.map((_, index) => (
    selectedMonth !== "all" && index === Number(selectedMonth)
      ? "#0EA5E9"
      : "#BAE6FD"
  ));

  const pointRadius = monthShortNames.map((_, index) => (
    selectedMonth !== "all" && index === Number(selectedMonth) ? 8 : 4
  ));

  createChart(
    "respostasMesChart",
    "line",
    monthShortNames,
    monthlyTotals,
    "Respostas por mês",
    {
      borderColor: "#38BDF8",
      backgroundColor: "rgba(56, 189, 248, 0.18)",
      pointBackgroundColor,
      pointBorderColor,
      pointRadius,
      pointHoverRadius: 9,
      tension: 0.35,
      fill: true
    }
  );
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

function updateRefreshProgress() {
  if (!refreshProgressBar) return;

  const elapsed = REFRESH_INTERVAL_SECONDS - secondsToRefresh;
  const percentage = Math.min(100, Math.max(0, (elapsed / REFRESH_INTERVAL_SECONDS) * 100));
  refreshProgressBar.style.width = `${percentage}%`;
}

function resetCountdown() {
  secondsToRefresh = REFRESH_INTERVAL_SECONDS;
  updateRefreshProgress();
}

function updateCountdown() {
  if (isLoading) return;

  secondsToRefresh -= 1;
  updateRefreshProgress();

  if (secondsToRefresh <= 0) {
    initDashboard();
  }
}

async function initDashboard() {
  if (isLoading) return;

  try {
    isLoading = true;

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
    resetCountdown();
  } catch (error) {
    recordsTable.innerHTML = '<tr><td colspan="2">Não foi possível carregar os dados. Verifique o código do Apps Script.</td></tr>';
    setLastUpdateStatus("Erro ao atualizar");
  } finally {
    isLoading = false;

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
setInterval(updateCountdown, 1000);
