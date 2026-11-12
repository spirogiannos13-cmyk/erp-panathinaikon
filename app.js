const boards = {
  tables: {title:"Κάτοψη τραπεζιών",description:"Πάτησε σε τραπέζι για να ανοίξεις τη διαχείρισή του",items:[
    ["Τραπέζι 01","Ελεύθερο","free","2 θέσεις","—"],["Τραπέζι 02","Κατειλημμένο","busy","2 άτομα · 18′","€28,50"],["Τραπέζι 03","Κατειλημμένο","busy","4 άτομα · 42′","€64,00"],["Τραπέζι 04","Κράτηση","reserved","4 άτομα · 20:30","—"],["Τραπέζι 05","Ελεύθερο","free","4 θέσεις","—"],["Τραπέζι 06","Κατειλημμένο","busy","3 άτομα · 12′","€41,00"],["Τραπέζι 07","Ελεύθερο","free","2 θέσεις","—"],["Τραπέζι 08","Κατειλημμένο","busy","5 άτομα · 56′","€82,00"],["Τραπέζι 09","Κράτηση","reserved","2 άτομα · 21:00","—"],["Τραπέζι 10","Κατειλημμένο","busy","2 άτομα · 8′","€19,50"],["Τραπέζι 11","Ελεύθερο","free","4 θέσεις","—"],["Τραπέζι 12","Κατειλημμένο","busy","3 άτομα · 31′","€47,00"]
  ]},
  takeaway:{title:"Πακέτο / Take Away",description:"Επίλεξε απευθείας είδη για να δημιουργήσεις παραγγελία",items:[]},
  delivery:{title:"Διαχείριση Delivery",description:"Παρακολούθηση προετοιμασίας, αποδείξεων και διανομέων",items:[
    ["#DL-2088","Νέα","new","Νέα παραγγελία · 19:24","€31,50"],["#DL-2087","Σε προετοιμασία","preparing","Κουζίνα · 19:18","€22,00"],["#DL-2086","Σε διανομή","dispatched","Διανομέας: Νίκος","€27,50"],["#DL-2085","Έτοιμη","ready","Αναμονή διανομέα","€19,00"],["#DL-2084","Σε προετοιμασία","preparing","Κουζίνα · 19:10","€42,00"],["#DL-2083","Παραδόθηκε","completed","Παράδοση · 19:02","€16,50"],["#DL-2082","Σε διανομή","dispatched","Διανομέας: Γιώργος","€35,00"]
  ]}
};

const apiConfig={base:localStorage.getItem("panathinaikon-api-url")||"http://localhost:5000",token:localStorage.getItem("panathinaikon-api-token")||"",connected:false,tables:[],orders:[],categories:[]};
async function apiRequest(path,options={}){const headers={"Content-Type":"application/json",...(apiConfig.token?{Authorization:"Bearer "+apiConfig.token}:{}),...(options.headers||{})};const response=await fetch(apiConfig.base.replace(/\/$/,"")+path,{...options,headers});if(response.status===401){apiConfig.token="";localStorage.removeItem("panathinaikon-api-token");throw new Error("Η σύνδεση έληξε. Συνδέσου ξανά.");}if(!response.ok){let message="Σφάλμα API ("+response.status+")";try{const body=await response.json();message=body.message||message;}catch{}throw new Error(message);}return response.status===204?null:response.json();}
function addConnectionControl(){const host=document.querySelector(".sidebar");if(!host||document.querySelector("#apiConnectButton"))return;const button=document.createElement("button");button.id="apiConnectButton";button.className="nav-item";button.type="button";button.style.cssText="width:100%;margin-top:12px;text-align:left;cursor:pointer";button.textContent=apiConfig.token?"● SQL Server":"○ Σύνδεση βάσης";host.append(button);button.addEventListener("click",()=>showApiLogin());}
function showApiLogin(){let modal=document.querySelector("#apiLoginModal");if(!modal){modal=document.createElement("div");modal.id="apiLoginModal";modal.className="modal-backdrop";modal.style.zIndex="1000";modal.innerHTML='<section class="order-modal" role="dialog" aria-modal="true"><div class="modal-heading"><div><div class="eyebrow">ΣΥΝΔΕΣΗ ΣΥΣΤΗΜΑΤΟΣ</div><h2>Σύνδεση SQL Server</h2><p>Σύνδεση με τον λογαριασμό διαχειριστή.</p></div><button class="modal-close" type="button" data-close-api>×</button></div><form id="apiLoginForm"><label style="display:block;margin:12px 0">Διεύθυνση API<input id="apiBaseInput" required value="'+apiConfig.base+'" placeholder="http://localhost:5000"></label><label style="display:block;margin:12px 0">Χρήστης<input id="apiUsername" required autocomplete="username"></label><label style="display:block;margin:12px 0">Κωδικός<input id="apiPassword" type="password" required autocomplete="current-password"></label><p id="apiLoginError" role="alert"></p><button class="primary-button" type="submit">Σύνδεση</button></form></section>';document.body.append(modal);modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest("[data-close-api]"))modal.hidden=true;});modal.querySelector("#apiLoginForm").addEventListener("submit",loginToApi);}modal.hidden=false;modal.querySelector("#apiBaseInput").value=apiConfig.base;}
async function loginToApi(event){event.preventDefault();const form=event.currentTarget,error=form.querySelector("#apiLoginError");apiConfig.base=form.querySelector("#apiBaseInput").value.trim().replace(/\/$/,"");localStorage.setItem("panathinaikon-api-url",apiConfig.base);error.textContent="Γίνεται σύνδεση…";try{const response=await fetch(apiConfig.base+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:form.querySelector("#apiUsername").value,password:form.querySelector("#apiPassword").value})});if(!response.ok)throw new Error(response.status===401?"Λανθασμένος χρήστης ή κωδικός.":"Δεν ήταν δυνατή η σύνδεση στο API.");const data=await response.json();apiConfig.token=data.accessToken;localStorage.setItem("panathinaikon-api-token",apiConfig.token);await loadSqlData();document.querySelector("#apiLoginModal").hidden=true;document.querySelector("#apiConnectButton").textContent="● "+(data.user.storeName||"SQL Server");showToast("Συνδέθηκες στη βάση δεδομένων.");}catch(e){error.textContent=e.message;}}
async function loadSqlData(){const [items,tables,orders,categories,stock,recipeRows]=await Promise.all([apiRequest("/api/items"),apiRequest("/api/tables"),apiRequest("/api/orders"),apiRequest("/api/categories"),apiRequest("/api/inventory"),apiRequest("/api/recipes")]);apiConfig.categories=categories;menu=items.map(x=>({id:x.id,categoryId:x.categoryId,name:x.name,category:x.categoryName||apiConfig.categories.find(c=>c.id===x.categoryId)?.name||"Γενικά",price:Number(x.price)}));apiConfig.tables=tables;apiConfig.orders=orders;stockItems=stock.map(x=>({id:x.id,code:x.code,name:x.name,category:x.category,unit:x.unit,quantity:Number(x.quantity),min:Number(x.minimumQuantity),unitCost:Number(x.unitCost)}));recipes=recipeRows.map(r=>({id:r.id,saleItemId:r.saleItemId,itemName:r.itemName,salePrice:Number(r.salePriceSnapshot),ingredients:r.ingredients.map(i=>({stockItemId:i.stockItemId,stockName:i.stockName,unit:i.unit,unitCost:Number(i.unitCost),quantity:Number(i.quantity)}))}));apiConfig.connected=true;boards.tables.items=tables.map((t,i)=>[t.name,t.status==="Occupied"?"Κατειλημμένο":t.status==="Reserved"?"Κράτηση":"Ελεύθερο",t.status==="Occupied"?"busy":t.status==="Reserved"?"reserved":"free","", "—"]);boards.delivery.items=orders.filter(o=>o.channel==="Delivery").map(o=>{const state=({New:"new",Preparing:"preparing",Ready:"ready",Dispatched:"dispatched",Delivered:"completed"})[o.status]||"new";return Object.assign([o.orderNumber,o.status,state,o.orderNumber,money(Number(o.total))],{id:o.id,customer:o.customerName||"",phone:o.phone||"",address:o.address||"",receipt:false});});if(activeBoard==="tables")renderTables();else if(activeBoard==="delivery")renderDelivery();else if(activeBoard==="takeaway")renderTakeaway();if(activeBoard==="inventory")renderInventory();if(activeBoard==="recipes")renderRecipes();renderItems();}

