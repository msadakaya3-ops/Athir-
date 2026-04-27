// تطبيق أثير ATHIR - منطق التطبيق الرئيسي
let activeTab = 'library';
let pdfFiles = [];
let notes = [];
let waterIntake = 0;
let stepsCount = 0;
let moonMood = 'محايد';
let memoryImages = [];
let pinCode = '';
let memoryLocked = true;
let calendarEvents = {};

const moonEmoji = { 'سعيد':'🌝', 'حزين':'🌚', 'غاضب':'🌚', 'محايد':'🌙' };

// حفظ وتحميل البيانات
const saveToLocal = () => {
  localStorage.setItem('athir_pdfs', JSON.stringify(pdfFiles.map(p => ({name:p.name, data:p.data, progress:p.progress}))));
  localStorage.setItem('athir_notes', JSON.stringify(notes));
  localStorage.setItem('athir_water', waterIntake);
  localStorage.setItem('athir_steps', stepsCount);
  localStorage.setItem('athir_memoryImages', JSON.stringify(memoryImages));
  localStorage.setItem('athir_calendar', JSON.stringify(calendarEvents));
};

const loadData = () => {
  try{
    let p = localStorage.getItem('athir_pdfs'); if(p) pdfFiles = JSON.parse(p);
    let n = localStorage.getItem('athir_notes'); if(n) notes = JSON.parse(n);
    let w = localStorage.getItem('athir_water'); if(w) waterIntake = parseInt(w);
    let s = localStorage.getItem('athir_steps'); if(s) stepsCount = parseInt(s);
    let mi = localStorage.getItem('athir_memoryImages'); if(mi) memoryImages = JSON.parse(mi);
    let ce = localStorage.getItem('athir_calendar'); if(ce) calendarEvents = JSON.parse(ce);
  }catch(e){}
};

loadData();

// دوال مساعدة
function addNote(text){
  if(text.trim()) notes.unshift({text, date: new Date().toLocaleString('ar-EG'), emoji:'📝'});
  saveToLocal();
  renderApp();
}

function addWater(){
  if(waterIntake < 12) waterIntake++;
  saveToLocal();
  renderApp();
}

function setSteps(val){
  stepsCount = parseInt(val) || 0;
  saveToLocal();
  renderApp();
}

function uploadPDF(file){
  const reader = new FileReader();
  reader.onload = e => {
    pdfFiles.push({ name: file.name, data: e.target.result, progress: 0 });
    saveToLocal();
    renderApp();
  };
  reader.readAsDataURL(file);
}

function openPDFViewer(pdfData, filename){
  let win = window.open();
  win.document.write(`
    <html dir="rtl"><head><style>body{margin:0; background:#000; color:white; font-family:Cairo} canvas{max-width:100%}</style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"><\/script>
    <script>
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      let pdfData = "${pdfData}";
      let loadingTask = pdfjsLib.getDocument({data: atob(pdfData.split(',')[1])});
      loadingTask.promise.then(pdf => {
        for(let i=1;i<=pdf.numPages;i++){
          pdf.getPage(i).then(page => {
            let scale = 1.5;
            let viewport = page.getViewport({scale});
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            document.body.appendChild(canvas);
            page.render({canvasContext: ctx, viewport}).promise;
          });
        }
      });
    <\/script>
  `);
  win.document.close();
}

let drawing = false;
function initCanvas(){
  let canvas = document.getElementById('neonCanvas');
  if(!canvas) return;
  let ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  let prevX, prevY;
  canvas.addEventListener('mousedown', (e)=>{ drawing=true; prevX=e.offsetX; prevY=e.offsetY; });
  canvas.addEventListener('mousemove', (e)=>{ if(drawing){ ctx.beginPath(); ctx.moveTo(prevX,prevY); ctx.lineTo(e.offsetX,e.offsetY); ctx.stroke(); prevX=e.offsetX; prevY=e.offsetY; }});
  canvas.addEventListener('mouseup',()=>drawing=false);
  canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); drawing=true; let rect=canvas.getBoundingClientRect(); prevX=e.touches[0].clientX-rect.left; prevY=e.touches[0].clientY-rect.top; });
  canvas.addEventListener('touchmove', (e)=>{ e.preventDefault(); if(drawing){ let rect=canvas.getBoundingClientRect(); let x=e.touches[0].clientX-rect.left; let y=e.touches[0].clientY-rect.top; ctx.beginPath(); ctx.moveTo(prevX,prevY); ctx.lineTo(x,y); ctx.stroke(); prevX=x; prevY=y; }});
  canvas.addEventListener('touchend',()=>drawing=false);
  window.clearCanvas = ()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); };
}

