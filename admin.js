var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxOn2KROUEy9DIRk7xxvg_ZvwJ0QPvddjf2r9HkNGsyrdOB4LapoRhwE__vdRvo4F1T/exec";

var caRegistry = {};
var activeCAId = "CA1";
var allStudents = [];

var loginSection = document.getElementById("login-section");
var dashboardSection = document.getElementById("dashboard-section");
var adminUserInput = document.getElementById("admin-user-input");
var adminPassInput = document.getElementById("admin-pass-input");
var loginBtn = document.getElementById("login-btn");
var logoutBtn = document.getElementById("logout-btn");
var loginStatusMsg = document.getElementById("login-status-msg");

var activeCaSelect = document.getElementById("active-ca-select");
var caVisCheckbox = document.getElementById("ca-vis-checkbox");
var tableBody = document.getElementById("table-body");
var refreshBtn = document.getElementById("refresh-btn");
var exportExcelBtn = document.getElementById("export-excel-btn");
var exportPdfBtn = document.getElementById("export-pdf-btn");
var printableReportCard = document.getElementById("printable-report-card");

var openCaModalBtn = document.getElementById("open-ca-modal-btn");
var closeCaModalBtn = document.getElementById("close-ca-modal-btn");
var caModal = document.getElementById("ca-modal");
var saveCaConfigBtn = document.getElementById("save-ca-config-btn");
var setsEditorContainer = document.getElementById("sets-editor-container");
var addSetBtn = document.getElementById("add-set-btn");
var caSaveStatus = document.getElementById("ca-save-status");
var cfgCaVisible = document.getElementById("cfg-ca-visible");

var openVivaModalBtn = document.getElementById("open-viva-modal-btn");
var closeVivaModalBtn = document.getElementById("close-viva-modal-btn");
var vivaModal = document.getElementById("viva-modal");
var studentSelect = document.getElementById("student-select");
var studentPreview = document.getElementById("modal-student-preview");
var vivaMarksInput = document.getElementById("viva-marks-input");
var demoMarksInput = document.getElementById("demo-marks-input");
var saveMarksBtn = document.getElementById("save-marks-btn");
var modalStatusMsg = document.getElementById("modal-status-msg");

var questionsModal = document.getElementById("questions-modal");
var closeQModalBtn = document.getElementById("close-qmodal-btn");
var qModalTitle = document.getElementById("qmodal-title");
var qModalSubtitle = document.getElementById("qmodal-subtitle");
var qModalBody = document.getElementById("qmodal-body");

var searchInput = document.getElementById("search-input");
var filterGroup = document.getElementById("filter-group");
var filterSet = document.getElementById("filter-set");
var filterStatus = document.getElementById("filter-status");

function jsonp(url) {
  return new Promise(function(resolve) {
    var cbName = "adm_cb_" + Math.round(100000 * Math.random());
    var script = document.createElement("script");

    var timer = setTimeout(function() {
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve({ status: "error", message: "Request timed out." });
    }, 10000);

    window[cbName] = function(res) {
      clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(res);
    };

    script.onerror = function() {
      clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve({ status: "error", message: "Network connection error." });
    };

    script.src = url + (url.indexOf("?") !== -1 ? "&" : "?") + "callback=" + cbName;
    document.body.appendChild(script);
  });
}

if (sessionStorage.getItem("admin_auth_user")) {
  showDashboard();
}

loginBtn.addEventListener("click", async function() {
  var u = adminUserInput.value.trim();
  var p = adminPassInput.value.trim();

  if (!u || !p) {
    loginStatusMsg.textContent = "Please enter username and password.";
    loginStatusMsg.className = "status-msg error";
    return;
  }

  loginBtn.disabled = true;
  loginStatusMsg.textContent = "Verifying credentials...";
  loginStatusMsg.className = "status-msg";

  var res = await jsonp(GOOGLE_SCRIPT_URL + "?action=adminLogin&username=" + encodeURIComponent(u) + "&password=" + encodeURIComponent(p));

  if (res && res.status === "success") {
    sessionStorage.setItem("admin_auth_user", u);
    showDashboard();
  } else {
    loginStatusMsg.textContent = (res && res.message) ? res.message : "Invalid credentials.";
    loginStatusMsg.className = "status-msg error";
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", function() {
  sessionStorage.removeItem("admin_auth_user");
  location.reload();
});

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  loadAllCAs();
}