const defaultMenu=[{name:"Freddo Espresso",category:"Καφέδες",price:2.80},{name:"Cappuccino",category:"Καφέδες",price:3.20},{name:"Club Sandwich",category:"Φαγητό",price:8.50},{name:"Burger",category:"Φαγητό",price:10.90},{name:"Caesar Salad",category:"Σαλάτες",price:9.20},{name:"Πατάτες",category:"Sides",price:4.00},{name:"Coca Cola",category:"Αναψυκτικά",price:2.50},{name:"Νερό",category:"Αναψυκτικά",price:0.50}];
let menu=defaultMenu.map(item=>({...item}));
try{const saved=JSON.parse(localStorage.getItem("panathinaikon-menu")||"null");if(Array.isArray(saved))menu=saved;}catch{}
const deliveryStages=[{key:"new",label:"Νέα",next:"preparing",action:"Έναρξη προετοιμασίας"},{key:"preparing",label:"Σε προετοιμασία",next:"ready",action:"Σήμανση ως έτοιμη"},{key:"ready",label:"Έτοιμη",next:"dispatched",action:"Έκδοση απόδειξης & αναχώρηση"},{key:"dispatched",label:"Σε διανομή",next:"completed",action:"Καταχώριση παράδοσης"},{key:"completed",label:"Παραδόθηκε",next:null,action:"Ολοκληρώθηκε"}];
let savedStates={};try{savedStates=JSON.parse(localStorage.getItem("panathinaikon-table-states")||"{}");}catch{}
let activeBoard="tables",showAll=true,selectedTable=0,cart={},selectedCategory="Όλα",productSearch="",orderCustomer="",orderPhone="",orderAddress="",orderNote="",orderMode="takeaway",discountPercent=0,itemsSearch="",stockSearch="",recipeSearch="",tableDiscounts={},tableOrderContext=null;
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
 grid.innerHTML=`<button class="table-service-tile" data-service-mode="takeaway"><span class="table-symbol">◈</span><strong>ΑΥΤΟ</strong><small>Take Away</small></button><button class="table-service-tile" data-service-mode="private"><span class="table-symbol">◇</span><strong>ΙΔΙΩΤΙΚΟ</strong><small>Χώρος / αίθουσα</small></button>`+tables.map(t=>`<button class="table-tile ${t.state}" data-table-index="${t.index}" aria-label="${t[0]}, ${t[1]}"><span class="table-symbol">▤</span><strong>${String(t.index+1).padStart(2,"0")}</strong><small>${t.state==="busy"?"Κατειλημμένο":t.state==="reserved"?"Κράτηση":"Ελεύθερο"}</small><span class="table-account">${t[4]}</span></button>`).join("");
}
function renderTakeaway(){
 summary.hidden=true;help.hidden=true;grid.className="takeaway-layout";
 const categories=["Όλα",...new Set(menu.map(x=>x.category))];
 const products=menu.filter(p=>(selectedCategory==="Όλα"||p.category===selectedCategory)&&p.name.toLocaleLowerCase("el").includes(productSearch.toLocaleLowerCase("el")));
 const cartEntries=Object.entries(cart).filter(([,qty])=>qty>0);
 const total=cartEntries.reduce((sum,[name,qty])=>sum+menu.find(p=>p.name===name).price*qty,0);
 grid.innerHTML=`<aside class="cart-panel cashier-ticket"><div class="cart-heading"><h3>Παραγγελία</h3><span>${cartEntries.reduce((s,[,q])=>s+q,0)} τεμ.</span></div><div class="cashier-ticket-head"><span>ΠΟΣ.</span><span>ΠΕΡΙΓΡΑΦΗ</span><span>ΤΙΜΗ</span><span>ΑΞΙΑ</span></div><div class="cart-items">${cartEntries.length?cartEntries.map(([name,qty])=>{const p=menu.find(x=>x.name===name);return `<div class="cart-row"><div><strong>${qty.toFixed(2)} × ${name}</strong><small>${money(p.price)} / τεμ.</small></div><div class="quantity-control"><button data-qty="-1" data-name="${name}">−</button><b>${qty}</b><button data-qty="1" data-name="${name}">＋</button></div><strong>${money(p.price*qty)}</strong></div>`}).join(""):'<p class="empty-cart">Η παραγγελία είναι κενή. Επίλεξε είδη από δεξιά.</p>'}</div><div class="cashier-order-meta"><label>Πελάτης<input id="orderCustomerInput" type="text" value="${orderCustomer}" placeholder="Πελάτης καταστήματος"></label>${orderMode==="delivery"?`<label>Τηλέφωνο<input id="orderPhoneInput" type="tel" value="${orderPhone}" placeholder="Τηλέφωνο πελάτη"></label><label>Διεύθυνση παράδοσης<input id="orderAddressInput" type="text" value="${orderAddress}" placeholder="Οδός, αριθμός, περιοχή"></label>`:""}<label>Σημειώσεις<textarea id="orderNoteInput" rows="2" placeholder="Παρατηρήσεις">${orderNote}</textarea></label></div><label class="cashier-discount">Έκπτωση (%)<input id="orderDiscountInput" type="number" min="0" max="100" step="0.5" value="${discountPercent}"></label><div class="cart-total"><span>ΑΡΧΙΚΟ ΣΥΝΟΛΟ</span><strong>${money(total)}</strong></div><div class="cart-total"><span>ΕΚΠΤΩΣΗ</span><strong>−${money(total*discountPercent/100)}</strong></div><div class="cart-total"><span>ΠΛΗΡΩΤΕΟ</span><strong>${money(total*(1-discountPercent/100))}</strong></div><button class="primary-button checkout-button" id="submitTakeaway" ${cartEntries.length?"":"disabled"}>Καταχώριση παραγγελίας</button></aside><section class="catalog-panel cashier-catalog"><div class="catalog-heading"><div><h3>${orderMode==="delivery"?"Νέα παραγγελία Delivery":"Ταμείο · Κατάλογος ειδών"}</h3><p>${orderMode==="delivery"?"Καταχώριση στοιχείων παράδοσης":tableOrderContext!==null?"Τραπέζι "+String(tableOrderContext+1).padStart(2,"0"):"Νέα παραγγελία"}</p></div><span class="catalog-count">${menu.length} είδη</span></div><div class="cashier-categories">${categories.map(c=>`<button class="category-tab ${c===selectedCategory?"active":""}" data-category="${c}">${c}</button>`).join("")}</div><input class="product-search" id="productSearch" type="search" value="${productSearch}" placeholder="Αναζήτηση είδους..." aria-label="Αναζήτηση είδους"><div class="product-grid cashier-product-grid">${products.length?products.map(p=>`<button type="button" class="product-tile product-button" data-add-product="${p.name}" aria-label="Προσθήκη ${p.name}"><div class="product-info"><strong>${p.name}</strong><small>${p.category}</small><b>${money(p.price)}</b></div><span class="add-product" aria-hidden="true">＋</span></button>`).join(""):'<p class="product-empty">Δεν βρέθηκαν είδη.</p>'}</div></section>`;
}
function renderDelivery(){
 summary.hidden=true;help.hidden=true;grid.className="delivery-board";
 const stages=deliveryStages;
 const renderRows=(orders)=>orders.map(({o,i})=>{const stage=stages.find(s=>s.key===o[2])||stages[0],receipt=o.receipt?"Εκδόθηκε":"Εκκρεμεί";return `<article class="delivery-row"><strong>${o[0]}</strong><span class="delivery-row-customer">${o.customer||o[3]}</span><span>${o.phone||"—"}</span><span>${o.address||"—"}</span><span class="delivery-status ${o[2]}">${stage.label}</span><b>${o[4]}</b><span class="${o.receipt?"receipt-done":"receipt-pending"}">${receipt}</span><div class="delivery-card-actions">${o[2]==="ready"&&!o.receipt?`<button class="secondary-button" data-receipt="${i}">Απόδειξη</button>`:""}${stage.next?`<button class="primary-button" data-delivery-next="${i}" ${o[2]==="ready"&&!o.receipt?"disabled":""}>${stage.action}</button>`:'<span class="completed-label">✓ Παραδόθηκε</span>'}</div></article>`;}).join("");const indexed=boards.delivery.items.map((o,i)=>({o,i}));const open=indexed.filter(({o})=>["new","preparing","ready"].includes(o[2]));const moving=indexed.filter(({o})=>["dispatched","completed"].includes(o[2]));grid.innerHTML=`<div class="delivery-toolbar"><button class="primary-button" type="button" data-new-delivery>＋ Νέα παραγγελία Delivery</button></div><div class="delivery-summary">${stages.map(s=>`<div class="delivery-stage-count"><span>${s.label}</span><b>${boards.delivery.items.filter(o=>o[2]===s.key).length}</b></div>`).join("")}</div><section class="delivery-list-section"><h3>Νέες παραγγελίες &amp; προετοιμασία</h3><div class="delivery-list-head"><span>Αριθμός</span><span>Πελάτης / Παραγγελία</span><span>Τηλέφωνο</span><span>Διεύθυνση</span><span>Κατάσταση</span><span>Αξία</span><span>Απόδειξη</span><span>Ενέργεια</span></div>${renderRows(open)||'<p class="delivery-empty">Δεν υπάρχουν ενεργές παραγγελίες.</p>'}</section><section class="delivery-list-section"><h3>Διανομή &amp; ολοκληρωμένες</h3><div class="delivery-list-head"><span>Αριθμός</span><span>Πελάτης / Παραγγελία</span><span>Τηλέφωνο</span><span>Διεύθυνση</span><span>Κατάσταση</span><span>Αξία</span><span>Απόδειξη</span><span>Ενέργεια</span></div>${renderRows(moving)||'<p class="delivery-empty">Δεν υπάρχουν παραγγελίες σε διανομή.</p>'}</section>`;
}
function saveMenu(){localStorage.setItem("panathinaikon-menu",JSON.stringify(menu));}
function renderItems(){
 const query=itemsSearch.trim().toLocaleLowerCase("el");
 const filtered=menu.map((item,index)=>({...item,index})).filter(item=>(item.name+" "+item.category).toLocaleLowerCase("el").includes(query));
 document.querySelector("#itemsCount").textContent=menu.length+" είδη";
 document.querySelector("#itemsTableBody").innerHTML=filtered.map(item=>`<tr><td><strong>${item.name}</strong></td><td>${item.category}</td><td>${money(item.price)}</td><td><button class="item-edit-button" data-edit-item="${item.index}">Επεξεργασία</button><button class="item-delete-button" data-delete-item="${item.index}">Διαγραφή</button></td></tr>`).join("")||'<tr><td colspan="4" class="items-empty">Δεν βρέθηκαν είδη.</td></tr>';
}
async function addOrEditItem(index=null){
 const current=index===null?{name:"",category:"Καφέδες",price:""}:menu[index];
 const name=prompt("Ονομασία είδους:",current.name);if(name===null)return;
 const cleanName=name.trim();if(!cleanName){showToast("Συμπλήρωσε ονομασία είδους.");return;}
 const category=prompt("Κατηγορία:",current.category);if(category===null)return;
 const cleanCategory=category.trim();if(!cleanCategory){showToast("Συμπλήρωσε κατηγορία.");return;}
 const raw=prompt("Τιμή (€):",String(current.price).replace(".",","));if(raw===null)return;
 const price=Number(raw.replace(",", "."));if(!Number.isFinite(price)||price<0){showToast("Μη έγκυρη τιμή.");return;}
 const duplicate=menu.some((item,i)=>i!==index&&item.name.toLocaleLowerCase("el")===cleanName.toLocaleLowerCase("el"));
 if(duplicate){showToast("Υπάρχει ήδη είδος με αυτή την ονομασία.");return;}
 if(apiConfig.connected){try{let category=apiConfig.categories.find(x=>x.name.toLocaleLowerCase("el")===cleanCategory.toLocaleLowerCase("el"));if(!category)category=await apiRequest("/api/categories",{method:"POST",body:JSON.stringify({name:cleanCategory})});const payload={name:cleanName,price,code:current.code||null,categoryId:category.id};if(index===null)await apiRequest("/api/items",{method:"POST",body:JSON.stringify(payload)});else await apiRequest("/api/items/"+menu[index].id,{method:"PUT",body:JSON.stringify(payload)});await loadSqlData();showToast(index===null?"Το είδος αποθηκεύτηκε στη βάση.":"Το είδος ενημερώθηκε στη βάση.");}catch(e){showToast(e.message);}return;}if(index===null)menu.push({name:cleanName,category:cleanCategory,price});else menu[index]={name:cleanName,category:cleanCategory,price};
 saveMenu();renderItems();if(activeBoard==="takeaway")renderTakeaway();showToast(index===null?"Το είδος προστέθηκε.":"Το είδος ενημερώθηκε.");
}
document.querySelector("#addItemButton").addEventListener("click",()=>addOrEditItem());
document.querySelector("#itemsSearch").addEventListener("input",event=>{itemsSearch=event.target.value;renderItems();const input=document.querySelector("#itemsSearch");input.focus();input.setSelectionRange(itemsSearch.length,itemsSearch.length);});
document.querySelector("#itemsTableBody").addEventListener("click",event=>{const edit=event.target.closest("[data-edit-item]");if(edit){addOrEditItem(Number(edit.dataset.editItem));return;}const del=event.target.closest("[data-delete-item]");if(del){const index=Number(del.dataset.deleteItem);if(!confirm("Να διαγραφεί το είδος "+menu[index].name+";"))return;if(apiConfig.connected){void apiRequest("/api/items/"+menu[index].id,{method:"DELETE"}).then(loadSqlData).then(()=>showToast("Το είδος διαγράφηκε από τη βάση.")).catch(e=>showToast(e.message));return;}menu.splice(index,1);saveMenu();renderItems();showToast("Το είδος διαγράφηκε.");}});

