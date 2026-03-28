const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const SHIFT_TYPES = {
  any: "Any shift",
  am: "AM only",
  pm: "PM only"
};

let employeesCache = [];

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
function minutesFromTime(t){
  if(!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const [h,m] = t.split(":").map(Number);
  return h*60+m;
}
function formatTime(t){
  if(!t) return "—";
  const [h,m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  let hour = h % 12;
  if(hour === 0) hour = 12;
  return `${hour}:${String(m).padStart(2,"0")} ${ampm}`;
}
function getShiftBand(start, end){
  const s = minutesFromTime(start);
  const e = minutesFromTime(end);
  if(s == null || e == null) return "unknown";
  if(e <= s) return "invalid";
  return e <= 12*60 ? "am" : (s >= 12*60 ? "pm" : "mixed");
}
function prettyDuration(mins){
  if(mins == null) return "—";
  const h = Math.floor(mins/60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}
function getDayMeta(currentDateValue){
  if(!currentDateValue){
    return {
      currentIndex: null,
      prevIndex: null,
      nextIndex: null,
      labels: {prev:"Previous Day", current:"Swap Day", next:"Next Day"}
    };
  }
  const d = new Date(currentDateValue + "T00:00:00");
  const currentIndex = d.getDay();
  const prevIndex = (currentIndex + 6) % 7;
  const nextIndex = (currentIndex + 1) % 7;
  return {
    currentIndex, prevIndex, nextIndex,
    labels: {
      prev: `Previous Day (${DAYS[prevIndex]})`,
      current: `Swap Day (${DAYS[currentIndex]})`,
      next: `Next Day (${DAYS[nextIndex]})`
    }
  };
}
function employeeList(){
  return employeesCache.slice().sort((a,b)=>a.name.localeCompare(b.name));
}
function buildEmployeeOptions(selected=""){
  const employees = employeeList();
  if(!employees.length) return `<option value="">No employees saved yet</option>`;
  return `<option value="">Select employee</option>` + employees.map(e =>
    `<option value="${escapeHtml(e.name)}" ${e.name===selected?'selected':''}>${escapeHtml(e.name)}</option>`
  ).join("");
}
function createEntryHtml(dayKey, idx, data={}){
  return `
    <div class="entry" data-day="${dayKey}" data-entry-index="${idx}">
      <div class="entry-head">
        <span class="badge">Entry ${idx+1}</span>
        <button type="button" class="btn danger remove-entry-btn">Remove</button>
      </div>
      <div class="grid grid-3">
        <div class="field">
          <label>Employee</label>
          <select class="entry-name">${buildEmployeeOptions(data.name || "")}</select>
        </div>
        <div class="field">
          <label>Start time</label>
          <input class="entry-start" type="time" value="${escapeHtml(data.start || "")}">
        </div>
        <div class="field">
          <label>End time</label>
          <input class="entry-end" type="time" value="${escapeHtml(data.end || "")}">
        </div>
      </div>
      <div class="entry-feedback small"></div>
    </div>
  `;
}
function gatherDayEntries(dayKey){
  const container = document.querySelector(`[data-entries="${dayKey}"]`);
  if(!container) return [];
  return [...container.querySelectorAll(".entry")].map(entry => ({
    name: entry.querySelector(".entry-name")?.value?.trim() || "",
    start: entry.querySelector(".entry-start")?.value || "",
    end: entry.querySelector(".entry-end")?.value || ""
  }));
}
function validateEntry(entry){
  const feedback = entry.querySelector(".entry-feedback");
  const start = entry.querySelector(".entry-start").value;
  const end = entry.querySelector(".entry-end").value;
  const name = entry.querySelector(".entry-name").value;
  const issues = [];
  if(!name) issues.push("Pick an employee.");
  if(!start) issues.push("Enter a start time.");
  if(!end) issues.push("Enter an end time.");
  const s = minutesFromTime(start);
  const e = minutesFromTime(end);
  if(s != null && e != null && e <= s){
    issues.push("End time must be later than start time.");
  }
  const band = getShiftBand(start, end);
  if(band === "mixed"){
    issues.push("This shift crosses AM and PM. That is allowed, but it will not match AM-only or PM-only employees.");
  }
  if(!issues.length){
    feedback.innerHTML = `<div class="message ok">Looks valid: ${formatTime(start)} to ${formatTime(end)}</div>`;
  }else{
    feedback.innerHTML = `<div class="message warn">${issues.join("<br>")}</div>`;
  }
}
function attachEntryHandlers(entry){
  entry.querySelectorAll("input,select").forEach(el=>{
    el.addEventListener("input", ()=>validateEntry(entry));
    el.addEventListener("change", ()=>validateEntry(entry));
  });
  entry.querySelector(".remove-entry-btn").addEventListener("click", ()=>{
    entry.remove();
    refreshEntryNumbers(entry.closest("[data-entries]").dataset.entries);
  });
  validateEntry(entry);
}
function refreshEntryNumbers(dayKey){
  const container = document.querySelector(`[data-entries="${dayKey}"]`);
  [...container.querySelectorAll(".entry")].forEach((entry, idx)=>{
    const badge = entry.querySelector(".badge");
    if(badge) badge.textContent = `Entry ${idx+1}`;
    entry.dataset.entryIndex = idx;
  });
}
function addEntry(dayKey, preset={}){
  const container = document.querySelector(`[data-entries="${dayKey}"]`);
  const idx = container.querySelectorAll(".entry").length;
  container.insertAdjacentHTML("beforeend", createEntryHtml(dayKey, idx, preset));
  attachEntryHandlers(container.lastElementChild);
}
function refillEmployeeDropdowns(){
  document.querySelectorAll(".entry-name").forEach(select=>{
    const current = select.value;
    select.innerHTML = buildEmployeeOptions(current);
  });
  const myName = document.getElementById("myName");
  if(myName){
    const current = myName.value;
    myName.innerHTML = buildEmployeeOptions(current);
  }
}
function shiftAllowedForEmployee(employee, swapShift){
  const band = getShiftBand(swapShift.start, swapShift.end);
  if(band === "invalid" || band === "unknown") return {ok:false, reason:"Swap shift time is invalid."};
  if(employee.shiftType === "any") return {ok:true};
  if(band === "mixed") return {ok:false, reason:`Shift is mixed AM/PM, but ${employee.name} is ${SHIFT_TYPES[employee.shiftType].toLowerCase()}.`};
  if(employee.shiftType !== band) return {ok:false, reason:`Only allowed to work ${SHIFT_TYPES[employee.shiftType].toLowerCase()}.`};
  return {ok:true};
}
function dayAllowedForEmployee(employee, dayIndex){
  if(dayIndex == null) return {ok:true};
  if(!Array.isArray(employee.allowedDays) || employee.allowedDays.length === 0) return {ok:true};
  if(employee.allowedDays.includes(dayIndex)) return {ok:true};
  return {ok:false, reason:`Not available on ${DAYS[dayIndex]}.`};
}
function restGapCheck(candidateName, prevEntries, nextEntries, swapShift){
  const prev = prevEntries.find(e => e.name === candidateName);
  if(prev){
    const prevEnd = minutesFromTime(prev.end);
    const swapStart = minutesFromTime(swapShift.start);
    if(prevEnd == null || swapStart == null) return {ok:false, reason:"Invalid previous day or swap shift time."};
    const gap = (24*60 + swapStart) - prevEnd;
    if(gap < 660){
      return {ok:false, reason:`Only ${prettyDuration(gap)} rest from previous day end (${formatTime(prev.end)}) to swap shift start (${formatTime(swapShift.start)}). Need 11h.`};
    }
  }
  const next = nextEntries.find(e => e.name === candidateName);
  if(next){
    const swapEnd = minutesFromTime(swapShift.end);
    const nextStart = minutesFromTime(next.start);
    if(swapEnd == null || nextStart == null) return {ok:false, reason:"Invalid next day or swap shift time."};
    const gap = (24*60 + nextStart) - swapEnd;
    if(gap < 660){
      return {ok:false, reason:`Only ${prettyDuration(gap)} rest from swap shift end (${formatTime(swapShift.end)}) to next day start (${formatTime(next.start)}). Need 11h.`};
    }
  }
  return {ok:true};
}
function duplicatePeople(entries){
  const count = {};
  entries.forEach(e=>{
    if(e.name) count[e.name] = (count[e.name] || 0) + 1;
  });
  return Object.keys(count).filter(k => count[k] > 1);
}
function renderResults(results){
  const target = document.getElementById("results");
  const eligible = results.filter(r => r.ok);
  const ineligible = results.filter(r => !r.ok);

  let html = `
    <div class="card">
      <h3>Summary</h3>
      <div class="kv">
        <div class="small">Eligible</div><div><strong>${eligible.length}</strong></div>
        <div class="small">Not eligible</div><div><strong>${ineligible.length}</strong></div>
      </div>
    </div>
  `;

  if(eligible.length){
    html += `<div class="card"><h3>Employees who can take your shift</h3><div class="results">`;
    html += eligible.map(r => `
      <div class="result-item ok">
        <div class="inline" style="justify-content:space-between">
          <strong>${escapeHtml(r.employee.name)}</strong>
          <span class="badge">${escapeHtml(r.employee.contact || "No contact saved")}</span>
        </div>
        <div class="small" style="margin-top:8px">Valid for the selected swap shift.</div>
      </div>
    `).join("");
    html += `</div></div>`;
  }

  if(ineligible.length){
    html += `<div class="card"><h3>Why others are invalid</h3><div class="results">`;
    html += ineligible.map(r => `
      <div class="result-item bad">
        <div class="inline" style="justify-content:space-between">
          <strong>${escapeHtml(r.employee.name)}</strong>
          <span class="badge">${escapeHtml(r.employee.contact || "No contact saved")}</span>
        </div>
        <ul>
          ${r.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join("")}
        </ul>
      </div>
    `).join("");
    html += `</div></div>`;
  }

  target.innerHTML = html;
}
function runSwapCheck(){
  const employees = employeeList();
  const myName = document.getElementById("myName").value.trim();
  const currentDate = document.getElementById("swapDate").value;
  const meta = getDayMeta(currentDate);
  const prev = gatherDayEntries("prev");
  const curr = gatherDayEntries("current");
  const next = gatherDayEntries("next");
  const allEntries = [...prev, ...curr, ...next];
  const problems = [];

  if(!employees.length) problems.push("No employees saved yet. Add employees first.");
  if(!myName) problems.push("Select your name.");
  if(allEntries.some(e => !e.name || !e.start || !e.end)) problems.push("One or more schedule rows are incomplete.");

  ["prev","current","next"].forEach(dayKey=>{
    const dupes = duplicatePeople(gatherDayEntries(dayKey));
    if(dupes.length) problems.push(`Duplicate names found in ${dayKey === "prev" ? "Previous Day" : dayKey === "current" ? "Swap Day" : "Next Day"}: ${dupes.join(", ")}.`);
  });

  const myShift = curr.find(e=>e.name === myName);
  if(!myShift) problems.push("Your name must appear in the Swap Day column.");
  if(myShift && getShiftBand(myShift.start, myShift.end) === "invalid") problems.push("Your shift time is invalid.");

  if(problems.length){
    document.getElementById("results").innerHTML = `
      <div class="card">
        <h3>Cannot calculate yet</h3>
        <div class="message err">${problems.map(p=>escapeHtml(p)).join("<br>")}</div>
      </div>
    `;
    return;
  }

  const results = employees.filter(emp => emp.name !== myName).map(emp => {
    const reasons = [];
    if(curr.some(e => e.name === emp.name)) reasons.push("Already working on the swap day.");

    const shiftCondition = shiftAllowedForEmployee(emp, myShift);
    if(!shiftCondition.ok) reasons.push(shiftCondition.reason);

    const prevDayCondition = dayAllowedForEmployee(emp, meta.prevIndex);
    const currentDayCondition = dayAllowedForEmployee(emp, meta.currentIndex);
    const nextDayCondition = dayAllowedForEmployee(emp, meta.nextIndex);

    if(prev.find(e=>e.name===emp.name) && !prevDayCondition.ok) reasons.push(`Previous day entry conflicts with saved availability. ${prevDayCondition.reason}`);
    if(!currentDayCondition.ok) reasons.push(currentDayCondition.reason);
    if(next.find(e=>e.name===emp.name) && !nextDayCondition.ok) reasons.push(`Next day entry conflicts with saved availability. ${nextDayCondition.reason}`);

    const rest = restGapCheck(emp.name, prev, next, myShift);
    if(!rest.ok) reasons.push(rest.reason);

    return {employee: emp, ok: reasons.length === 0, reasons};
  });

  results.sort((a,b)=> Number(b.ok) - Number(a.ok) || a.employee.name.localeCompare(b.employee.name));
  renderResults(results);
}
function clearSchedule(){
  ["prev","current","next"].forEach(dayKey=>{
    const container = document.querySelector(`[data-entries="${dayKey}"]`);
    container.innerHTML = "";
    addEntry(dayKey);
  });
  document.getElementById("results").innerHTML = "";
}
function applyDayLabels(){
  const meta = getDayMeta(document.getElementById("swapDate").value);
  document.querySelector("[data-title='prev']").textContent = meta.labels.prev;
  document.querySelector("[data-title='current']").textContent = meta.labels.current;
  document.querySelector("[data-title='next']").textContent = meta.labels.next;
  document.getElementById("dateHint").textContent = meta.currentIndex == null ?
    "Pick the swap date so saved day restrictions can be checked properly." :
    `Saved availability will be checked against ${DAYS[meta.prevIndex]}, ${DAYS[meta.currentIndex]}, and ${DAYS[meta.nextIndex]}.`;
}
function listenEmployeesRealtime(onReady){
  employeeDB.off();
  employeeDB.on("value", snapshot => {
    employeesCache = [];
    snapshot.forEach(child => {
      employeesCache.push({
        id: child.key,
        ...child.val()
      });
    });
    refillEmployeeDropdowns();
    if (typeof onReady === "function") onReady();
  });
}
function initSwapPage(){
  if(!document.getElementById("mainPage")) return;

  document.getElementById("myName").innerHTML = buildEmployeeOptions();
  ["prev","current","next"].forEach(dayKey=>addEntry(dayKey));

  document.querySelectorAll(".add-entry-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>addEntry(btn.dataset.day));
  });

  document.getElementById("runCheckBtn").addEventListener("click", runSwapCheck);
  document.getElementById("clearScheduleBtn").addEventListener("click", clearSchedule);
  document.getElementById("swapDate").addEventListener("change", applyDayLabels);

  applyDayLabels();
  listenEmployeesRealtime();
}
document.addEventListener("DOMContentLoaded", initSwapPage);