async function loadAllCAs() {
  var res = await jsonp(GOOGLE_SCRIPT_URL + "?action=getAllCAs");
  if (res && res.status === "success" && res.cas && res.cas.length > 0) {
    res.cas.forEach(function(item) {
      caRegistry[item.id] = item;
    });
  }
  populateCASwitcher();
}

function populateCASwitcher() {
  activeCaSelect.innerHTML = "";
  Object.keys(caRegistry).forEach(function(id) {
    var opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id + " - " + (caRegistry[id].name || id);
    if (id === activeCAId) opt.selected = true;
    activeCaSelect.appendChild(opt);
  });
  syncCurrentCAVisibility();
  syncFilterOptions();
  fetchActiveSheetData();
}

function syncCurrentCAVisibility() {
  var ca = caRegistry[activeCAId];
  caVisCheckbox.checked = (ca && ca.isVisible !== undefined) ? ca.isVisible : true;
}

caVisCheckbox.addEventListener("change", async function() {
  var isVis = this.checked;
  if (caRegistry[activeCAId]) {
    caRegistry[activeCAId].isVisible = isVis;
  }
  var payload = {
    action: "toggleVisibility",
    caId: activeCAId,
    isVisible: isVis
  };

  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
});

function syncFilterOptions() {
  var ca = caRegistry[activeCAId];
  filterGroup.innerHTML = '<option value="">All Groups</option>';
  filterSet.innerHTML = '<option value="">All Sets</option>';

  if (ca && ca.sets) {
    ca.sets.forEach(function(s) {
      var gOpt = document.createElement("option");
      gOpt.value = s.groupName;
      gOpt.textContent = s.groupName;
      filterGroup.appendChild(gOpt);

      var sOpt = document.createElement("option");
      sOpt.value = "SET " + s.setNum;
      sOpt.textContent = "SET " + s.setNum;
      filterSet.appendChild(sOpt);
    });
  }
}

activeCaSelect.addEventListener("change", function() {
  activeCAId = this.value;
  syncCurrentCAVisibility();
  syncFilterOptions();
  fetchActiveSheetData();
});

async function fetchActiveSheetData() {
  tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 2rem; color: var(--muted);">Loading records...</td></tr>';
  var res = await jsonp(GOOGLE_SCRIPT_URL + "?action=getAllData&caId=" + encodeURIComponent(activeCAId));
  if (res && res.status === "success") {
    allStudents = res.data;
    populateStudentDropdown();
    renderTable();
    updateStats();
  } else {
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; color: var(--danger); padding: 2rem;">No records found for ' + activeCAId + '.</td></tr>';
  }
}

function updateStats() {
  var total = allStudents.length;
  var hasFiles = allStudents.filter(function (s) { return s.file1Url || s.file2Url; }).length;
  var evaluated = allStudents.filter(function (s) { return s.viva !== "" || s.demo !== ""; }).length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-files").textContent = hasFiles;
  document.getElementById("stat-evaluated").textContent = evaluated;
  document.getElementById("stat-pending").textContent = (total - evaluated);
}

function populateStudentDropdown() {
  studentSelect.innerHTML = '<option value="">-- Choose Candidate --</option>';
  allStudents.forEach(function (s) {
    var opt = document.createElement("option");
    opt.value = s.regNo;
    opt.textContent = s.regNo + " - " + s.name;
    studentSelect.appendChild(opt);
  });
}

function calculateTotal(vivaStr, demoStr) {
  if (vivaStr === "" && demoStr === "") return "-";
  var v = parseFloat(vivaStr) || 0;
  var d = parseFloat(demoStr) || 0;
  return (v + d);
}

function getFilteredData() {
  var search = searchInput.value.toLowerCase().trim();
  var grp = filterGroup.value;
  var setVal = filterSet.value;
  var status = filterStatus.value;

  return allStudents.filter(function (s) {
    var matchSearch = s.regNo.toLowerCase().indexOf(search) !== -1 || s.name.toLowerCase().indexOf(search) !== -1;
    var matchGroup = !grp || s.group.indexOf(grp) !== -1;
    var matchSet = !setVal || s.set.indexOf(setVal) !== -1;
    var isEval = s.viva !== "" || s.demo !== "";
    var matchStatus = !status || (status === "evaluated" ? isEval : !isEval);
    return matchSearch && matchGroup && matchSet && matchStatus;
  });
}

