import { useState, useEffect, useRef } from "react";

async function storageGet(key, fallback) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : fallback; }
  catch { return fallback; }
}
async function storageSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}

const DEFAULT_FAMILIES = [
  { id: 1, name: "Smith Family", students: ["Ira S.", "Zach S."] },
  { id: 2, name: "Croasmun Family", students: ["Allison C.", "Kate C.", "Titus C.", "Adaline C.", "Oksana C.", "Willow C.", "Haven C."] },
  { id: 3, name: "Jackson Family", students: ["Elijah J."] },
];
const SUBJECTS = [
  { id:"math_video",    label:"Math Video",             abbr:"MaV",  group:"Math",   xp:1 },
  { id:"math_practice", label:"Math Practice",          abbr:"MaP",  group:"Math",   xp:2 },
  { id:"math_review",   label:"Math Review",            abbr:"MaR",  group:"Math",   xp:3 },
  { id:"ela_lesson",    label:"ELA / Phonics Lesson",   abbr:"ELA-L",group:"ELA",    xp:1 },
  { id:"ela_practice",  label:"ELA / Phonics Practice", abbr:"ELA-P",group:"ELA",    xp:2 },
  { id:"ela_review",    label:"ELA / Phonics Review",   abbr:"ELA-R",group:"ELA",    xp:3 },
  { id:"science",       label:"Science",                abbr:"Sci",  group:"Core",   xp:3 },
  { id:"history",       label:"History",                abbr:"His",  group:"Core",   xp:3 },
  { id:"spanish",       label:"Spanish",                abbr:"Spa",  group:"Core",   xp:2 },
  { id:"typing",        label:"Typing",                 abbr:"Typ",  group:"Skills", xp:2 },
  { id:"spelling",      label:"Spelling",               abbr:"Spell",group:"Skills", xp:3 },
];
const TOTAL_MS = 2.5*60*60*1000;
const TRACK_HEIGHT = 340;
const BG="#0a0a1a", CARD="#13132a", ACCENT="#f0c040", GREEN="#1D9E75", BLUE="#185FA5";
const MAX_STREAK = 5;
const CURRENT_YEAR = new Date().getFullYear();