const defaultStock=[
 {name:"Καφές Espresso",category:"Καφέδες",unit:"kg",quantity:8,min:3},
 {name:"Γάλα πλήρες",category:"Γαλακτοκομικά",unit:"lt",quantity:14,min:5},
 {name:"Κόκκοι κακάο",category:"Ροφήματα",unit:"kg",quantity:2,min:2},
 {name:"Ψωμί burger",category:"Αρτοποιία",unit:"τεμ.",quantity:36,min:12},
 {name:"Πατάτες",category:"Τρόφιμα",unit:"kg",quantity:18,min:5},
 {name:"Coca Cola",category:"Αναψυκτικά",unit:"τεμ.",quantity:48,min:12}
];
let stockItems=defaultStock.map(x=>({...x}));
try{const saved=JSON.parse(localStorage.getItem("panathinaikon-stock")||"null");if(Array.isArray(saved))stockItems=saved;}catch{}
function saveStock(){localStorage.setItem("panathinaikon-stock",JSON.stringify(stockItems));}
function renderInventory(){
 const query=stockSearch.trim().toLocaleLowerCase("el");
 const filtered=stockItems.map((item,index)=>({...item,index})).filter(item=>(item.name+" "+item.category).toLocaleLowerCase("el").includes(query));
 const low=stockItems.filter(x=>x.quantity<=x.min).length;
 document.querySelector("#inventoryKpis").innerHTML=`<div class="inventory-kpi"><span>ΥΛΙΚΑ</span><b>${stockItems.length}</b></div><div class="inventory-kpi"><span>ΧΑΜΗΛΟ ΑΠΟΘΕΜΑ</span><b>${low}</b></div><div class="inventory-kpi"><span>ΣΥΝΟΛΙΚΕΣ ΜΟΝΑΔΕΣ</span><b>${stockItems.reduce((s,x)=>s+x.quantity,0).toLocaleString("el-GR")}</b></div>`;
 document.querySelector("#stockCount").textContent=stockItems.length+" υλικά";
 document.querySelector("#stockTableBody").innerHTML=filtered.map(item=>`<tr><td><strong>${item.name}</strong></td><td>${item.category}</td><td><b>${item.quantity} ${item.unit}</b></td><td>${item.min} ${item.unit}</td><td><span class="stock-state ${item.quantity<=item.min?"low":"ok"}">${item.quantity<=item.min?"Χαμηλό":"Επαρκές"}</span></td><td><button class="item-edit-button" data-stock-move="${item.index}">＋ / − Κίνηση</button><button class="item-delete-button" data-stock-edit="${item.index}">Επεξεργασία</button></td></tr>`).join("")||'<tr><td colspan="6" class="items-empty">Δεν βρέθηκαν υλικά.</td></tr>';
}
async function createStockItem(){
 const name=prompt("Ονομασία υλικού:");if(name===null)return;
 const clean=name.trim();if(!clean)return;
 const category=prompt("Κατηγορία υλικού:","Τρόφιμα");if(category===null)return;
 const unit=prompt("Μονάδα μέτρησης (kg, lt, τεμ.):","kg");if(unit===null)return;
 const quantity=Number(prompt("Αρχική ποσότητα:","0"));if(!Number.isFinite(quantity)||quantity<0){showToast("Μη έγκυρη ποσότητα.");return;}
 const min=Number(prompt("Όριο ασφαλείας:","0"));if(!Number.isFinite(min)||min<0){showToast("Μη έγκυρο όριο.");return;}
 if(apiConfig.connected){try{await apiRequest("/api/inventory",{method:"POST",body:JSON.stringify({name:clean,category:category.trim(),unit:unit.trim()||"τεμ.",quantity,minimumQuantity:min,unitCost:0})});await loadSqlData();showToast("Το υλικό αποθηκεύτηκε στη SQL Server.");}catch(e){showToast(e.message);}return;}stockItems.push({name:clean,category:category.trim(),unit:unit.trim()||"τεμ.",quantity,min});saveStock();renderInventory();showToast("Το υλικό προστέθηκε.");
}
async function editStockItem(index){
 const item=stockItems[index];if(!item)return;
 const name=prompt("Ονομασία υλικού:",item.name);if(name===null)return;
 const category=prompt("Κατηγορία:",item.category);if(category===null)return;
 const unit=prompt("Μονάδα μέτρησης:",item.unit);if(unit===null)return;
 const min=Number(prompt("Όριο ασφαλείας:",String(item.min)));if(!Number.isFinite(min)||min<0){showToast("Μη έγκυρο όριο.");return;}
 const updated={...item,name:name.trim()||item.name,category:category.trim()||item.category,unit:unit.trim()||item.unit,min};if(apiConfig.connected){try{await apiRequest("/api/inventory/"+item.id,{method:"PUT",body:JSON.stringify({name:updated.name,category:updated.category,unit:updated.unit,minimumQuantity:min,unitCost:item.unitCost||0})});await loadSqlData();showToast("Το υλικό ενημερώθηκε στη βάση.");}catch(e){showToast(e.message);}return;}stockItems[index]=updated;saveStock();renderInventory();showToast("Τα στοιχεία ενημερώθηκαν.");
}
async function moveStock(index){
 const item=stockItems[index];if(!item)return;
 const raw=prompt("Ποσότητα κίνησης για "+item.name+" (θετικό για εισαγωγή, αρνητικό για ανάλωση):","1");if(raw===null)return;
 const delta=Number(raw.replace(",", "."));if(!Number.isFinite(delta)||delta===0){showToast("Μη έγκυρη ποσότητα κίνησης.");return;}
 if(item.quantity+delta<0){showToast("Δεν υπάρχει επαρκές απόθεμα.");return;}
 if(apiConfig.connected){try{await apiRequest("/api/inventory/"+item.id+"/movements",{method:"POST",body:JSON.stringify({quantityDelta:delta,movementType:delta>0?"Receipt":"Consumption",reference:"Χειροκίνητη κίνηση"})});await loadSqlData();showToast(delta>0?"Καταχωρίστηκε εισαγωγή στη βάση.":"Καταχωρίστηκε ανάλωση στη βάση.");}catch(e){showToast(e.message);}return;}item.quantity=Number((item.quantity+delta).toFixed(3));saveStock();renderInventory();showToast(delta>0?"Καταχωρίστηκε εισαγωγή αποθέματος.":"Καταχωρίστηκε ανάλωση αποθέματος.");
}
document.querySelector("#addStockItem").addEventListener("click",createStockItem);
document.querySelector("#stockSearch").addEventListener("input",event=>{stockSearch=event.target.value;renderInventory();});
document.querySelector("#stockTableBody").addEventListener("click",event=>{const move=event.target.closest("[data-stock-move]");if(move){moveStock(Number(move.dataset.stockMove));return;}const edit=event.target.closest("[data-stock-edit]");if(edit)editStockItem(Number(edit.dataset.stockEdit));});

