const boards = {
  tables: {title:"Κάτοψη τραπεζιών",description:"Πάτησε σε τραπέζι για να ανοίξεις τη διαχείρισή του",items:[
    ["Τραπέζι 01","Ελεύθερο","free","2 θέσεις","—"],["Τραπέζι 02","Κατειλημμένο","busy","2 άτομα · 18′","€28,50"],["Τραπέζι 03","Κατειλημμένο","busy","4 άτομα · 42′","€64,00"],["Τραπέζι 04","Κράτηση","reserved","4 άτομα · 20:30","—"],["Τραπέζι 05","Ελεύθερο","free","4 θέσεις","—"],["Τραπέζι 06","Κατειλημμένο","busy","3 άτομα · 12′","€41,00"],["Τραπέζι 07","Ελεύθερο","free","2 θέσεις","—"],["Τραπέζι 08","Κατειλημμένο","busy","5 άτομα · 56′","€82,00"],["Τραπέζι 09","Κράτηση","reserved","2 άτομα · 21:00","—"],["Τραπέζι 10","Κατειλημμένο","busy","2 άτομα · 8′","€19,50"],["Τραπέζι 11","Ελεύθερο","free","4 θέσεις","—"],["Τραπέζι 12","Κατειλημμένο","busy","3 άτομα · 31′","€47,00"]
  ]},
  takeaway:{title:"Πακέτο / Take Away",description:"Επίλεξε απευθείας είδη για να δημιουργήσεις παραγγελία",items:[]},
  delivery:{title:"Διαχείριση Delivery",description:"Παρακολούθηση προετοιμασίας, αποδείξεων και διανομέων",items:[
    ["#DL-2088","Νέα","new","Νέα παραγγελία · 19:24","€31,50"],["#DL-2087","Σε προετοιμασία","preparing","Κουζίνα · 19:18","€22,00"],["#DL-2086","Σε διανομή","dispatched","Διανομέας: Νίκος","€27,50"],["#DL-2085","Έτοιμη","ready","Αναμονή διανομέα","€19,00"],["#DL-2084","Σε προετοιμασία","preparing","Κουζίνα · 19:10","€42,00"],["#DL-2083","Παραδόθηκε","completed","Παράδοση · 19:02","€16,50"],["#DL-2082","Σε διανομή","dispatched","Διανομέας: Γιώργος","€35,00"]
  ]}
};
const menu=[{name:"Freddo Espresso",category:"Καφέδες",price:2.80},{name:"Cappuccino",category:"Καφέδες",price:3.20},{name:"Club Sandwich",category:"Φαγητό",price:8.50},{name:"Burger",category:"Φαγητό",price:10.90},{name:"Caesar Salad",category:"Σαλάτες",price:9.20},{name:"Πατάτες",category:"Sides",price:4.00},{name:"Coca Cola",category:"Αναψυκτικά",price:2.50},{name:"Νερό",category:"Αναψυκτικά",price:0.50}];
const deliveryStages=[{key:"new",label:"Νέα",next:"preparing",action:"Έναρξη προετοιμασίας"},{key:"preparing",label:"Σε προετοιμασία",next:"ready",action:"Σήμανση ως έτοιμη"},{key:"ready",label:"Έτοιμη",next:"dispatched",action:"Έκδοση απόδειξης & αναχώρηση"},{key:"dispatched",label:"Σε διανομή",next:"completed",action:"Καταχώριση παράδοσης"},{key:"completed",label:"Παραδόθηκε",next:null,action:"Ολοκληρώθηκε"}];
let savedStates={};try{savedStates=JSON.parse(localStorage.getItem("panathinaikon-table-states")||"{}");}catch{}
let activeBoard="tables",showAll=true,selectedTable=0,cart={},selectedCategory="Όλα",tableDiscounts={},tableOrderContext=null;
const grid=document.querySelector("#orderGrid"),title=document.querySelector("#boardTitle"),description=document.querySelector("#boardDescription"),toast=document.querySelector("#toast"),summary=document.querySelector("#floorplanSummary"),help=document.querySelector("#tableHelp");
const tableModal=document.querySelector("#tableModal"),receiptModal=document.querySelector("#receiptModal");
const money=n=>n.toLocaleString("el-GR",{style:"currency",currency:"EUR"});
function currentTables(){return boards.tables.items.map((item,index)=>({...item,state:savedStates[index]||item[2],index}));}
function saveTables(){localStorage.setItem("panathinaikon-table-states",JSON.stringify(savedStates));localStorage.setItem("panathinaikon-tables",JSON.stringify(boards.tables.items));}
try{const persisted=JSON.parse(localStorage.getItem("panathinaikon-tables")||"null");if(Array.isArray(persisted)&&persisted.length===12)boards.tables.items=persisted;}catch{}
function setBoardTab(type){activeBoard=type;document.querySelectorAll("[data-tab]").forEach(tab=>{const on=tab.dataset.tab===type;tab.classList.toggle("active",on);tab.setAttribute("aria-selected",String(on));});renderBoard();}
function renderTables(){
 const tables=currentTables(),free=tables.filter(t=>t.state==="free").length,busy=tables.filter(t=>t.state==="busy").length,reserved=tables.filter(t=>t.state==="reserved").length;
 summary.hidden=false;help.hidden=false;summary.innerHTML=`<span><b>12</b> Σύνολο</span><span><b>${free}</b> Ελεύθερα</span><span><b>${busy}</b> Κατειλημμένα</span><span><b>${reserved}</b> Κρατήσεις</span>`;
 grid.className="order-grid floorplan-grid";
 grid.innerHTML=tables.map(t=>`<button class="table-tile ${t.state}" data-table-index="${t.index}" aria-label="${t[0]}, ${t[1]}"><span class="table-topline"><span class="table-symbol">▦</span><span class="table-status">${t[1]}</span></span><strong>${t[0]}</strong><span class="table-meta">${t[3]}</span><span class="table-bottom"><span>Λογαριασμός</span><b>${t[4]}</b></span></button>`).join("");
}
function renderTakeaway(){
 summary.hidden=true;help.hidden=true;grid.className="takeaway-layout";
 const categories=["Όλα",...new Set(menu.map(x=>x.category))];
 const products=menu.filter(p=>selectedCategory==="Όλα"||p.category===selectedCategory);
 const cartEntries=Object.entries(cart).filter(([,qty])=>qty>0);
 const total=cartEntries.reduce((sum,[name,qty])=>sum+menu.find(p=>p.name===name).price*qty,0);
 grid.innerHTML=`<section class="catalog-panel"><div class="catalog-heading"><div><h3>Κατάλογος ειδών</h3><p>Επίλεξε προϊόντα για την παραγγελία ${tableOrderContext!==null?"· Τραπέζι "+String(tableOrderContext+1).padStart(2,"0"):""}</p></div><span class="catalog-count">${menu.length} είδη</span></div><div class="category-tabs">${categories.map(c=>`<button class="category-tab ${c===selectedCategory?"active":""}" data-category="${c}">${c}</button>`).join("")}</div><div class="product-grid">${products.map(p=>`<button type="button" class="product-tile product-button" data-add-product="${p.name}" aria-label="Προσθήκη ${p.name}"><div class="product-placeholder">${p.category==="Καφέδες"?"☕":p.category==="Αναψυκτικά"?"🥤":p.category==="Σαλάτες"?"🥗":"🍽"}</div><div class="product-info"><strong>${p.name}</strong><small>${p.category}</small><b>${money(p.price)}</b></div><span class="add-product" aria-hidden="true">＋ Προσθήκη</span></button>`).join("")}</div></section><aside class="cart-panel"><div class="cart-heading"><h3>Τρέχουσα παραγγελία</h3><span>${cartEntries.reduce((s,[,q])=>s+q,0)} τεμ.</span></div><div class="cart-items">${cartEntries.length?cartEntries.map(([name,qty])=>{const p=menu.find(x=>x.name===name);return `<div class="cart-row"><div><strong>${name}</strong><small>${money(p.price)} / τεμ.</small></div><div class="quantity-control"><button data-qty="-1" data-name="${name}">−</button><b>${qty}</b><button data-qty="1" data-name="${name}">＋</button></div><strong>${money(p.price*qty)}</strong></div>`}).join(""):'<p class="empty-cart">Δεν έχεις προσθέσει είδη ακόμη.</p>'}</div><div class="cart-total"><span>Σύνολο</span><strong>${money(total)}</strong></div><button class="primary-button checkout-button" id="submitTakeaway" ${cartEntries.length?"":"disabled"}>Καταχώριση παραγγελίας</button></aside>`;
}
function renderDelivery(){
 summary.hidden=true;help.hidden=true;grid.className="delivery-board";
 const stages=deliveryStages;
 grid.innerHTML=`<div class="delivery-summary">${stages.map(s=>`<div class="delivery-stage-count"><span>${s.label}</span><b>${boards.delivery.items.filter(o=>o[2]===s.key).length}</b></div>`).join("")}</div><div class="delivery-orders">${boards.delivery.items.map((o,i)=>{const stage=stages.find(s=>s.key===o[2])||stages[0];const receipt=o.receipt?"Απόδειξη εκδόθηκε":"Απόδειξη εκκρεμεί";return `<article class="delivery-card"><div class="delivery-card-top"><strong>${o[0]}</strong><span class="delivery-status ${o[2]}">${stage.label}</span></div><p>${o[3]}</p><div class="delivery-card-meta"><b>${o[4]}</b><span class="${o.receipt?"receipt-done":"receipt-pending"}">▤ ${receipt}</span></div><div class="delivery-card-actions">${o[2]==="ready"&&!o.receipt?`<button class="secondary-button" data-receipt="${i}">Έκδοση απόδειξης</button>`:""}${stage.next?`<button class="primary-button" data-delivery-next="${i}" ${o[2]==="ready"&&!o.receipt?"disabled":""}>${o[2]==="ready"?"Αναχώρηση διανομέα":stage.action}</button>`:'<span class="completed-label">✓ Ολοκληρώθηκε</span>'}</div></article>`}).join("")}</div>`;
}
function renderBoard(){
 const dashboard=activeBoard==="dashboard";
 document.querySelector("#dashboardView").hidden=!dashboard;
 document.querySelector("#ordersHeading").hidden=dashboard;
 document.querySelector("#boardToolbar").hidden=dashboard;
 document.querySelector(".section-heading").hidden=dashboard;
 grid.hidden=dashboard;summary.hidden=dashboard;help.hidden=dashboard;
 if(dashboard)return;
 const board=boards[activeBoard];title.textContent=board.title;description.textContent=board.description;
 if(activeBoard==="tables"){renderTables();return;}
 if(activeBoard==="takeaway"){renderTakeaway();return;}
 renderDelivery();
}
function openTable(index){selectedTable=index;const row=boards.tables.items[index];document.querySelector("#tableModalTitle").textContent=row[0];document.querySelector("#tableModalSubtitle").textContent=row[1]+" · "+row[4];document.querySelector("#tableManagementNote").textContent=row[2]==="busy"?"Διαχείριση ενεργού λογαριασμού. Οι ενέργειες απόδειξης/έκπτωσης είναι demo.":"Ελεύθερο τραπέζι. Μπορείς να ξεκινήσεις νέα παραγγελία.";tableModal.hidden=false;}
function closeTable(){tableModal.hidden=true;}
grid.addEventListener("click",event=>{
 const tile=event.target.closest("[data-table-index]");if(tile){openTable(Number(tile.dataset.tableIndex));return;}
 const add=event.target.closest("[data-add-product]");if(add){const n=add.dataset.addProduct;cart[n]=(cart[n]||0)+1;renderTakeaway();return;}
 const qty=event.target.closest("[data-qty]");if(qty){const n=qty.dataset.name;cart[n]=Math.max(0,(cart[n]||0)+Number(qty.dataset.qty));renderTakeaway();return;}
 const category=event.target.closest("[data-category]");if(category){selectedCategory=category.dataset.category;renderTakeaway();return;}
 const next=event.target.closest("[data-delivery-next]");if(next){const i=Number(next.dataset.deliveryNext),stage=deliveryStages.find(s=>s.key===boards.delivery.items[i][2]);if(stage?.next){boards.delivery.items[i][2]=stage.next;boards.delivery.items[i][1]=deliveryStages.find(s=>s.key===stage.next).label;persistDelivery();renderDelivery();}return;}
 const receipt=event.target.closest("[data-receipt]");if(receipt){const i=Number(receipt.dataset.receipt);boards.delivery.items[i].receipt=true;persistDelivery();renderDelivery();showToast("Η απόδειξη σημειώθηκε ως εκδοθείσα (demo).");return;}
 if(event.target.closest("#submitTakeaway")){submitTakeaway();}
});
function persistDelivery(){localStorage.setItem("panathinaikon-delivery",JSON.stringify(boards.delivery.items));}
try{const d=JSON.parse(localStorage.getItem("panathinaikon-delivery")||"null");if(Array.isArray(d))boards.delivery.items=d;}catch{}
function submitTakeaway(){const entries=Object.entries(cart).filter(([,q])=>q>0);if(!entries.length)return;const total=entries.reduce((s,[n,q])=>s+menu.find(p=>p.name===n).price*q,0);const suffix=String(Date.now()).slice(-5);const summaryText=entries.map(([n,q])=>q+"× "+n).join(", ");if(tableOrderContext!==null){const index=tableOrderContext;const row=boards.tables.items[index];const existing=Number(String(row[4]).replace(/[^0-9,.-]/g,"").replace(".","").replace(",", "."))||0;boards.tables.items[index]=[row[0],"Κατειλημμένο","busy",summaryText,money(existing+total)];savedStates[index]="busy";saveTables();tableOrderContext=null;setBoardTab("tables");showToast("Τα είδη προστέθηκαν στο τραπέζι.");}else{boards.takeaway.items.unshift(["#TA-"+suffix,"Νέα","new",summaryText,money(total)]);localStorage.setItem("panathinaikon-takeaway",JSON.stringify(boards.takeaway.items));renderTakeaway();showToast("Η παραγγελία Take Away καταχωρίστηκε.");}cart={};}
try{const t=JSON.parse(localStorage.getItem("panathinaikon-takeaway")||"null");if(Array.isArray(t))boards.takeaway.items=t;}catch{}
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>setBoardTab(b.dataset.tab)));
document.querySelector("#filterButton").hidden=true;
document.querySelector("#themeToggle").addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("panathinaikon-theme",document.body.classList.contains("dark")?"dark":"light");});
if(localStorage.getItem("panathinaikon-theme")==="dark")document.body.classList.add("dark");
document.querySelector("#closeTableModal").addEventListener("click",closeTable);
tableModal.addEventListener("click",e=>{if(e.target===tableModal)closeTable();});
document.querySelector("#tableStartOrder").addEventListener("click",()=>{tableOrderContext=selectedTable;cart={};closeTable();setBoardTab("takeaway");showToast("Επίλεξε είδη για το "+boards.tables.items[selectedTable][0]+".");});
function showReceipt(){receiptModal.hidden=false;}
document.querySelector("#tableReceipt").addEventListener("click",showReceipt);
document.querySelector("#closeReceiptModal").addEventListener("click",()=>receiptModal.hidden=true);
document.querySelector("#receiptOk").addEventListener("click",()=>receiptModal.hidden=true);
document.querySelector("#tableDiscount").addEventListener("click",()=>{const raw=prompt("Ποσοστό έκπτωσης (1–100):","10");if(raw===null)return;const pct=Number(raw);if(!Number.isFinite(pct)||pct<=0||pct>100){showToast("Μη έγκυρο ποσοστό έκπτωσης.");return;}tableDiscounts[selectedTable]=pct;localStorage.setItem("panathinaikon-table-discounts",JSON.stringify(tableDiscounts));document.querySelector("#tableManagementNote").textContent="Εφαρμόστηκε έκπτωση "+pct+"% (demo).";});
document.querySelector("#tableClose").addEventListener("click",()=>{savedStates[selectedTable]="free";const row=boards.tables.items[selectedTable];boards.tables.items[selectedTable]=[row[0],"Ελεύθερο","free",row[3],"—"];saveTables();closeTable();renderTables();showToast("Το τραπέζι αποδεσμεύτηκε.");});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeTable();receiptModal.hidden=true;}});
function showToast(message){toast.textContent=message;toast.classList.add("show");window.setTimeout(()=>toast.classList.remove("show"),2600);}
document.querySelector("#today").textContent=new Intl.DateTimeFormat("el-GR",{weekday:"short",day:"numeric",month:"short",year:"numeric"}).format(new Date());
renderBoard();