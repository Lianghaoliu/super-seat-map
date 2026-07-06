import React, { useState, useCallback, useEffect } from "react";

interface StudentTag {
  type: "violation" | "difficulty" | "praise";
  count?: number;
  subjects?: string[];
}

interface Student {
  id: string;
  name: string;
  tags: StudentTag[];
  violationHistory: { date: string; note: string }[];
  praiseHistory: { date: string; note: string }[];
}

interface Seat {
  row: number;
  col: number;
  studentId: string | null;
}

interface ClassData {
  students: Student[];
  seats: Seat[];
  rows: number;
  cols: number;
}

const SUBJECTS = [
  { key: "chinese", labelZh: "语文", labelEn: "Chinese", icon: "📖" },
  { key: "math", labelZh: "数学", labelEn: "Math", icon: "🔢" },
  { key: "english", labelZh: "英语", labelEn: "English", icon: "🔤" },
  { key: "science", labelZh: "科学", labelEn: "Science", icon: "🔬" },
  { key: "society", labelZh: "社会", labelEn: "Society", icon: "🌍" },
];

const STORAGE_KEY = "superseatmap-class-data";
const CLASS_KEYS = ["classA", "classB", "classC"] as const;
type ClassKey = typeof CLASS_KEYS[number];
const CLASS_LABELS_ZH: Record<ClassKey, string> = { classA: "一班", classB: "二班", classC: "三班" };
const CLASS_LABELS_EN: Record<ClassKey, string> = { classA: "Class A", classB: "Class B", classC: "Class C" };

function defaultClassData(): ClassData {
  return { students: [], seats: initSeats(6, 8), rows: 6, cols: 8 };
}

function initSeats(r: number, c: number): Seat[] {
  const s: Seat[] = [];
  for (let ri = 0; ri < r; ri++)
    for (let ci = 0; ci < c; ci++)
      s.push({ row: ri, col: ci, studentId: null });
  return s;
}

function loadAllData(): { classA: ClassData; classB: ClassData; classC: ClassData; activeClass: ClassKey } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        classA: parsed.classA || defaultClassData(),
        classB: parsed.classB || defaultClassData(),
        activeClass: parsed.activeClass || "classA",
      };
    }
  } catch {}
  return { classA: defaultClassData(), classB: defaultClassData(), classC: defaultClassData(), activeClass: "classA" };
}

function saveAllData(classA: ClassData, classB: ClassData, classC: ClassData, activeClass: ClassKey) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ classA, classB, classC, activeClass }));
  } catch {}
}

let _idCounter = Date.now();
function genId(): string { return (++_idCounter).toString(); }

// Helper: extract student names for sharing with RandomPicker
function getClassNames(data: ClassData): string[] {
  return data.students.map(s => s.name);
}

export { getClassNames, loadAllData, CLASS_LABELS_ZH, STORAGE_KEY };
export type { ClassKey, ClassData };