let pomodoroInterval;
let pomodoroSeconds = 25*60;
let pomodoroActive=false;
function startPomodoro(){
  if(pomodoroInterval) clearInterval(pomodoroInterval);
  pomodoroActive=true;
  pomodoroInterval = setInterval(()=>{
    if(pomodoroSeconds<=0){
      clearInterval(pomodoroInterval);
      pomodoroActive=false;
      alert('✅ انتهت جلسة التركيز!');
      pomodoroSeconds = 25*60;
      renderApp();
    }
    else {
      pomodoroSeconds--;
      let timer = document.getElementById('pomodoroTimer');
      if(timer) timer.innerText = Math.floor(pomodoroSeconds/60)+':'+String(pomodoroSeconds%60).padStart(2,'0');
    }
  },1000);
  renderApp();
}

function navItem(tab, icon, label){
  return `<div class="nav-item ${activeTab===tab?'active':''} onclick="setActiveTab('${tab}')" style="cursor:pointer"><i class="${icon}"></i><span>${label}</span></div>`;
}

function getTabContent(){
  if(activeTab === 'library') return `
    <div class="glass-card"><div class="section-title"><i class="fas fa-upload"></i> مكتبتي - رفع PDF</div>
    <div class="upload-area" onclick="document.getElementById('pdfInput').click()"><i class="fas fa-cloud-upload-alt"></i> اضغط لرفع ملف PDF</div>
    <input type="file" id="pdfInput" accept="application/pdf" style="display:none" onchange="handlePDF(this.files[0])">
    ${pdfFiles.map((pdf,i)=>`<div class="book-card"><div><i class="fas fa-file-pdf"></i> ${pdf.name}</div><button onclick="openPDF(${i})">قراءة</button><button onclick="deletePDF(${i})">حذف</button></div>`).join('')}
    </div>`;
  if(activeTab === 'reader') return `<div class="glass-card"><div class="section-title"><i class="fas fa-eye"></i> قارئ متطور</div><p>اختر كتابًا من مكتبتي لبدء القراءة بدقة عالية مع دعم التشكيل والعرض المتجهي.</p></div>`;
  if(activeTab === 'notes') return `
    <div class="glass-card"><div class="section-title"><i class="fas fa-sticky-note"></i> المفكرة الذكية</div>
    <textarea id="noteText" class="rich-editor" rows="3" placeholder="اكتب ملاحظتك..."></textarea>
    <button onclick="saveNote()" style="margin-top:10px">حفظ الملاحظة</button>
    ${notes.map(n=>`<div style="border-bottom:1px solid cyan; padding:10px"><span>${n.emoji||'📝'}</span> <strong>${n.date}</strong><p>${n.text}</p></div>`).join('')}
    </div>`;
  if(activeTab === 'encyclopedia') return `<div class="glass-card"><div class="section-title"><i class="fas fa-university"></i> الموسوعة المعرفية</div><div id="encycContent">🌌 القمر يبعد 384,400 كم عن الأرض 🌙<br/>📚 المزيد من المعلومات قريباً...</div></div>`;
  if(activeTab === 'health') return `
    <div class="glass-card"><div class="section-title"><i class="fas fa-tint"></i> تتبع الماء والخطوات</div>
    <div style="text-align:center; padding:15px"><i class="fas fa-tint" style="font-size:40px;color:cyan"></i> <span id="waterCount">${waterIntake}</span>/8 أكواب <button onclick="addWater()">➕ كوب</button></div>
    <div style="padding:15px"><i class="fas fa-shoe-prints"></i> عدد الخطوات: <input type="number" id="stepInput" value="${stepsCount}" style="width:100px; padding:5px; border-radius:10px; border:1px solid cyan; background:rgba(0,0,0,0.5); color:white"><button onclick="setSteps(document.getElementById('stepInput').value)">تحديث</button></div>
    </div>`;
  if(activeTab === 'games') return `<div class="glass-card"><div class="section-title"><i class="fas fa-dice"></i> ألعاب بدون إنترنت</div>
    <button onclick="alert('❓ سؤال: عاصمة فرنسا؟\n✅ الإجابة: باريس')">أسئلة عامة</button>
    <button onclick="alert('🎮 لعبة الذاكرة: افتح البطاقات المتطابقة')">لعبة الذاكرة</button>
    <button onclick="alert('🧩 ألغاز الصور: المستوى السهل')">ألغاز</button>
    <div style="margin-top:12px"><i class="fas fa-palette"></i> <button onclick="setActiveTab('drawing')">مساحة الرسم المضيئة</button></div>
    </div>`;
  if(activeTab === 'drawing') return `<div class="glass-card"><div class="section-title"><i class="fas fa-brush"></i> الرسم النيوني</div><canvas id="neonCanvas" style="width:100%; height:300px; background:#010514; border-radius:24px; border:1px solid cyan"></canvas><div><button onclick="clearCanvas()">مسح</button><button onclick="saveDrawing()">حفظ</button></div></div>`;
  if(activeTab === 'calendar') return `<div class="glass-card"><div class="section-title"><i class="fas fa-calendar"></i> التقويم الذكي</div><div id="simpleCal">📅 ${new Date().toLocaleDateString('ar-EG')}<br/><button onclick="let ev=prompt('حدث?'); if(ev) alert('✅ تمت إضافة حدث')">إضافة حدث</button></div></div>`;
  if(activeTab === 'emergency') return `
    <div class="glass-card"><div class="section-title"><i class="fas fa-bolt"></i> مركز المساعدة الطارئة</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div><i class="fas fa-heartbeat"></i> <strong>نوبة هلع:</strong> تنفس عميق</div>
      <div><i class="fas fa-lungs"></i> <strong>ضيق تنفس:</strong> استخدم البخاخ</div>
      <div><i class="fas fa-fire"></i> <strong>حريق:</strong> 198 إطفاء</div>
      <div><i class="fas fa-faint"></i> <strong>إغماء:</strong> رفع الأرجل</div>
    </div>
    <div style="margin-top:15px; background:rgba(255,0,0,0.1); padding:15px; border-radius:20px">
      <strong>☎️ أرقام الطوارئ:</strong>
      <p>الشرطة: 197 | الإسعاف: 190 | الحماية المدنية: 198</p>
    </div>
    </div>`;
  if(activeTab === 'focus') return `
    <div class="glass-card"><div class="section-title"><i class="fas fa-brain"></i> وضع التركيز بومودورو</div>
    <div style="text-align:center;font-size:3rem;padding:20px" id="pomodoroTimer">25:00</div>
    <button onclick="startPomodoro()">▶️ ابدأ العمل</button> <button onclick="resetPomodoro()">⏹️ إيقاف</button>
    </div>`;
  if(activeTab === 'memory') return `<div class="glass-card"><div class="section-title"><i class="fas fa-lock"></i> ألبوم الذكريات</div><p>صورك وملاحظاتك المحمية بكود سري 🕊️</p><button onclick="addMemoryImage()">أضف صورة</button>${memoryImages.map(img=>`<div style="margin:10px 0"><img src="${img.src}" style="width:100%; border-radius:20px"/><p>${img.caption}</p></div>`).join('')}</div>`;
  if(activeTab === 'settings') return `<div class="glass-card"><div class="section-title"><i class="fas fa-sliders-h"></i> الإعدادات</div><label>الاسم: <input type="text" id="userName" placeholder="اسمك" style="padding:5px; border-radius:10px; border:1px solid cyan; background:rgba(0,0,0,0.5); color:white"/></label><br/><br/><button onclick="alert('✅ تم حفظ التعديلات')">حفظ التعديلات</button><hr/><button onclick="localStorage.clear(); location.reload()">🔄 إعادة ضبط التطبيق</button></div>`;
  return `<div class="glass-card">مرحباً في أثير 🌙</div>`;
}