function renderTable() {
  var filtered = getFilteredData();

  if (filtered.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 2rem; color: var(--muted);">No matching students found.</td></tr>';
    return;
  }

  var html = "";
  filtered.forEach(function (s, idx) {
    var fileLinks = [];
    if (s.file1Url) fileLinks.push('<a class="file-link" href="' + s.file1Url + '" target="_blank">File 1</a>');
    if (s.file2Url) fileLinks.push('<a class="file-link" href="' + s.file2Url + '" target="_blank">File 2</a>');
    if (fileLinks.length === 0) fileLinks.push('<span style="color: var(--muted); font-size: 0.8rem;">No files</span>');

    var vivaDisplay = s.viva !== "" ? '<strong style="color: var(--success);">' + s.viva + '</strong>' : '<span style="color: var(--muted);">-</span>';
    var demoDisplay = s.demo !== "" ? '<strong style="color: var(--success);">' + s.demo + '</strong>' : '<span style="color: var(--muted);">-</span>';
    var totalMarks = calculateTotal(s.viva, s.demo);
    var totalDisplay = totalMarks !== "-" ? '<strong style="color: var(--primary); font-size:0.95rem;">' + totalMarks + '</strong>' : '<span style="color: var(--muted);">-</span>';

    html += '<tr>' +
      '<td style="font-weight:600; color:var(--muted);">' + (idx + 1) + '</td>' +
      '<td><strong>' + s.regNo + '</strong></td>' +
      '<td>' + s.name + '</td>' +
      '<td>' +
        '<button type="button" class="badge-btn" onclick="openQuestionsModal(\'' + s.regNo + '\')">' +
          '<span>' + s.group + '</span><br>' +
          '<span style="font-size:0.75rem; color: var(--primary);">' + s.set + ' &bull; View ↗</span>' +
        '</button>' +
      '</td>' +
      '<td>' + (s.selectedQuestions || "-") + '</td>' +
      '<td>' + fileLinks.join(" ") + '</td>' +
      '<td>' + vivaDisplay + '</td>' +
      '<td>' + demoDisplay + '</td>' +
      '<td>' + totalDisplay + '</td>' +
      '<td><button type="button" class="btn-edit-mark" onclick="openEvaluationModal(\'' + s.regNo + '\')">Evaluate</button></td>' +
      '</tr>';
  });

  tableBody.innerHTML = html;
}

