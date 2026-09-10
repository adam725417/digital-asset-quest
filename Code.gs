/**
 * Google Apps Script（Google 應用程式指令碼）後端
 *
 * 使用方式：
 * 1. 建立一份 Google Sheet
 * 2. 擴充功能 → Apps Script
 * 3. 貼上此檔案內容
 * 4. 部署 → 新增部署作業 → 網頁應用程式
 * 5. 執行身分：我；誰可以存取：任何知道連結的人（依組織政策調整）
 * 6. 將 Web App URL 貼回 GitHub 專案 config.js 的 gasEndpoint
 */

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "ping";
    if (action === "summary") {
      const sessionName = (e && e.parameter && e.parameter.sessionName) || "";
      return jsonOutput_({ ok: true, summary: buildSummary_(sessionName) });
    }
    return jsonOutput_({ ok: true, message: "Digital Asset Quest API" });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet_(ss, "responses");
    ensureHeader_(sheet);

    const p = data.participant || {};
    const submittedAt = data.submittedAt || new Date().toISOString();
    const sessionName = data.sessionName || "";
    const score = data.score || 0;
    const assets = data.assets || {};

    ["system", "database", "document"].forEach(function(type) {
      const arr = assets[type] || [];
      arr.forEach(function(a) {
        if (!a.name) return;
        sheet.appendRow([
          submittedAt,
          sessionName,
          p.name || "",
          p.department || "",
          p.workRole || "",
          score,
          type,
          typeLabel_(type),
          a.name || "",
          a.purpose || "",
          a.locationType || "",
          a.locationDetail || ""
        ]);
      });
    });

    return jsonOutput_({ ok: true });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

function buildSummary_(sessionName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss, "responses");
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return {
      totalParticipants: 0,
      totalSubmissions: 0,
      totalAssets: 0,
      uncertainAssets: 0,
      averageScore: 0,
      assetTypeCounts: { system: 0, database: 0, document: 0 },
      leaderboard: [],
      topAssets: [],
      topLocations: [],
      topDepartments: [],
      riskItems: [],
      updatedAt: new Date().toISOString()
    };
  }

  const header = values[0];
  const rows = values.slice(1).map(function(row) {
    const obj = {};
    header.forEach(function(key, idx) { obj[key] = row[idx]; });
    return obj;
  }).filter(function(r) {
    return !sessionName || r["場次"] === sessionName;
  });

  const participantMap = {};
  const assetCounts = { system: 0, database: 0, document: 0 };
  const assetNameCounter = {};
  const locationCounter = {};
  const departmentCounter = {};
  const riskItems = [];
  const submissionKeys = {};

  rows.forEach(function(r) {
    const participantKey = [r["姓名/代號"], r["部門/單位"], r["主要工作"]].join("|");
    if (!participantMap[participantKey]) {
      participantMap[participantKey] = {
        name: r["姓名/代號"] || "未命名",
        department: r["部門/單位"] || "",
        workRole: r["主要工作"] || "",
        score: Number(r["分數"]) || 0,
        submittedAt: r["提交時間"] || ""
      };
    } else {
      participantMap[participantKey].score = Math.max(participantMap[participantKey].score, Number(r["分數"]) || 0);
      if (String(r["提交時間"]) > String(participantMap[participantKey].submittedAt)) {
        participantMap[participantKey].submittedAt = r["提交時間"];
      }
    }

    if (r["部門/單位"]) {
      departmentCounter[r["部門/單位"]] = (departmentCounter[r["部門/單位"]] || 0) + 1;
    }

    const submissionKey = [r["提交時間"], r["姓名/代號"], r["部門/單位"]].join("|");
    submissionKeys[submissionKey] = true;

    const type = r["資產類型"];
    if (assetCounts[type] !== undefined) assetCounts[type]++;

    const assetCounterKey = [r["資產標籤"], r["資產名稱"]].join("|");
    if (r["資產名稱"]) {
      assetNameCounter[assetCounterKey] = assetNameCounter[assetCounterKey] || {
        name: r["資產名稱"], assetTypeLabel: r["資產標籤"], count: 0
      };
      assetNameCounter[assetCounterKey].count++;
    }

    if (r["位置類型"]) {
      locationCounter[r["位置類型"]] = locationCounter[r["位置類型"]] || {
        name: r["位置類型"], example: r["位置細節"] || "", count: 0
      };
      locationCounter[r["位置類型"]].count++;
      if (!locationCounter[r["位置類型"]].example && r["位置細節"]) {
        locationCounter[r["位置類型"]].example = r["位置細節"];
      }
    }

    if (!r["位置類型"] || r["位置類型"] === "我不確定" || !r["位置細節"]) {
      riskItems.push({
        name: r["姓名/代號"] || "",
        department: r["部門/單位"] || "",
        assetType: r["資產標籤"] || "",
        assetName: r["資產名稱"] || "",
        locationType: r["位置類型"] || "",
        locationDetail: r["位置細節"] || ""
      });
    }
  });

  const participants = Object.keys(participantMap).map(function(k) { return participantMap[k]; });
  participants.sort(function(a, b) {
    return (b.score - a.score) || String(a.name).localeCompare(String(b.name), 'zh-Hant');
  });

  const leaderboard = participants.slice(0, 20);
  const totalParticipants = participants.length;
  const totalAssets = rows.length;
  const totalSubmissions = Object.keys(submissionKeys).length;
  const avgScore = totalParticipants ? participants.reduce(function(sum, p) { return sum + (p.score || 0); }, 0) / totalParticipants : 0;

  return {
    totalParticipants: totalParticipants,
    totalSubmissions: totalSubmissions,
    totalAssets: totalAssets,
    uncertainAssets: riskItems.length,
    averageScore: avgScore,
    assetTypeCounts: assetCounts,
    leaderboard: leaderboard,
    topAssets: toSortedArray_(assetNameCounter, 8),
    topLocations: toSortedArray_(locationCounter, 8),
    topDepartments: toSimpleCounts_(departmentCounter, 8),
    riskItems: riskItems.slice(0, 50),
    updatedAt: new Date().toISOString()
  };
}

function toSortedArray_(obj, limit) {
  return Object.keys(obj).map(function(k) { return obj[k]; })
    .sort(function(a, b) { return (b.count - a.count) || String(a.name).localeCompare(String(b.name), 'zh-Hant'); })
    .slice(0, limit);
}

function toSimpleCounts_(obj, limit) {
  return Object.keys(obj).map(function(key) {
    return { name: key, count: obj[key] };
  }).sort(function(a, b) {
    return (b.count - a.count) || String(a.name).localeCompare(String(b.name), 'zh-Hant');
  }).slice(0, limit);
}

function typeLabel_(type) {
  if (type === "system") return "系統";
  if (type === "database") return "資料庫";
  if (type === "document") return "文件";
  return type;
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "提交時間", "場次", "姓名/代號", "部門/單位", "主要工作", "分數",
      "資產類型", "資產標籤", "資產名稱", "主要用途", "位置類型", "位置細節"
    ]);
    sheet.setFrozenRows(1);
  }
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