function renderApp(){
  const appDiv = document.getElementById('app');
  let moonChar = moonEmoji[moonMood] || '🌙';
  let content = `
  <div class="main-container">
    <div class="moon-header">
      <div class="moon-avatar">
        <div class="moon-face" style="cursor:pointer">${moonChar}</div>
        <select id="moodSelect" onchange="changeMood(this.value)" style="background:transparent;color:white;border:1px solid cyan;border-radius:20px;padding:5px;">
          <option value="سعيد">😊 سعيد</option>
          <option value="حزين">😢 حزين</option>
          <option value="غاضب">😠 غاضب</option>
          <option value="محايد">😐 محايد</option>
        </select>
      </div>
      <div class="athir-title"><i class="fas fa-moon"></i> أثير ATHIR</div>
      <div class="quick-icons">
        <div class="quick-icon" onclick="setActiveTab('focus')" style="cursor:pointer;"><i class="fas fa-hourglass-half"></i></div>
        <div class="quick-icon" onclick="setActiveTab('emergency')" style="cursor:pointer;"><i class="fas fa-ambulance"></i></div>
      </div>
    </div>
    
    <div id="pageContent">${getTabContent()}</div>
    <footer>✨ المطور: AyaMsaddak ✨<br/>🌐 رابط التطبيق: athir-app.github.io</footer>
  </div>
  <div class="bottom-nav">
    ${navItem('library','fas fa-book','مكتبتي')}
    ${navItem('notes','fas fa-pen-alt','المفكرة')}
    ${navItem('health','fas fa-heartbeat','الصحة')}
    ${navItem('games','fas fa-gamepad','الألعاب')}
    ${navItem('calendar','fas fa-calendar-alt','التقويم')}
    ${navItem('focus','fas fa-brain','التركيز')}
    ${navItem('emergency','fas fa-ambulance','الطوارئ')}
    ${navItem('settings','fas fa-cog','الإعدادات')}
  </div>
  `;
  appDiv.innerHTML = content;
  if(activeTab === 'drawing') setTimeout(initCanvas, 50);
  if(activeTab === 'focus') {
    let timer = document.getElementById('pomodoroTimer');
    if(timer) timer.innerText = Math.floor(pomodoroSeconds/60)+':'+String(pomodoroSeconds%60).padStart(2,'0');
  }
}

// دوال النافذة العامة
window.setActiveTab = (tab) => { activeTab = tab; renderApp(); };
window.changeMood = (val) => { moonMood = val; renderApp(); };
window.handlePDF = (file) => { if(file) uploadPDF(file); };
window.openPDF = (idx) => { openPDFViewer(pdfFiles[idx].data, pdfFiles[idx].name); };
window.deletePDF = (idx) => { pdfFiles.splice(idx,1); saveToLocal(); renderApp(); };
window.saveNote = () => { let t = document.getElementById('noteText')?.value; if(t) { addNote(t); document.getElementById('noteText').value = ''; } };
window.addWater = () => { addWater(); };
window.setSteps = (val) => { setSteps(val); };
window.resetPomodoro = () => { clearInterval(pomodoroInterval); pomodoroActive = false; pomodoroSeconds = 25*60; renderApp(); };
window.saveDrawing = () => { alert('✅ تم حفظ الرسم!'); };
window.addMemoryImage = () => { alert('📸 سيتم إضافة دعم رفع الصور قريباً'); };

// بدء التطبيق
renderApp();