// Stats modal with dual radar + bar charts
function StatsModal({ show, onClose, students, lang, isLight, textColor, mutedColor, panelBg }: any) {
  if (!show) return null;
  const t = (zh: string, en: string) => lang === "zh" ? zh : en;
  const sumTag = (type) => students.reduce((s, st) => s + (st.tags?.filter(t => t.type === type).reduce((sum, t) => sum + (t.count || 0), 0) || 0), 0);
  const totalPraise = sumTag("praise");
  const totalViolation = sumTag("violation");
  const difficultyCount = students.filter(st => st.tags?.some(t => t.type === "difficulty" && t.subjects?.length > 0)).length;
  const perTag = (st, type) => (st.tags?.filter(t => t.type === type).reduce((sum, t) => sum + (t.count || 0), 0) || 0);
  const barData = students.map(st => ({ name: st.name, v: perTag(st, "violation"), p: perTag(st, "praise") })).filter(d => d.v > 0 || d.p > 0).sort((a, b) => (b.v + b.p) - (a.v + a.p)).slice(0, 8);
  const maxBar = Math.max(1, ...barData.map(d => Math.max(d.v, d.p)));
  const subjects = ["语文","数学","英语","物理","化学","生物","地理","历史","政治","道法"];
  const radar1Data = subjects.map(s => ({ label: s, v: students.filter(st => st.tags?.some(t => t.type === "difficulty" && t.subjects?.includes(s))).length })).filter(d => d.v > 0);
  const maxR1 = Math.max(1, ...radar1Data.map(d => d.v));
  const radar2Data = [
    { label: t("表扬","Praise"), v: totalPraise },
    { label: t("违纪","Violation"), v: totalViolation },
    { label: t("学困","Difficulty"), v: difficultyCount },
    { label: t("总人数","Total"), v: students.length },
  ];
  const maxR2 = Math.max(1, ...radar2Data.map(d => d.v));
  const drawRadar = (data, maxVal, cx, cy, r, color) => {
    if (data.length < 2) return null;
    const angles = data.map((_, i) => (Math.PI * 2 * i) / data.length - Math.PI / 2);
    const points = angles.map((a, i) => { const dist = Math.max((data[i].v / maxVal) * r, data[i].v === 0 ? 3 : 0); return { x: cx + dist * Math.cos(a), y: cy + dist * Math.sin(a), z: data[i].v === 0 }; });
    const path = points.map((p, i) => (i === 0 ? "M" : "L") + p.x + "," + p.y).join(" ") + " Z";
    const levels = [0.25, 0.5, 0.75, 1];
    return React.createElement(React.Fragment, null,
      ...levels.map((lv, li) => React.createElement("polygon", { key:"r"+li, points: angles.map(a => (cx + r * lv * Math.cos(a)) + "," + (cy + r * lv * Math.sin(a))).join(" "), fill:"none", stroke:isLight?"#ccc":"#444", strokeWidth:1 })),
      ...angles.map((a, i) => React.createElement("line", { key:"ax"+i, x1:cx, y1:cy, x2:cx+r*Math.cos(a), y2:cy+r*Math.sin(a), stroke:isLight?"#ccc":"#444", strokeWidth:1 })),
      ...angles.map((a, i) => React.createElement("circle", { key:"rk"+i, cx:cx+r*Math.cos(a), cy:cy+r*Math.sin(a), r:2, fill:isLight?"#aaa":"#555" })),
      React.createElement("path", { d:path, fill:color+"33", stroke:color, strokeWidth:2 }),
      ...points.map((p, i) => React.createElement("circle", { key:"pt"+i, cx:p.x, cy:p.y, r:p.z?3:5, fill:p.z?(isLight?"#999":"#666"):color, stroke:p.z?color:"none", strokeWidth:p.z?1:0 })),
      ...angles.map((a, i) => { const lr = r + 40; return React.createElement("text", { key:"lb"+i, x:cx+lr*Math.cos(a), y:cy+lr*Math.sin(a), textAnchor:"middle", dominantBaseline:"middle", fontSize: data.length>6?10:12, fontWeight:"bold", fill:textColor }, data[i].label, " ", data[i].v); }),
    );
  };
  const ov = { position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:10000 };
  const mo = { background:panelBg, borderRadius:16, padding:24, width:680, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", color:textColor, boxShadow:"0 8px 40px rgba(0,0,0,0.3)" };
  const cards = [
    { v: totalPraise, l: t("表扬次数","Praise"), bg: "linear-gradient(135deg,#2ecc71,#27ae60)" },
    { v: totalViolation, l: t("违纪次数","Violations"), bg: "linear-gradient(135deg,#f093fb,#f5576c)" },
    { v: students.length, l: t("学生总数","Students"), bg: "linear-gradient(135deg,#4facfe,#00f2fe)" },
    { v: difficultyCount, l: t("学困生","Struggling"), bg: "linear-gradient(135deg,#fa709a,#fee140)" },
  ];
  return React.createElement("div", { style: ov, onClick: onClose },
    React.createElement("div", { style: mo, onClick: e => e.stopPropagation() },
      React.createElement("div", { style: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 } },
        React.createElement("h3", { style: { margin:0, color:textColor, fontSize:18 } }, "📊 ", t("班级数据统计","Class Statistics")),
        React.createElement("button", { onClick: onClose, style: { background:"none", border:"none", color:textColor, cursor:"pointer", fontSize:20 } }, "✕"),
      ),
      React.createElement("div", { style: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:20 } },
        ...cards.map(c => React.createElement("div", { key: c.l, style: { padding:"12px 16px", borderRadius:10, textAlign:"center", fontWeight:"bold", fontSize:14, color:"#fff", background:c.bg } },
          React.createElement("div", { style:{fontSize:24} }, c.v),
          React.createElement("div", { style:{fontSize:11,opacity:0.9} }, c.l),
        ))
      ),
      React.createElement("div", { style: { display:"flex", gap:12, marginBottom:16, flexWrap:"wrap", justifyContent:"center" } },
        radar1Data.length >= 2 && React.createElement("div", { style: { flex:"1 1 280px", minWidth:260, background:isLight?"#f5f5f5":"#1e1e30", borderRadius:10, padding:12, display:"flex", flexDirection:"column", alignItems:"center" } },
          React.createElement("h4", { style: { margin:"0 0 8px", color:textColor, fontSize:13 } }, "🎯 ", t("学困生学科分布","Difficulty by Subject")),
          React.createElement("svg", { width:280, height:280, viewBox:"0 0 380 380" }, drawRadar(radar1Data, maxR1, 190, 190, 100, "#fa709a")),
        ),
        React.createElement("div", { style: { flex:"1 1 280px", minWidth:260, background:isLight?"#f5f5f5":"#1e1e30", borderRadius:10, padding:12, display:"flex", flexDirection:"column", alignItems:"center" } },
          React.createElement("h4", { style: { margin:"0 0 8px", color:textColor, fontSize:13 } }, "🌟 ", t("班级综合雷达","Class Overview")),
          React.createElement("svg", { width:280, height:280, viewBox:"0 0 380 380" }, drawRadar(radar2Data, maxR2, 190, 190, 100, "#667eea")),
        ),
      ),
      barData.length > 0 && React.createElement(React.Fragment, null,
        React.createElement("h4", { style: { margin:"12px 0 8px", color:textColor, fontSize:14 } }, "📊 ", t("学生表现","Performance")),
        React.createElement("div", { style: { background:isLight?"#e8e8e8":"#2a2a3e", borderRadius:10, padding:16 } },
          ...barData.map(d => React.createElement("div", { key: d.name, style: { display:"flex", alignItems:"center", marginBottom:8, gap:8 } },
            React.createElement("span", { style: { width:50, fontSize:11, textAlign:"right", color:mutedColor } }, d.name.slice(0,4)),
            React.createElement("div", { style: { flex:1, height:22, background:isLight?"#ddd":"#333", borderRadius:4, position:"relative", overflow:"hidden" } },
              d.v > 0 && React.createElement("div", { style: { height:"100%", width:(d.v/maxBar*100)+"%", background:"linear-gradient(90deg,#f5576c,#f093fb)", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:4, fontSize:10, color:"#fff", minWidth:18 } }, d.v),
              d.p > 0 && React.createElement("div", { style: { height:10, width:(d.p/maxBar*100)+"%", background:"linear-gradient(90deg,#2ecc71,#27ae60)", borderRadius:4, position:"absolute", bottom:0, fontSize:9, color:"#fff", paddingLeft:4, minWidth:18, display:"flex", alignItems:"center" } }, d.p),
            ),
          )),
          React.createElement("div", { style: { display:"flex", gap:16, marginTop:8, fontSize:10, color:mutedColor } },
            React.createElement("span", null, "🔴 ", t("违纪","Violation")),
            React.createElement("span", null, "🟢 ", t("表扬","Praise")),
          ),
        ),
      ),
    )
  );
}

