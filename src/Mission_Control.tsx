// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { fsGet, fsSet, fsListen, PATHS } from "./db";

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_FAMILIES = [
  { id: 1, name: "Smith Family", students: ["Ira S.", "Zach S."] },
  { id: 2, name: "Croasmun Family", students: ["Allison C.", "Kate C.", "Titus C.", "Adaline C.", "Oksana C.", "Willow C.", "Haven C."] },
  { id: 3, name: "Jackson Family", students: ["Elijah J."] },
];

// ── PANTRY + SLOTS (Stage 3b — defined but not yet wired up) ─────────────────
// PANTRY is the master catalog of all 104 subjects. defaultGroup decides
// which header in the picker the item appears under but does NOT restrict
// where the item can be assigned — teachers can drop any item into any slot.
const PANTRY = [
  // Math (21)
  { id:"math_video", label:"Math Video", defaultGroup:"Math", xp:1 },
  { id:"math_practice", label:"Math Practice", defaultGroup:"Math", xp:2 },
  { id:"math_review", label:"Math Review", defaultGroup:"Math", xp:3 },
  { id:"math_facts", label:"Math Facts", defaultGroup:"Math", xp:2 },
  { id:"math_flashcards", label:"Math Flashcards", defaultGroup:"Math", xp:2 },
  { id:"arithmetic_lesson", label:"Arithmetic Lesson", defaultGroup:"Math", xp:1 },
  { id:"arithmetic_seatwork", label:"Arithmetic Seat-work", defaultGroup:"Math", xp:3 },
  { id:"geometry_video", label:"Geometry Video", defaultGroup:"Math", xp:1 },
  { id:"geometry", label:"Geometry", defaultGroup:"Math", xp:2 },
  { id:"algebra_video", label:"Algebra Video", defaultGroup:"Math", xp:1 },
  { id:"algebra_practice", label:"Algebra Practice", defaultGroup:"Math", xp:2 },
  { id:"algebra_review", label:"Algebra Review", defaultGroup:"Math", xp:3 },
  { id:"numbers_seatwork", label:"Numbers Seat-work", defaultGroup:"Math", xp:3 },
  { id:"numbers_lesson", label:"Numbers Lesson", defaultGroup:"Math", xp:1 },
  { id:"drill_set_flashcards", label:"Drill Set Flashcards", defaultGroup:"Math", xp:2 },
  { id:"times_tables", label:"Times Tables", defaultGroup:"Math", xp:2 },
  { id:"math_seeds", label:"Math Seeds", defaultGroup:"Math", xp:2 },
  { id:"tower_math", label:"Tower Math", defaultGroup:"Math", xp:2 },
  { id:"abc_mouse_math", label:"ABC Mouse (Math)", defaultGroup:"Math", xp:2 },
  { id:"_180_math", label:"180 (Math)", defaultGroup:"Math", xp:3 },
  { id:"pace_math", label:"Pace (Math)", defaultGroup:"Math", xp:2 },
  // ELA / Phonics (28)
  { id:"grammar_lesson", label:"Grammar Lesson", defaultGroup:"ELA", xp:1 },
  { id:"grammar_practice", label:"Grammar Practice", defaultGroup:"ELA", xp:2 },
  { id:"grammar_review", label:"Grammar Review", defaultGroup:"ELA", xp:3 },
  { id:"language_arts", label:"Language Arts", defaultGroup:"ELA", xp:2 },
  { id:"letters_and_sounds", label:"Letters and Sounds", defaultGroup:"ELA", xp:2 },
  { id:"explode_the_code", label:"Explode The Code", defaultGroup:"ELA", xp:2 },
  { id:"abc_mouse_letters", label:"ABC Mouse (Letters)", defaultGroup:"ELA", xp:2 },
  { id:"reading_eggs_reading", label:"Reading Eggs (reading)", defaultGroup:"ELA", xp:2 },
  { id:"reading_eggs_other", label:"Reading Eggs (other)", defaultGroup:"ELA", xp:2 },
  { id:"handwriting", label:"Handwriting", defaultGroup:"ELA", xp:2 },
  { id:"penmanship", label:"Penmanship", defaultGroup:"ELA", xp:2 },
  { id:"combo_dictation_journal_writing", label:"Dictation / Journal Entry / Writing Lesson", defaultGroup:"ELA", xp:2 },
  { id:"dictation", label:"Dictation", defaultGroup:"ELA", xp:2 },
  { id:"journal_entry", label:"Journal Entry", defaultGroup:"ELA", xp:2 },
  { id:"writing_lesson", label:"Writing Lesson", defaultGroup:"ELA", xp:1 },
  { id:"english", label:"English", defaultGroup:"ELA", xp:2 },
  { id:"english_lesson", label:"English Lesson", defaultGroup:"ELA", xp:1 },
  { id:"phonics_lesson", label:"Phonics Lesson", defaultGroup:"ELA", xp:1 },
  { id:"phonics_seatwork", label:"Phonics Seat-work", defaultGroup:"ELA", xp:3 },
  { id:"vocabulary", label:"Vocabulary", defaultGroup:"ELA", xp:2 },
  { id:"handbook_for_reading", label:"Handbook For Reading", defaultGroup:"ELA", xp:2 },
  { id:"flashcards", label:"Flashcards", defaultGroup:"ELA", xp:2 },
  { id:"charts", label:"Charts", defaultGroup:"ELA", xp:2 },
  { id:"reading", label:"Reading", defaultGroup:"ELA", xp:2 },
  { id:"iew_writing_lesson", label:"IEW Writing Lesson", defaultGroup:"ELA", xp:1 },
  { id:"iew_writing_assignment", label:"IEW Writing Assignment", defaultGroup:"ELA", xp:3 },
  { id:"fixit", label:"FixIt!", defaultGroup:"ELA", xp:2 },
  { id:"_180_language", label:"180 (language)", defaultGroup:"ELA", xp:3 },
  // Core (30)
  { id:"spelling", label:"Spelling", defaultGroup:"Core", xp:3 },
  { id:"history", label:"History", defaultGroup:"Core", xp:3 },
  { id:"social_studies", label:"Social Studies", defaultGroup:"Core", xp:3 },
  { id:"science", label:"Science", defaultGroup:"Core", xp:3 },
  { id:"typing", label:"Typing", defaultGroup:"Core", xp:3 },
  { id:"coding", label:"Coding", defaultGroup:"Core", xp:3 },
  { id:"word_building", label:"Word Building", defaultGroup:"Core", xp:3 },
  { id:"story_of_the_world", label:"Story Of the World", defaultGroup:"Core", xp:3 },
  { id:"mystery_of_history", label:"Mystery of History", defaultGroup:"Core", xp:3 },
  { id:"zoology", label:"Zoology", defaultGroup:"Core", xp:3 },
  { id:"biology", label:"Biology", defaultGroup:"Core", xp:3 },
  { id:"chemistry", label:"Chemistry", defaultGroup:"Core", xp:3 },
  { id:"physics", label:"Physics", defaultGroup:"Core", xp:3 },
  { id:"earth_science", label:"Earth Science", defaultGroup:"Core", xp:3 },
  { id:"botany", label:"Botany", defaultGroup:"Core", xp:3 },
  { id:"astronomy", label:"Astronomy", defaultGroup:"Core", xp:3 },
  { id:"anatomy_physiology", label:"Anatomy and Physiology", defaultGroup:"Core", xp:3 },
  { id:"logic", label:"Logic", defaultGroup:"Core", xp:3 },
  { id:"health", label:"Health", defaultGroup:"Core", xp:3 },
  { id:"civics", label:"Civics", defaultGroup:"Core", xp:3 },
  { id:"economics", label:"Economics", defaultGroup:"Core", xp:3 },
  { id:"government", label:"Government", defaultGroup:"Core", xp:3 },
  { id:"_180_geography", label:"180 (geography)", defaultGroup:"Core", xp:3 },
  { id:"_180_spelling", label:"180 (spelling)", defaultGroup:"Core", xp:3 },
  { id:"_180_science", label:"180 (Science)", defaultGroup:"Core", xp:3 },
  { id:"_180_history", label:"180 (history)", defaultGroup:"Core", xp:3 },
  { id:"pace_science", label:"Pace (Science)", defaultGroup:"Core", xp:3 },
  { id:"pace_history", label:"Pace (History)", defaultGroup:"Core", xp:3 },
  { id:"pace_other", label:"Pace (other)", defaultGroup:"Core", xp:3 },
  { id:"tyson_squats", label:"15 card Tyson Squats", defaultGroup:"Core", xp:3 },
  // Autonomous Navigation (15)
  { id:"spanish", label:"Spanish", defaultGroup:"AutoNav", xp:2 },
  { id:"french", label:"French", defaultGroup:"AutoNav", xp:2 },
  { id:"literature", label:"Literature", defaultGroup:"AutoNav", xp:2 },
  { id:"math_app", label:"Math (app)", defaultGroup:"AutoNav", xp:2 },
  { id:"who_was_app", label:"Who Was? (app)", defaultGroup:"AutoNav", xp:2 },
  { id:"social_studies_audiobook", label:"Social Studies Audiobook", defaultGroup:"AutoNav", xp:2 },
  { id:"knowledge_base", label:"Knowledge Base (encyclopedia 2 pages)", defaultGroup:"AutoNav", xp:2 },
  { id:"grammar_app", label:"Grammar app", defaultGroup:"AutoNav", xp:2 },
  { id:"geography_app", label:"Geography App", defaultGroup:"AutoNav", xp:2 },
  { id:"picture_books", label:"Picture Books", defaultGroup:"AutoNav", xp:2 },
  { id:"read_aloud", label:"Read aloud", defaultGroup:"AutoNav", xp:2 },
  { id:"plank_1min", label:"1 Minute Plank", defaultGroup:"AutoNav", xp:2 },
  { id:"teachers_choice_video", label:"Teachers Choice Video", defaultGroup:"AutoNav", xp:2 },
  { id:"approved_game", label:"Approved Game", defaultGroup:"AutoNav", xp:2 },
  { id:"autonav_other", label:"Other", defaultGroup:"AutoNav", xp:2 },
  // Skills (10)
  { id:"fine_arts", label:"Fine Arts", defaultGroup:"Skills", xp:1 },
  { id:"landscaping_technology", label:"Landscaping Technology", defaultGroup:"Skills", xp:1 },
  { id:"provision_gardening", label:"Provision Gardening", defaultGroup:"Skills", xp:1 },
  { id:"auto_detailing", label:"Auto Detailing", defaultGroup:"Skills", xp:1 },
  { id:"culinary_skills", label:"Culinary Skills", defaultGroup:"Skills", xp:1 },
  { id:"domestic_proficiency", label:"Domestic Proficiency", defaultGroup:"Skills", xp:1 },
  { id:"textile_crafting", label:"Textile Crafting", defaultGroup:"Skills", xp:1 },
  { id:"entrepreneurship", label:"Entrepreneurship", defaultGroup:"Skills", xp:1 },
  { id:"finance", label:"Finance", defaultGroup:"Skills", xp:1 },
  { id:"skills_other", label:"Other", defaultGroup:"Skills", xp:1 },
];

