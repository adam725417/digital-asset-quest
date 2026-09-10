const cfg = window.APP_CONFIG || {};
const TYPE_META = {
  system: {title:"系統", icon:"🖥️", placeholder:"例如：SAP ERP、MES、WMS、設備戰情室"},
  database: {title:"資料庫", icon:"🗄️", placeholder:"例如：MES SQL Server、production_order、Excel 主檔"},
  document: {title:"文件", icon:"📚", placeholder:"例如：SOP、設備規格書、月報、專案會議記錄"}
};

const state = {
  currentStep: 0,
  participant: {},
  assets: {system:[], database:[], document:[]},
  completed: [false,false,false]
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function initTitles(){
  $("#gameTitle").textContent = cfg.gameTitle || "數位資產尋寶任務";
  $("#subtitle").textContent = cfg.subtitle || "找出你每天工作真正依賴的系統、資料庫與文件";
}

function saveLocal(){
  localStorage.setItem("digitalAssetQuestDraft", JSON.stringify(state));
}

function loadLocal(){
  try{
    const saved = JSON.parse(localStorage.getItem("digitalAssetQuestDraft") || "null");
    if(saved && saved.assets) Object.assign(state, saved);
  }catch(e){}
}

function createItem(type, data={}){
  const tpl = $("#itemTemplate").content.cloneNode(true);
  const item = tpl.querySelector(".asset-item");
  item.dataset.type = type;

  const meta = TYPE_META[type];
  item.querySelector(".asset-name-label").textContent = `${meta.title}名稱`;
  item.querySelector(".asset-name").placeholder = meta.placeholder;
  item.querySelector(".asset-name").value = data.name || "";
  item.querySelector(".asset-purpose").value = data.purpose || "";
  item.querySelector(".asset-location-type").value = data.locationType || "";
  item.querySelector(".asset-location-detail").value = data.locationDetail || "";

  item.querySelector(".remove-btn").addEventListener("click", ()=>{
    item.remove();
    renumber(type);
    syncFromDOM();
    updateProgress();
  });

  item.querySelectorAll("input,select").forEach(el=>{
    el.addEventListener("input", ()=>{ syncFromDOM(); updateProgress(); });
    el.addEventListener("change", ()=>{ syncFromDOM(); updateProgress(); });
  });

  document.querySelector(`#${type}List`).appendChild(item);
  renumber(type);
}

function renumber(type){
  document.querySelectorAll(`#${type}List .asset-item`).forEach((el,i)=>{
    el.querySelector(".asset-num").textContent = i + 1;
  });
}

function getAssetsFromDOM(type){
  return [...document.querySelectorAll(`#${type}List .asset-item`)].map(item=>({
    name:item.querySelector(".asset-name").value.trim(),
    purpose:item.querySelector(".asset-purpose").value.trim(),
    locationType:item.querySelector(".asset-location-type").value.trim(),
    locationDetail:item.querySelector(".asset-location-detail").value.trim()
  })).filter(x => x.name || x.purpose || x.locationType || x.locationDetail);
}

function syncFromDOM(){
  ["system","database","document"].forEach(type => state.assets[type] = getAssetsFromDOM(type));
  saveLocal();
}

function completedAssetsCount(){
  return Object.values(state.assets).flat().filter(a => a.name && a.locationType).length;
}

function score(){
  return state.completed.filter(Boolean).length * 100 + completedAssetsCount() * 20;
}

function updateProgress(){
  const pct = ((state.currentStep + 1) / 3) * 100;
  $("#progressBar").style.width = `${pct}%`;
  $("#missionLabel").textContent = `任務 ${state.currentStep + 1} / 3`;
  $("#scoreLabel").textContent = `${score()} XP`;
}

function showStep(n){
  state.currentStep = Math.max(0, Math.min(2, n));
  $$(".mission").forEach((m,i)=>m.classList.toggle("active", i === state.currentStep));
  updateProgress();
  saveLocal();
  window.scrollTo({top:200, behavior:"smooth"});
}

function validateStep(){
  syncFromDOM();
  const type = ["system","database","document"][state.currentStep];
  const items = state.assets[type];
  const valid = items.some(a => a.name && a.locationType);
  if(!valid){
    alert(`至少新增 1 個${TYPE_META[type].title}，並選擇它放在哪一類位置。`);
    return false;
  }
  return true;
}

function participantFromInputs(){
  return {
    name:$("#participantName").value.trim(),
    department:$("#department").value.trim(),
    workRole:$("#workRole").value.trim()
  };
}

function startGame(){
  state.participant = participantFromInputs();
  if(!state.participant.name){
    alert("請先輸入姓名或代號。");
    return;
  }
  $("#introCard").classList.add("hidden");
  $("#progressWrap").classList.remove("hidden");
  $("#missions").classList.remove("hidden");
  showStep(state.currentStep || 0);
  saveLocal();
}

function renderResult(){
  syncFromDOM();
  const counts = {
    system: state.assets.system.filter(x=>x.name).length,
    database: state.assets.database.filter(x=>x.name).length,
    document: state.assets.document.filter(x=>x.name).length
  };
  const uncertain = Object.values(state.assets).flat().filter(a =>
    !a.locationType || a.locationType === "我不確定" || !a.locationDetail
  ).length;

  $("#systemCount").textContent = counts.system;
  $("#databaseCount").textContent = counts.database;
  $("#documentCount").textContent = counts.document;
  $("#riskCount").textContent = uncertain;
  $("#resultSummary").textContent =
    `${state.participant.name} 共盤點 ${counts.system + counts.database + counts.document} 項工作資產，獲得 ${score()} XP。`;

  const output = $("#mapOutput");
  output.innerHTML = "";

  ["system","database","document"].forEach(type=>{
    const items = state.assets[type].filter(x=>x.name);
    if(!items.length) return;
    const group = document.createElement("section");
    group.className = "map-group";
    group.innerHTML = `<h3>${TYPE_META[type].icon} ${TYPE_META[type].title}</h3>`;
    items.forEach(a=>{
      const row = document.createElement("div");
      row.className = "map-row";
      row.innerHTML = `
        <div><strong>${escapeHtml(a.name)}</strong><small>${escapeHtml(a.purpose || "未填用途")}</small></div>
        <div>${escapeHtml(a.locationType || "位置未分類")}</div>
        <div>${escapeHtml(a.locationDetail || "位置細節未填")}</div>`;
      group.appendChild(row);
    });
    output.appendChild(group);
  });
}

function finishGame(){
  if(!validateStep()) return;
  state.completed[2] = true;
  $("#missions").classList.add("hidden");
  $("#progressWrap").classList.add("hidden");
  $("#resultCard").classList.remove("hidden");
  renderResult();
  saveLocal();
  window.scrollTo({top:0, behavior:"smooth"});
}

function buildPayload(){
  syncFromDOM();
  return {
    submittedAt: new Date().toISOString(),
    sessionName: cfg.sessionName || "",
    participant: state.participant,
    score: score(),
    assets: state.assets
  };
}

async function submitResult(){
  const btn = $("#submitBtn");
  const status = $("#submitStatus");
  const endpoint = (cfg.gasEndpoint || "").trim();

  if(!endpoint){
    status.textContent = "目前未設定 Google Apps Script；你仍可下載 CSV / JSON 保存結果。";
    return;
  }

  btn.disabled = true;
  status.textContent = "正在送出…";
  try{
    await fetch(endpoint, {
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify(buildPayload())
    });
    status.textContent = "✅ 已送出，老師戰情室稍後會更新。";
    localStorage.setItem("digitalAssetQuestLastSubmit", new Date().toISOString());
  }catch(err){
    status.textContent = "⚠️ 送出失敗，請先下載 CSV 保存，再請主持人確認網路或 Apps Script 設定。";
  }finally{
    btn.disabled = false;
  }
}

function toRows(){
  const payload = buildPayload();
  const rows = [["姓名/代號","部門/單位","主要工作","類型","資產名稱","主要用途","位置類型","位置細節","提交時間"]];
  ["system","database","document"].forEach(type=>{
    payload.assets[type].forEach(a=>{
      if(!a.name) return;
      rows.push([
        payload.participant.name,
        payload.participant.department,
        payload.participant.workRole,
        TYPE_META[type].title,
        a.name,
        a.purpose,
        a.locationType,
        a.locationDetail,
        payload.submittedAt
      ]);
    });
  });
  return rows;
}

function csvEscape(v){
  const s = String(v ?? "");
  return `"${s.replaceAll('"','""')}"`;
}

function download(name, text, mime){
  const blob = new Blob([text], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv(){
  const csv = "\ufeff" + toRows().map(r=>r.map(csvEscape).join(",")).join("\n");
  download("digital_asset_quest.csv", csv, "text/csv;charset=utf-8");
}

function downloadJson(){
  download("digital_asset_quest.json", JSON.stringify(buildPayload(), null, 2), "application/json;charset=utf-8");
}

function restart(){
  if(!confirm("要清空目前盤點並重新開始嗎？")) return;
  localStorage.removeItem("digitalAssetQuestDraft");
  location.reload();
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function init(){
  initTitles();
  loadLocal();
  $("#participantName").value = state.participant?.name || "";
  $("#department").value = state.participant?.department || "";
  $("#workRole").value = state.participant?.workRole || "";

  ["system","database","document"].forEach(type=>{
    const items = state.assets?.[type] || [];
    if(items.length) items.forEach(x=>createItem(type, x));
    else createItem(type);
  });

  $("#startBtn").addEventListener("click", startGame);
  $$(".add-btn").forEach(btn=>btn.addEventListener("click", ()=>createItem(btn.dataset.type)));
  $$(".next-btn").forEach(btn=>btn.addEventListener("click", ()=>{
    if(!validateStep()) return;
    state.completed[state.currentStep] = true;
    showStep(state.currentStep + 1);
  }));
  $$(".prev-btn").forEach(btn=>btn.addEventListener("click", ()=>showStep(state.currentStep - 1)));
  $("#finishBtn").addEventListener("click", finishGame);
  $("#submitBtn").addEventListener("click", submitResult);
  $("#downloadCsvBtn").addEventListener("click", downloadCsv);
  $("#downloadJsonBtn").addEventListener("click", downloadJson);
  $("#restartBtn").addEventListener("click", restart);

  if(state.currentStep >= 0 && state.participant?.name && !$("#missions").classList.contains("hidden")){
    updateProgress();
  }
}

init();