let recipes=[];
try{const savedRecipes=JSON.parse(localStorage.getItem("panathinaikon-recipes")||"[]");if(Array.isArray(savedRecipes))recipes=savedRecipes;}catch{}
function saveRecipes(){localStorage.setItem("panathinaikon-recipes",JSON.stringify(recipes));}
function recipeCost(recipe){return recipe.ingredients.reduce((sum,line)=>{const stock=stockItems.find(item=>item.name===line.stockName);return sum+(stock?stock.quantity*0+line.quantity*(stock.unit===line.unit?1:0)*line.unitCost:line.quantity*line.unitCost);},0);}
function renderRecipes(){
 const query=recipeSearch.trim().toLocaleLowerCase("el");
 const rows=recipes.map((recipe,index)=>({...recipe,index})).filter(recipe=>recipe.itemName.toLocaleLowerCase("el").includes(query));
 const totalCost=recipes.reduce((sum,recipe)=>sum+recipeCost(recipe),0);
 document.querySelector("#recipeKpis").innerHTML=`<div class="recipe-kpi"><span>ΣΥΝΤΑΓΕΣ</span><b>${recipes.length}</b></div><div class="recipe-kpi"><span>ΣΥΝΟΛΙΚΟ ΚΟΣΤΟΣ ΜΕΡΙΔΑΣ</span><b>${money(totalCost)}</b></div><div class="recipe-kpi"><span>ΥΛΙΚΑ ΑΠΟΘΗΚΗΣ</span><b>${stockItems.length}</b></div>`;
 document.querySelector("#recipeCount").textContent=recipes.length+" συνταγές";
 document.querySelector("#recipeTableBody").innerHTML=rows.map(recipe=>{const cost=recipeCost(recipe),price=Number(recipe.salePrice)||0,margin=price-cost,percent=price>0?margin/price*100:0;return `<tr><td><strong>${recipe.itemName}</strong></td><td>${recipe.ingredients.length} υλικά</td><td>${money(cost)}</td><td>${money(price)}</td><td><span class="recipe-margin ${margin>=0?"positive":"negative"}">${money(margin)} · ${percent.toFixed(1)}%</span></td><td><button class="item-edit-button" data-recipe-edit="${recipe.index}">Επεξεργασία</button><button class="item-delete-button" data-recipe-delete="${recipe.index}">Διαγραφή</button></td></tr>`;}).join("")||'<tr><td colspan="6" class="items-empty">Δεν υπάρχουν συνταγές. Δημιούργησε την πρώτη.</td></tr>';
}
async function createRecipe(index=null){
 if(!stockItems.length){showToast("Πρόσθεσε πρώτα υλικά στην Αποθήκη.");return;}
 const existing=index===null?null:recipes[index];
 const itemName=prompt("Είδος πώλησης (όπως εμφανίζεται στα Είδη & Τιμές):",existing?.itemName||menu[0]?.name||"");if(itemName===null)return;
 const menuItem=menu.find(item=>item.name.toLocaleLowerCase("el")===itemName.trim().toLocaleLowerCase("el"));
 if(!menuItem){showToast("Το είδος πρέπει να υπάρχει πρώτα στα Είδη & Τιμές.");return;}
 const saleRaw=prompt("Τιμή πώλησης (€):",String(existing?.salePrice??menuItem.price).replace(".",","));if(saleRaw===null)return;
 const salePrice=Number(saleRaw.replace(",", "."));if(!Number.isFinite(salePrice)||salePrice<0){showToast("Μη έγκυρη τιμή πώλησης.");return;}
 const count=Number(prompt("Πόσα διαφορετικά υλικά έχει η συνταγή;",String(existing?.ingredients.length||1)));if(!Number.isInteger(count)||count<1||count>30){showToast("Μη έγκυρος αριθμός υλικών.");return;}
 const ingredients=[];
 for(let i=0;i<count;i++){
  const old=existing?.ingredients[i];
  const names=stockItems.map((item,n)=>n+": "+item.name+" ("+item.unit+")").join("\n");
  const chosen=prompt("Υλικό "+(i+1)+" — γράψε τον αριθμό του υλικού:\n"+names,String(old?stockItems.findIndex(x=>x.name===old.stockName):0));if(chosen===null)return;
  const stock=stockItems[Number(chosen)];if(!stock){showToast("Μη έγκυρο υλικό.");return;}
  const qtyRaw=prompt("Ποσότητα "+stock.unit+" για μία μερίδα:",String(old?.quantity??1));if(qtyRaw===null)return;
  const quantity=Number(qtyRaw.replace(",", "."));if(!Number.isFinite(quantity)||quantity<=0){showToast("Μη έγκυρη ποσότητα.");return;}
  const unitCost=stock.unitCost??0;
  const costRaw=prompt("Κόστος ανά "+stock.unit+" (€):",String(unitCost).replace(".",","));if(costRaw===null)return;
  const cost=Number(costRaw.replace(",", "."));if(!Number.isFinite(cost)||cost<0){showToast("Μη έγκυρο κόστος υλικού.");return;}
  stock.unitCost=cost;
  ingredients.push({stockName:stock.name,quantity,unit:stock.unit,unitCost:cost});
 }
 const recipe={itemName:itemName.trim(),salePrice,ingredients};
 if(apiConfig.connected){try{await apiRequest("/api/recipes",{method:"POST",body:JSON.stringify({saleItemId:menuItem.id,salePriceSnapshot:salePrice,ingredients:ingredients.map(line=>({stockItemId:stockItems.find(x=>x.name===line.stockName).id,quantity:line.quantity,unitCost:line.unitCost}))})});await loadSqlData();showToast("Η συνταγή αποθηκεύτηκε στη SQL Server.");}catch(e){showToast(e.message);}return;}
 if(index===null)recipes.push(recipe);else recipes[index]=recipe;
 saveStock();saveRecipes();renderRecipes();showToast("Η συνταγή αποθηκεύτηκε.");
}
document.querySelector("#addRecipeButton").addEventListener("click",()=>createRecipe());
document.querySelector("#recipeSearch").addEventListener("input",event=>{recipeSearch=event.target.value;renderRecipes();});
document.querySelector("#recipeTableBody").addEventListener("click",event=>{const edit=event.target.closest("[data-recipe-edit]");if(edit){createRecipe(Number(edit.dataset.recipeEdit));return;}const del=event.target.closest("[data-recipe-delete]");if(del){const i=Number(del.dataset.recipeDelete);if(confirm("Να διαγραφεί η συνταγή για "+recipes[i].itemName+";")){if(apiConfig.connected){void apiRequest("/api/recipes/"+recipes[i].id,{method:"DELETE"}).then(loadSqlData).then(()=>showToast("Η συνταγή διαγράφηκε από τη βάση.")).catch(e=>showToast(e.message));return;}recipes.splice(i,1);saveRecipes();renderRecipes();}}});

