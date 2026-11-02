let extractedText = "";
let currentFile = null;
let currentReport = "";

const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const preview = document.getElementById("extractedPreview");
const markBtn = document.getElementById("markBtn");
const statusBox = document.getElementById("status");
const resultSection = document.getElementById("resultSection");
const reportBox = document.getElementById("report");
const resultFile = document.getElementById("resultFile");
const downloadBtn = document.getElementById("downloadBtn");
const saveRuleBtn = document.getElementById("saveRuleBtn");
const ruleInput = document.getElementById("ruleInput");
const ruleList = document.getElementById("ruleList");

function setStatus(message, error=false) {
  statusBox.textContent = message;
  statusBox.classList.remove("hidden");
  statusBox.style.background = error ? "#fff0f1" : "#eef4ff";
  statusBox.style.color = error ? "#8f2334" : "#234875";
}

function clearStatus() {
  statusBox.classList.add("hidden");
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[c]);
}

// Lightweight Markdown renderer for headings, tables, bullets, bold, blockquotes and paragraphs.
function markdownToHtml(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  let out = [];
  let inUl = false, inOl = false, inTable = false, tableRows = [];

  const inline = (s) => escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

  function flushLists() {
    if (inUl) { out.push("</ul>"); inUl=false; }
    if (inOl) { out.push("</ol>"); inOl=false; }
  }
  function flushTable() {
    if (!inTable) return;
    const rows = tableRows.filter(r => r.trim());
    if (rows.length >= 2) {
      out.push("<table>");
      const parse = r => r.trim().replace(/^\||\|$/g,"").split("|").map(x=>x.trim());
      const header = parse(rows[0]);
      out.push("<thead><tr>" + header.map(x=>`<th>${inline(x)}</th>`).join("") + "</tr></thead>");
      out.push("<tbody>");
      for (let i=2;i<rows.length;i++) {
        const cells = parse(rows[i]);
        out.push("<tr>" + cells.map(x=>`<td>${inline(x)}</td>`).join("") + "</tr>");
      }
      out.push("</tbody></table>");
    } else {
      out.push(...rows.map(r=>`<p>${inline(r)}</p>`));
    }
    inTable=false; tableRows=[];
  }

  for (let i=0;i<lines.length;i++) {
    const line = lines[i];

    const isTableLine = line.trim().startsWith("|") && line.trim().endsWith("|");
    if (isTableLine) {
      flushLists();
      inTable=true;
      tableRows.push(line);
      continue;
    } else {
      flushTable();
    }

    if (!line.trim()) {
      flushLists();
      continue;
    }
    if (/^### /.test(line)) { flushLists(); out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (/^## /.test(line)) { flushLists(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (/^# /.test(line)) { flushLists(); out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }
    if (/^> /.test(line)) { flushLists(); out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`); continue; }
    if (/^[-*] /.test(line)) {
      if (!inUl) { flushLists(); out.push("<ul>"); inUl=true; }
      out.push(`<li>${inline(line.replace(/^[-*] /,""))}</li>`); continue;
    }
    if (/^\d+\. /.test(line)) {
      if (!inOl) { flushLists(); out.push("<ol>"); inOl=true; }
      out.push(`<li>${inline(line.replace(/^\d+\. /,""))}</li>`); continue;
    }
    flushLists();
    out.push(`<p>${inline(line)}</p>`);
  }
  flushLists(); flushTable();
  return out.join("\n");
}

async function extractPdf(file) {
  const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs";
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data: buf}).promise;
  const pages = [];
  for (let i=1; i<=pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(x => x.str).join(" ");
    pages.push(`--- PAGE ${i} ---\n${text}`);
  }
  return pages.join("\n\n");
}

async function extractDocx(file) {
  const buf = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({arrayBuffer: buf});
  return result.value;
}

async function handleFile(file) {
  clearStatus();
  resultSection.classList.add("hidden");
  currentFile = file;
  fileName.textContent = file.name;
  setStatus("Reading file…");
  try {
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".pdf")) extractedText = await extractPdf(file);
    else if (lower.endsWith(".docx")) extractedText = await extractDocx(file);
    else throw new Error("Only PDF and DOCX are supported.");

    preview.textContent = extractedText || "No readable text was extracted.";
    markBtn.disabled = !extractedText.trim();
    if (extractedText.trim().length < 100) {
      setStatus("Very little text was extracted. If this is a scanned PDF, convert it to a searchable/OCR PDF first.", true);
    } else {
      setStatus("File ready for marking.");
    }
  } catch (err) {
    extractedText = "";
    preview.textContent = "Could not extract this file.";
    markBtn.disabled = true;
    setStatus("Could not read the file: " + err.message, true);
  }
}

fileInput.addEventListener("change", e => {
  if (e.target.files?.[0]) handleFile(e.target.files[0]);
});

markBtn.addEventListener("click", async () => {
  if (!extractedText.trim()) return;
  markBtn.disabled = true;
  resultSection.classList.add("hidden");
  setStatus("Evaluating the assessment…");

  const rules = JSON.parse(localStorage.getItem("ioshReviewerRules") || "[]");
  const body = {
    text: extractedText,
    filename: currentFile?.name || "assessment",
    model: document.getElementById("modelSelect").value,
    wholeRowRule: document.getElementById("wholeRowRule").checked,
    reviewerRules: rules
  };

  try {
    const res = await fetch("/api/mark", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Marking failed.");
    currentReport = data.report;
    reportBox.innerHTML = markdownToHtml(currentReport);
    resultFile.textContent = currentFile?.name || "";
    resultSection.classList.remove("hidden");
    setStatus("Marking complete.");
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    markBtn.disabled = false;
  }
});

downloadBtn.addEventListener("click", () => {
  const blob = new Blob([currentReport], {type: "text/markdown;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const base = (currentFile?.name || "assessment").replace(/\.[^.]+$/, "");
  a.download = `${base}_IOSH_marking_report.md`;
  a.click();
  URL.revokeObjectURL(a.href);
});

function renderRules() {
  const rules = JSON.parse(localStorage.getItem("ioshReviewerRules") || "[]");
  ruleList.innerHTML = "";
  if (!rules.length) {
    ruleList.innerHTML = '<p class="small">No extra reviewer rules saved yet.</p>';
    return;
  }
  rules.forEach((rule, i) => {
    const div = document.createElement("div");
    div.className = "rule";
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.onclick = () => {
      rules.splice(i,1);
      localStorage.setItem("ioshReviewerRules", JSON.stringify(rules));
      renderRules();
    };
    div.appendChild(btn);
    div.appendChild(document.createTextNode(rule));
    ruleList.appendChild(div);
  });
}

saveRuleBtn.addEventListener("click", () => {
  const value = ruleInput.value.trim();
  if (!value) return;
  const rules = JSON.parse(localStorage.getItem("ioshReviewerRules") || "[]");
  rules.push(value);
  localStorage.setItem("ioshReviewerRules", JSON.stringify(rules));
  ruleInput.value = "";
  renderRules();
});

renderRules();