function fmt(ms) {
  const t=Math.max(0,Math.floor(ms/1000));
  return `${Math.floor(t/3600)}:${String(Math.floor((t%3600)/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;
}
function fmtDuration(ms) {
  if(ms==null) return "—"; const s=Math.floor(ms/1000);
  return s<60?`${s}s`:`${Math.floor(s/60)}m ${s%60}s`;
}
function nowStr() { return new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}); }
function dateStr() { return new Date().toLocaleDateString([],{weekday:"long",year:"numeric",month:"long",day:"numeric"}); }
function todayKey() { return new Date().toISOString().slice(0,10); }
function initSession() {
  return {completed:{},timestamps:{},durations:{},startEpoch:null,pausedRemainingMs:TOTAL_MS,
    isPaused:true,lastSubjectEpoch:null,startTimeStr:null,submitted:false,
    finishTimeStr:null,earlyMins:0,launched:false};
}
function getRemainingMs(s) {
  if(s.isPaused||!s.startEpoch) return s.pausedRemainingMs;
  return Math.max(0,s.pausedRemainingMs-(Date.now()-s.startEpoch));
}
function subjectXP(session) { return SUBJECTS.reduce((sum,s)=>sum+(session.completed[s.id]?s.xp:0),0); }
function normalizeId(name) { return name.replace(/[\s.]/g,"").toLowerCase(); }

function StarBadge({xp}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:5,background:"#1a1a35",borderRadius:20,padding:"4px 12px",border:"1px solid #f0c04055"}}>
      <svg width="16" height="16" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={ACCENT} stroke={ACCENT} strokeWidth="1"/></svg>
      <span style={{fontWeight:800,fontSize:14,color:ACCENT}}>{xp}</span>
    </div>
  );
}
function StreakBar({streak}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:5,background:"#1a1a35",borderRadius:20,padding:"4px 12px",border:"1px solid #ff6b3555"}}>
      <span style={{fontSize:13}}>🔥</span>
      <span style={{fontWeight:800,fontSize:13,color:"#ff9955"}}>{streak}/{MAX_STREAK}</span>
    </div>
  );
}
function Particles({particles}) {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:500}}>
      {particles.map(p=>(
        <div key={p.id} style={{position:"absolute",left:p.x,top:p.y,width:p.size,height:p.size,borderRadius:"50%",background:p.color,opacity:p.life,transform:`translate(${p.dx}px,${p.dy}px) scale(${p.life})`,transition:"all 0.8s ease-out",pointerEvents:"none"}}/>
      ))}
    </div>
  );
}
function XPFlash({flashes}) {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:450}}>
      {flashes.map(f=>(
        <div key={f.id} style={{position:"absolute",left:f.x,top:f.y,color:ACCENT,fontWeight:800,fontSize:20,opacity:f.life,transform:`translateY(${-40*(1-f.life)}px)`,transition:"all 0.9s ease-out",textShadow:"0 0 8px #f0c040"}}>+{f.xp} XP</div>
      ))}
    </div>
  );
}
function SpaceTrack({progress,doneCount}) {
  return (
    <div style={{width:60,position:"relative",height:TRACK_HEIGHT,flexShrink:0}}>
      <svg width="60" height={TRACK_HEIGHT} viewBox={`0 0 60 ${TRACK_HEIGHT}`} style={{position:"absolute",top:0,left:0,pointerEvents:"none"}}>
        {[[8,15],[48,28],[15,55],[52,70],[6,95],[44,108],[25,138],[58,152],[10,178],[50,193],[18,218],[56,238],[4,262],[38,274]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r={i%3===0?1.5:1} fill="#6060a0" opacity={0.7}/>
        ))}
        <circle cx={44} cy={85} r={8} fill="#c8a030" opacity={0.8}/>
        <ellipse cx={44} cy={85} rx={14} ry={3.5} fill="none" stroke="#a07020" strokeWidth={1.5} opacity={0.6}/>
        <circle cx={12} cy={125} r={5} fill="#4a7aaf" opacity={0.75}/>
        <circle cx={36} cy={TRACK_HEIGHT-16} r={16} fill="#1a5fa0" opacity={0.9}/>
        <ellipse cx={30} cy={TRACK_HEIGHT-20} rx={6} ry={4} fill="#2a9a5e" opacity={0.85}/>
        <ellipse cx={40} cy={TRACK_HEIGHT-12} rx={4} ry={3} fill="#2a9a5e" opacity={0.8}/>
      </svg>
      <div style={{position:"absolute",top:20,left:"50%",transform:"translateX(-50%)",bottom:40,width:3,background:"#2a2a5a",borderRadius:99}}/>
      {SUBJECTS.map((_,idx)=>{
        const pct=(SUBJECTS.length-1-idx)/(SUBJECTS.length-1);
        const topPx=20+pct*(TRACK_HEIGHT-60-20);
        const done=idx<doneCount;
        return <div key={idx} style={{position:"absolute",top:topPx,left:"50%",transform:"translate(-50%,-50%)",width:done?11:6,height:done?11:6,borderRadius:"50%",background:done?GREEN:"#2a2a5a",transition:"all 0.4s",zIndex:2,boxShadow:done?`0 0 6px ${GREEN}`:undefined}}/>;
      })}
      <div style={{position:"absolute",top:20+(1-progress)*(TRACK_HEIGHT-60-20),left:"50%",transform:"translate(-50%,-50%)",fontSize:24,transition:"top 0.6s cubic-bezier(.4,1.6,.6,1)",zIndex:3,lineHeight:1,filter:"drop-shadow(0 0 6px #ffffff88)"}}>🚀</div>
    </div>
  );
}
function ConfirmModal({message,onConfirm,onCancel,confirmLabel="Yes, reset"}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:"1rem"}}>
      <div style={{background:CARD,borderRadius:16,padding:"2rem",width:"100%",maxWidth:340,textAlign:"center",border:"1px solid #2a2a5a"}}>
        <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
        <p style={{margin:"0 0 20px",fontSize:15,fontWeight:600,color:"#ccc",lineHeight:1.5}}>{message}</p>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"11px",borderRadius:8,border:"1.5px solid #2a2a5a",background:"transparent",fontWeight:700,fontSize:15,cursor:"pointer",color:"#888"}}>Cancel</button>
          <button onClick={onConfirm} style={{flex:1,padding:"11px",borderRadius:8,border:"none",background:"#a32d2d",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
function StreakPopup({streak,wasMax,onClose}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
      <div style={{background:CARD,borderRadius:24,padding:"2.5rem 2rem",width:"100%",maxWidth:320,textAlign:"center",border:`2px solid ${wasMax?ACCENT:"#ff6b35"}`,boxShadow:`0 0 40px ${wasMax?"#f0c04066":"#ff6b3566"}`}}>
        {wasMax?(
          <>
            <div style={{fontSize:60,marginBottom:8}}>🏆</div>
            <h2 style={{margin:"0 0 8px",color:ACCENT,fontWeight:800,fontSize:24}}>5-Day Streak!</h2>
            <p style={{color:"#aaa",fontWeight:600,fontSize:15,margin:"0 0 20px"}}>Incredible — a full week crushed! Streak resets fresh.</p>
          </>
        ):(
          <>
            <div style={{fontSize:56,marginBottom:8}}>🔥</div>
            <h2 style={{margin:"0 0 8px",color:"#ff9955",fontWeight:800,fontSize:24}}>Day {streak} of {MAX_STREAK}!</h2>
            <p style={{color:"#aaa",fontWeight:600,fontSize:15,margin:"0 0 20px"}}>Keep it going — you're on a streak!</p>
            <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:20}}>
              {Array.from({length:MAX_STREAK}).map((_,i)=>(
                <div key={i} style={{width:32,height:32,borderRadius:"50%",background:i<streak?"#ff6b35":"#2a2a4a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{i<streak?"🔥":"○"}</div>
              ))}
            </div>
          </>
        )}
        <button onClick={onClose} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:wasMax?ACCENT:GREEN,color:wasMax?"#1a1a00":"#fff",fontWeight:800,fontSize:16,cursor:"pointer"}}>Awesome!</button>
      </div>
    </div>
  );
}
function MissionCompletePopup({xpEarned,onClose}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:399}}>
      <div style={{background:CARD,borderRadius:24,padding:"2.5rem 2rem",width:"100%",maxWidth:320,textAlign:"center",border:`2px solid ${GREEN}`,boxShadow:`0 0 40px ${GREEN}66`}}>
        <div style={{fontSize:60,marginBottom:8}}>🚀</div>
        <h2 style={{margin:"0 0 8px",color:GREEN,fontWeight:800,fontSize:24}}>Mission Complete!</h2>
        <p style={{color:"#aaa",fontWeight:600,fontSize:15,margin:"0 0 8px"}}>All subjects done!</p>
        <p style={{color:ACCENT,fontWeight:800,fontSize:18,margin:"0 0 20px"}}>+{xpEarned} XP earned today</p>
        <button onClick={onClose} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:GREEN,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer"}}>Submit for approval!</button>
      </div>
    </div>
  );
}
function TeacherGate({onSuccess,onCancel}) {
  const [pw,setPw]=useState(""); const [err,setErr]=useState("");
  function check() {
    const yr=parseInt(pw,10);
    if(!isNaN(yr)&&yr<=CURRENT_YEAR-30){ onSuccess(); }
    else { setErr("Access denied."); setPw(""); }
  }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"1rem"}}>
      <div style={{background:CARD,borderRadius:20,padding:"2rem",width:"100%",maxWidth:320,textAlign:"center",border:"1px solid #2a2a5a"}}>
        <div style={{fontSize:36,marginBottom:8}}>🔒</div>
        <h3 style={{margin:"0 0 4px",fontWeight:800,fontSize:20,color:"#fff"}}>Teacher Access</h3>
        <p style={{margin:"0 0 16px",fontSize:13,color:"#888",fontWeight:600}}>Enter your access code</p>
        <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}}
          onKeyDown={e=>e.key==="Enter"&&check()}
          style={{width:"100%",fontSize:20,padding:"11px",borderRadius:9,border:"1.5px solid #2a2a5a",background:"#0a0a1a",color:"#fff",fontWeight:700,textAlign:"center",boxSizing:"border-box",marginBottom:10}}/>
        {err&&<p style={{color:"#e05050",fontWeight:700,fontSize:13,margin:"0 0 10px"}}>{err}</p>}
        <div style={{display:"flex",gap:8}}>
          <button onClick={onCancel} style={{flex:1,padding:"11px",borderRadius:8,border:"1.5px solid #2a2a5a",background:"transparent",fontWeight:700,fontSize:15,cursor:"pointer",color:"#888"}}>Cancel</button>
          <button onClick={check} style={{flex:1,padding:"11px",borderRadius:8,border:"none",background:BLUE,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>Enter</button>
        </div>
      </div>
    </div>
  );
}

function AccessGate({pins, onGranted, onTeacherGranted}) {
  const [tab, setTab]=useState("student"); // "student" | "teacher"
  const [nameInput,setNameInput]=useState("");
  const [pin,setPin]=useState("");
  const [teacherPw,setTeacherPw]=useState("");
  const [err,setErr]=useState("");

  function attemptStudent() {
    setErr("");
    const sid=normalizeId(nameInput);
    if(!sid||!pin){ setErr("Please enter your name and PIN."); return; }
    const stored=pins[sid];
    if(!stored||!stored.pin){ setErr("Name not found or no PIN set. Ask your teacher."); return; }
    if(stored.pin!==pin){ setErr("Incorrect PIN. Try again."); return; }
    onGranted();
  }
  function attemptTeacher() {
    setErr("");
    const yr=parseInt(teacherPw,10);
    if(!isNaN(yr)&&yr<=CURRENT_YEAR-30){ onTeacherGranted(); }
    else { setErr("Access denied."); setTeacherPw(""); }
  }

  const tabStyle=(active)=>({
    flex:1, padding:"10px", border:"none", borderRadius:"8px 8px 0 0",
    fontWeight:700, fontSize:14, cursor:"pointer",
    background:active?"#1a1a3a":"transparent",
    color:active?"#fff":"#555",
    borderBottom:active?`2px solid ${BLUE}`:"2px solid transparent",
    transition:"all 0.15s"
  });

  return (
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}>
      <div style={{background:CARD,borderRadius:20,padding:"2.5rem 2rem",width:"100%",maxWidth:380,border:"1px solid #2a2a5a"}}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:56,marginBottom:10}}>🚀</div>
          <h1 style={{margin:0,fontWeight:900,fontSize:28,color:"#fff",letterSpacing:"0.02em"}}>Mission Control</h1>
          <p style={{margin:"6px 0 0",fontSize:14,color:"#888",fontWeight:600}}>Sign in to access the Launch Pad</p>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,marginBottom:"1.25rem",borderBottom:"1px solid #2a2a5a"}}>
          <button style={tabStyle(tab==="student")} onClick={()=>{setTab("student");setErr("");}}>🎓 Student</button>
          <button style={tabStyle(tab==="teacher")} onClick={()=>{setTab("teacher");setErr("");}}>🔒 Teacher</button>
        </div>

        {tab==="student"&&(
          <>
            <p style={{fontSize:12,color:"#555",fontWeight:600,margin:"0 0 8px"}}>Name as it appears on your button, no spaces — e.g. <span style={{color:ACCENT}}>ZachS</span></p>
            <input type="text" placeholder="Your name (no spaces or periods)" value={nameInput}
              onChange={e=>{setNameInput(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&attemptStudent()}
              style={{width:"100%",fontSize:15,padding:"12px 14px",borderRadius:9,border:"1.5px solid #2a2a5a",background:"#0a0a1a",color:"#fff",fontWeight:600,boxSizing:"border-box",marginBottom:10}}/>
            <input type="password" placeholder="PIN" value={pin}
              onChange={e=>{setPin(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&attemptStudent()}
              style={{width:"100%",fontSize:15,padding:"12px 14px",borderRadius:9,border:"1.5px solid #2a2a5a",background:"#0a0a1a",color:"#fff",fontWeight:600,boxSizing:"border-box",marginBottom:10}}/>
            {err&&<p style={{color:"#e05050",fontWeight:700,fontSize:13,margin:"0 0 10px",textAlign:"center"}}>{err}</p>}
            <button onClick={attemptStudent} style={{width:"100%",padding:"13px",borderRadius:9,border:"none",background:GREEN,color:"#fff",fontWeight:800,fontSize:17,cursor:"pointer",boxShadow:`0 0 16px ${GREEN}55`}}>
              Access Launch Pad 🚀
            </button>
          </>
        )}

        {tab==="teacher"&&(
          <>
            <p style={{fontSize:13,color:"#888",fontWeight:600,margin:"0 0 12px",textAlign:"center"}}>Enter your teacher access code</p>
            <input type="password" placeholder="Access code" value={teacherPw}
              onChange={e=>{setTeacherPw(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&attemptTeacher()}
              style={{width:"100%",fontSize:20,padding:"12px 14px",borderRadius:9,border:`1.5px solid ${BLUE}55`,background:"#0a0a1a",color:"#fff",fontWeight:700,textAlign:"center",boxSizing:"border-box",marginBottom:10}}/>
            {err&&<p style={{color:"#e05050",fontWeight:700,fontSize:13,margin:"0 0 10px",textAlign:"center"}}>{err}</p>}
            <button onClick={attemptTeacher} style={{width:"100%",padding:"13px",borderRadius:9,border:"none",background:BLUE,color:"#fff",fontWeight:800,fontSize:17,cursor:"pointer",boxShadow:`0 0 16px ${BLUE}55`}}>
              Enter Teacher View 🔒
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LaunchPad({families,sessions,streaks,balances,onSelectStudent,onTeacherAccess,onLogout}) {
  const [tick,setTick]=useState(0);
  useEffect(()=>{ const t=setInterval(()=>setTick(x=>x+1),30000); return ()=>clearInterval(t); },[]);
  const totalStudents=families.flatMap(f=>f.students).length;
  const doneCount=families.flatMap(f=>f.students).filter(n=>(sessions[n]||{}).submitted).length;
  const activeCount=families.flatMap(f=>f.students).filter(n=>{ const s=sessions[n]; return s&&s.startTimeStr&&!s.submitted; }).length;
  return (
    <div style={{background:BG,minHeight:"100vh",padding:"1.5rem"}}>
      <div style={{textAlign:"center",marginBottom:"1.5rem",position:"relative"}}>
        <button onClick={onLogout} style={{position:"absolute",right:0,top:0,fontWeight:700,fontSize:12,background:"transparent",color:"#444",border:"1px solid #2a2a5a",borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>Sign out</button>
        <h1 style={{margin:0,fontWeight:900,fontSize:30,color:"#fff",letterSpacing:"0.02em"}}>🚀 Launch Pad</h1>
        <p style={{margin:"4px 0 0",fontSize:13,color:"#888",fontWeight:600}}>{dateStr()}</p>
        <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:12,flexWrap:"wrap"}}>
          <div style={{background:CARD,borderRadius:20,padding:"6px 16px",border:"1px solid #2a2a5a",fontSize:13,fontWeight:700,color:"#888"}}>👥 {totalStudents} students</div>
          <div style={{background:CARD,borderRadius:20,padding:"6px 16px",border:`1px solid ${GREEN}44`,fontSize:13,fontWeight:700,color:GREEN}}>🚀 {activeCount} in progress</div>
          <div style={{background:CARD,borderRadius:20,padding:"6px 16px",border:`1px solid ${ACCENT}44`,fontSize:13,fontWeight:700,color:ACCENT}}>✓ {doneCount} done</div>
        </div>
      </div>
      {families.map(fam=>(
        <div key={fam.id} style={{marginBottom:"1.5rem"}}>
          <p style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:"0.08em"}}>{fam.name}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
            {fam.students.map(name=>{
              const sess=sessions[name];
              const active=sess&&sess.startTimeStr&&!sess.submitted;
              const done=sess&&sess.submitted;
              const streak=(streaks[name]||{count:0}).count;
              const doneSubjects=SUBJECTS.filter(s=>sess?.completed?.[s.id]).length;
              return (
                <button key={name} onClick={()=>onSelectStudent(name)}
                  style={{padding:"14px 10px",textAlign:"center",fontWeight:700,background:done?"#0a2a1a":active?"#0a1a2a":CARD,color:"#fff",border:done?`2px solid ${GREEN}`:active?`2px solid ${BLUE}`:"2px solid #2a2a5a",borderRadius:12,cursor:"pointer",transition:"all 0.2s",boxShadow:active?`0 0 12px ${BLUE}44`:done?`0 0 12px ${GREEN}44`:undefined}}>
                  <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>{name}</div>
                  {done&&<div style={{fontSize:12,color:GREEN,fontWeight:700}}>✓ Done</div>}
                  {active&&<div style={{fontSize:12,color:"#60aaff",fontWeight:700}}>🚀 {doneSubjects}/{SUBJECTS.length}</div>}
                  {!active&&!done&&<div style={{fontSize:14}}>⭐</div>}
                  {streak>0&&<div style={{fontSize:11,color:"#ff9955",fontWeight:700,marginTop:3}}>🔥 {streak}/{MAX_STREAK}</div>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:"1px solid #1a1a3a"}}>
        <button onClick={onTeacherAccess} style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid #2a2a5a",background:CARD,color:"#888",fontWeight:700,fontSize:14,cursor:"pointer"}}>🔒 Teacher View</button>
      </div>
    </div>
  );
}

function ManagePINs({families,pins,onPinsChange,onBack}) {
  const [inputs,setInputs]=useState({});
  const [saved,setSaved]=useState({});
  function savePin(name) {
    const sid=normalizeId(name); const pin=(inputs[sid]||"").trim(); if(!pin) return;
    const next={...pins,[sid]:{pin,displayName:name}};
    onPinsChange(next); setInputs(i=>({...i,[sid]:""}));
    setSaved(s=>({...s,[sid]:true})); setTimeout(()=>setSaved(s=>({...s,[sid]:false})),2000);
  }
  function clearPin(name) {
    const sid=normalizeId(name);
    onPinsChange({...pins,[sid]:{...(pins[sid]||{}),pin:"",displayName:name}});
  }
  return (
    <div style={{background:BG,minHeight:"100vh",padding:"1.5rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.5rem"}}>
        <button onClick={onBack} style={{fontWeight:700,fontSize:14,background:BLUE,color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",cursor:"pointer"}}>← Back</button>
        <h2 style={{margin:0,fontWeight:700,fontSize:22,color:"#fff"}}>🔑 Student PINs</h2>
      </div>
      {families.map(fam=>(
        <div key={fam.id} style={{background:CARD,border:"1px solid #2a2a5a",borderRadius:14,padding:"1rem 1.25rem",marginBottom:"1rem"}}>
          <p style={{margin:"0 0 10px",fontWeight:700,fontSize:15,color:"#888"}}>{fam.name}</p>
          {fam.students.map(name=>{
            const sid=normalizeId(name); const hasPIN=pins[sid]?.pin?.length>0;
            return (
              <div key={name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
                <span style={{fontWeight:700,fontSize:15,color:"#fff",minWidth:120}}>{name}</span>
                <span style={{fontSize:12,color:hasPIN?GREEN:"#e05050",fontWeight:700,minWidth:80}}>{hasPIN?"PIN set ✓":"No PIN ✗"}</span>
                <input type="password" placeholder="New PIN" value={inputs[sid]||""}
                  onChange={e=>setInputs(i=>({...i,[sid]:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&savePin(name)}
                  style={{fontSize:14,padding:"7px 10px",borderRadius:8,border:"1.5px solid #2a2a5a",background:"#0a0a1a",color:"#fff",fontWeight:600,width:110}}/>
                <button onClick={()=>savePin(name)} style={{fontWeight:700,fontSize:13,background:saved[sid]?"#0a3a1a":GREEN,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer"}}>{saved[sid]?"Saved ✓":"Set PIN"}</button>
                {hasPIN&&<button onClick={()=>clearPin(name)} style={{fontWeight:700,fontSize:13,background:"#2a1a1a",color:"#e05050",border:"1px solid #5a1a1a",borderRadius:8,padding:"7px 12px",cursor:"pointer"}}>Clear</button>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function XPBank({families,balances,onUpdate,onBack}) {
  const [inputs,setInputs]=useState({});
  const allStudents=families.flatMap(f=>f.students);
  function adjust(name,type) {
    const val=parseInt(inputs[name+type]||"",10); if(isNaN(val)||val<=0) return;
    onUpdate(name,type==="add"?(balances[name]||0)+val:Math.max(0,(balances[name]||0)-val));
    setInputs(i=>({...i,[name+type]:""}));
  }
  return (
    <div style={{background:BG,minHeight:"100vh",padding:"1.5rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.5rem"}}>
        <button onClick={onBack} style={{fontWeight:700,fontSize:14,background:BLUE,color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",cursor:"pointer"}}>← Back</button>
        <h2 style={{margin:0,fontWeight:700,fontSize:22,color:"#fff"}}>⭐ XP Bank</h2>
      </div>
      {allStudents.map(name=>(
        <div key={name} style={{background:CARD,border:"1px solid #2a2a5a",borderRadius:14,padding:"1rem 1.25rem",marginBottom:"0.75rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
            <span style={{fontWeight:700,fontSize:17,color:"#fff"}}>{name}</span>
            <StarBadge xp={balances[name]||0}/>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:6,flex:1,minWidth:160}}>
              <input type="number" min="0" placeholder="Add XP" value={inputs[name+"add"]||""}
                onChange={e=>setInputs(i=>({...i,[name+"add"]:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&adjust(name,"add")}
                style={{flex:1,fontSize:14,padding:"8px 10px",borderRadius:8,border:"1.5px solid #2a2a5a",background:"#0a0a1a",color:"#fff",fontWeight:600}}/>
              <button onClick={()=>adjust(name,"add")} style={{fontWeight:700,fontSize:13,background:GREEN,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer"}}>+ Add</button>
            </div>
            <div style={{display:"flex",gap:6,flex:1,minWidth:160}}>
              <input type="number" min="0" placeholder="Deduct XP" value={inputs[name+"deduct"]||""}
                onChange={e=>setInputs(i=>({...i,[name+"deduct"]:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&adjust(name,"deduct")}
                style={{flex:1,fontSize:14,padding:"8px 10px",borderRadius:8,border:"1.5px solid #2a2a5a",background:"#0a0a1a",color:"#fff",fontWeight:600}}/>
              <button onClick={()=>adjust(name,"deduct")} style={{fontWeight:700,fontSize:13,background:"#a32d2d",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer"}}>− Spend</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ManageStudents({families,onChange,onBack}) {
  const [newFamName,setNewFamName]=useState("");
  const [newStudent,setNewStudent]=useState({});
  const [confirm,setConfirm]=useState(null);
  function addFamily() { const n=newFamName.trim(); if(!n) return; onChange([...families,{id:Date.now(),name:n,students:[]}]); setNewFamName(""); }
  function removeFamily(id) { const f=families.find(x=>x.id===id); setConfirm({msg:`Remove "${f.name}" and all their students?`,cb:()=>onChange(families.filter(x=>x.id!==id))}); }
  function addStudent(famId) { const n=(newStudent[famId]||"").trim(); if(!n) return; onChange(families.map(f=>f.id===famId?{...f,students:[...f.students,n]}:f)); setNewStudent(s=>({...s,[famId]:""})); }
  function removeStudent(famId,sName) { setConfirm({msg:`Remove "${sName}"?`,cb:()=>onChange(families.map(f=>f.id===famId?{...f,students:f.students.filter(s=>s!==sName)}:f))}); }
  return (
    <div style={{background:BG,minHeight:"100vh",padding:"1.5rem"}}>
      {confirm&&<ConfirmModal message={confirm.msg} onConfirm={()=>{confirm.cb();setConfirm(null);}} onCancel={()=>setConfirm(null)} confirmLabel="Remove"/>}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.5rem"}}>
        <button onClick={onBack} style={{fontWeight:700,fontSize:14,background:BLUE,color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",cursor:"pointer"}}>← Back</button>
        <h2 style={{margin:0,fontWeight:700,fontSize:22,color:"#fff"}}>👥 Manage Students</h2>
      </div>
      {families.map(fam=>(
        <div key={fam.id} style={{background:CARD,border:"1px solid #2a2a5a",borderRadius:14,padding:"1rem 1.25rem",marginBottom:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
            <span style={{fontWeight:700,fontSize:17,color:"#fff"}}>{fam.name}</span>
            <button onClick={()=>removeFamily(fam.id)} style={{fontWeight:700,fontSize:12,background:"#2a1a1a",color:"#e05050",border:"1px solid #5a1a1a",borderRadius:7,padding:"5px 12px",cursor:"pointer"}}>Remove family</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:"0.75rem"}}>
            {fam.students.length===0?<span style={{fontSize:13,color:"#444",fontWeight:600}}>No students yet</span>
              :fam.students.map(s=>(
                <span key={s} style={{display:"inline-flex",alignItems:"center",gap:6,background:"#1a1a3a",borderRadius:20,padding:"5px 12px",fontWeight:700,fontSize:14,color:"#ccc"}}>
                  {s}<button onClick={()=>removeStudent(fam.id,s)} style={{background:"none",border:"none",cursor:"pointer",color:"#e05050",fontWeight:700,fontSize:16,lineHeight:1,padding:0}}>×</button>
                </span>
              ))
            }
          </div>
          <div style={{display:"flex",gap:8}}>
            <input placeholder="Student name" value={newStudent[fam.id]||""} onChange={e=>setNewStudent(s=>({...s,[fam.id]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addStudent(fam.id)}
              style={{flex:1,fontSize:14,padding:"8px 12px",borderRadius:8,border:"1.5px solid #2a2a5a",background:"#0a0a1a",color:"#fff",fontWeight:600}}/>
            <button onClick={()=>addStudent(fam.id)} style={{fontWeight:700,fontSize:14,background:GREEN,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer"}}>Add</button>
          </div>
        </div>
      ))}
      <div style={{background:CARD,border:"2px dashed #2a2a5a",borderRadius:14,padding:"1rem 1.25rem"}}>
        <p style={{margin:"0 0 10px",fontWeight:700,fontSize:15,color:"#888"}}>Add new family</p>
        <div style={{display:"flex",gap:8}}>
          <input placeholder="Family name" value={newFamName} onChange={e=>setNewFamName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addFamily()}
            style={{flex:1,fontSize:14,padding:"8px 12px",borderRadius:8,border:"1.5px solid #2a2a5a",background:"#0a0a1a",color:"#fff",fontWeight:600}}/>
          <button onClick={addFamily} style={{fontWeight:700,fontSize:14,background:BLUE,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer"}}>Add</button>
        </div>
      </div>
    </div>
  );
}

// ── Daily Summary ─────────────────────────────────────────────────────────────
function DailySummary({reports,families,onClose}) {
  // Group subjects by group for the legend
  const groups = ["Math","ELA","Core","Skills"];
  const groupColors = { Math:"#6080ff", ELA:"#c060ff", Core:"#ff9955", Skills:"#40c0c0" };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:200,overflowY:"auto",padding:"1rem"}}>
      <div style={{background:CARD,borderRadius:16,padding:"1.5rem",width:"100%",maxWidth:700,marginTop:"1rem",marginBottom:"1rem",border:"1px solid #2a2a5a"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
          <div>
            <h3 style={{margin:0,fontWeight:700,fontSize:20,color:"#fff"}}>Daily summary</h3>
            <p style={{margin:0,fontSize:13,color:"#888",fontWeight:600}}>{dateStr()}</p>
          </div>
          <button onClick={onClose} style={{fontWeight:700,fontSize:14,background:"#2a2a5a",color:"#ccc",border:"none",borderRadius:8,padding:"9px 14px",cursor:"pointer"}}>Close</button>
        </div>

        {reports.length===0
          ? <p style={{color:"#888",fontWeight:600}}>No submissions yet today.</p>
          : families.map(fam=>{
              const famR=reports.filter(r=>fam.students.includes(r.student));
              if(!famR.length) return null;
              return (
                <div key={fam.id} style={{marginBottom:"1rem"}}>
                  <p style={{margin:"0 0 6px",fontWeight:700,fontSize:14,color:"#fff",background:"#1a1a3a",padding:"6px 10px",borderRadius:8}}>{fam.name}</p>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead><tr>
                        <th style={{textAlign:"left",padding:"4px 8px",color:"#888",fontWeight:700,borderBottom:"1px solid #2a2a5a"}}>Student</th>
                        {SUBJECTS.map(s=><th key={s.id} style={{textAlign:"center",padding:"4px 3px",color:groupColors[s.group],fontWeight:700,borderBottom:"1px solid #2a2a5a",fontSize:10}}>{s.abbr}</th>)}
                        <th style={{textAlign:"center",padding:"4px 6px",color:"#888",fontWeight:700,borderBottom:"1px solid #2a2a5a"}}>Mins</th>
                        <th style={{textAlign:"center",padding:"4px 6px",color:"#888",fontWeight:700,borderBottom:"1px solid #2a2a5a"}}>XP</th>
                      </tr></thead>
                      <tbody>{famR.map((r,i)=>(
                        <tr key={i} style={{borderBottom:"0.5px solid #2a2a5a"}}>
                          <td style={{padding:"6px 8px",fontWeight:700,color:"#fff",whiteSpace:"nowrap"}}>{r.student}</td>
                          {SUBJECTS.map(s=><td key={s.id} style={{textAlign:"center",padding:"6px 2px",fontWeight:700,color:r.completed[s.id]?GREEN:"#333"}}>{r.completed[s.id]?"✓":"–"}</td>)}
                          <td style={{textAlign:"center",padding:"6px 4px",fontWeight:700,color:"#aaa"}}>{r.earlyMins>0?r.earlyMins:"—"}</td>
                          <td style={{textAlign:"center",padding:"6px 4px",fontWeight:700,color:ACCENT}}>{r.xpEarned||0}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              );
            })
        }

        {/* Legend */}
        <div style={{marginTop:"1.25rem",borderTop:"1px solid #2a2a5a",paddingTop:"1rem"}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:"0.08em"}}>Key</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0.75rem 2rem"}}>
            {groups.map(grp=>(
              <div key={grp}>
                <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:groupColors[grp],textTransform:"uppercase",letterSpacing:"0.06em"}}>{grp}</p>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {SUBJECTS.filter(s=>s.group===grp).map(s=>(
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:11,fontWeight:800,color:groupColors[grp],minWidth:38,fontFamily:"monospace"}}>{s.abbr}</span>
                      <span style={{fontSize:11,color:"#888",fontWeight:600}}>{s.label}</span>
                      <span style={{fontSize:10,color:ACCENT,fontWeight:700,marginLeft:2}}>+{s.xp}xp</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function StudentScreen({name,session,streak,balance,onUpdate,onBack,onSubmit}) {
  const [,setTick]=useState(0);
  const rafRef=useRef(null);
  const [particles,setParticles]=useState([]);
  const [xpFlashes,setXpFlashes]=useState([]);
  const [showComplete,setShowComplete]=useState(false);
  const [completeFired,setCompleteFired]=useState(false);

  useEffect(()=>{
    function loop(){ setTick(t=>t+1); rafRef.current=setTimeout(loop,500); }
    rafRef.current=setTimeout(loop,500); return ()=>clearTimeout(rafRef.current);
  },[]);

  const remainingMs=getRemainingMs(session);
  const doneCount=SUBJECTS.filter(s=>session.completed[s.id]).length;
  const progress=doneCount/SUBJECTS.length;
  const isRunning=!session.isPaused&&session.startEpoch!=null;
  const allDone=doneCount===SUBJECTS.length;
  const sessionXP=subjectXP(session);

  useEffect(()=>{
    if(allDone&&!completeFired&&session.startTimeStr){ setShowComplete(true); setCompleteFired(true); }
  },[allDone]);

  function burst(xp) {
    const colors=["#f0c040","#1D9E75","#60a0ff","#ff6060","#ff9955","#c060ff"];
    const cx=window.innerWidth/2,cy=window.innerHeight/2;
    const ps=Array.from({length:18},(_,i)=>({id:Date.now()+i,x:cx+Math.random()*120-60,y:cy+Math.random()*120-60,dx:(Math.random()-0.5)*80,dy:(Math.random()-0.5)*80,size:6+Math.random()*8,color:colors[i%colors.length],life:1}));
    setParticles(p=>[...p,...ps]); setXpFlashes(f=>[...f,{id:Date.now(),x:cx-20,y:cy-60,xp,life:1}]);
    setTimeout(()=>{ setParticles(p=>p.map(x=>({...x,life:0}))); setXpFlashes(f=>f.map(x=>({...x,life:0}))); },100);
    setTimeout(()=>{ setParticles([]); setXpFlashes([]); },1000);
  }

  function handleLaunch() {
    const now=Date.now();
    onUpdate({...session,isPaused:false,startEpoch:now,startTimeStr:session.startTimeStr||nowStr(),lastSubjectEpoch:session.lastSubjectEpoch||now,launched:true});
  }
  function handlePause() { onUpdate({...session,isPaused:true,pausedRemainingMs:getRemainingMs(session),startEpoch:null}); }
  function handleCheck(id) {
    if(session.submitted||session.isPaused) return;
    const now=Date.now();
    const comp={...session.completed},ts={...session.timestamps},dur={...session.durations};
    const subj=SUBJECTS.find(s=>s.id===id);
    if(comp[id]){ delete comp[id]; delete ts[id]; delete dur[id]; }
    else { comp[id]=true; ts[id]=nowStr(); dur[id]=session.lastSubjectEpoch?now-session.lastSubjectEpoch:0; burst(subj.xp); }
    onUpdate({...session,completed:comp,timestamps:ts,durations:dur,lastSubjectEpoch:now});
  }
  function handleSubmit() {
    const rem=getRemainingMs(session);
    const earlyMins=Math.max(0,Math.floor(rem/60000));
    const totalXP=sessionXP+(allDone?1:0)+earlyMins;
    onSubmit({...session,isPaused:true,startEpoch:null,pausedRemainingMs:rem,finishTimeStr:nowStr(),earlyMins,submitted:true,xpEarned:totalXP});
  }

  return (
    <div style={{background:BG,minHeight:"100vh",padding:"1rem"}}>
      <Particles particles={particles}/>
      <XPFlash flashes={xpFlashes}/>
      {showComplete&&<MissionCompletePopup xpEarned={sessionXP+1} onClose={()=>setShowComplete(false)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
        <button onClick={onBack} style={{fontWeight:700,fontSize:13,background:"#2a2a5a",color:"#ccc",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer"}}>← Launch Pad</button>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <StreakBar streak={streak}/>
          <StarBadge xp={balance||0}/>
        </div>
      </div>
      <div style={{background:CARD,borderRadius:14,padding:"0.75rem 1rem",marginBottom:"0.75rem",border:"1px solid #2a2a5a",textAlign:"center"}}>
        <p style={{margin:0,fontSize:12,color:"#555",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em"}}>Mission Specialist</p>
        <p style={{margin:"2px 0 0",fontWeight:900,fontSize:26,color:"#fff",letterSpacing:"0.02em"}}>{name}</p>
      </div>
      <div style={{textAlign:"center",marginBottom:"0.75rem"}}>
        <p style={{margin:0,fontSize:12,color:"#888",fontWeight:700}}>Time remaining</p>
        <p style={{margin:0,fontWeight:800,fontSize:30,color:remainingMs<600000?"#e05050":"#fff",letterSpacing:"0.04em"}}>{fmt(remainingMs)}</p>
      </div>
      <div style={{display:"flex",gap:"1rem",marginBottom:"1rem",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{background:CARD,borderRadius:12,padding:"0.65rem 1rem",marginBottom:"0.75rem",border:"1px solid #2a2a5a"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:13,fontWeight:700,color:"#888"}}>Progress</span>
              <span style={{fontSize:13,fontWeight:800,color:ACCENT}}>{doneCount}/{SUBJECTS.length} · {sessionXP} XP</span>
            </div>
            <div style={{background:"#1a1a3a",borderRadius:99,height:10,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progress*100}%`,background:`linear-gradient(90deg,${GREEN},${ACCENT})`,borderRadius:99,transition:"width 0.4s",boxShadow:`0 0 8px ${GREEN}`}}/>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:"0.75rem"}}>
            <button onClick={isRunning?handlePause:handleLaunch}
              style={{width:100,height:100,borderRadius:"50%",border:"none",background:isRunning?"#3a0a0a":"#0a2a1a",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,boxShadow:isRunning?`0 0 0 3px #e05050,0 0 20px #e0505055`:`0 0 0 3px ${GREEN},0 0 20px ${GREEN}55`}}>
              <span style={{fontSize:26}}>{isRunning?"⏸":"🚀"}</span>
              <span style={{fontSize:13}}>{isRunning?"Pause":(session.startTimeStr?"Resume":"Launch")}</span>
            </button>
          </div>
          {!isRunning&&!session.startTimeStr&&<p style={{textAlign:"center",fontSize:13,color:"#888",fontWeight:700,margin:"0 0 8px"}}>Press Launch to start your day!</p>}
          {!isRunning&&session.startTimeStr&&!session.submitted&&<p style={{textAlign:"center",fontSize:13,color:"#f0a030",fontWeight:700,margin:"0 0 8px"}}>Paused — press Resume to continue.</p>}
        </div>
        <SpaceTrack progress={progress} doneCount={doneCount}/>
      </div>
      {["Math","ELA","Core","Skills"].map(group=>(
        <div key={group} style={{marginBottom:"0.65rem"}}>
          <p style={{margin:"0 0 5px",fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:"0.08em"}}>{group}</p>
          {SUBJECTS.filter(s=>s.group===group).map(s=>(
            <div key={s.id} onClick={()=>handleCheck(s.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",marginBottom:4,background:session.completed[s.id]?"#0a2a1a":CARD,border:`1px solid ${session.completed[s.id]?"#1D9E7588":"#2a2a5a"}`,borderRadius:10,cursor:(!isRunning||session.submitted)?"default":"pointer",opacity:!isRunning&&!session.completed[s.id]?0.4:1,transition:"all 0.2s",boxShadow:session.completed[s.id]?`0 0 8px ${GREEN}22`:undefined}}>
              <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${session.completed[s.id]?GREEN:"#2a2a5a"}`,background:session.completed[s.id]?GREEN:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}>
                {session.completed[s.id]&&<span style={{color:"#fff",fontSize:13,fontWeight:700,lineHeight:1}}>✓</span>}
              </div>
              <span style={{flex:1,fontSize:15,fontWeight:600,color:session.completed[s.id]?GREEN:"#ccc",textDecoration:session.completed[s.id]?"line-through":"none"}}>{s.label}</span>
              <span style={{fontSize:12,fontWeight:700,color:ACCENT,opacity:0.7}}>+{s.xp}</span>
              {session.timestamps[s.id]&&<span style={{fontSize:11,fontWeight:600,color:"#555"}}>{session.timestamps[s.id]}</span>}
            </div>
          ))}
        </div>
      ))}
      {session.startTimeStr&&!session.submitted&&(
        <button onClick={handleSubmit} style={{width:"100%",marginTop:8,fontWeight:700,fontSize:16,background:allDone?GREEN:BLUE,color:"#fff",border:"none",borderRadius:10,padding:"13px",cursor:"pointer",boxShadow:allDone?`0 0 16px ${GREEN}88`:undefined}}>
          {allDone?"🚀 Submit for teacher approval":`Submit now (${SUBJECTS.length-doneCount} remaining)`}
        </button>
      )}
    </div>
  );
}

function AddTeacherModal({onClose}) {
  const [email,setEmail]=useState("");
  const [sent,setSent]=useState(false);
  const [err,setErr]=useState("");

  function handleInvite() {
    setErr("");
    if(!email.trim()||!email.includes("@")){ setErr("Please enter a valid email address."); return; }
    // TODO: wire to Firebase Auth — createUserWithEmailAndPassword or sendSignInLinkToEmail
    setSent(true);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:"1rem"}}>
      <div style={{background:CARD,borderRadius:20,padding:"2rem",width:"100%",maxWidth:360,border:"1px solid #2a2a5a",textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:8}}>👩‍🏫</div>
        <h3 style={{margin:"0 0 4px",fontWeight:800,fontSize:20,color:"#fff"}}>Add Teacher</h3>
        {!sent ? (
          <>
            <p style={{margin:"0 0 16px",fontSize:13,color:"#888",fontWeight:600,lineHeight:1.5}}>
              Enter the new teacher's email. They'll receive an invite to set up their account.<br/>
              <span style={{color:"#555",fontSize:12}}>(Firebase email verification — coming with deployment)</span>
            </p>
            <input type="email" placeholder="teacher@example.com" value={email}
              onChange={e=>{setEmail(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&handleInvite()}
              style={{width:"100%",fontSize:15,padding:"12px 14px",borderRadius:9,border:`1.5px solid ${BLUE}55`,background:"#0a0a1a",color:"#fff",fontWeight:600,boxSizing:"border-box",marginBottom:10}}/>
            {err&&<p style={{color:"#e05050",fontWeight:700,fontSize:13,margin:"0 0 10px"}}>{err}</p>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:8,border:"1.5px solid #2a2a5a",background:"transparent",fontWeight:700,fontSize:15,cursor:"pointer",color:"#888"}}>Cancel</button>
              <button onClick={handleInvite} style={{flex:1,padding:"11px",borderRadius:8,border:"none",background:BLUE,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>Send Invite</button>
            </div>
          </>
        ) : (
          <>
            <div style={{fontSize:48,margin:"8px 0"}}>📧</div>
            <p style={{color:GREEN,fontWeight:700,fontSize:15,margin:"0 0 6px"}}>Invite ready to send!</p>
            <p style={{color:"#888",fontSize:13,fontWeight:600,margin:"0 0 20px",lineHeight:1.5}}>
              <b style={{color:"#ccc"}}>{email}</b> will be invited once Firebase Auth is connected at deployment.
            </p>
            <button onClick={onClose} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:GREEN,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer"}}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}

function TeacherView({families,sessions,teacherReports,approved,balances,streaks,pins,onApprove,onResetAll,onResetStudent,onFamiliesChange,onBalanceUpdate,onPinsChange,onBack}) {
  const [subScreen,setSubScreen]=useState("main");
  const [showSummary,setShowSummary]=useState(false);
  const [showAddTeacher,setShowAddTeacher]=useState(false);
  const [confirmModal,setConfirmModal]=useState(null);
  function showConfirm(msg,cb){ setConfirmModal({msg,cb}); }
  if(subScreen==="pins") return <ManagePINs families={families} pins={pins} onPinsChange={onPinsChange} onBack={()=>setSubScreen("main")}/>;
  if(subScreen==="xpbank") return <XPBank families={families} balances={balances} onUpdate={onBalanceUpdate} onBack={()=>setSubScreen("main")}/>;
  if(subScreen==="students") return <ManageStudents families={families} onChange={onFamiliesChange} onBack={()=>setSubScreen("main")}/>;
  return (
    <div style={{background:BG,minHeight:"100vh",padding:"1.5rem"}}>
      {confirmModal&&<ConfirmModal message={confirmModal.msg} onConfirm={()=>{confirmModal.cb();setConfirmModal(null);}} onCancel={()=>setConfirmModal(null)}/>}
      {showSummary&&<DailySummary reports={teacherReports} families={families} onClose={()=>setShowSummary(false)}/>}
      {showAddTeacher&&<AddTeacherModal onClose={()=>setShowAddTeacher(false)}/>}
      <div style={{display:"flex",gap:"1.25rem",marginBottom:"1.5rem",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <button onClick={onBack} style={{fontWeight:700,fontSize:14,background:"#2a2a5a",color:"#ccc",border:"none",borderRadius:8,padding:"10px 16px",cursor:"pointer"}}>← Launch Pad</button>
          <h2 style={{margin:"10px 0 0",fontWeight:700,fontSize:20,color:"#fff"}}>🚀 Teacher View</h2>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,minWidth:140}}>
          <button onClick={()=>setShowAddTeacher(true)} style={{fontWeight:700,fontSize:13,background:"#0a1a2a",color:"#60aaff",border:"1px solid #185FA555",borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>👩‍🏫 Add Teacher</button>
          <button onClick={()=>setSubScreen("pins")} style={{fontWeight:700,fontSize:13,background:"#1a1a3a",color:"#ccc",border:"1px solid #2a2a5a",borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>🔑 PINs</button>
          <button onClick={()=>setSubScreen("xpbank")} style={{fontWeight:700,fontSize:13,background:"#2a1a4a",color:ACCENT,border:`1px solid ${ACCENT}44`,borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>⭐ XP Bank</button>
          <button onClick={()=>setSubScreen("students")} style={{fontWeight:700,fontSize:13,background:"#1a1a3a",color:"#ccc",border:"1px solid #2a2a5a",borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>👥 Students</button>
          <button onClick={()=>setShowSummary(true)} style={{fontWeight:700,fontSize:13,background:"#0a2a1a",color:GREEN,border:`1px solid ${GREEN}44`,borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>📋 Summary</button>
          <button onClick={()=>showConfirm("Reset ALL students? Clears timers, checklists, and today's reports. XP and streaks are safe.",onResetAll)} style={{fontWeight:700,fontSize:13,background:"#2a0a0a",color:"#e05050",border:"1px solid #5a1a1a",borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>🕐 Reset all</button>
        </div>
      </div>
      {teacherReports.length===0
        ?<p style={{fontSize:16,color:"#888",fontWeight:600}}>No reports submitted yet today.</p>
        :teacherReports.map((r,i)=>(
          <div key={i} style={{background:CARD,border:"1px solid #2a2a5a",borderRadius:14,padding:"1rem 1.25rem",marginBottom:"1rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontWeight:700,fontSize:18,color:"#fff"}}>{r.student}</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <StarBadge xp={r.xpEarned||0}/>
                <span style={{fontSize:12,color:"#555",fontWeight:600}}>{r.date}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:16,fontSize:13,color:"#888",marginBottom:12,flexWrap:"wrap",fontWeight:600}}>
              <span>Start: <b style={{color:"#ccc"}}>{r.startTime}</b></span>
              <span>Finish: <b style={{color:"#ccc"}}>{r.finishTime}</b></span>
              <span>Mins left: <b style={{color:"#ccc"}}>{r.earlyMins}</b></span>
            </div>
            <table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}>
              <thead><tr>{["Subject","Completed at","Duration","Status"].map(h=>(
                <th key={h} style={{textAlign:h==="Subject"?"left":"right",color:"#555",fontWeight:700,paddingBottom:6,fontSize:12}}>{h}</th>
              ))}</tr></thead>
              <tbody>{SUBJECTS.map(s=>(
                <tr key={s.id} style={{borderTop:"0.5px solid #1a1a3a"}}>
                  <td style={{padding:"5px 0",color:"#ccc",fontWeight:600}}>{s.label}</td>
                  <td style={{textAlign:"right",padding:"5px 0",color:"#888",fontWeight:600}}>{r.timestamps[s.id]||"—"}</td>
                  <td style={{textAlign:"right",padding:"5px 0",color:"#888",fontWeight:600}}>{fmtDuration(r.durations[s.id])}</td>
                  <td style={{textAlign:"right",padding:"5px 0"}}>{r.completed[s.id]?<span style={{color:GREEN,fontWeight:700}}>Done</span>:<span style={{color:"#e05050",fontWeight:700}}>Not done</span>}</td>
                </tr>
              ))}</tbody>
            </table>
            <div style={{marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <button onClick={()=>showConfirm(`Reset ${r.student}? Their timer and today's report will be cleared. XP and streak are safe.`,()=>onResetStudent(r.student))}
                style={{fontWeight:700,fontSize:13,background:"#2a1a1a",color:"#e05050",border:"1px solid #5a1a1a",borderRadius:8,padding:"7px 14px",cursor:"pointer"}}>Reset student</button>
              {approved[i]
                ?<span style={{fontSize:14,color:GREEN,fontWeight:700}}>✓ Approved</span>
                :<button onClick={()=>onApprove(i)} style={{fontWeight:700,fontSize:14,background:GREEN,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer"}}>Approve day</button>}
            </div>
          </div>
        ))
      }
    </div>
  );
}

export default function App() {
  const [unlocked,setUnlocked]=useState(false);
  const [screen,setScreen]=useState("launchpad");
  const [activeStudent,setActiveStudent]=useState(null);
  const [showTeacherGate,setShowTeacherGate]=useState(false);
  const [families,setFamilies]=useState(null);
  const [pins,setPins]=useState({});
  const [sessions,setSessions]=useState({});
  const [teacherReports,setTeacherReports]=useState([]);
  const [approved,setApproved]=useState({});
  const [balances,setBalances]=useState({});
  const [streaks,setStreaks]=useState({});
  const [streakPopup,setStreakPopup]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    Promise.all([
      storageGet("mc_roster",DEFAULT_FAMILIES),
      storageGet("mc_balances",{}),
      storageGet("mc_streaks",{}),
      storageGet("mc_pins",{}),
      storageGet("mc_unlocked",false),
      storageGet(`mc_reports_${todayKey()}`,null),
    ]).then(([fams,bals,stks,pns,locked,reports])=>{
      setFamilies(fams); setBalances(bals); setStreaks(stks); setPins(pns);
      setUnlocked(!!locked);
      if(reports){
        setTeacherReports(reports.list||[]); setApproved(reports.approved||{});
        const rs={}; (reports.list||[]).forEach(r=>{ rs[r.student]={...initSession(),submitted:true,completed:r.completed,earlyMins:r.earlyMins,xpEarned:r.xpEarned,startTimeStr:r.startTime,finishTimeStr:r.finishTime}; });
        setSessions(rs);
      }
      setLoading(false);
    });
  },[]);

  useEffect(()=>{
    function msUntil3am() {
      const now=new Date(); const est=new Date(now.toLocaleString("en-US",{timeZone:"America/New_York"}));
      const next=new Date(est); next.setHours(3,0,0,0); if(est>=next) next.setDate(next.getDate()+1);
      return next-est;
    }
    const t=setTimeout(()=>{ setUnlocked(false); storageSet("mc_unlocked",false); },msUntil3am());
    return ()=>clearTimeout(t);
  },[]);

  useEffect(()=>{ if(families!==null) storageSet("mc_roster",families); },[families]);
  useEffect(()=>{ storageSet("mc_balances",balances); },[balances]);
  useEffect(()=>{ storageSet("mc_streaks",streaks); },[streaks]);
  useEffect(()=>{ storageSet("mc_pins",pins); },[pins]);

  function saveReports(list,app){ storageSet(`mc_reports_${todayKey()}`,{list,approved:app}); }
  function getStreak(name){ return (streaks[name]||{count:0}).count; }
  function getSession(name){ return sessions[name]||initSession(); }
  function handleUnlock(){ setUnlocked(true); storageSet("mc_unlocked",true); }

  function handleSelectStudent(name){
    setSessions(s=>({...s,[name]:s[name]||initSession()}));
    setActiveStudent(name); setScreen("student");
  }
  function handleStudentBack(){ setActiveStudent(null); setScreen("launchpad"); }
  function handleUpdate(name,updated){ setSessions(s=>({...s,[name]:updated})); }

  function handleSubmit(name,final){
    setSessions(s=>({...s,[name]:final}));
    const allDone=SUBJECTS.every(s=>final.completed[s.id]);
    const newStreaks={...streaks};
    const cur=newStreaks[name]||{count:0};
    let newCount=cur.count;
    if(allDone){ newCount=cur.count+1; if(newCount>MAX_STREAK) newCount=0; }
    else if(final.launched){ newCount=0; }
    newStreaks[name]={count:newCount,lastCompleted:Date.now()};
    setStreaks(newStreaks);
    setTimeout(()=>setStreakPopup({name,streak:newCount,wasMax:newCount===0&&cur.count===MAX_STREAK}),400);
    const newBal={...balances,[name]:(balances[name]||0)+final.xpEarned};
    setBalances(newBal);
    const newReport={student:name,startTime:final.startTimeStr,finishTime:final.finishTimeStr,completed:final.completed,timestamps:final.timestamps,durations:final.durations,earlyMins:final.earlyMins,xpEarned:final.xpEarned,date:new Date().toLocaleDateString()};
    const newReports=[...teacherReports,newReport];
    setTeacherReports(newReports); saveReports(newReports,approved);
    setActiveStudent(null); setScreen("done_"+name);
  }

  function handleResetAll(){
    setSessions({}); setTeacherReports([]); setApproved({});
    saveReports([],{}); setScreen("launchpad");
  }
  function handleResetStudent(name){
    setSessions(s=>{ const n={...s}; delete n[name]; return n; });
    setTeacherReports(prev=>{
      const newApp={};let idx=0;
      prev.forEach((r,old)=>{ if(r.student!==name){ if(approved[old]) newApp[idx]=true; idx++; } });
      setApproved(newApp);
      const next=prev.filter(r=>r.student!==name);
      saveReports(next,newApp); return next;
    });
  }
  function handleApprove(i){ const a={...approved,[i]:true}; setApproved(a); saveReports(teacherReports,a); }

  if(loading) return (
    <div style={{background:BG,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
      <div style={{fontSize:48}}>🚀</div>
      <p style={{fontSize:16,fontWeight:700,color:"#888"}}>Loading Mission Control…</p>
    </div>
  );

  function handleTeacherUnlock(){ setUnlocked(true); storageSet("mc_unlocked",true); setScreen("teacher"); }

  function handleLogout(){ setUnlocked(false); storageSet("mc_unlocked",false); setScreen("launchpad"); }

  if(!unlocked) return <AccessGate pins={pins} onGranted={handleUnlock} onTeacherGranted={handleTeacherUnlock}/>;

  if(screen.startsWith("done_")){
    const name=screen.replace("done_","");
    const sess=sessions[name]||{};
    return (
      <div style={{background:BG,minHeight:"100vh",padding:"2rem",textAlign:"center"}}>
        {streakPopup&&streakPopup.name===name&&(
          <StreakPopup streak={streakPopup.wasMax?0:streakPopup.streak} wasMax={streakPopup.wasMax}
            onClose={()=>{ setStreakPopup(null); setScreen("launchpad"); }}/>
        )}
        {!streakPopup&&<>
          <div style={{fontSize:64,marginBottom:12}}>🚀</div>
          <h2 style={{fontWeight:800,fontSize:26,color:"#fff",marginBottom:8}}>Day complete, {name}!</h2>
          <p style={{fontSize:16,color:"#888",fontWeight:600,marginBottom:4}}>Sent for teacher review.</p>
          {sess.xpEarned>0&&<p style={{fontSize:20,color:ACCENT,fontWeight:800}}>+{sess.xpEarned} XP earned!</p>}
          <div style={{display:"flex",justifyContent:"center",gap:10,marginTop:8}}>
            <StarBadge xp={balances[name]||0}/>
            <StreakBar streak={getStreak(name)}/>
          </div>
          <button onClick={()=>setScreen("launchpad")} style={{marginTop:"1.5rem",fontWeight:700,fontSize:16,background:BLUE,color:"#fff",border:"none",borderRadius:10,padding:"12px 28px",cursor:"pointer"}}>← Back to Launch Pad</button>
        </>}
      </div>
    );
  }

  if(screen==="teacher") return (
    <TeacherView
      families={families} sessions={sessions} teacherReports={teacherReports}
      approved={approved} balances={balances} streaks={streaks} pins={pins}
      onApprove={handleApprove} onResetAll={handleResetAll} onResetStudent={handleResetStudent}
      onFamiliesChange={f=>setFamilies(f)} onBalanceUpdate={(n,v)=>setBalances(b=>({...b,[n]:v}))}
      onPinsChange={setPins} onBack={()=>setScreen("launchpad")}/>
  );

  if(screen==="student"&&activeStudent) return (
    <StudentScreen name={activeStudent} session={getSession(activeStudent)}
      streak={getStreak(activeStudent)} balance={balances[activeStudent]||0}
      onUpdate={u=>handleUpdate(activeStudent,u)}
      onBack={handleStudentBack}
      onSubmit={f=>handleSubmit(activeStudent,f)}/>
  );

  return (
    <>
      {showTeacherGate&&<TeacherGate onSuccess={()=>{ setShowTeacherGate(false); setScreen("teacher"); }} onCancel={()=>setShowTeacherGate(false)}/>}
      <LaunchPad
        families={families} sessions={sessions} streaks={streaks} balances={balances}
        onSelectStudent={handleSelectStudent}
        onTeacherAccess={()=>setShowTeacherGate(true)}
        onLogout={handleLogout}/>
    </>
  );
}