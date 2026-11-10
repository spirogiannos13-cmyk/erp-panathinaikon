const boards = {
  tables: {
    title: "Πλάνο τραπεζιών",
    description: "Κατάσταση τραπεζιών σε πραγματικό χρόνο",
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
    title: "Πλάνο Take Away",
    description: "Παρακολούθηση παραγγελιών παραλαβής",
    items: [
      ["#TA-1042","Νέα","reserved","Παραλαβή · 19:25","€24,50"],
      ["#TA-1041","Σε προετοιμασία","busy","Παραλαβή · 19:20","€18,00"],
      ["#TA-1040","Έτοιμη","free","Παραλαβή · 19:15","€32,00"],
      ["#TA-1039","Νέα","reserved","Παραλαβή · 19:30","€14,50"]
    ]
  },
  delivery: {
    title: "Πλάνο Delivery",
    description: "Ροή παραγγελιών και διανομέων",
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
let activeBoard = "tables";
let showAll = true;
const grid = document.querySelector("#orderGrid");
const title = document.querySelector("#boardTitle");
const description = document.querySelector("#boardDescription");
const toast = document.querySelector("#toast");
function renderBoard() {
  const board = boards[activeBoard];
  title.textContent = board.title;
  description.textContent = board.description;
  grid.innerHTML = board.items.filter(item => showAll || item[2] !== "free").map(item => `
    <article class="order-card ${item[2]}">
      <div class="order-card-head"><span class="order-number">${item[0]}</span><span class="status-pill">${item[1]}</span></div>
      <div class="order-detail">${item[3]}</div>
      <div class="order-card-foot"><span>${activeBoard === "tables" ? "Τρέχων λογαριασμός" : "Σύνολο παραγγελίας"}</span><strong>${item[4]}</strong></div>
    </article>`).join("");
}
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
document.querySelector("#newOrder").addEventListener("click", () => showToast("Η φόρμα νέας παραγγελίας θα προστεθεί στο επόμενο βήμα."));
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}
const now = new Date();
document.querySelector("#today").textContent = new Intl.DateTimeFormat("el-GR", {weekday:"short",day:"numeric",month:"short",year:"numeric"}).format(now);
renderBoard();