// SLOTS are the 5 buckets per student. requiredForStreak determines whether
// items in the slot must be checked for the daily streak to fire.
const SLOTS = [
  { id:"Math",    label:"Math",                  requiredForStreak:true  },
  { id:"ELA",     label:"ELA / Phonics",         requiredForStreak:true  },
  { id:"Core",    label:"Core",                  requiredForStreak:true  },
  { id:"AutoNav", label:"Autonomous Navigation", requiredForStreak:false },
  { id:"Skills",  label:"Skills",                requiredForStreak:false },
];

const TOTAL_MS = 2.5*60*60*1000;
const TRACK_HEIGHT = 340;
const BG="#0a0a1a", CARD="#13132a", ACCENT="#f0c040", GREEN="#1D9E75", BLUE="#185FA5";
const MAX_STREAK = 5;

// ── Util ──────────────────────────────────────────────────────────────────────
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
function normalizeId(name) { return name.replace(/[\s.]/g,"").toLowerCase(); }

// ── UI Primitives ─────────────────────────────────────────────────────────────
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
function SpaceTrack({progress,doneCount,totalCount}) {
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
      {Array.from({length:Math.max(1,totalCount)}).map((_,idx)=>{
        const pct=totalCount<=1?0:(totalCount-1-idx)/(totalCount-1);
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

// ── Access Gate (students: name + PIN; teachers: email + password) ─────────────
function AccessGate({pins, onStudentGranted, onTeacherGranted}) {
  const [tab, setTab]=useState("student");
  const [nameInput,setNameInput]=useState("");
  const [pin,setPin]=useState("");
  const [teacherEmail,setTeacherEmail]=useState("");
  const [teacherPw,setTeacherPw]=useState("");
  const [err,setErr]=useState("");
  const [loggingIn,setLoggingIn]=useState(false);

  function attemptStudent() {
    setErr("");
    const sid=normalizeId(nameInput);
    if(!sid||!pin){ setErr("Please enter your name and PIN."); return; }
    const stored=pins[sid];
    if(!stored||!stored.pin){ setErr("Name not found or no PIN set. Ask your teacher."); return; }
    if(stored.pin!==pin){ setErr("Incorrect PIN. Try again."); return; }
    onStudentGranted();
  }

  async function attemptTeacher() {
    setErr("");
    if(!teacherEmail.trim()||!teacherPw){ setErr("Please enter your email and password."); return; }
    setLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, teacherEmail.trim(), teacherPw);
      onTeacherGranted();
    } catch(e) {
      setErr("Login failed. Check your email and password.");
    }
    setLoggingIn(false);
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
            <p style={{fontSize:13,color:"#888",fontWeight:600,margin:"0 0 12px",textAlign:"center"}}>Sign in with your teacher account</p>
            <input type="email" placeholder="Email" value={teacherEmail}
              onChange={e=>{setTeacherEmail(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&attemptTeacher()}
              style={{width:"100%",fontSize:15,padding:"12px 14px",borderRadius:9,border:`1.5px solid ${BLUE}55`,background:"#0a0a1a",color:"#fff",fontWeight:600,boxSizing:"border-box",marginBottom:10}}/>
            <input type="password" placeholder="Password" value={teacherPw}
              onChange={e=>{setTeacherPw(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&attemptTeacher()}
              style={{width:"100%",fontSize:15,padding:"12px 14px",borderRadius:9,border:`1.5px solid ${BLUE}55`,background:"#0a0a1a",color:"#fff",fontWeight:600,boxSizing:"border-box",marginBottom:10}}/>
            {err&&<p style={{color:"#e05050",fontWeight:700,fontSize:13,margin:"0 0 10px",textAlign:"center"}}>{err}</p>}
            <button onClick={attemptTeacher} disabled={loggingIn}
              style={{width:"100%",padding:"13px",borderRadius:9,border:"none",background:loggingIn?"#1a3a5a":BLUE,color:"#fff",fontWeight:800,fontSize:17,cursor:loggingIn?"default":"pointer",boxShadow:`0 0 16px ${BLUE}55`}}>
              {loggingIn?"Signing in…":"Enter Teacher View 🔒"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Launch Pad ────────────────────────────────────────────────────────────────
function LaunchPad({families,sessions,streaks,balances,studentSubjects,onSelectStudent,onTeacherAccess,onLogout}) {
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
              const ids=SLOTS.flatMap(s=>(studentSubjects?.[name]?.[s.id])||[]);const totalItems=ids.length;const doneSubjects=ids.filter(id=>sess?.completed?.[id]).length;
              return (
                <button key={name} onClick={()=>onSelectStudent(name)}
                  style={{padding:"14px 10px",textAlign:"center",fontWeight:700,background:done?"#0a2a1a":active?"#0a1a2a":CARD,color:"#fff",border:done?`2px solid ${GREEN}`:active?`2px solid ${BLUE}`:"2px solid #2a2a5a",borderRadius:12,cursor:"pointer",transition:"all 0.2s",boxShadow:active?`0 0 12px ${BLUE}44`:done?`0 0 12px ${GREEN}44`:undefined}}>
                  <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>{name}</div>
                  {done&&<div style={{fontSize:12,color:GREEN,fontWeight:700}}>✓ Done</div>}
                  {active&&<div style={{fontSize:12,color:"#60aaff",fontWeight:700}}>🚀 {doneSubjects}/{totalItems}</div>}
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

// ── Manage Student PINs ───────────────────────────────────────────────────────
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

// ── XP Bank ───────────────────────────────────────────────────────────────────
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

// ── Manage Students ───────────────────────────────────────────────────────────
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
function DailySummary({reports, families, slotAssignments, onClose}) {
  const fmtTotalDuration = (ms) => {
    if (!ms) return "0m";
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  const itemById = Object.fromEntries(PANTRY.map(p => [p.id, p]));

  return (
    <div className="ds-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:200,overflowY:"auto",padding:"1rem"}}>
      <style>{`
        @media print {
          @page { margin: 0.5in; }
          body { background: #FFFFFF !important; }
          body * { visibility: hidden !important; }
          .ds-modal, .ds-modal * {visibility: visible !important; }
          .ds-backdrop { position: static !important; background: transparent !important; padding: 0 !important; overflow: visible !important; display: block !important; visibility: hidden !important; }
          .ds-modal { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; background: #FFFFFF !important; }
          .ds-buttons { display: none !important; }
          .ds-topbar { padding-bottom: 6px !important; margin-bottom: 8px !important; border-bottom-color: #2A2A1A !important; }
          .ds-title { font-size: 16px !important; }
          .ds-date { font-size: 11px !important; }
          .ds-family-pill { background: #2A2A1A !important; color: #FFFFFF !important; font-size: 10px !important; padding: 4px 10px !important; margin: 0.7rem 0 0.4rem !important; }
          .ds-student { background: #FFFFFF !important; border: 1px solid #999 !important; padding: 0.5rem 0.7rem 0.6rem !important; margin-bottom: 0.5rem !important; break-inside: avoid !important; page-break-inside: avoid !important; }
          .ds-student-name { font-size: 14px !important; margin-bottom: 0.2rem !important; }
          .ds-stats { font-size: 10px !important; gap: 0.85rem !important; margin-bottom: 0.4rem !important; padding-bottom: 0.35rem !important; }
          .ds-stat-strong { font-size: 11px !important; }
          .ds-slot-grid { column-count: 2 !important; column-gap: 1.25rem !important; column-rule: 1px solid #E5D5BB !important; }
          .ds-slot { break-inside: avoid !important; page-break-inside: avoid !important; margin-bottom: 0.45rem !important; display: block !important; }
          .ds-slot-header { font-size: 9.5px !important; letter-spacing: 0.08em !important; padding-bottom: 1px !important; margin-bottom: 2px !important; border-bottom-color: #2A2A1A !important; }
          .ds-item { font-size: 11px !important; padding: 2px 2px !important; }
          .ds-duration { font-size: 10px !important; }
          .ds-empty-note { font-size: 9px !important; padding: 2px !important; }
          .ds-skipped-tag { font-size: 9.5px !important; }
        }
      `}</style>
      <div className="ds-modal" style={{background:"#F5E6D3",borderRadius:16,padding:"1.5rem 1.75rem 1.75rem",width:"100%",maxWidth:760,marginTop:"1rem",marginBottom:"1rem",border:"1px solid #D9C9B0",boxShadow:"0 8px 40px rgba(0,0,0,0.5)"}}>
        <div className="ds-topbar" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"1rem",marginBottom:"1.25rem",paddingBottom:"0.9rem",borderBottom:"1.5px solid #D9C9B0"}}>
          <div>
            <h3 className="ds-title" style={{margin:0,fontSize:26,fontWeight:800,color:"#2A2A1A",letterSpacing:"-0.01em"}}>Daily Summary</h3>
            <p className="ds-date" style={{margin:"4px 0 0",fontSize:15,color:"#776655",fontWeight:600}}>{dateStr()}</p>
          </div>
          <div className="ds-buttons" style={{display:"flex",gap:8,flexShrink:0}}>
            <button onClick={()=>window.print()} style={{border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:"#8B5A3C",color:"#FBF1E2"}}>🖨️ Print</button>
            <button onClick={onClose} style={{border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:"#D9C9B0",color:"#2A2A1A"}}>Close</button>
          </div>
        </div>

        {reports.length === 0
          ? <p style={{color:"#776655",fontWeight:600,fontSize:15}}>No submissions yet today.</p>
          : families.map(fam => {
              const famReports = reports.filter(r => fam.students.includes(r.student));
              if (!famReports.length) return null;
              return (
                <div key={fam.id}>
                  <span className="ds-family-pill" style={{display:"inline-block",background:"#8B5A3C",color:"#FBF1E2",padding:"7px 16px",borderRadius:999,fontSize:13,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",margin:"1.5rem 0 0.85rem"}}>{fam.name}</span>
                  {famReports.map((r, i) => {
                    const studentAssigns = (slotAssignments && slotAssignments[r.student]) || {};
                    let totalDurationMs = 0;
                    Object.values(r.durations || {}).forEach(d => totalDurationMs += (d || 0));
                    const completedCount = Object.values(r.completed || {}).filter(Boolean).length;
                    let assignedCount = 0;
                    for (const slot of SLOTS) assignedCount += (studentAssigns[slot.id] || []).length;

                    return (
                      <div key={i} className="ds-student" style={{background:"#FBF1E2",border:"1px solid #E5D5BB",borderRadius:12,padding:"1.1rem 1.3rem 1.25rem",marginBottom:"1.1rem"}}>
                        <h4 className="ds-student-name" style={{margin:"0 0 0.45rem",fontSize:22,fontWeight:800,color:"#2A2A1A"}}>{r.student}</h4>
                        <div className="ds-stats" style={{display:"flex",flexWrap:"wrap",gap:"1.25rem",fontSize:14,color:"#5A4A3A",marginBottom:"0.95rem",paddingBottom:"0.85rem",borderBottom:"1px dashed #D9C9B0",fontWeight:600}}>
                          <span><strong className="ds-stat-strong" style={{color:"#2A2A1A",fontSize:16,marginRight:4}}>{fmtTotalDuration(totalDurationMs)}</strong> total time</span>
                          <span><strong className="ds-stat-strong" style={{color:"#2A2A1A",fontSize:16,marginRight:4}}>{r.xpEarned||0}</strong> XP earned</span>
                          <span><strong className="ds-stat-strong" style={{color:"#2A2A1A",fontSize:16,marginRight:4}}>{completedCount} / {assignedCount}</strong> assigned subjects done</span>
                        </div>
                        <div className="ds-slot-grid">
                          {SLOTS.map(slot => {
                            const assignedIds = studentAssigns[slot.id] || [];
                            const assignedItems = assignedIds.map(id => itemById[id]).filter(Boolean);
                            const showSkipped = slot.requiredForStreak;
                            const itemsToShow = showSkipped
                              ? assignedItems
                              : assignedItems.filter(item => r.completed[item.id]);
                            return (
                              <div key={slot.id} className="ds-slot" style={{marginBottom:"0.95rem"}}>
                                <p className="ds-slot-header" style={{margin:"0 0 6px",fontSize:13,fontWeight:800,color:"#5A4A3A",textTransform:"uppercase",letterSpacing:"0.11em",borderBottom:"1px solid #E5D5BB",paddingBottom:4}}>{slot.label}</p>
                                {itemsToShow.length === 0
                                  ? <p className="ds-empty-note" style={{margin:0,padding:"6px 4px",fontSize:14,color:"#A89580",fontStyle:"italic"}}>— nothing completed —</p>
                                  : itemsToShow.map(item => {
                                      const isDone = r.completed[item.id];
                                      return (
                                        <div key={item.id} className="ds-item" style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"7px 4px",fontSize:17,borderBottom:"1px dotted #E5D5BB"}}>
                                          {isDone
                                            ? <>
                                                <span style={{color:"#1D7A5A",fontWeight:700}}>✓ {item.label}</span>
                                                <span className="ds-duration" style={{color:"#5A4A3A",fontSize:14,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmtDuration(r.durations[item.id])}</span>
                                              </>
                                            : <>
                                                <span style={{color:"#A89580",fontStyle:"italic"}}>○ {item.label}</span>
                                                <span className="ds-skipped-tag" style={{color:"#A89580",fontSize:13,fontWeight:600,fontStyle:"italic"}}>not done</span>
                                              </>
                                          }
                                        </div>
                                      );
                                    })
                                }
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
        }
      </div>
    </div>
  );
}

// ── Student Screen ────────────────────────────────────────────────────────────
function StudentScreen({name,session,streak,balance,slotAssignments,onUpdate,onBack,onSubmit}) {
  const [,setTick]=useState(0);
  const rafRef=useRef(null);
  const [particles,setParticles]=useState([]);
  const [xpFlashes,setXpFlashes]=useState([]);
  const [showComplete,setShowComplete]=useState(false);
  const [completeFired,setCompleteFired]=useState(false);

  // Build the visible items from this student's slot assignments.
  // Defensive: skip any IDs that no longer exist in the pantry.
  const itemById = Object.fromEntries(PANTRY.map(p=>[p.id,p]));
  const itemsBySlot = {};
  let visibleItems = [];
  for (const slot of SLOTS) {
    const ids = (slotAssignments && slotAssignments[slot.id]) || [];
    const items = ids.map(id=>itemById[id]).filter(Boolean);
    itemsBySlot[slot.id] = items;
    visibleItems = visibleItems.concat(items);
  }
  const totalItemCount = visibleItems.length;

  useEffect(()=>{
    function loop(){ setTick(t=>t+1); rafRef.current=setTimeout(loop,500); }
    rafRef.current=setTimeout(loop,500); return ()=>clearTimeout(rafRef.current);
  },[]);

  const remainingMs=getRemainingMs(session);
  const doneCount = visibleItems.filter(it=>session.completed[it.id]).length;
  const progress = totalItemCount>0 ? doneCount/totalItemCount : 0;
  const isRunning=!session.isPaused&&session.startEpoch!=null;
  const allDone = totalItemCount>0 && doneCount===totalItemCount;
  const sessionXP = visibleItems.reduce((sum,it)=>sum+(session.completed[it.id]?it.xp:0),0);

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
    const subj=itemById[id];
    if(!subj) return;
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
      {totalItemCount === 0 ? (
        <div style={{background:CARD,borderRadius:14,padding:"2rem 1.25rem",border:"1px solid #2a2a5a",textAlign:"center",marginBottom:"1rem"}}>
          <div style={{fontSize:48,marginBottom:8}}>📋</div>
          <p style={{margin:"0 0 4px",fontWeight:800,fontSize:18,color:"#fff"}}>No subjects assigned yet</p>
          <p style={{margin:0,fontSize:13,color:"#888",fontWeight:600}}>Ask your teacher to set up your daily list.</p>
        </div>
      ) : (
        <>
          <div style={{textAlign:"center",marginBottom:"0.75rem"}}>
            <p style={{margin:0,fontSize:12,color:"#888",fontWeight:700}}>Time remaining</p>
            <p style={{margin:0,fontWeight:800,fontSize:30,color:remainingMs<600000?"#e05050":"#fff",letterSpacing:"0.04em"}}>{fmt(remainingMs)}</p>
          </div>
          <div style={{display:"flex",gap:"1rem",marginBottom:"1rem",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{background:CARD,borderRadius:12,padding:"0.65rem 1rem",marginBottom:"0.75rem",border:"1px solid #2a2a5a"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#888"}}>Progress</span>
                  <span style={{fontSize:13,fontWeight:800,color:ACCENT}}>{doneCount}/{totalItemCount} · {sessionXP} XP</span>
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
            <SpaceTrack progress={progress} doneCount={doneCount} totalCount={totalItemCount}/>
          </div>
          {SLOTS.map(slot=>{
            const items = itemsBySlot[slot.id];
            if(items.length===0) return null;
            return (
              <div key={slot.id} style={{marginBottom:"0.65rem"}}>
                <p style={{margin:"0 0 5px",fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:"0.08em"}}>{slot.label}</p>
                {items.map(s=>(
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
            );
          })}
          {session.startTimeStr&&!session.submitted&&(
            <button onClick={handleSubmit} style={{width:"100%",marginTop:8,fontWeight:700,fontSize:16,background:allDone?GREEN:BLUE,color:"#fff",border:"none",borderRadius:10,padding:"13px",cursor:"pointer",boxShadow:allDone?`0 0 16px ${GREEN}88`:undefined}}>
              {allDone?"🚀 Submit for teacher approval":`Submit now (${totalItemCount-doneCount} remaining)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Add Teacher Modal ─────────────────────────────────────────────────────────
function AddTeacherModal({onClose}) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [sent,setSent]=useState(false);
  const [err,setErr]=useState("");
  const [saving,setSaving]=useState(false);

  async function handleCreate() {
    setErr("");
    if(!displayName.trim()){ setErr("Please enter a name."); return; }
    if(!email.trim()||!email.includes("@")){ setErr("Please enter a valid email address."); return; }
    if(password.length<6){ setErr("Password must be at least 6 characters."); return; }
    setSaving(true);
    try {
      // Store teacher info in Firestore so it shows up in the list
      const { db } = await import("./firebase");
      const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
      await setDoc(doc(db, "teachers", normalizeId(email)), {
        displayName: displayName.trim(),
        email: email.trim(),
        createdAt: serverTimestamp(),
      });
      setSent(true);
    } catch(e) {
      setErr("Failed to save teacher. Try again.");
    }
    setSaving(false);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:"1rem"}}>
      <div style={{background:CARD,borderRadius:20,padding:"2rem",width:"100%",maxWidth:360,border:"1px solid #2a2a5a",textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:8}}>👩‍🏫</div>
        <h3 style={{margin:"0 0 4px",fontWeight:800,fontSize:20,color:"#fff"}}>Add Teacher</h3>
        {!sent ? (
          <>
            <p style={{margin:"0 0 14px",fontSize:13,color:"#888",fontWeight:600,lineHeight:1.5}}>
              Create a new teacher account. They can sign in with these credentials immediately.
            </p>
            <input type="text" placeholder="Display name" value={displayName}
              onChange={e=>{setDisplayName(e.target.value);setErr("");}}
              style={{width:"100%",fontSize:15,padding:"11px 14px",borderRadius:9,border:"1.5px solid #2a2a5a",background:"#0a0a1a",color:"#fff",fontWeight:600,boxSizing:"border-box",marginBottom:8}}/>
            <input type="email" placeholder="Email" value={email}
              onChange={e=>{setEmail(e.target.value);setErr("");}}
              style={{width:"100%",fontSize:15,padding:"11px 14px",borderRadius:9,border:`1.5px solid ${BLUE}55`,background:"#0a0a1a",color:"#fff",fontWeight:600,boxSizing:"border-box",marginBottom:8}}/>
            <input type="password" placeholder="Temporary password (min 6 chars)" value={password}
              onChange={e=>{setPassword(e.target.value);setErr("");}}
              style={{width:"100%",fontSize:15,padding:"11px 14px",borderRadius:9,border:`1.5px solid ${BLUE}55`,background:"#0a0a1a",color:"#fff",fontWeight:600,boxSizing:"border-box",marginBottom:10}}/>
            <p style={{fontSize:11,color:"#555",margin:"0 0 10px",lineHeight:1.5}}>
              Note: New teacher accounts must also be created in the Firebase console to enable login. Share the email + password with the teacher.
            </p>
            {err&&<p style={{color:"#e05050",fontWeight:700,fontSize:13,margin:"0 0 10px"}}>{err}</p>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:8,border:"1.5px solid #2a2a5a",background:"transparent",fontWeight:700,fontSize:15,cursor:"pointer",color:"#888"}}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{flex:1,padding:"11px",borderRadius:8,border:"none",background:saving?"#1a3a5a":BLUE,color:"#fff",fontWeight:700,fontSize:15,cursor:saving?"default":"pointer"}}>
                {saving?"Saving…":"Add Teacher"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{fontSize:48,margin:"8px 0"}}>✅</div>
            <p style={{color:GREEN,fontWeight:700,fontSize:15,margin:"0 0 6px"}}>Teacher added!</p>
            <p style={{color:"#888",fontSize:13,fontWeight:600,margin:"0 0 6px",lineHeight:1.5}}>
              <b style={{color:"#ccc"}}>{displayName}</b> has been saved.<br/>
              Remember to also add <b style={{color:"#ccc"}}>{email}</b> in the Firebase console so they can log in.
            </p>
            <button onClick={onClose} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:GREEN,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",marginTop:12}}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Subjects Edit Modal — used by ManageSubjects below ────────────────────────
// Five slot sections per student. Chips for assigned items, removable via ×.
// "+ Add subject" opens an in-modal pantry picker grouped by defaultGroup.
// Items already in another slot for this student are greyed out.
// Saves are continuous — every change calls onChange(newAssignments).
function SubjectsEditModal({ studentName, assignments, onChange, onClose }) {
  const [pickerSlot, setPickerSlot] = useState(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const itemById = Object.fromEntries(PANTRY.map(p => [p.id, p]));
  const slotById = Object.fromEntries(SLOTS.map(s => [s.id, s]));

  function getSlotForItem(itemId) {
    for (const slot of SLOTS) {
      if ((assignments[slot.id] || []).includes(itemId)) return slot.id;
    }
    return null;
  }
  function removeFromSlot(slotId, itemId) {
    onChange({ ...assignments, [slotId]: (assignments[slotId] || []).filter(id => id !== itemId) });
  }
  function togglePickerItem(itemId) {
    if (!pickerSlot) return;
    const list = assignments[pickerSlot] || [];
    if (list.includes(itemId)) onChange({ ...assignments, [pickerSlot]: list.filter(id => id !== itemId) });
    else onChange({ ...assignments, [pickerSlot]: [...list, itemId] });
  }

  function renderPicker() {
    if (!pickerSlot) return null;
    const term = pickerSearch.toLowerCase().trim();
    const groupOrder = ["Math", "ELA", "Core", "AutoNav", "Skills"];
    const grouped = groupOrder.map(gid => ({
      gid,
      items: PANTRY.filter(p => p.defaultGroup === gid && (!term || p.label.toLowerCase().includes(term))),
    })).filter(g => g.items.length > 0);
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) setPickerSlot(null); }}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", zIndex:400 }}>
        <div style={{ background:CARD, borderRadius:14, border:"1px solid #2a2a5a", width:"100%", maxWidth:500, maxHeight:"85vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid #2a2a5a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:"#fff" }}>Add to {slotById[pickerSlot].label}</h3>
              <small style={{ color:"#888", fontWeight:600, fontSize:11, display:"block", marginTop:2 }}>Tap to add. Tap again to remove. Greyed = already in another slot.</small>
            </div>
            <button onClick={() => setPickerSlot(null)} style={{ background:"transparent", border:"1px solid #2a2a5a", color:"#888", padding:"6px 12px", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer" }}>Close</button>
          </div>
          <div style={{ padding:"12px 18px", borderBottom:"1px solid #2a2a5a" }}>
            <input type="text" placeholder="Search pantry…" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} autoFocus
              style={{ width:"100%", background:BG, color:"#fff", border:"1px solid #2a2a5a", borderRadius:8, padding:"9px 12px", fontSize:14, fontWeight:600, boxSizing:"border-box", fontFamily:"inherit" }}/>
          </div>
          <div style={{ overflowY:"auto", padding:"4px 18px 16px", flex:1 }}>
            {grouped.length === 0 ? (
              <p style={{ color:"#555", fontSize:13, textAlign:"center", padding:"32px 0", fontWeight:600 }}>No subjects match your search.</p>
            ) : grouped.map(g => (
              <div key={g.gid} style={{ marginTop:12 }}>
                <p style={{ fontSize:10, fontWeight:800, color:"#666", textTransform:"uppercase", letterSpacing:"0.1em", margin:"6px 0 8px" }}>{slotById[g.gid].label}</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {g.items.map(it => {
                    const slotOfItem = getSlotForItem(it.id);
                    const inThisSlot = slotOfItem === pickerSlot;
                    const inOtherSlot = slotOfItem && !inThisSlot;
                    const base = { display:"inline-flex", alignItems:"center", gap:6, borderRadius:16, padding:"5px 11px", fontSize:12, fontWeight:600, border:"1px solid", fontFamily:"inherit" };
                    const style = inThisSlot
                      ? { ...base, background:"rgba(29,158,117,0.12)", borderColor:GREEN, color:GREEN, cursor:"pointer" }
                      : inOtherSlot
                      ? { ...base, background:BG, borderColor:"#1a1a3a", color:"#666", opacity:0.35, cursor:"not-allowed" }
                      : { ...base, background:"#1a1a3a", borderColor:"#2a2a5a", color:"#ddd", cursor:"pointer" };
                    return (
                      <button key={it.id} disabled={inOtherSlot} onClick={() => !inOtherSlot && togglePickerItem(it.id)} style={style}>
                        {inThisSlot && <span style={{ color:GREEN, fontWeight:800 }}>✓ </span>}
                        {it.label}
                        <span style={{ color: inOtherSlot ? "#444" : inThisSlot ? GREEN : ACCENT, fontSize:10, fontWeight:800, marginLeft:2 }}>+{it.xp}</span>
                        {inOtherSlot && <span style={{ fontSize:9, fontWeight:700, color:"#555", marginLeft:4, fontStyle:"italic" }}>in {slotById[slotOfItem].label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"1rem", overflowY:"auto", zIndex:300 }}>
      <div style={{ background:CARD, borderRadius:16, border:"1px solid #2a2a5a", width:"100%", maxWidth:560, marginTop:"1rem", marginBottom:"1rem" }}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #2a2a5a", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:"#fff" }}>Edit Subjects</h2>
            <p style={{ margin:"3px 0 0", fontSize:12, color:"#888", fontWeight:600 }}>
              <strong style={{ color:"#fff", fontWeight:700 }}>{studentName}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid #2a2a5a", color:"#888", padding:"6px 12px", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>Close</button>
        </div>
        <div style={{ padding:"16px 20px 8px" }}>
          {SLOTS.map(slot => {
            const items = assignments[slot.id] || [];
            const count = items.length;
            const highlighted = count >= 5;
            return (
              <div key={slot.id} style={{ marginBottom:16, paddingBottom:14, borderBottom:"1px solid #1a1a3a" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, gap:10, flexWrap:"wrap" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:12, fontWeight:800, color:"#ccc", textTransform:"uppercase", letterSpacing:"0.08em" }}>{slot.label}</span>
                    <span style={{ fontSize:9, fontWeight:800, padding:"3px 7px", borderRadius:10, textTransform:"uppercase", letterSpacing:"0.05em", border:"1px solid", background:slot.requiredForStreak?"rgba(255,107,53,0.08)":"rgba(29,158,117,0.08)", color:slot.requiredForStreak?"#ff9955":GREEN, borderColor:slot.requiredForStreak?"rgba(255,107,53,0.3)":"rgba(29,158,117,0.3)" }}>
                      {slot.requiredForStreak ? "Streak" : "XP only"}
                    </span>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color: highlighted ? ACCENT : "#555", textShadow: highlighted ? "0 0 6px rgba(240,192,64,0.4)" : undefined }}>
                    {count} item{count === 1 ? "" : "s"}{highlighted ? " · full slot" : ""}
                  </span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8, minHeight:30 }}>
                  {items.length === 0 ? (
                    <span style={{ fontSize:12, color:"#444", fontStyle:"italic", padding:"6px 0 4px" }}>No subjects assigned yet.</span>
                  ) : (
                    items.map(itemId => {
                      const it = itemById[itemId];
                      if (!it) return null;
                      return (
                        <span key={itemId} style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#1a1a3a", border:"1px solid #2a2a5a", borderRadius:16, padding:"4px 4px 4px 10px", fontSize:12, fontWeight:600, color:"#ddd" }}>
                          {it.label}
                          <span style={{ color:ACCENT, fontWeight:800, fontSize:10 }}>+{it.xp}</span>
                          <button onClick={() => removeFromSlot(slot.id, itemId)} style={{ background:"transparent", border:"none", color:"#888", fontWeight:700, fontSize:18, lineHeight:1, cursor:"pointer", padding:"0 6px" }}>×</button>
                        </span>
                      );
                    })
                  )}
                </div>
                <button onClick={() => { setPickerSlot(slot.id); setPickerSearch(""); }}
                  style={{ background:"transparent", border:"1px dashed #3a3a6a", color:"#888", borderRadius:16, padding:"5px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>+ Add subject</button>
              </div>
            );
          })}
        </div>
        <div style={{ padding:"14px 20px", borderTop:"1px solid #2a2a5a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:GREEN, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:GREEN, boxShadow:`0 0 4px ${GREEN}` }}/>
            Auto-saves on each change
          </span>
          <button onClick={onClose} style={{ background:BLUE, color:"#fff", border:"none", borderRadius:8, padding:"9px 22px", fontSize:14, fontWeight:800, cursor:"pointer" }}>Done</button>
        </div>
      </div>
      {renderPicker()}
    </div>
  );
}

// ── Manage Subjects — teacher list of students with their slot assignments ────
// Lists every student grouped by family. Each card shows assigned subjects
// grouped by slot, plus an Edit button that opens SubjectsEditModal.
function ManageSubjects({ families, studentSubjects, onSubjectsChange, onBack }) {
  const [editingStudent, setEditingStudent] = useState(null);
  const itemById = Object.fromEntries(PANTRY.map(p => [p.id, p]));

  function updateStudent(name, newAssignments) {
    onSubjectsChange({ ...studentSubjects, [name]: newAssignments });
  }

  return (
    <div style={{ background:BG, minHeight:"100vh", padding:"1.5rem" }}>
      {editingStudent && (
        <SubjectsEditModal
          studentName={editingStudent}
          assignments={studentSubjects[editingStudent] || { Math:[], ELA:[], Core:[], AutoNav:[], Skills:[] }}
          onChange={(newAssignments) => updateStudent(editingStudent, newAssignments)}
          onClose={() => setEditingStudent(null)}
        />
      )}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1.5rem" }}>
        <button onClick={onBack} style={{ fontWeight:700, fontSize:14, background:BLUE, color:"#fff", border:"none", borderRadius:8, padding:"10px 16px", cursor:"pointer" }}>← Back</button>
        <h2 style={{ margin:0, fontWeight:700, fontSize:22, color:"#fff" }}>📚 Subjects</h2>
      </div>
      {families.map(fam => (
        <div key={fam.id} style={{ marginBottom:"1.5rem" }}>
          <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em" }}>{fam.name}</p>
          {fam.students.map(name => {
            const assignments = studentSubjects[name] || { Math:[], ELA:[], Core:[], AutoNav:[], Skills:[] };
            const totalCount = SLOTS.reduce((sum, s) => sum + (assignments[s.id] || []).length, 0);
            const slotsUsed = SLOTS.filter(s => (assignments[s.id] || []).length > 0).length;
            return (
              <div key={name} style={{ background:CARD, border:"1px solid #2a2a5a", borderRadius:14, padding:"1rem 1.25rem", marginBottom:"0.75rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: totalCount>0 ? "0.75rem" : 0, gap:10, flexWrap:"wrap" }}>
                  <div>
                    <span style={{ fontWeight:700, fontSize:17, color:"#fff" }}>{name}</span>
                    <span style={{ fontSize:12, color:"#555", fontWeight:600, marginLeft:10 }}>
                      {totalCount === 0
                        ? "No subjects assigned"
                        : `${totalCount} subject${totalCount === 1 ? "" : "s"} across ${slotsUsed} slot${slotsUsed === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  <button onClick={() => setEditingStudent(name)} style={{ fontWeight:700, fontSize:13, background:BLUE, color:"#fff", border:"none", borderRadius:8, padding:"7px 16px", cursor:"pointer" }}>Edit</button>
                </div>
                {totalCount > 0 && (
                  <div>
                    {SLOTS.map(slot => {
                      const items = assignments[slot.id] || [];
                      if (items.length === 0) return null;
                      return (
                        <div key={slot.id} style={{ marginBottom:6, display:"flex", alignItems:"flex-start", gap:8, flexWrap:"wrap" }}>
                          <span style={{ fontSize:10, fontWeight:800, color:"#666", textTransform:"uppercase", letterSpacing:"0.08em", paddingTop:4, minWidth:60 }}>{slot.label}</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:4, flex:1 }}>
                            {items.map(itemId => {
                              const it = itemById[itemId];
                              if (!it) return null;
                              return (
                                <span key={itemId} style={{ display:"inline-block", background:"#1a1a3a", border:"1px solid #2a2a5a", borderRadius:12, padding:"2px 9px", fontSize:11, fontWeight:600, color:"#ccc" }}>
                                  {it.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Teacher View ──────────────────────────────────────────────────────────────
function TeacherView({families,sessions,teacherReports,approved,balances,streaks,pins,teacherUser,onApprove,onResetAll,onResetStudent,onFamiliesChange,onBalanceUpdate,onPinsChange,onBack,onTeacherSignOut,studentSubjects,onSubjectsChange}) {
  const [subScreen,setSubScreen]=useState("main");
  const [showSummary,setShowSummary]=useState(false);
  const [showAddTeacher,setShowAddTeacher]=useState(false);
  const [confirmModal,setConfirmModal]=useState(null);
  function showConfirm(msg,cb){ setConfirmModal({msg,cb}); }
  if(subScreen==="pins") return <ManagePINs families={families} pins={pins} onPinsChange={onPinsChange} onBack={()=>setSubScreen("main")}/>;
  if(subScreen==="xpbank") return <XPBank families={families} balances={balances} onUpdate={onBalanceUpdate} onBack={()=>setSubScreen("main")}/>;
  if(subScreen==="students") return <ManageStudents families={families} onChange={onFamiliesChange} onBack={()=>setSubScreen("main")}/>;
  if(subScreen==="subjects") return <ManageSubjects families={families} studentSubjects={studentSubjects} onSubjectsChange={onSubjectsChange} onBack={()=>setSubScreen("main")}/>;
  return (
    <div style={{background:BG,minHeight:"100vh",padding:"1.5rem"}}>
      {confirmModal&&<ConfirmModal message={confirmModal.msg} onConfirm={()=>{confirmModal.cb();setConfirmModal(null);}} onCancel={()=>setConfirmModal(null)}/>}
      {showSummary&&<DailySummary reports={teacherReports} families={families} slotAssignments={studentSubjects} onClose={()=>setShowSummary(false)}/>}
      {showAddTeacher&&<AddTeacherModal onClose={()=>setShowAddTeacher(false)}/>}
      <div style={{display:"flex",gap:"1.25rem",marginBottom:"1.5rem",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <button onClick={onBack} style={{fontWeight:700,fontSize:14,background:"#2a2a5a",color:"#ccc",border:"none",borderRadius:8,padding:"10px 16px",cursor:"pointer"}}>← Launch Pad</button>
          <h2 style={{margin:"10px 0 0",fontWeight:700,fontSize:20,color:"#fff"}}>🚀 Teacher View</h2>
          {teacherUser&&<p style={{margin:"4px 0 0",fontSize:12,color:"#555",fontWeight:600}}>{teacherUser.email}</p>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,minWidth:140}}>
          <button onClick={()=>setShowAddTeacher(true)} style={{fontWeight:700,fontSize:13,background:"#0a1a2a",color:"#60aaff",border:"1px solid #185FA555",borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>👩‍🏫 Add Teacher</button>
          <button onClick={()=>setSubScreen("pins")} style={{fontWeight:700,fontSize:13,background:"#1a1a3a",color:"#ccc",border:"1px solid #2a2a5a",borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>🔑 PINs</button>
          <button onClick={()=>setSubScreen("xpbank")} style={{fontWeight:700,fontSize:13,background:"#2a1a4a",color:ACCENT,border:`1px solid ${ACCENT}44`,borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>⭐ XP Bank</button>
          <button onClick={()=>setSubScreen("students")} style={{fontWeight:700,fontSize:13,background:"#1a1a3a",color:"#ccc",border:"1px solid #2a2a5a",borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>👥 Students</button>
          <button onClick={()=>setSubScreen("subjects")} style={{fontWeight:700,fontSize:13,background:"#1a1a3a",color:"#ccc",border:"1px solid #2a2a5a",borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>📚 Subjects</button>
          <button onClick={()=>setShowSummary(true)} style={{fontWeight:700,fontSize:13,background:"#0a2a1a",color:GREEN,border:`1px solid ${GREEN}44`,borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>📋 Summary</button>
          <button onClick={()=>showConfirm("Reset ALL students? Clears timers, checklists, and today's reports. XP and streaks are safe.",onResetAll)} style={{fontWeight:700,fontSize:13,background:"#2a0a0a",color:"#e05050",border:"1px solid #5a1a1a",borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>🕐 Reset all</button>
          <button onClick={onTeacherSignOut} style={{fontWeight:700,fontSize:13,background:"transparent",color:"#555",border:"1px solid #2a2a5a",borderRadius:8,padding:"9px 14px",cursor:"pointer",textAlign:"right"}}>Sign out</button>
        </div>
      </div>
      {teacherReports.length===0
        ?<p style={{fontSize:16,color:"#888",fontWeight:600}}>No reports submitted yet today.</p>
        :teacherReports.map((r,i)=>{
          const studentAssigns = (studentSubjects && studentSubjects[r.student]) || {};
          const itemById = Object.fromEntries(PANTRY.map(p => [p.id, p]));
          const flatItems = SLOTS.flatMap(slot => (studentAssigns[slot.id] || []).map(id => itemById[id]).filter(Boolean));
          return (
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
              <tbody>{flatItems.length===0?<tr><td colSpan={4} style={{padding:"5px 0",color:"#666",fontStyle:"italic"}}>No subjects assigned</td></tr>:flatItems.map(s=>(
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
        )})
      }
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [authReady,setAuthReady]=useState(false);
  const [teacherUser,setTeacherUser]=useState(null); // Firebase Auth user or null
  const [studentUnlocked,setStudentUnlocked]=useState(false);
  const [screen,setScreen]=useState("launchpad");
  const [activeStudent,setActiveStudent]=useState(null);
  const [families,setFamilies]=useState(null);
  const [pins,setPins]=useState({});
  const [sessions,setSessions]=useState({});
  const [teacherReports,setTeacherReports]=useState([]);
  const [approved,setApproved]=useState({});
  const [balances,setBalances]=useState({});
  const [streaks,setStreaks]=useState({});
  const [studentSubjects,setStudentSubjects]=useState({});
  const [streakPopup,setStreakPopup]=useState(null);
  const [dataLoading,setDataLoading]=useState(true);
  // Tracks the last sessions JSON we saved or received, so the auto-save and
  // listener don't echo each other into an infinite loop.
  const lastSyncedRef=useRef("");

  // ── Listen for Firebase Auth state ──────────────────────────────────────────
  useEffect(()=>{
    const unsub=onAuthStateChanged(auth, user=>{
      setTeacherUser(user||null);
      setAuthReady(true);
      if(user) setScreen("teacher");
    });
    return unsub;
  },[]);

  // ── Load data from Firestore ────────────────────────────────────────────────
  useEffect(()=>{
    if(!authReady || !teacherUser) return;
    Promise.all([
      fsGet(PATHS.roster, DEFAULT_FAMILIES),
      fsGet(PATHS.balances, {}),
      fsGet(PATHS.streaks, {}),
      fsGet(PATHS.pins, {}),
      fsGet(PATHS.reports(todayKey()), null),
      fsGet(PATHS.sessions(todayKey()), null),
      fsGet(PATHS.studentSubjects, {}),
    ]).then(([fams,bals,stks,pns,reports,liveSessions,subs])=>{
      setFamilies(fams); setBalances(bals); setStreaks(stks); setPins(pns);
      // Seed slot assignments: ensure every current student has an entry.
      // Existing entries are preserved; new students get five empty slots.
      const allStudents=fams.flatMap(f=>f.students);
      const seeded={...subs};
      for(const name of allStudents){
        if(!seeded[name]) seeded[name]={Math:[],ELA:[],Core:[],AutoNav:[],Skills:[]};
      }
      setStudentSubjects(seeded);

      // Reconstruct submitted-day sessions from reports as a baseline.
      const rs={};
      if(reports){
        setTeacherReports(reports.list||[]); setApproved(reports.approved||{});
        (reports.list||[]).forEach(r=>{
          rs[r.student]={...initSession(),submitted:true,completed:r.completed,
            earlyMins:r.earlyMins,xpEarned:r.xpEarned,startTimeStr:r.startTime,finishTimeStr:r.finishTime};
        });
      }
      // Overlay any live in-progress sessions saved to Firestore.
      const merged={...rs,...((liveSessions&&liveSessions.list)||{})};
      setSessions(merged);
      setDataLoading(false);
    });
  },[authReady, teacherUser?.uid]);

  // ── 3AM expiry ──────────────────────────────────────────────────────────────
  useEffect(()=>{
    function msUntil3am() {
      const now=new Date();
      const est=new Date(now.toLocaleString("en-US",{timeZone:"America/New_York"}));
      const next=new Date(est); next.setHours(3,0,0,0);
      if(est>=next) next.setDate(next.getDate()+1);
      return next-est;
    }
    const t=setTimeout(()=>setStudentUnlocked(false), msUntil3am());
    return ()=>clearTimeout(t);
  },[]);

  // ── Persist to Firestore whenever data changes ───────────────────────────────
  useEffect(()=>{ if(!dataLoading && families!==null) fsSet(PATHS.roster, families); },[families,dataLoading]);
  useEffect(()=>{ if(!dataLoading) fsSet(PATHS.balances, balances); },[balances,dataLoading]);
  useEffect(()=>{ if(!dataLoading) fsSet(PATHS.streaks, streaks); },[streaks,dataLoading]);
  useEffect(()=>{ if(!dataLoading) fsSet(PATHS.pins, pins); },[pins,dataLoading]);
  useEffect(()=>{ if(!dataLoading) fsSet(PATHS.studentSubjects, studentSubjects); },[studentSubjects,dataLoading]);
  
  // When a new student is added to families later, make sure they get an
  // empty slotAssignments entry. Existing entries are preserved.
  useEffect(()=>{
    if(dataLoading || !families) return;
    setStudentSubjects(prev=>{
      const next={...prev};
      let changed=false;
      for(const fam of families){
        for(const name of fam.students){
          if(!next[name]){
            next[name]={Math:[],ELA:[],Core:[],AutoNav:[],Skills:[]};
            changed=true;
          }
        }
      }
      return changed?next:prev;
    });
  },[families,dataLoading]);

  // ── Auto-save active sessions to Firestore (debounced) ──────────────────────
  // Saves the sessions object 500ms after the last change. The delay batches
  // rapid edits so we don't write to Firestore on every keystroke. The ref
  // check prevents echoing back changes that arrived from the listener.
  useEffect(()=>{
    if(dataLoading) return;
    if(JSON.stringify(sessions)===lastSyncedRef.current) return;
    const t=setTimeout(()=>{
      lastSyncedRef.current=JSON.stringify(sessions);
      fsSet(PATHS.sessions(todayKey()), {list:sessions});
    }, 500);
    return ()=>clearTimeout(t);
  },[sessions,dataLoading]);

  // ── Subscribe to remote session updates (cross-device sync) ─────────────────
  // Listens for changes from other devices and applies them to local state.
  // The ref check prevents re-saving data we just received as if it were a
  // new local edit.
  useEffect(()=>{
    if(dataLoading) return;
    const unsub=fsListen(PATHS.sessions(todayKey()), null, data=>{
      if(!data || !data.list) return;
      const json=JSON.stringify(data.list);
      if(json===lastSyncedRef.current) return;
      lastSyncedRef.current=json;
      setSessions(data.list);
    });
    return unsub;
  },[dataLoading]);

  function saveReports(list,app){ fsSet(PATHS.reports(todayKey()), {list, approved:app}); }

  function getStreak(name){ return (streaks[name]||{count:0}).count; }
  function getSession(name){ return {...initSession(),...(sessions[name]||{})}; }

  function handleSelectStudent(name){
    setSessions(s=>({...s,[name]:s[name]||initSession()}));
    setActiveStudent(name); setScreen("student");
  }
  function handleStudentBack(){ setActiveStudent(null); setScreen("launchpad"); }
  function handleUpdate(name,updated){ setSessions(s=>({...s,[name]:updated})); }

  function handleSubmit(name,final){
    setSessions(s=>({...s,[name]:final}));
    const requiredIds=SLOTS.filter(slot=>slot.requiredForStreak).flatMap(slot=>(studentSubjects?.[name]?.[slot.id])||[]);const allDone=requiredIds.length>0 && requiredIds.every(id=>final.completed[id]);
    const newStreaks={...streaks};
    const cur=newStreaks[name]||{count:0};
    let newCount=cur.count;
    if(allDone){ newCount=cur.count+1; if(newCount>MAX_STREAK) newCount=0; }
    else if(final.launched && requiredIds.length>0){ newCount=0; }
    newStreaks[name]={count:newCount,lastCompleted:Date.now()};
    setStreaks(newStreaks);
    setTimeout(()=>setStreakPopup({name,streak:newCount,wasMax:newCount===0&&cur.count===MAX_STREAK}),400);
    const newBal={...balances,[name]:(balances[name]||0)+final.xpEarned};
    setBalances(newBal);
    const newReport={student:name,startTime:final.startTimeStr,finishTime:final.finishTimeStr,
      completed:final.completed,timestamps:final.timestamps,durations:final.durations,
      earlyMins:final.earlyMins,xpEarned:final.xpEarned,date:new Date().toLocaleDateString()};
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

  async function handleTeacherSignOut(){
    await signOut(auth);
    setTeacherUser(null);
    setScreen("launchpad");
  }

  function handleStudentLogout(){
    setStudentUnlocked(false);
    setScreen("launchpad");
  }

  // ── Loading screens ─────────────────────────────────────────────────────────
  if(!authReady||dataLoading) return (
    <div style={{background:BG,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
      <div style={{fontSize:48}}>🚀</div>
      <p style={{fontSize:16,fontWeight:700,color:"#888"}}>Loading Mission Control…</p>
    </div>
  );

  // ── Teacher is logged in via Firebase Auth ──────────────────────────────────
  if(teacherUser && screen!=="launchpad" && screen!=="student" && !screen.startsWith("done_")) return (
    <TeacherView
      families={families} sessions={sessions} teacherReports={teacherReports}
      approved={approved} balances={balances} streaks={streaks} pins={pins}
      teacherUser={teacherUser}
      onApprove={handleApprove} onResetAll={handleResetAll} onResetStudent={handleResetStudent}
      onFamiliesChange={f=>setFamilies(f)} onBalanceUpdate={(n,v)=>setBalances(b=>({...b,[n]:v}))}
      onPinsChange={setPins} onBack={()=>setScreen("launchpad")}
      studentSubjects={studentSubjects} onSubjectsChange={setStudentSubjects}
      onTeacherSignOut={handleTeacherSignOut}/>
  );

  // ── Student not yet unlocked — show gate ────────────────────────────────────
  if(!teacherUser && !studentUnlocked) return (
    <AccessGate
      pins={pins}
      onStudentGranted={()=>setStudentUnlocked(true)}
      onTeacherGranted={()=>{/* handled by onAuthStateChanged */}}
    />
  );

  // ── Done screen ─────────────────────────────────────────────────────────────
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

  // ── Student screen ──────────────────────────────────────────────────────────
  if(screen==="student"&&activeStudent) return (
    <StudentScreen name={activeStudent} session={getSession(activeStudent)}
      streak={getStreak(activeStudent)} balance={balances[activeStudent]||0} slotAssignments={studentSubjects[activeStudent]}
      onUpdate={u=>handleUpdate(activeStudent,u)}
      onBack={handleStudentBack}
      onSubmit={f=>handleSubmit(activeStudent,f)}/>
  );

  // ── Launch Pad ──────────────────────────────────────────────────────────────
  return (
    <LaunchPad
      families={families} sessions={sessions} streaks={streaks} balances={balances} studentSubjects={studentSubjects}
      onSelectStudent={handleSelectStudent}
      onTeacherAccess={()=>{ if(teacherUser) setScreen("teacher"); }}
      onLogout={handleStudentLogout}/>
  );
}
