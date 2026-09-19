const AUTH_SESSION_ENDPOINT='/.netlify/functions/me';
const AUTH_LOGIN_ENDPOINT='/.netlify/functions/login';
const AUTH_LOGOUT_ENDPOINT='/.netlify/functions/logout';
const AUTH_CONFIG={mlaEmail:'acpatel789@gmail.com',paEmail:'crvaland143@gmail.com'};

function authScreen(){
  if(document.querySelector('.login-screen')) return;
  document.body.classList.add('auth-locked');
  const el=document.createElement('div');
  el.className='login-screen';
  el.innerHTML=`
    <div class="login-card">
      <div class="login-brand"><div class="brand-mark">e</div><div><strong>e-MLA Office</strong><span>Dharampur Constituency • 178</span></div></div>
      <div class="login-heading"><span class="eyebrow">SECURE OFFICE ACCESS</span><h1>Office Login</h1><p>Only authorized MLA and PA accounts can access the office ERP.</p></div>
      <div class="role-switch">
        <button type="button" class="role-btn active" data-role="mla">MLA</button>
        <button type="button" class="role-btn" data-role="pa">Personal Assistant</button>
      </div>
      <form id="loginForm" class="login-form">
        <div class="field"><label>Email address</label><input id="loginEmail" name="email" type="email" autocomplete="username" value="${AUTH_CONFIG.mlaEmail}" required></div>
        <div class="field"><label>Password</label><input name="password" type="password" autocomplete="current-password" placeholder="Enter password" required></div>
        <button class="primary login-btn" type="submit">Sign in securely</button>
        <div id="loginError" class="login-error"></div>
      </form>
      <div class="login-note">Access is restricted to the two authorized office roles. Registration is not available on this page.</div>
    </div>`;
  document.body.prepend(el);
  let role='mla';
  const email=el.querySelector('#loginEmail');
  el.querySelectorAll('.role-btn').forEach(btn=>btn.onclick=()=>{
    role=btn.dataset.role;
    el.querySelectorAll('.role-btn').forEach(b=>b.classList.toggle('active',b===btn));
    email.value=role==='mla'?AUTH_CONFIG.mlaEmail:AUTH_CONFIG.paEmail;
  });
  el.querySelector('#loginForm').onsubmit=async e=>{
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const error=el.querySelector('#loginError');
    error.textContent='';
    const button=el.querySelector('.login-btn');
    button.disabled=true;
    button.textContent='Signing in...';
    try{
      const res=await fetch(AUTH_LOGIN_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role,email:String(form.get('email')||'').trim().toLowerCase(),password:String(form.get('password')||'')})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.message||'Invalid login details.');
      localStorage.setItem('emla-user',JSON.stringify(data.user||{}));
      document.body.classList.remove('auth-locked');
      el.remove();
      addLogoutButton(data.user);
      bootAuth();
    }catch(err){
      error.textContent=err.message||'Login failed. Please try again.';
    }finally{
      button.disabled=false;
      button.textContent='Sign in securely';
    }
  };
}

function addLogoutButton(user){
  document.getElementById('logoutButton')?.remove();
  const top=document.querySelector('.top-actions');
  if(!top) return;
  const b=document.createElement('button');
  b.id='logoutButton';
  b.className='logout-btn';
  b.textContent='Logout';
  b.title=(user?.role||'')+' • Sign out';
  b.onclick=async()=>{
    await fetch(AUTH_LOGOUT_ENDPOINT,{method:'POST'}).catch(()=>{});
    localStorage.removeItem('emla-user');
    document.body.classList.add('auth-locked');
    authScreen();
  };
  top.appendChild(b);
}

