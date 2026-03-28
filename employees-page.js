const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SHIFT_TYPES = {
  any: "Any shift",
  am: "AM only",
  pm: "PM only"
};

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
function downloadFile(filename, content, mime="application/json"){
  const blob = new Blob([content], {type:mime});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}
function renderEmployeeList(){
  const target = document.getElementById("employeeList");
  target.innerHTML = "";
  employeeDB.off();

  employeeDB.on("value", snapshot => {
    const rows = [];
    snapshot.forEach(child => {
      rows.push({
        id: child.key,
        ...child.val()
      });
    });
    rows.sort((a,b)=> (a.name || "").localeCompare(b.name || ""));

    if(!rows.length){
      target.innerHTML = `<div class="message warn">No employees saved yet.</div>`;
      return;
    }

    target.innerHTML = rows.map(e => `
      <div class="employee-card">
        <div class="inline" style="justify-content:space-between">
          <strong>${escapeHtml(e.name || "")}</strong>
          <button class="btn danger delete-employee-btn" data-id="${escapeHtml(e.id)}">Delete</button>
        </div>
        <div class="small" style="margin-top:8px">${escapeHtml(e.contact || "No contact saved")}</div>
        <div class="small" style="margin-top:6px">${escapeHtml(SHIFT_TYPES[e.shiftType || "any"])}</div>
        <div class="small" style="margin-top:6px">
          ${Array.isArray(e.allowedDays) && e.allowedDays.length ? e.allowedDays.map(d=>DAYS[d]).join(", ") : "All days allowed"}
        </div>
      </div>
    `).join("");

    target.querySelectorAll(".delete-employee-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        if(confirm("Delete this employee?")){
          employeeDB.child(btn.dataset.id).remove();
        }
      });
    });
  });
}
function setMessage(html){
  document.getElementById("employeeMessage").innerHTML = html;
}
function initEmployeesPage(){
  if(!document.getElementById("employeesPage")) return;

  document.getElementById("daysCheckboxes").innerHTML = DAYS.map((d, idx)=>`
    <label class="day-pill"><input type="checkbox" value="${idx}" class="allowed-day-box"> ${escapeHtml(d)}</label>
  `).join("");

  document.getElementById("employeeForm").addEventListener("submit", e=>{
    e.preventDefault();
    const name = document.getElementById("empName").value.trim();
    const contact = document.getElementById("empContact").value.trim();
    const shiftType = document.getElementById("empShiftType").value;
    const allowedDays = [...document.querySelectorAll(".allowed-day-box:checked")].map(x => Number(x.value));

    if(!name){
      setMessage(`<div class="message err">Name is required.</div>`);
      return;
    }

    employeeDB.orderByChild("name").equalTo(name).once("value", snapshot => {
      if(snapshot.exists()){
        setMessage(`<div class="message err">Employee already exists. Use a unique name.</div>`);
        return;
      }

      employeeDB.push({
        name,
        contact,
        shiftType,
        allowedDays
      }).then(()=>{
        document.getElementById("employeeForm").reset();
        document.querySelectorAll(".allowed-day-box").forEach(x=>x.checked=false);
        setMessage(`<div class="message ok">Employee saved to Firebase.</div>`);
      }).catch(err=>{
        setMessage(`<div class="message err">${escapeHtml(err.message || "Save failed.")}</div>`);
      });
    });
  });

  document.getElementById("exportEmployeesBtn").addEventListener("click", ()=>{
    employeeDB.once("value", snapshot => {
      const out = [];
      snapshot.forEach(child => {
        out.push({
          id: child.key,
          ...child.val()
        });
      });
      downloadFile("employees.json", JSON.stringify(out, null, 2));
    });
  });

  document.getElementById("importEmployeesInput").addEventListener("change", async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    try{
      const text = await file.text();
      const data = JSON.parse(text);
      if(!Array.isArray(data)) throw new Error("Imported file must be a JSON array.");

      for(const item of data){
        if(!item || !item.name) continue;
        await employeeDB.push({
          name: String(item.name).trim(),
          contact: String(item.contact || "").trim(),
          shiftType: ["any","am","pm"].includes(item.shiftType) ? item.shiftType : "any",
          allowedDays: Array.isArray(item.allowedDays) ? item.allowedDays.map(Number).filter(n=>n>=0 && n<=6) : []
        });
      }

      setMessage(`<div class="message ok">Employees imported to Firebase.</div>`);
    }catch(err){
      setMessage(`<div class="message err">${escapeHtml(err.message || "Import failed.")}</div>`);
    }finally{
      e.target.value = "";
    }
  });

  renderEmployeeList();
}
document.addEventListener("DOMContentLoaded", initEmployeesPage);