exportExcelBtn.addEventListener("click", function () {
  var currentCA = caRegistry[activeCAId] || { name: activeCAId };
  var data = getFilteredData();

  if (data.length === 0) {
    alert("No records to export.");
    return;
  }

  var dateStr = new Date().toLocaleDateString();
  var rowsHtml = "";
  for (var i = 0; i < data.length; i++) {
    var s = data[i];
    var totalMarks = calculateTotal(s.viva, s.demo);
    rowsHtml += "<tr>" +
      "<td>" + (i + 1) + "</td>" +
      "<td>" + s.regNo + "</td>" +
      "<td>" + s.name + "</td>" +
      "<td>" + s.group + " - " + s.set + "</td>" +
      "<td>" + (s.selectedQuestions || "-") + "</td>" +
      "<td>" + (s.viva !== "" ? s.viva : "-") + "</td>" +
      "<td>" + (s.demo !== "" ? s.demo : "-") + "</td>" +
      "<td>" + totalMarks + "</td>" +
      "</tr>";
  }

  var excelHtml = "<html><head><meta charset='utf-8'></head><body>" +
    "<table border='1'>" +
    "<tr><th colspan='8' style='background:#2563eb;color:#fff;font-size:16px;'>Course: CAP392 - Student Assessment Report</th></tr>" +
    "<tr><th colspan='8' style='background:#eff6ff;'>Assessment: " + activeCAId + " - " + currentCA.name + " | Date: " + dateStr + "</th></tr>" +
    "<tr><th>Sr. No.</th><th>Reg No</th><th>Student Name</th><th>Group &amp; Set</th><th>Questions</th><th>Viva</th><th>Demo</th><th>Total Marks</th></tr>" +
    rowsHtml +
    "</table></body></html>";

  var blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = "CAP392_" + activeCAId + "_Report.xls";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

exportPdfBtn.addEventListener("click", function () {
  var currentCA = caRegistry[activeCAId] || { name: activeCAId };
  var data = getFilteredData();

  if (data.length === 0) {
    alert("No records to export.");
    return;
  }

  var dateStr = new Date().toLocaleDateString();
  var rowsHtml = "";
  for (var i = 0; i < data.length; i++) {
    var s = data[i];
    var totalMarks = calculateTotal(s.viva, s.demo);
    rowsHtml += "<tr>" +
      "<td style='padding:5px;'>" + (i + 1) + "</td>" +
      "<td style='padding:5px;font-weight:bold;'>" + s.regNo + "</td>" +
      "<td style='padding:5px;'>" + s.name + "</td>" +
      "<td style='padding:5px;'>" + s.group + " (" + s.set + ")</td>" +
      "<td style='padding:5px;'>" + (s.selectedQuestions || "-") + "</td>" +
      "<td style='padding:5px;'>" + (s.viva !== "" ? s.viva : "-") + "</td>" +
      "<td style='padding:5px;'>" + (s.demo !== "" ? s.demo : "-") + "</td>" +
      "<td style='padding:5px;font-weight:bold;color:#1e40af;'>" + totalMarks + "</td>" +
      "</tr>";
  }

  var reportHtml = "<div style='padding:10px;'>" +
    "<div style='border-bottom:2px solid #2563eb;padding-bottom:8px;margin-bottom:15px;'>" +
      "<h2 style='margin:0;'>Course: CAP392 - Practical Report Card</h2>" +
      "<h4 style='margin:4px 0 0 0;color:#2563eb;'>Assessment: " + activeCAId + " - " + currentCA.name + " | Date: " + dateStr + "</h4>" +
    "</div>" +
    "<table border='1' style='width:100%;border-collapse:collapse;font-size:12px;'>" +
      "<thead><tr style='background:#f1f5f9;'><th>Sr.</th><th>Reg No</th><th>Name</th><th>Group &amp; Set</th><th>Questions</th><th>Viva</th><th>Demo</th><th>Total</th></tr></thead><tbody>" +
      rowsHtml +
      "</tbody></table>" +
    "<div style='margin-top:30px;display:flex;justify-content:space-between;font-size:13px;'>" +
      "<span>Evaluator: __________________</span>" +
      "<span>Signature: __________________</span>" +
    "</div></div>";

  printableReportCard.innerHTML = reportHtml;
  printableReportCard.classList.remove("hidden");
  window.print();

  setTimeout(function () {
    printableReportCard.classList.add("hidden");
  }, 1000);
});

window.openQuestionsModal = function (regNo) {
  var student = allStudents.find(function (s) { return s.regNo === regNo; });
  if (!student) return;

  var currentCA = caRegistry[activeCAId];
  if (!currentCA) return;

  var setMatch = student.set.match(/\d+/);
  var setNum = setMatch ? parseInt(setMatch[0], 10) : 1;
  var currentSet = currentCA.sets.find(function(s) { return s.setNum === setNum; }) || currentCA.sets[0];

  var selectedList = (student.selectedQuestions || "")
    .split(",")
    .map(function (q) { return q.trim().toUpperCase(); });

  qModalTitle.textContent = (currentSet.groupName || ("SET " + setNum)) + " - " + student.name + " (" + student.regNo + ")";
  qModalSubtitle.textContent = "Attempted selections: " + (student.selectedQuestions || "None");

  var bodyHtml = "";
  currentSet.questions.forEach(function (q) {
    var isSelected = selectedList.indexOf(q.code.toUpperCase()) !== -1;
    bodyHtml += '<div class="q-item ' + (isSelected ? "highlighted" : "") + '">' +
      '<div class="q-item-header">' +
        '<h3>' + q.code + '. ' + q.title + '</h3>' +
        (isSelected
          ? '<span class="tag-selected">Selected</span>'
          : '<span class="tag-not-selected">Not Selected</span>') +
      '</div>' +
      '<div>' + q.html + '</div>' +
    '</div>';
  });

  qModalBody.innerHTML = bodyHtml;
  questionsModal.classList.remove("hidden");
};

closeQModalBtn.addEventListener("click", function () { questionsModal.classList.add("hidden"); });

window.openEvaluationModal = function (regNo) {
  vivaModal.classList.remove("hidden");
  studentSelect.value = regNo;
  onStudentSelectChange();
};

function onStudentSelectChange() {
  var reg = studentSelect.value;
  modalStatusMsg.textContent = "";
  if (!reg) {
    studentPreview.classList.add("hidden");
    vivaMarksInput.value = "";
    demoMarksInput.value = "";
    return;
  }
  var student = allStudents.find(function (s) { return s.regNo === reg; });
  if (student) {
    studentPreview.classList.remove("hidden");
    var fLinks = [];
    if (student.file1Url) fLinks.push('<a class="file-link" href="' + student.file1Url + '" target="_blank">File 1</a>');
    if (student.file2Url) fLinks.push('<a class="file-link" href="' + student.file2Url + '" target="_blank">File 2</a>');

    studentPreview.innerHTML =
      '<strong>' + student.name + ' (' + student.regNo + ')</strong><br>' +
      '<span>' + student.group + ' | ' + student.set + ' | Questions: ' + student.selectedQuestions + '</span><br>' +
      '<div style="margin-top:0.4rem;">' + (fLinks.length ? fLinks.join(" ") : "No submissions yet") + '</div>';

    vivaMarksInput.value = student.viva || "";
    demoMarksInput.value = student.demo || "";
  }
}

studentSelect.addEventListener("change", onStudentSelectChange);
openVivaModalBtn.addEventListener("click", function () { vivaModal.classList.remove("hidden"); onStudentSelectChange(); });
closeVivaModalBtn.addEventListener("click", function () { vivaModal.classList.add("hidden"); });

saveMarksBtn.addEventListener("click", async function () {
  var reg = studentSelect.value;
  if (!reg) return;

  var viva = vivaMarksInput.value.trim();
  var demo = demoMarksInput.value.trim();

  saveMarksBtn.disabled = true;
  modalStatusMsg.textContent = "Saving to Google Sheet...";
  modalStatusMsg.className = "status-msg";

  var payload = {
    action: "updateMarks",
    caId: activeCAId,
    regNo: reg,
    viva: viva,
    demo: demo
  };

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    var s = allStudents.find(function (item) { return item.regNo === reg; });
    if (s) { s.viva = viva; s.demo = demo; }

    modalStatusMsg.textContent = "Marks updated in sheet!";
    modalStatusMsg.className = "status-msg success";
    renderTable();
    updateStats();

    setTimeout(function () { saveMarksBtn.disabled = false; }, 800);
  } catch (err) {
    modalStatusMsg.textContent = "Failed to update marks.";
    modalStatusMsg.className = "status-msg error";
    saveMarksBtn.disabled = false;
  }
});

openCaModalBtn.addEventListener("click", function() {
  caModal.classList.remove("hidden");
  var current = caRegistry[activeCAId] || { id: "CA1", name: "New CA", sets: [] };
  document.getElementById("cfg-ca-id").value = current.id;
  document.getElementById("cfg-ca-name").value = current.name;
  cfgCaVisible.checked = (current.isVisible !== undefined) ? current.isVisible : true;
  renderSetsEditor(current.sets || []);
});

closeCaModalBtn.addEventListener("click", function() { caModal.classList.add("hidden"); });

function renderSetsEditor(sets) {
  setsEditorContainer.innerHTML = "";
  sets.forEach(function(setObj, sIdx) {
    var card = document.createElement("div");
    card.className = "creator-section";
    card.style.background = "#fff";

    var topRow = document.createElement("div");
    topRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;";
    topRow.innerHTML = "<strong>SET " + setObj.setNum + " Definition</strong>";
    
    var removeSetBtn = document.createElement("button");
    removeSetBtn.type = "button";
    removeSetBtn.className = "btn-secondary";
    removeSetBtn.style.cssText = "padding:0.2rem 0.5rem; font-size:0.75rem;";
    removeSetBtn.textContent = "Remove Set";
    removeSetBtn.onclick = function() { removeSet(sIdx); };
    topRow.appendChild(removeSetBtn);

    var inputsDiv = document.createElement("div");
    inputsDiv.className = "two-col-inputs";
    inputsDiv.style.marginBottom = "0.75rem";
    inputsDiv.innerHTML = 
      '<div class="form-group" style="margin-bottom:0;">' +
        '<label>Group Label</label>' +
        '<input type="text" class="cfg-group-name" value="' + setObj.groupName + '" placeholder="Group A (A - H)" />' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:0;">' +
        '<label>Alphabet Rule (Start - End Char)</label>' +
        '<div style="display:flex; gap:0.5rem;">' +
          '<input type="text" class="cfg-char-start" maxlength="1" value="' + setObj.charStart + '" style="text-align:center; text-transform:uppercase;" />' +
          '<input type="text" class="cfg-char-end" maxlength="1" value="' + setObj.charEnd + '" style="text-align:center; text-transform:uppercase;" />' +
        '</div>' +
      '</div>';

    var qListDiv = document.createElement("div");
    qListDiv.id = "ql-container-" + sIdx;

    var addQBtn = document.createElement("button");
    addQBtn.type = "button";
    addQBtn.className = "btn-secondary";
    addQBtn.style.cssText = "font-size:0.75rem; margin-top:0.5rem;";
    addQBtn.textContent = "✚ Add Question to SET " + setObj.setNum;
    addQBtn.onclick = function() { addQuestionToSet(sIdx); };

    card.appendChild(topRow);
    card.appendChild(inputsDiv);
    card.appendChild(qListDiv);
    card.appendChild(addQBtn);

    setsEditorContainer.appendChild(card);
    renderQuestionsForSet(sIdx, setObj.questions || []);
  });
}

function renderQuestionsForSet(sIdx, questions) {
  var container = document.getElementById("ql-container-" + sIdx);
  container.innerHTML = "";

  questions.forEach(function(q, qIdx) {
    var qBox = document.createElement("div");
    qBox.style.cssText = "border:1px solid var(--border); border-radius:6px; padding:0.75rem; margin-bottom:0.75rem; background:#fafafa;";

    var headerDiv = document.createElement("div");
    headerDiv.style.cssText = "display:flex; justify-content:space-between; gap:0.5rem; margin-bottom:0.4rem;";

    var codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.className = "cfg-q-code";
    codeInput.value = q.code;
    codeInput.style.cssText = "width:70px; font-weight:700;";
    codeInput.placeholder = "Q1";

    var titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "cfg-q-title";
    titleInput.value = q.title;
    titleInput.style.flex = "1";
    titleInput.placeholder = "Problem Title";

    var removeQBtn = document.createElement("button");
    removeQBtn.type = "button";
    removeQBtn.className = "btn-secondary";
    removeQBtn.style.cssText = "padding:0.2rem 0.5rem; font-size:0.75rem;";
    removeQBtn.textContent = "✕";
    removeQBtn.onclick = function() { removeQuestion(sIdx, qIdx); };

    headerDiv.appendChild(codeInput);
    headerDiv.appendChild(titleInput);
    headerDiv.appendChild(removeQBtn);

    var toolbar = document.createElement("div");
    toolbar.className = "editor-toolbar";
    toolbar.innerHTML = 
      '<button type="button" onclick="formatEditor(\'bold\', this)"><b>B</b></button>' +
      '<button type="button" onclick="formatEditor(\'italic\', this)"><i>I</i></button>' +
      '<button type="button" onclick="formatEditor(\'insertUnorderedList\', this)">&bull; List</button>';

    var editor = document.createElement("div");
    editor.className = "rich-editor cfg-q-html";
    editor.contentEditable = "true";
    editor.innerHTML = q.html;

    qBox.appendChild(headerDiv);
    qBox.appendChild(toolbar);
    qBox.appendChild(editor);

    container.appendChild(qBox);
  });
}

window.formatEditor = function(cmd, btn) {
  var editor = btn.closest(".editor-toolbar").nextElementSibling;
  editor.focus();
  document.execCommand(cmd, false, null);
};

addSetBtn.addEventListener("click", function() {
  var currentSets = collectSetsFromUI();
  var nextSetNum = currentSets.length + 1;
  currentSets.push({
    setNum: nextSetNum,
    groupName: "Group " + String.fromCharCode(64 + nextSetNum),
    charStart: "A",
    charEnd: "Z",
    questions: [
      { code: "Q1", title: "Problem 1", html: "<p>Describe problem details here...</p>" },
      { code: "Q2", title: "Problem 2", html: "<p>Describe problem details here...</p>" }
    ]
  });
  renderSetsEditor(currentSets);
});

function removeSet(sIdx) {
  var currentSets = collectSetsFromUI();
  currentSets.splice(sIdx, 1);
  renderSetsEditor(currentSets);
}

function addQuestionToSet(sIdx) {
  var currentSets = collectSetsFromUI();
  var nextCode = "Q" + (currentSets[sIdx].questions.length + 1);
  currentSets[sIdx].questions.push({ code: nextCode, title: "New Question", html: "<p>Question requirements...</p>" });
  renderSetsEditor(currentSets);
}

function removeQuestion(sIdx, qIdx) {
  var currentSets = collectSetsFromUI();
  currentSets[sIdx].questions.splice(qIdx, 1);
  renderSetsEditor(currentSets);
}

function collectSetsFromUI() {
  var sets = [];
  var setCards = setsEditorContainer.querySelectorAll(".creator-section");

  setCards.forEach(function(card, idx) {
    var groupName = card.querySelector(".cfg-group-name").value.trim();
    var charStart = card.querySelector(".cfg-char-start").value.trim().toUpperCase();
    var charEnd = card.querySelector(".cfg-char-end").value.trim().toUpperCase();

    var questions = [];
    var qBoxes = card.querySelectorAll("[id^='ql-container-'] > div");
    qBoxes.forEach(function(qBox) {
      questions.push({
        code: qBox.querySelector(".cfg-q-code").value.trim(),
        title: qBox.querySelector(".cfg-q-title").value.trim(),
        html: qBox.querySelector(".cfg-q-html").innerHTML
      });
    });

    sets.push({
      setNum: idx + 1,
      groupName: groupName,
      charStart: charStart,
      charEnd: charEnd,
      questions: questions
    });
  });
  return sets;
}

saveCaConfigBtn.addEventListener("click", async function() {
  var caId = document.getElementById("cfg-ca-id").value.trim().toUpperCase();
  var caName = document.getElementById("cfg-ca-name").value.trim();
  var isVis = cfgCaVisible.checked;

  if (!caId || !caName) {
    alert("Please specify a CA Identifier and Display Title.");
    return;
  }

  var sets = collectSetsFromUI();
  if (sets.length === 0) {
    alert("Please configure at least one question set.");
    return;
  }

  saveCaConfigBtn.disabled = true;
  caSaveStatus.textContent = "Publishing CA to cloud...";
  caSaveStatus.className = "status-msg";

  var payload = {
    action: "saveCAConfig",
    ca: {
      id: caId,
      name: caName,
      isVisible: isVis,
      sets: sets
    }
  };

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    caRegistry[caId] = payload.ca;
    activeCAId = caId;

    caSaveStatus.textContent = "CA saved & synchronized successfully!";
    caSaveStatus.className = "status-msg success";

    populateCASwitcher();
    setTimeout(function() {
      saveCaConfigBtn.disabled = false;
      caModal.classList.add("hidden");
    }, 1200);
  } catch (err) {
    caSaveStatus.textContent = "Failed to synchronize CA config.";
    caSaveStatus.className = "status-msg error";
    saveCaConfigBtn.disabled = false;
  }
});

window.addEventListener("click", function (e) {
  if (e.target === questionsModal) questionsModal.classList.add("hidden");
  if (e.target === vivaModal) vivaModal.classList.add("hidden");
  if (e.target === caModal) caModal.classList.add("hidden");
});

refreshBtn.addEventListener("click", fetchActiveSheetData);
searchInput.addEventListener("input", renderTable);
filterGroup.addEventListener("change", renderTable);
filterSet.addEventListener("change", renderTable);
filterStatus.addEventListener("change", renderTable);
