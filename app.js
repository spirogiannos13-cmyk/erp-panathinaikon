const boards = {
  tables: {
    title: "Κάτοψη τραπεζιών",
    description: "Επίλεξε τραπέζι για να δεις και να αλλάξεις την κατάστασή του",
    items: [
      ["Τραπέζι 01","Ελεύθερο","free","2 θέσεις","—"],
      ["Τραπέζι 02","Κατειλημμένο","busy","2 άτομα · 18′","€28,50"],
      ["Τραπέζι 03","Κατειλημμένο","busy","4 άτομα · 42′","€64,00"],
      ["Τραπέζι 04","Κράτηση","reserved","4 άτομα · 20:30","—"],
      ["Τραπέζι 05","Ελεύθερο","free","4 θέσεις","—"],
      ["Τραπέζι 06","Κατειλημμένο","busy","3 άτομα · 12′","€41,00"],
      ["Τραπέζι 07","Ελεύθερο","free","2 θέσεις","—"],
      ["Τραπέζι 08","Κατειλημμένο","busy","5 άτομα · 56′","€82,00"],
      ["Τραπέζι 09","Κράτηση","reserved","2 άτομα · 21:00","—"],
      ["Τραπέζι 10","Κατειλημμένο","busy","2 άτομα · 8′","€19,50"],
      ["Τραπέζι 11","Ελεύθερο","free","4 θέσεις","—"],
      ["Τραπέζι 12","Κατειλημμένο","busy","3 άτομα · 31′","€47,00"]
    ]
  },
  takeaway: {
    title: "Πλάνο Take Away", description: "Παρακολούθηση παραγγελιών παραλαβής",
    items: [
      ["#TA-1042","Νέα","reserved","Παραλαβή · 19:25","€24,50"],
      ["#TA-1041","Σε προετοιμασία","busy","Παραλαβή · 19:20","€18,00"],
      ["#TA-1040","Έτοιμη","free","Παραλαβή · 19:15","€32,00"],
      ["#TA-1039","Νέα","reserved","Παραλαβή · 19:30","€14,50"]
    ]
  },
  delivery: {
    title: "Πλάνο Delivery", description: "Ροή παραγγελιών και διανομέων",
    items: [
      ["#DL-2088","Νέα","reserved","Νέα παραγγελία · 19:24","€31,50"],
      ["#DL-2087","Σε προετοιμασία","busy","Κουζίνα · 19:18","€22,00"],
      ["#DL-2086","Σε διανομή","free","Διανομέας: Νίκος","€27,50"],
      ["#DL-2085","Έτοιμη","free","Αναμονή διανομέα","€19,00"],
      ["#DL-2084","Σε προετοιμασία","busy","Κουζίνα · 19:10","€42,00"],
      ["#DL-2083","Ολοκληρώθηκε","free","Παράδοση · 19:02","€16,50"],
      ["#DL-2082","Σε διανομή","free","Διανομέας: Γιώργος","€35,00"]
    ]
  }
};
const tableStates = ["free", "busy", "reserved"];
const tableLabels = {free:"Ελεύθερο",busy:"Κατειλημμένο",reserved:"Κράτηση"};
let savedStates = {};
try { savedStates = JSON.parse(localStorage.getItem("panathinaikon-table-states") || "{}"); } catch { savedStates = {}; }
let activeBoard = "tables";
let showAll = true;
const grid = document.querySelector("#orderGrid");
const title = document.querySelector("#boardTitle");
const description = document.querySelector("#boardDescription");
const toast = document.querySelector("#toast");
const summary = document.querySelector("#floorplanSummary");
const help = document.querySelector("#tableHelp");

function currentTables() {
  return boards.tables.items.map((item,index) => {
    const state = savedStates[index] || item[2];
    return {...item, state, label:tableLabels[state], index};
  });
}
function renderBoard() {
  const board = boards[activeBoard];
  title.textContent = board.title;
  description.textContent = board.description;
  const isTables = activeBoard === "tables";
  summary.hidden = !isTables;
  help.hidden = !isTables;
  if (isTables) {
    const tables = currentTables();
    const free = tables.filter(t=>t.state==="free").length;
    const busy = tables.filter(t=>t.state==="busy").length;
    const reserved = tables.filter(t=>t.state==="reserved").length;
    summary.innerHTML = `<span><b>${tables.length}</b> Σύνολο</span><span><b>${free}</b> Ελεύθερα</span><span><b>${busy}</b> Κατειλημμένα</span><span><b>${reserved}</b> Κρατήσεις</span>`;
    grid.className = "order-grid floorplan-grid";
    grid.innerHTML = tables.map(t => `
      <button class="table-tile ${t.state}" data-table-index="${t.index}" aria-label="${t[0]}, ${t.label}">
        <span class="table-topline"><span class="table-symbol">▦</span><span class="table-status">${t.label}</span></span>
        <strong>${t[0]}</strong>
        <span class="table-meta">${t[3]}</span>
        <span class="table-bottom"><span>${t.state==="busy"?"Τρέχων λογαριασμός":"Χωρητικότητα"}</span><b>${t[4]}</b></span>
      </button>`).join("");
    return;
  }
  grid.className = "order-grid";
  summary.hidden = true;
  grid.innerHTML = board.items.filter(item => showAll || item[2] !== "free").map(item => `
    <article class="order-card ${item[2]}">
      <div class="order-card-head"><span class="order-number">${item[0]}</span><span class="status-pill">${item[1]}</span></div>
      <div class="order-detail">${item[3]}</div>
      <div class="order-card-foot"><span>Σύνολο παραγγελίας</span><strong>${item[4]}</strong></div>
    </article>`).join("");
}
grid.addEventListener("click", event => {
  const tile = event.target.closest("[data-table-index]");
  if (!tile) return;
  const index = Number(tile.dataset.tableIndex);
  const current = savedStates[index] || boards.tables.items[index][2];
  const next = tableStates[(tableStates.indexOf(current)+1)%tableStates.length];
  savedStates[index] = next;
  localStorage.setItem("panathinaikon-table-states", JSON.stringify(savedStates));
  renderBoard();
  showToast(`${boards.tables.items[index][0]}: ${tableLabels[next]}`);
});
document.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => {
  activeBoard = button.dataset.tab;
  document.querySelectorAll("[data-tab]").forEach(tab => {
    const selected = tab === button;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  renderBoard();
}));
document.querySelector("#filterButton").addEventListener("click", event => {
  showAll = !showAll;
  event.currentTarget.querySelector("span").textContent = showAll ? "Όλα" : "Σε εξέλιξη";
  renderBoard();
});
document.querySelector("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  localStorage.setItem("panathinaikon-theme", dark ? "dark" : "light");
});
if (localStorage.getItem("panathinaikon-theme") === "dark") document.body.classList.add("dark");