function renderBoard(){
 const dashboard=activeBoard==="dashboard",itemsView=activeBoard==="items",inventoryView=activeBoard==="inventory",recipesView=activeBoard==="recipes";
 document.querySelector("#recipesManagement").hidden=!recipesView;
 document.querySelector("#inventoryManagement").hidden=!inventoryView;
 document.querySelector("#itemsManagement").hidden=!itemsView;
 document.querySelector("#dashboardView").hidden=!dashboard;
 document.querySelector("#ordersHeading").hidden=dashboard||itemsView||inventoryView||recipesView;
 document.querySelector("#boardToolbar").hidden=dashboard||itemsView||inventoryView||recipesView;
 document.querySelector(".section-heading").hidden=dashboard||itemsView||inventoryView||recipesView;
 grid.hidden=dashboard||itemsView||inventoryView||recipesView;summary.hidden=dashboard||itemsView||inventoryView||recipesView;help.hidden=dashboard||itemsView||inventoryView||recipesView;
 if(dashboard||itemsView||inventoryView||recipesView){if(itemsView)renderItems();if(inventoryView)renderInventory();if(recipesView)renderRecipes();return;}
 const board=boards[activeBoard];title.textContent=board.title;description.textContent=board.description;
 if(activeBoard==="tables"){renderTables();return;}
 if(activeBoard==="takeaway"){renderTakeaway();return;}
 renderDelivery();
}
function openTable(index){selectedTable=index;const row=boards.tables.items[index];document.querySelector("#tableModalTitle").textContent=row[0];document.querySelector("#tableModalSubtitle").textContent=row[1]+" · "+row[4];document.querySelector("#tableManagementNote").textContent=row[2]==="busy"?"Διαχείριση ενεργού λογαριασμού. Οι ενέργειες απόδειξης/έκπτωσης είναι demo.":"Ελεύθερο τραπέζι. Μπορείς να ξεκινήσεις νέα παραγγελία.";tableModal.hidden=false;}
function closeTable(){tableModal.hidden=true;}
grid.addEventListener("input",event=>{if(event.target.id==="productSearch"){productSearch=event.target.value;const position=productSearch.length;renderTakeaway();const input=document.querySelector("#productSearch");input.focus();input.setSelectionRange(position,position);}if(event.target.id==="orderCustomerInput")orderCustomer=event.target.value;if(event.target.id==="orderPhoneInput")orderPhone=event.target.value;if(event.target.id==="orderAddressInput")orderAddress=event.target.value;if(event.target.id==="orderNoteInput")orderNote=event.target.value;if(event.target.id==="orderDiscountInput"){discountPercent=Math.min(100,Math.max(0,Number(event.target.value)||0));}});
grid.addEventListener("click",event=>{
 const newDelivery=event.target.closest("[data-new-delivery]");if(newDelivery){cart={};orderCustomer="";orderPhone="";orderAddress="";orderNote="";orderMode="delivery";tableOrderContext=null;setBoardTab("takeaway");return;}
 const service=event.target.closest("[data-service-mode]");if(service){if(service.dataset.serviceMode==="takeaway"){tableOrderContext=null;cart={};setBoardTab("takeaway");}else showToast("Η διαχείριση ιδιωτικού χώρου θα προστεθεί σε επόμενο βήμα.");return;}const tile=event.target.closest("[data-table-index]");if(tile){openTable(Number(tile.dataset.tableIndex));return;}
 const add=event.target.closest("[data-add-product]");if(add){const n=add.dataset.addProduct;cart[n]=(cart[n]||0)+1;renderTakeaway();return;}
 const qty=event.target.closest("[data-qty]");if(qty){const n=qty.dataset.name;cart[n]=Math.max(0,(cart[n]||0)+Number(qty.dataset.qty));renderTakeaway();return;}
 const category=event.target.closest("[data-category]");if(category){selectedCategory=category.dataset.category;renderTakeaway();return;}
 const next=event.target.closest("[data-delivery-next]");if(next){const i=Number(next.dataset.deliveryNext),order=boards.delivery.items[i],stage=deliveryStages.find(s=>s.key===order[2]);if(stage?.next){if(apiConfig.connected&&order.id){const status=({preparing:"Preparing",ready:"Ready",dispatched:"Dispatched",completed:"Delivered"})[stage.next];void apiRequest("/api/orders/"+order.id+"/status",{method:"PATCH",body:JSON.stringify({status})}).then(loadSqlData).then(renderDelivery).catch(e=>showToast(e.message));}else{order[2]=stage.next;order[1]=deliveryStages.find(s=>s.key===stage.next).label;persistDelivery();renderDelivery();}}return;}
 const receipt=event.target.closest("[data-receipt]");if(receipt){const i=Number(receipt.dataset.receipt);boards.delivery.items[i].receipt=true;persistDelivery();renderDelivery();showToast("Η απόδειξη σημειώθηκε ως εκδοθείσα (demo).");return;}
 if(event.target.closest("#submitTakeaway")){submitTakeaway();}
});
async function submitSqlOrder(channel,tableId){try{const lines=Object.entries(cart).filter(([,q])=>q>0).map(([name,quantity])=>({saleItemId:menu.find(x=>x.name===name).id,quantity}));if(lines.some(x=>!x.saleItemId))throw new Error("Κάποιο είδος δεν έχει καταχωριστεί στη βάση.");await apiRequest("/api/orders",{method:"POST",body:JSON.stringify({channel,tableId,customerName:orderCustomer||null,phone:orderPhone||null,address:orderAddress||null,notes:orderNote||null,discountAmount:Math.round((Object.entries(cart).reduce((sum,[name,qty])=>sum+menu.find(x=>x.name===name).price*qty,0)*discountPercent/100)*100)/100,lines})});cart={};orderCustomer="";orderPhone="";orderAddress="";orderNote="";discountPercent=0;orderMode="takeaway";tableOrderContext=null;await loadSqlData();setBoardTab(channel==="Delivery"?"delivery":channel==="Table"?"tables":"takeaway");showToast("Η παραγγελία αποθηκεύτηκε στη SQL Server.");}catch(e){showToast(e.message);}}
function persistDelivery(){localStorage.setItem("panathinaikon-delivery",JSON.stringify(boards.delivery.items));}
try{const d=JSON.parse(localStorage.getItem("panathinaikon-delivery")||"null");if(Array.isArray(d))boards.delivery.items=d;}catch{}
function submitTakeaway(){const entries=Object.entries(cart).filter(([,q])=>q>0);if(!entries.length)return;const subtotal=entries.reduce((s,[n,q])=>s+menu.find(p=>p.name===n).price*q,0);const total=subtotal*(1-discountPercent/100);const suffix=String(Date.now()).slice(-5);const summaryText=(orderCustomer?orderCustomer+" · ":"")+entries.map(([n,q])=>q+"× "+n).join(", ")+(orderNote?" · "+orderNote:"");if(orderMode==="delivery"){if(apiConfig.connected){void submitSqlOrder("Delivery",null);return;}const order={0:"#DL-"+suffix,1:"Νέα",2:"new",3:summaryText,4:money(total),customer:orderCustomer,phone:orderPhone,address:orderAddress,receipt:false};boards.delivery.items.unshift(order);persistDelivery();cart={};orderCustomer="";orderPhone="";orderAddress="";orderNote="";discountPercent=0;orderMode="takeaway";setBoardTab("delivery");showToast("Η παραγγελία Delivery καταχωρίστηκε (demo).");return;}if(apiConfig.connected){void submitSqlOrder(tableOrderContext!==null?"Table":"TakeAway",tableOrderContext!==null?apiConfig.tables[tableOrderContext]?.id:null);return;}if(tableOrderContext!==null){const index=tableOrderContext;const row=boards.tables.items[index];const existing=Number(String(row[4]).replace(/[^0-9,.-]/g,"").replace(".","").replace(",", "."))||0;boards.tables.items[index]=[row[0],"Κατειλημμένο","busy",summaryText,money(existing+total)];savedStates[index]="busy";saveTables();tableOrderContext=null;setBoardTab("tables");showToast("Τα είδη προστέθηκαν στο τραπέζι.");}else{boards.takeaway.items.unshift(["#TA-"+suffix,"Νέα","new",(orderCustomer?orderCustomer+" · ":"")+summaryText,money(total)]);localStorage.setItem("panathinaikon-takeaway",JSON.stringify(boards.takeaway.items));renderTakeaway();showToast("Η παραγγελία Take Away καταχωρίστηκε.");}cart={};}
try{const t=JSON.parse(localStorage.getItem("panathinaikon-takeaway")||"null");if(Array.isArray(t))boards.takeaway.items=t;}catch{}
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-view]").forEach(item=>item.classList.remove("active"));setBoardTab(b.dataset.tab);}));
document.querySelectorAll("[data-view]").forEach(link=>link.addEventListener("click",event=>{event.preventDefault();activeBoard=link.dataset.view;document.querySelectorAll("[data-view]").forEach(item=>item.classList.toggle("active",item===link));document.querySelectorAll("[data-tab]").forEach(tab=>{tab.classList.remove("active");tab.setAttribute("aria-selected","false");});renderBoard();}));
document.querySelector("#filterButton").hidden=true;addConnectionControl();if(apiConfig.token){apiRequest("/api/items").then(()=>loadSqlData()).then(()=>{const b=document.querySelector("#apiConnectButton");if(b)b.textContent="● SQL Server";}).catch(()=>{apiConfig.token="";localStorage.removeItem("panathinaikon-api-token");showToast("Η σύνδεση με τη βάση χρειάζεται επανάληψη.");});}
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