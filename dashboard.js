const cfg = window.APP_CONFIG || {};
const endpoint = (cfg.gasEndpoint || "").trim();
const refreshMs = ((cfg.dashboardRefreshSeconds || 20) * 1000);
const leaderboardSize = cfg.leaderboardSize || 8;

const $ = s => document.querySelector(s);

function setText(id, value){
  const el = $(id);
  if(el) el.textContent = value;
}

function boardRow(rank, title, sub, count){
  return `
    <div class="board-row">
      <div class="board-rank">${rank}</div>
      <div>
        <div class="board-main">${escapeHtml(title || "未命名")}</div>
        ${sub ? `<span class="board-sub">${escapeHtml(sub)}</span>` : ""}
      </div>
      <div class="board-count">${count}</div>
    </div>`;
}

function renderList(target, items, formatter){
  const el = $(target);
  if(!el) return;
  if(!items || !items.length){
    el.innerHTML = `<div class="empty-box">目前沒有資料</div>`;
    return;
  }
  el.innerHTML = items.map((item, idx)=>formatter(item, idx)).join("");
}

function renderRiskTable(rows){
  const el = $("#riskTable");
  if(!rows || !rows.length){
    el.innerHTML = `<div class="empty-box">目前沒有待釐清位置的項目 🎉</div>`;
    return;
  }
  const body = rows.map(r=>`
    <tr>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.department || "-")}</td>
      <td>${escapeHtml(r.assetType)}</td>
      <td>${escapeHtml(r.assetName)}</td>
      <td>${escapeHtml(r.locationType || "未填")}</td>
      <td>${escapeHtml(r.locationDetail || "未填")}</td>
    </tr>`).join("");
  el.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>姓名 / 代號</th>
          <th>部門</th>
          <th>類型</th>
          <th>資產名稱</th>
          <th>位置類型</th>
          <th>位置細節</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

async function loadDashboard(){
  setText("#dashboardStatus", endpoint ? "讀取中…" : "尚未設定 gasEndpoint，老師戰情室目前無法跨裝置整合。請先在 config.js 填入 Google Apps Script Web App URL。");
  if(!endpoint) return;

  try{
    const url = `${endpoint}?action=summary&sessionName=${encodeURIComponent(cfg.sessionName || "")}`;
    const res = await fetch(url, {method:"GET"});
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || "讀取失敗");
    renderDashboard(data.summary || {});
    const updatedAt = data.summary?.updatedAt ? new Date(data.summary.updatedAt).toLocaleString() : "";
    setText("#dashboardStatus", `最後更新：${updatedAt}`);
  }catch(err){
    setText("#dashboardStatus", `讀取失敗：${err.message}`);
  }
}

function renderDashboard(summary){
  setText("#totalParticipants", summary.totalParticipants || 0);
  setText("#totalSubmissions", summary.totalSubmissions || 0);
  setText("#totalAssets", summary.totalAssets || 0);
  setText("#uncertainAssets", summary.uncertainAssets || 0);
  setText("#systemAssets", summary.assetTypeCounts?.system || 0);
  setText("#databaseAssets", summary.assetTypeCounts?.database || 0);
  setText("#documentAssets", summary.assetTypeCounts?.document || 0);
  setText("#avgScore", Math.round(summary.averageScore || 0));

  renderList("#leaderboard", summary.leaderboard?.slice(0, leaderboardSize), (item, idx)=>
    boardRow(idx+1, item.name, `${item.department || "未填部門"}｜${item.workRole || "未填工作"}`, `${item.score} XP`)
  );

  renderList("#topAssets", summary.topAssets, (item, idx)=>
    boardRow(idx+1, item.name, item.assetTypeLabel, `${item.count} 次`)
  );

  renderList("#topLocations", summary.topLocations, (item, idx)=>
    boardRow(idx+1, item.name, item.example || "", `${item.count} 次`)
  );

  renderList("#topDepartments", summary.topDepartments, (item, idx)=>
    boardRow(idx+1, item.name, "已提交人數", `${item.count} 人`)
  );

  renderRiskTable(summary.riskItems || []);
}

function init(){
  setText("#sessionName", cfg.sessionName || "未設定");
  setText("#refreshSeconds", cfg.dashboardRefreshSeconds || 20);
  $("#refreshBtn").addEventListener("click", loadDashboard);
  loadDashboard();
  if(endpoint) setInterval(loadDashboard, refreshMs);
}

init();