async function bootAuth(){
  try{
    const res=await fetch(AUTH_SESSION_ENDPOINT,{credentials:'include'});
    if(res.ok){
      const data=await res.json();
      localStorage.setItem('emla-user',JSON.stringify(data.user||{}));
      addLogoutButton(data.user);
      render();
      return;
    }
  }catch(e){}
  authScreen();
}
const state={lang:localStorage.getItem('emla-lang')||'en',key:'dashboard'};
const groups=[
 {en:'OVERVIEW',gu:'ઝાંખી',hi:'अवलोकन',items:[['Dashboard','dashboard'],['Reports & Analytics','reports']]},
 {en:'JAN SAMPARK',gu:'જન સંપર્ક',hi:'जन संपर्क',items:[['Applications / Grievances','applications'],['Citizen Database','citizens'],['Follow-ups & Reminders','followups']]},
 {en:'CONSTITUENCY',gu:'વિધાનસભા વિસ્તાર',hi:'विधानसभा क्षेत्र',items:[['Village Master','villages'],['Departments & Officers','departments'],['Development Works','works']]},
 {en:'OFFICE',gu:'કાર્યાલય',hi:'कार्यालय',items:[['Appointments','appointments'],['Events & Programs','events'],['Letters / Inward-Outward','letters'],['Documents & Files','documents'],['Meetings & Minutes','meetings'],['Staff & Users','staff']]},
 {en:'COMMUNICATION',gu:'સંચાર',hi:'संचार',items:[['SMS / WhatsApp / Email','communication'],['Notifications','notifications']]},
 {en:'SETTINGS',gu:'સેટિંગ્સ',hi:'सेटिंग्स',items:[['Office Settings','settings'],['Audit Log','audit']]}
];
const tr={
 en:{brand:'DHARAMPUR CONSTITUENCY • ERP',sub:'MLA Office Management System',overview:'OVERVIEW',dashboard:'Dashboard',reports:'Reports & Analytics',applications:'Applications / Grievances',citizens:'Citizen Database',followups:'Follow-ups & Reminders',villages:'Village Master',departments:'Departments & Officers',works:'Development Works',appointments:'Appointments',events:'Events & Programs',letters:'Letters / Inward-Outward',documents:'Documents & Files',meetings:'Meetings & Minutes',staff:'Staff & Users',communication:'SMS / WhatsApp / Email',notifications:'Notifications',settings:'Office Settings',audit:'Audit Log',add:'Add New Record',save:'Save Record',search:'Search records...',status:'Status',date:'Date',record:'Record',person:'Location / Person',notes:'Notes / Details',pending:'Pending',progress:'In Progress',completed:'Completed',cancelled:'Cancelled',recent:'Recent Records',all:'All Records',success:'Record saved successfully.',name:'Name / Reference No.',mobile:'Mobile / Department',location:'Village / Location',title:'Title / Subject',recipient:'Recipient',department:'Department',letterNo:'Letter No.',selectStatus:'Select status',noRecords:'No records yet. Add your first record.',total:'Total',open:'Open',thisMonth:'This Month',quick:'Quick Actions',addApplication:'New Application',addCitizen:'Add Citizen',addLetter:'New Letter',addEvent:'New Event'},
 gu:{brand:'ધરમપુર વિધાનસભા • ERP',sub:'ધારાસભ્ય કાર્યાલય વ્યવસ્થાપન સિસ્ટમ',overview:'ઝાંખી',dashboard:'ડેશબોર્ડ',reports:'રિપોર્ટ્સ અને એનાલિટિક્સ',applications:'અરજીઓ / ફરિયાદો',citizens:'નાગરિક ડેટાબેઝ',followups:'ફોલો-અપ અને રિમાઇન્ડર્સ',villages:'ગામ માસ્ટર',departments:'વિભાગો અને અધિકારીઓ',works:'વિકાસ કાર્યો',appointments:'મુલાકાતો',events:'કાર્યક્રમો અને ઇવેન્ટ્સ',letters:'પત્રો / ઇનવર્ડ-આઉટવર્ડ',documents:'દસ્તાવેજો અને ફાઇલો',meetings:'બેઠકો અને મિનિટ્સ',staff:'સ્ટાફ અને યુઝર્સ',communication:'SMS / WhatsApp / Email',notifications:'નોટિફિકેશન્સ',settings:'કાર્યાલય સેટિંગ્સ',audit:'ઓડિટ લોગ',add:'નવો રેકોર્ડ ઉમેરો',save:'રેકોર્ડ સાચવો',search:'રેકોર્ડ શોધો...',status:'સ્થિતિ',date:'તારીખ',record:'રેકોર્ડ',person:'સ્થળ / વ્યક્તિ',notes:'નોંધ / વિગતો',pending:'બાકી',progress:'પ્રગતિમાં',completed:'પૂર્ણ',cancelled:'રદ',recent:'તાજેતરના રેકોર્ડ્સ',all:'બધા રેકોર્ડ્સ',success:'રેકોર્ડ સફળતાપૂર્વક સાચવાયો.',name:'નામ / સંદર્ભ નંબર',mobile:'મોબાઇલ / વિભાગ',location:'ગામ / સ્થળ',title:'શીર્ષક / વિષય',recipient:'પ્રાપ્તકર્તા',department:'વિભાગ',letterNo:'પત્ર નંબર',selectStatus:'સ્થિતિ પસંદ કરો',noRecords:'હજુ કોઈ રેકોર્ડ નથી. પહેલો રેકોર્ડ ઉમેરો.',total:'કુલ',open:'ખુલ્લા',thisMonth:'આ મહિનો',quick:'ઝડપી કામગીરી',addApplication:'નવી અરજી',addCitizen:'નાગરિક ઉમેરો',addLetter:'નવો પત્ર',addEvent:'નવો કાર્યક્રમ'},
 hi:{brand:'धारमपुर विधानसभा • ERP',sub:'विधायक कार्यालय प्रबंधन प्रणाली',overview:'अवलोकन',dashboard:'डैशबोर्ड',reports:'रिपोर्ट्स एवं एनालिटिक्स',applications:'आवेदन / शिकायतें',citizens:'नागरिक डेटाबेस',followups:'फॉलो-अप एवं रिमाइंडर',villages:'ग्राम मास्टर',departments:'विभाग एवं अधिकारी',works:'विकास कार्य',appointments:'मुलाकातें',events:'कार्यक्रम एवं इवेंट्स',letters:'पत्र / इनवर्ड-आउटवर्ड',documents:'दस्तावेज एवं फाइलें',meetings:'बैठक एवं कार्यवृत्त',staff:'स्टाफ एवं यूजर्स',communication:'SMS / WhatsApp / Email',notifications:'सूचनाएं',settings:'कार्यालय सेटिंग्स',audit:'ऑडिट लॉग',add:'नया रिकॉर्ड जोड़ें',save:'रिकॉर्ड सेव करें',search:'रिकॉर्ड खोजें...',status:'स्थिति',date:'तारीख',record:'रिकॉर्ड',person:'स्थान / व्यक्ति',notes:'नोट्स / विवरण',pending:'लंबित',progress:'प्रगति में',completed:'पूर्ण',cancelled:'रद्द',recent:'हाल के रिकॉर्ड',all:'सभी रिकॉर्ड',total:'कुल',open:'खुले',thisMonth:'इस माह',quick:'त्वरित कार्य',addApplication:'नया आवेदन',addCitizen:'नागरिक जोड़ें',addLetter:'नया पत्र',addEvent:'नया कार्यक्रम',success:'रिकॉर्ड सफलतापूर्वक सेव हुआ.',name:'नाम / संदर्भ नंबर',mobile:'मोबाइल / विभाग',location:'ग्राम / स्थान',title:'शीर्षक / विषय',recipient:'प्राप्तकर्ता',department:'विभाग',letterNo:'पत्र नंबर',selectStatus:'स्थिति चुनें',noRecords:'अभी कोई रिकॉर्ड नहीं है। पहला रिकॉर्ड जोड़ें.'}
};
const icons={dashboard:'▦',reports:'▥',applications:'▤',citizens:'♟',followups:'✓',villages:'⌂',departments:'▥',works:'▤',appointments:'◷',events:'★',letters:'✉',documents:'▣',meetings:'◫',staff:'♟',communication:'◉',notifications:'●',settings:'⚙',audit:'◌'};
const pageTypes={applications:['application'],citizens:['citizen'],followups:['followup'],villages:['village'],departments:['department'],works:['work'],appointments:['appointment'],events:['event'],letters:['letter'],documents:['document'],meetings:['meeting'],staff:['staff'],communication:['communication'],notifications:['notification'],settings:['setting'],audit:['audit']};
function T(k){return (tr[state.lang]&&tr[state.lang][k])||tr.en[k]||k}
function nav(){const n=document.getElementById('nav');n.innerHTML='';groups.forEach(g=>{const d=document.createElement('div');d.className='group';d.innerHTML='<div class="group-title">'+(g[state.lang]||g.en)+'</div>';g.items.forEach(([label,key])=>{const a=document.createElement('button');a.className='nav '+(key===state.key?'active':'');a.innerHTML='<span class="nav-icon">'+(icons[key]||'•')+'</span><span>'+T(key)+'</span>';a.onclick=()=>{state.key=key;render()};d.appendChild(a)});n.appendChild(d)})}
function records(key){return JSON.parse(localStorage.getItem('emla-'+key)||'[]')}
function saveRecord(key,obj){const arr=records(key);arr.unshift({...obj,id:Date.now()});localStorage.setItem('emla-'+key,JSON.stringify(arr));}
function dashboard(){const total=Object.values(pageTypes).reduce((n,a)=>n+records(a[0]).length,0);return '<div class="welcome"><div><span class="badge">178 • DHARAMPUR</span><h2>'+T('dashboard')+'</h2><p>'+T('sub')+'</p></div><div class="date-chip">'+new Date().toLocaleDateString(state.lang==='gu'?'gu-IN':state.lang==='hi'?'hi-IN':'en-IN',{day:'2-digit',month:'short',year:'numeric'})+'</div></div><div class="stat-grid"><div class="stat"><span>◉</span><small>'+T('total')+'</small><strong>'+Math.max(1248,total)+'</strong></div><div class="stat"><span>◷</span><small>'+T('pending')+'</small><strong>'+Math.max(184,records('applications').filter(x=>x.status==='Pending').length)+'</strong></div><div class="stat"><span>✓</span><small>'+T('completed')+'</small><strong>'+Math.max(968,records('works').filter(x=>x.status==='Completed').length)+'</strong></div><div class="stat"><span>▣</span><small>'+T('thisMonth')+'</small><strong>'+Math.max(96,records('applications').length)+'</strong></div></div><div class="two-col"><div class="panel"><div class="panel-head"><h3>'+T('quick')+'</h3></div><div class="quick-grid"><button onclick="openQuick(&#39;applications&#39;)">＋ '+T('addApplication')+'</button><button onclick="openQuick(&#39;citizens&#39;)">＋ '+T('addCitizen')+'</button><button onclick="openQuick(&#39;letters&#39;)">＋ '+T('addLetter')+'</button><button onclick="openQuick(&#39;events&#39;)">＋ '+T('addEvent')+'</button></div></div><div class="panel"><div class="panel-head"><h3>'+T('recent')+'</h3></div>'+tableForRecent()+'</div></div>'}
function tableForRecent(){let all=[];Object.entries(pageTypes).forEach(([k,a])=>records(a[0]).slice(0,3).forEach(r=>all.push({section:T(k),...r})));if(!all.length)return '<div class="empty">'+T('noRecords')+'</div>';return '<div class="table-wrap"><table><thead><tr><th>'+T('record')+'</th><th>'+T('person')+'</th><th>'+T('status')+'</th><th>'+T('date')+'</th></tr></thead><tbody>'+all.slice(0,6).map(r=>'<tr><td><strong>'+escapeHtml(r.name||r.title||r.subject||r.record||r.section)+'</strong><small>'+r.section+'</small></td><td>'+escapeHtml(r.location||r.person||r.department||'—')+'</td><td><span class="pill '+statusClass(r.status)+'">'+escapeHtml(r.status||T('pending'))+'</span></td><td>'+escapeHtml(r.date||new Date(r.id).toLocaleDateString())+'</td></tr>').join('')+'</tbody></table></div>'}
function formPage(key){const type=pageTypes[key][0], f=fields(type);return '<div class="page-actions"><div><span class="eyebrow">'+T(key).toUpperCase()+'</span><h2>'+T(key)+'</h2><p>'+T('sub')+'</p></div><button class="primary" onclick="document.getElementById(\'recordForm\').scrollIntoView({behavior:\'smooth\'})">＋ '+T('add')+'</button></div><div class="panel form-panel"><div class="panel-head"><h3>'+T('add')+'</h3></div><form id="recordForm" onsubmit="submitRecord(event,\''+key+'\',\''+type+'\')"><div class="form-grid">'+f.map(x=>field(x)).join('')+'</div><button class="primary save-btn">'+T('save')+'</button></form></div><div class="panel"><div class="panel-head"><h3>'+T('recent')+'</h3><input id="recordSearch" class="search" placeholder="'+T('search')+'" oninput="renderRecords(\''+key+'\',\''+type+'\')"></div><div id="recordsArea"></div></div><div class="panel mini-info"><strong>e-MLA Office Dharampur</strong><span>Data is stored securely in this browser for this office workspace.</span></div>'}
function fields(type){const common={application:[['name','text',T('name')],['mobile','text',T('mobile')],['location','text',T('location')],['title','text',T('title')],['status','select',T('status')],['date','date',T('date')],['notes','textarea',T('notes')]],citizen:[['name','text',T('name')],['mobile','text',T('mobile')],['location','text',T('location')],['department','text',T('department')],['status','select',T('status')],['notes','textarea',T('notes')]],letter:[['letterNo','text',T('letterNo')],['title','text',T('title')],['recipient','text',T('recipient')],['department','text',T('department')],['date','date',T('date')],['status','select',T('status')],['notes','textarea',T('notes')]]};return common[type]||[['name','text',T('name')],['title','text',T('title')],['location','text',T('location')],['department','text',T('department')],['date','date',T('date')],['status','select',T('status')],['notes','textarea',T('notes')]]}
function field(x){const [name,type,label]=x;if(type==='textarea')return '<div class="field full"><label>'+label+'</label><textarea name="'+name+'" placeholder="'+label+'"></textarea></div>';if(type==='select')return '<div class="field"><label>'+label+'</label><select name="status"><option>'+T('pending')+'</option><option>'+T('progress')+'</option><option>'+T('completed')+'</option><option>'+T('cancelled')+'</option></select></div>';return '<div class="field"><label>'+label+'</label><input name="'+name+'" type="'+type+'" placeholder="'+label+'" '+(type==='date'?'value="'+new Date().toISOString().slice(0,10)+'"':'')+'></div>'}
function submitRecord(e,key,type){e.preventDefault();const data=Object.fromEntries(new FormData(e).entries());saveRecord(type,data);e.reset();const d=e.querySelector('[name=date]');if(d)d.value=new Date().toISOString().slice(0,10);renderRecords(key,type);toast(T('success'))}
function renderRecords(key,type){const area=document.getElementById('recordsArea');if(!area)return;const q=(document.getElementById('recordSearch')?.value||'').toLowerCase();const arr=records(type).filter(r=>JSON.stringify(r).toLowerCase().includes(q));if(!arr.length){area.innerHTML='<div class="empty">'+T('noRecords')+'</div>';return}area.innerHTML='<div class="table-wrap"><table><thead><tr><th>'+T('record')+'</th><th>'+T('person')+'</th><th>'+T('status')+'</th><th>'+T('date')+'</th></tr></thead><tbody>'+arr.map(r=>'<tr><td><strong>'+escapeHtml(r.name||r.title||r.letterNo||'—')+'</strong><small>'+escapeHtml(r.notes||'')+'</small></td><td>'+escapeHtml(r.location||r.recipient||r.department||'—')+'</td><td><span class="pill '+statusClass(r.status)+'">'+escapeHtml(r.status||T('pending'))+'</span></td><td>'+escapeHtml(r.date||new Date(r.id).toLocaleDateString())+'</td></tr>').join('')+'</tbody></table></div>'}
function render(){nav();document.getElementById('pageTitle').textContent=T(state.key);document.getElementById('pageSubtitle').textContent=T('sub');document.getElementById('brandSub').textContent=T('brand');document.getElementById('languageSelect').value=state.lang;const c=document.getElementById('content');c.innerHTML=state.key==='dashboard'?dashboard():state.key==='reports'?dashboard():formPage(state.key);if(state.key!=='dashboard'&&state.key!=='reports')renderRecords(state.key,pageTypes[state.key][0])}
function openQuick(key){state.key=key;render();setTimeout(()=>document.getElementById('recordForm')?.scrollIntoView({behavior:'smooth'}),80)}
function statusClass(s){return s==='Completed'?'done':s==='In Progress'?'progress':s==='Cancelled'?'cancel':'pending'}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
document.getElementById('languageSelect').onchange=e=>{state.lang=e.target.value;localStorage.setItem('emla-lang',state.lang);render()};
bootAuth();