export default function SeatingChart({ lang = "zh", theme = "dark", fullScreen = true, onToggleTheme }: { lang?: string; theme?: string; fullScreen?: boolean; onToggleTheme?: () => void }) {
  const saved = loadAllData();
  const [activeClass, setActiveClass] = useState<ClassKey>(saved.activeClass);
  const [classA, setClassA] = useState<ClassData>(saved.classA);
  const [classB, setClassB] = useState<ClassData>(saved.classB);
  const [classC, setClassC] = useState<ClassData>(saved.classC || defaultClassData());
  const classData = activeClass === "classA" ? classA : classB;
  const updateClass = (fn: (prev: ClassData) => ClassData) => { if (activeClass === "classA") setClassA(fn as any); else setClassB(fn as any); };

  
  const [isOnTop, setIsOnTop] = useState(false);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [newName, setNewName] = useState("");
  const [batchText, setBatchText] = useState("");
  const [showBatch, setShowBatch] = useState(false);
  const [violationNote, setViolationNote] = useState("");
  const [praiseNote, setPraiseNote] = useState("");
  const [showStats, setShowStats] = useState(false);
  const isLight = theme === "light";
  const textColor = isLight ? "#000" : "#fff";
  const mutedColor = isLight ? "#333" : "#ccc";
  const panelBg = isLight ? "#FFF8E7" : "#1e1e2e";
  const dividerColor = isLight ? "#ddd" : "#333";

  useEffect(() => {
    saveAllData(classA, classB, classC, activeClass);
  }, [classA, classB, classC, activeClass]);

  const addStudent = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const student: Student = { id: genId(), name, tags: [], violationHistory: [], praiseHistory: [] };
    updateClass((prev: ClassData) => {
      const nextStudents = [...prev.students, student];
      const emptyIdx = prev.seats.findIndex(s => !s.studentId);
      const nextSeats = [...prev.seats];
      if (emptyIdx >= 0) nextSeats[emptyIdx] = { ...nextSeats[emptyIdx], studentId: student.id };
      return { ...prev, students: nextStudents, seats: nextSeats };
    });
    setNewName("");
  }, [newName]);



  const batchAdd = useCallback(() => {
    const names = batchText.split(/[\n\r,，、]+/).map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return;
    updateClass((prev: ClassData) => {
      const newStudents = names.map(name => ({ id: genId(), name, tags: [] as StudentTag[], violationHistory: [], praiseHistory: [] as { date: string; note: string }[] }));
      const allStudents = [...prev.students, ...newStudents];
      const nextSeats = [...prev.seats];
      let si = nextSeats.findIndex(s => !s.studentId);
      for (const ns of newStudents) {
        if (si >= 0) { nextSeats[si] = { ...nextSeats[si], studentId: ns.id }; si = nextSeats.findIndex((s, i) => i > si && !s.studentId); }
      }
      return { ...prev, students: allStudents, seats: nextSeats };
    });
    setBatchText("");
    setShowBatch(false);
  }, [batchText]);

  const removeStudent = useCallback((id: string) => {
    updateClass((prev: ClassData) => ({
      ...prev,
      students: prev.students.filter(s => s.id !== id),
      seats: prev.seats.map(s => s.studentId === id ? { ...s, studentId: null } : s),
    }));
    setActiveStudent(null);
    setShowPanel(false);
  }, []);

  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", studentId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetSeatIdx: number) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("text/plain");
    if (!fromId) return;
    updateClass((prev: ClassData) => {
      const next = [...prev.seats];
      const fromIdx = next.findIndex(s => s.studentId === fromId);
      const toStudentId = next[targetSeatIdx].studentId;
      if (fromIdx >= 0) next[fromIdx] = { ...next[fromIdx], studentId: toStudentId };
      next[targetSeatIdx] = { ...next[targetSeatIdx], studentId: fromId };
      return { ...prev, seats: next };
    });
  };

  const openStudentPanel = (studentId: string | null) => {
    if (!studentId) return;
    const s = classData.students.find(st => st.id === studentId);
    if (s) { setActiveStudent({ ...s }); setShowPanel(true); setViolationNote(""); }
  };

  const refreshActiveStudent = (id: string) => {
    updateClass((prev: ClassData) => {
      const found = prev.students.find(s => s.id === id);
      if (found) setActiveStudent({ ...found });
      return prev;
    });
  };

  const addViolation = () => {
    if (!activeStudent) return;
    updateClass((prev: ClassData) => ({
      ...prev,
      students: prev.students.map(s => {
        if (s.id !== activeStudent.id) return s;
        const vTag = s.tags.find(t => t.type === "violation");
        const newCount = (vTag?.count || 0) + 1;
        return {
          ...s,
          tags: vTag
            ? s.tags.map(t => t.type === "violation" ? { ...t, count: newCount } : t)
            : [...s.tags, { type: "violation" as const, count: 1 }],
          violationHistory: [...s.violationHistory, { date: new Date().toLocaleString("zh-CN"), note: violationNote || (lang === "zh" ? "违纪" : "Violation") }],
        };
      }),
    }));
    refreshActiveStudent(activeStudent.id);
  };

  const addPraise = () => {
    if (!activeStudent) return;
    updateClass((prev) => ({
      ...prev,
      students: prev.students.map(s => {
        if (s.id !== activeStudent.id) return s;
        const pTag = s.tags.find(t => t.type === "praise");
        const newCount = (pTag?.count || 0) + 1;
        return {
          ...s,
          tags: pTag ? s.tags.map(t => t.type === "praise" ? { ...t, count: newCount } : t) : [...s.tags, { type: "praise", count: 1 }],
          praiseHistory: [...(s.praiseHistory || []), { date: new Date().toISOString().slice(0, 10), note: praiseNote }],
        };
      }),
    }));
    refreshActiveStudent(activeStudent.id);
    setPraiseNote("");
  };
  const removePraise = () => {
    if (!activeStudent) return;
    updateClass((prev) => ({
      ...prev,
      students: prev.students.map(s => {
        if (s.id !== activeStudent.id) return s;
        const pTag = s.tags.find(t => t.type === "praise");
        if (!pTag || (pTag.count || 0) <= 1) return { ...s, tags: s.tags.filter(t => t.type !== "praise") };
        return { ...s, tags: s.tags.map(t => t.type === "praise" ? { ...t, count: (t.count || 0) - 1 } : t) };
      }),
    }));
    refreshActiveStudent(activeStudent.id);
  };

  const removeViolation = () => {
    if (!activeStudent) return;
    updateClass((prev: ClassData) => ({
      ...prev,
      students: prev.students.map(s => {
        if (s.id !== activeStudent.id) return s;
        const vTag = s.tags.find(t => t.type === "violation");
        if (!vTag || (vTag.count || 0) <= 1) {
          return { ...s, tags: s.tags.filter(t => t.type !== "violation") };
        }
        return { ...s, tags: s.tags.map(t => t.type === "violation" ? { ...t, count: (t.count || 0) - 1 } : t) };
      }),
    }));
    refreshActiveStudent(activeStudent.id);
  };

  const toggleDifficultySubject = (subjKey: string) => {
    if (!activeStudent) return;
    updateClass((prev: ClassData) => ({
      ...prev,
      students: prev.students.map(s => {
        if (s.id !== activeStudent.id) return s;
        const dTag = s.tags.find(t => t.type === "difficulty");
        const curSubjects = dTag?.subjects || [];
        const newSubjects = curSubjects.includes(subjKey)
          ? curSubjects.filter(k => k !== subjKey)
          : [...curSubjects, subjKey];
        return newSubjects.length > 0
          ? {
              ...s,
              tags: dTag
                ? s.tags.map(t => t.type === "difficulty" ? { ...t, subjects: newSubjects } : t)
                : [...s.tags, { type: "difficulty" as const, subjects: newSubjects }],
            }
          : { ...s, tags: s.tags.filter(t => t.type !== "difficulty") };
      }),
    }));
    refreshActiveStudent(activeStudent.id);
  };

  const resizeGrid = (newRows: number, newCols: number) => {
    updateClass((prev: ClassData) => {
      const newSeats = initSeats(newRows, newCols);
      const occupied = prev.seats.filter(s => s.studentId);
      occupied.forEach((ks, i) => {
        if (i < newSeats.length) newSeats[i] = { ...newSeats[i], studentId: ks.studentId };
      });
      return { ...prev, seats: newSeats, rows: newRows, cols: newCols };
    });
  };

  const getViolationColor = (count: number): string => {
    if (count >= 5) return "#c0392b";
    if (count >= 3) return "#e67e22";
    if (count >= 1) return "#f1c40f";
    return "";
  };

  const { students, seats, rows, cols } = classData;

  return (
    <div className="seating-chart-section" style={{ background: panelBg, minHeight: "100vh", padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h4 style={{ color: textColor, margin: 0 }}>{lang === "zh" ? "🪑 座位图" : "🪑 Seating Chart"}</h4>
        <div style={{ display: "flex", gap: 4 }}>
          {CLASS_KEYS.map(key => (
            <button
              key={key}
              onClick={() => setActiveClass(key)}
              style={{
                padding: "3px 12px", fontSize: 12, borderRadius: 4, border: "1px solid #555",
                background: activeClass === key ? "#f39c12" : "transparent",
                color: activeClass === key ? "#fff" : "#ccc", cursor: "pointer",
              }}
            >
              {(lang === "zh" ? CLASS_LABELS_ZH[key] : CLASS_LABELS_EN[key])} ({key === "classA" ? classA.students.length : classB.students.length}{lang === "zh" ? "人)" : ")"}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: mutedColor }}>{lang === "zh" ? "行" : "Rows"}</label>
          <select value={rows} onChange={e => resizeGrid(Number(e.target.value), cols)} style={{ padding: "2px 4px", fontSize: 12 }}>
            {[4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <label style={{ fontSize: 12, color: mutedColor }}>{lang === "zh" ? "列" : "Cols"}</label>
          <select value={cols} onChange={e => resizeGrid(rows, Number(e.target.value))} style={{ padding: "2px 4px", fontSize: 12 }}>
            {[4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addStudent()}
          placeholder={lang === "zh" ? "添加学生" : "Add student"} style={{ width: 80, padding: "2px 4px", fontSize: 12 }} />
        <button onClick={addStudent} style={{ padding: "3px 14px", fontSize: 12, borderRadius: 14, border: "none", background: "linear-gradient(135deg, #43e97b, #38f9d7)", color: "#1a1a2e", cursor: "pointer", fontWeight: "bold" }}>{lang === "zh" ? "添加" : "Add"}</button>
        <button onClick={() => setShowBatch(!showBatch)} style={{ padding: "3px 14px", fontSize: 12, borderRadius: 14, border: "none", background: "linear-gradient(135deg, #f093fb, #f5576c)", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>
          {showBatch ? (lang === "zh" ? "收起" : "Collapse") : (lang === "zh" ? "批量导入" : "Batch Import")}
        </button>
        <button onClick={() => setShowStats(true)} style={{ padding: "3px 14px", fontSize: 12, borderRadius: 14, border: "none", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff", cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" }}>📊 {lang === "zh" ? "数据统计" : "Stats"}</button>
        <button onClick={onToggleTheme} title={lang === "zh" ? "切换主题" : "Toggle theme"} style={{ padding: "3px 10px", fontSize: 14, borderRadius: 4, border: "1px solid #555", background: "transparent", cursor: "pointer", lineHeight: "20px" }}>{isLight ? "🌙" : "☀️"}</button>
          {(window as any).huasheng && <button onClick={() => { const result = (window as any).huasheng?.setAlwaysOnTop?.(); if (result !== undefined) { result.then((v: boolean) => setIsOnTop(v)); } else { setIsOnTop(prev => !prev); } }} title={lang === "zh" ? (isOnTop ? "已置顶 - 点击取消" : "PPT演示模式 - 点击置顶") : (isOnTop ? "On Top - Click to cancel" : "PPT Mode - Click to pin")} style={{ padding: "3px 10px", fontSize: 14, borderRadius: 4, border: isOnTop ? "1px solid #2ecc71" : "1px solid #555", background: isOnTop ? "#2ecc71" : "transparent", color: isOnTop ? "#fff" : (isLight ? "#333" : "#ccc"), cursor: "pointer", lineHeight: "20px" }}>🖥️</button>}
      </div>

      {showBatch && (
        <div style={{ marginBottom: 6 }}>
          <textarea
            value={batchText}
            onChange={e => setBatchText(e.target.value)}
            placeholder={lang === "zh" ? "批量粘贴姓名，支持换行、逗号、顿号分隔\n例如：张三,李四,王五\n或：\n张三\n李四\n王五" : "Paste names (newline/comma separated)\ne.g. John,Jane,Bob\nor:\nJohn\nJane\nBob"}
            style={{
              width: "100%", height: 60, padding: 4, fontSize: 12,
              background: "rgba(0,0,0,0.2)", color: "#fff", border: "1px solid #555",
              borderRadius: 4, resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <button onClick={batchAdd} style={{ padding: "3px 12px", fontSize: 12 }}>
              {lang === "zh" ? "确认导入 (" : "Import ("}{batchText.split(/[\n\r,，、]+/).filter(n => n.trim()).length}{lang === "zh" ? "人)" : ")"}
            </button>
            <button onClick={() => { setBatchText(""); setShowBatch(false); }}
              style={{ padding: "3px 8px", fontSize: 12, background: "transparent", color: mutedColor, border: "1px solid #555" }}>
              取消
            </button>
          </div>
        </div>
      )}

      {students.length === 0 && (
        <p style={{ color: mutedColor, fontSize: 12, margin: "4px 0" }}>{lang === "zh" ? "暂无学生，请先添加或批量导入" : "No students. Add or import first."}</p>
      )}

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: fullScreen ? 8 : 3, marginBottom: 8,
      }}>
        {seats.map((seat, idx) => {
          const student = seat.studentId ? students.find(s => s.id === seat.studentId) : null;
          const vCount = student?.tags.find(t => t.type === "violation")?.count || 0;
          const pCount = student?.tags.find(t => t.type === "praise")?.count || 0;
          const dSubjects = student?.tags.find(t => t.type === "difficulty")?.subjects || [];
          const vColor = getViolationColor(vCount);
          const borderColor = dSubjects.length > 0 ? "#f39c12" : "#555";

          return (
            <div
              key={idx}
              style={{
                border: `2px solid ${borderColor}`,
                borderRadius: 4, padding: 2, minHeight: fullScreen ? 84 : 30,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: student ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.2)",
                cursor: student ? "grab" : "default",
                opacity: activeStudent && seat.studentId === activeStudent.id ? 0.6 : 1,
                fontSize: fullScreen ? 40 : 11, position: "relative" as const, userSelect: "none" as const,
              }}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, idx)}
              onClick={() => openStudentPanel(seat.studentId)}
            >
              {student ? (
                <div draggable onDragStart={e => handleDragStart(e, student.id)}
                  style={{ display: "flex", alignItems: "center", gap: 2, width: "100%", justifyContent: "center" }}>
                  <span style={{ fontSize: 22, color: textColor, fontWeight: "bold" }}>{student.name}</span>
                  {vCount > 0 && (
                    <span style={{
                      background: vColor, color: "#fff", borderRadius: "50%",
                      width: 16, height: 16, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 10, fontWeight: "bold",
                    }}>{vCount}</span>
                  )}
                  {pCount > 0 && (
                    <span style={{
                      background: "linear-gradient(135deg, #2ecc71, #27ae60)", color: "#fff", borderRadius: "50%",
                      width: 16, height: 16, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 10, fontWeight: "bold",
                    }}>{pCount}</span>
                  )}
                  {dSubjects.length > 0 && (
                    <span style={{ fontSize: 10 }}>{dSubjects.map(k => SUBJECTS.find(s => s.key === k)?.icon || "").join("")}</span>
                  )}
                </div>
              ) : (
                <span style={{ color: mutedColor, fontSize: 10 }}>{lang === "zh" ? "空" : "Empty"}</span>
              )}
            </div>
          );
        })}
      </div>


      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", fontSize: 11, color: mutedColor, justifyContent: "center", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#f1c40f", display: "inline-block" }}></span>
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#e67e22", display: "inline-block" }}></span>
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#c0392b", display: "inline-block" }}></span>
          {lang === "zh" ? "违纪(1-2/3-4/5+)" : "Violation"}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: "linear-gradient(135deg, #2ecc71, #27ae60)", display: "inline-block" }}></span>
          {lang === "zh" ? "表扬" : "Praise"}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: "#f39c12", display: "inline-block" }}></span>
          {lang === "zh" ? "学困" : "Difficulty"}
        </span>
      </div>
      {/* Student panel */}
      {showStats && React.createElement(StatsModal, { show: showStats, onClose: () => setShowStats(false), students: classData ? classData.students : [], lang, isLight, textColor, mutedColor, panelBg: isLight ? "#f0f0f0" : "#1a1a2e" })}
      {showPanel && activeStudent && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000,
        }} onClick={() => setShowPanel(false)}>
          <div style={{
            background: panelBg, borderRadius: 8, padding: 16, minWidth: 260,
            maxWidth: 320, maxHeight: "80vh", overflow: "auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h4 style={{ margin: 0, color: textColor }}>{activeStudent.name}</h4>
              <button onClick={() => setShowPanel(false)}
                style={{ background: "none", border: "none", color: textColor, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <h5 style={{ margin: "4px 0", color: textColor }}>{lang === "zh" ? "🔴 违纪记录" : "🔴 Violation Record"}</h5>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: mutedColor }}>
                  {lang === "zh" ? "违纪次数：" : "Violations: "}<strong style={{ color: textColor }}>{(activeStudent.tags as StudentTag[]).find(t => t.type === "violation")?.count || 0}</strong>
                </span>
              </div>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                <input value={violationNote} onChange={e => setViolationNote(e.target.value)}
                  placeholder={lang === "zh" ? "备注" : "Note"} style={{ width: 80, padding: "2px 4px", fontSize: 11 }} />
                <button onClick={addViolation} style={{ padding: "2px 8px", fontSize: 11 }}>{lang === "zh" ? "+1 违纪" : "+1 Violation"}</button>
                {((activeStudent.tags as StudentTag[]).find(t => t.type === "violation")?.count || 0) > 0 && (
                  <button onClick={removeViolation} style={{ padding: "2px 8px", fontSize: 11 }}>-1</button>
                )}
              </div>
              {activeStudent.violationHistory.length > 0 && (
                <div style={{ maxHeight: 100, overflow: "auto", fontSize: 11, background: "rgba(0,0,0,0.2)", borderRadius: 4, padding: 4 }}>
                  {activeStudent.violationHistory.map((h, i) => (
                    <div key={i} style={{ padding: "2px 0", borderBottom: dividerColor }}>
                      <span style={{ color: mutedColor, marginRight: 4 }}>{h.date}</span>
                      {h.note}
                    </div>
                  ))}
                </div>
              )}
            </div>


            <div style={{ marginBottom: 12 }}>
              <h5 style={{ margin: "4px 0", color: textColor }}>👍 {lang === "zh" ? "表扬" : "Praise"}</h5>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: mutedColor }}>
                  {lang === "zh" ? "表扬次数：" : "Praise: "}<strong style={{ color: textColor }}>{(activeStudent.tags as StudentTag[]).find(t => t.type === "praise")?.count || 0}</strong>
                </span>
              </div>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                <input value={praiseNote} onChange={e => setPraiseNote(e.target.value)}
                  placeholder={lang === "zh" ? "备注" : "Note"} style={{ width: 80, padding: "2px 4px", fontSize: 11 }} />
                <button onClick={addPraise} style={{ padding: "2px 8px", fontSize: 11, background: "linear-gradient(135deg, #2ecc71, #27ae60)", color: "#fff", border: "none", borderRadius: 4 }}>{lang === "zh" ? "+1 表扬" : "+1 Praise"}</button>
                {((activeStudent.tags as StudentTag[]).find(t => t.type === "praise")?.count || 0) > 0 && (
                  <button onClick={removePraise} style={{ padding: "2px 8px", fontSize: 11 }}>-1</button>
                )}
              </div>
              {activeStudent.praiseHistory?.length > 0 && (
                <div style={{ maxHeight: 80, overflow: "auto", fontSize: 11, background: "rgba(0,0,0,0.2)", borderRadius: 4, padding: 4 }}>
                  {activeStudent.praiseHistory.map((h, i) => (
                    <div key={i} style={{ padding: "2px 0", borderBottom: dividerColor }}>
                      <span style={{ color: mutedColor, marginRight: 4 }}>{h.date}</span>
                      {h.note}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <h5 style={{ margin: "4px 0", color: textColor }}>{lang === "zh" ? "⚠️ 学困学科" : "⚠️ Difficulty Subjects"}</h5>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {SUBJECTS.map(subj => {
                  const isActive = (activeStudent.tags as StudentTag[]).find(t => t.type === "difficulty")?.subjects?.includes(subj.key);
                  return (
                    <button key={subj.key} onClick={() => toggleDifficultySubject(subj.key)}
                      style={{
                        padding: "4px 8px", fontSize: 11, borderRadius: 4, border: "1px solid #555",
                        background: isActive ? "#f39c12" : "transparent",
                        color: isActive ? "#fff" : "#ccc", cursor: "pointer",
                      }}>{subj.icon} {lang === "zh" ? subj.labelZh : subj.labelEn}</button>
                  );
                })}
              </div>
            </div>

            <button onClick={() => removeStudent(activeStudent.id)}
              style={{ width: "100%", padding: "6px", background: "#e74c3c", color: textColor, border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
              移除学生
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