const orderModal = document.querySelector("#orderModal");
const orderForm = document.querySelector("#orderForm");
const orderType = document.querySelector("#orderType");
const tableField = document.querySelector("#tableField");
let demoOrders = [];
try { demoOrders = JSON.parse(localStorage.getItem("panathinaikon-demo-orders") || "[]"); } catch { demoOrders = []; }

function openOrderModal() {
  orderForm.reset();
  updateTableField();
  orderModal.hidden = false;
  document.querySelector("#orderType").focus();
}
function closeOrderModal() {
  orderModal.hidden = true;
}
function updateTableField() {
  const isTable = orderType.value === "tables";
  tableField.hidden = !isTable;
  document.querySelector("#orderTable").required = isTable;
}
document.querySelector("#newOrder").addEventListener("click", openOrderModal);
document.querySelector("#closeOrderModal").addEventListener("click", closeOrderModal);
document.querySelector("#cancelOrder").addEventListener("click", closeOrderModal);
orderModal.addEventListener("click", event => { if (event.target === orderModal) closeOrderModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !orderModal.hidden) closeOrderModal(); });
orderType.addEventListener("change", updateTableField);
orderForm.addEventListener("submit", event => {
  event.preventDefault();
  const type = orderType.value;
  const amount = Number(document.querySelector("#orderAmount").value);
  const customer = document.querySelector("#orderCustomer").value.trim();
  const note = document.querySelector("#orderNote").value.trim();
  const tableNumber = document.querySelector("#orderTable").value;
  if (!Number.isFinite(amount) || amount <= 0) return;
  let item;
  const formattedAmount = amount.toLocaleString("el-GR", {style:"currency",currency:"EUR"});
  const time = new Intl.DateTimeFormat("el-GR", {hour:"2-digit",minute:"2-digit"}).format(new Date());
  const suffix = String(Date.now()).slice(-5);
  if (type === "tables") {
    if (!tableNumber) return;
    const index = Number(tableNumber) - 1;
    const current = savedStates[index] || boards.tables.items[index][2];
    if (current === "busy") {
      showToast("Το τραπέζι είναι ήδη κατειλημμένο.");
      return;
    }
    savedStates[index] = "busy";
    localStorage.setItem("panathinaikon-table-states", JSON.stringify(savedStates));
    const label = customer ? customer : "Νέα παραγγελία";
    boards.tables.items[index] = [`Τραπέζι ${tableNumber}`, "Κατειλημμένο", "busy", `${label} · ${time}`, formattedAmount];
    item = {id:`TB-${tableNumber}-${suffix}`, type, item:boards.tables.items[index], note};
  } else {
    const prefix = type === "takeaway" ? "#TA-" : "#DL-";
    const status = "Νέα";
    const detail = [customer, type === "takeaway" ? `Παραλαβή · ${time}` : `Νέα παραγγελία · ${time}`].filter(Boolean).join(" · ");
    const row = [`${prefix}${suffix}`, status, "reserved", detail, formattedAmount];
    boards[type].items.unshift(row);
    item = {id:row[0], type, item:row, note};
  }
  demoOrders.unshift(item);
  localStorage.setItem("panathinaikon-demo-orders", JSON.stringify(demoOrders));
  activeBoard = type;
  document.querySelectorAll("[data-tab]").forEach(tab => {
    const selected = tab.dataset.tab === type;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  closeOrderModal();
  renderBoard();
  showToast("Η παραγγελία καταχωρίστηκε στο demo.");
});
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}
const now = new Date();
document.querySelector("#today").textContent = new Intl.DateTimeFormat("el-GR", {weekday:"short",day:"numeric",month:"short",year:"numeric"}).format(now);
renderBoard();