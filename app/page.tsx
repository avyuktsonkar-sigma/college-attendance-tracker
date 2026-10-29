'use client';

import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Plus, Download, Check, X, Trash2, 
  AlertCircle, Sparkles, History, Database, BookOpenCheck 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Subject {
  id: string;
  name: string;
  code: string;
  target_percentage: number;
  present_count: number;
  total_count: number;
}

interface AuditLog {
  id: string;
  subject_name: string;
  subject_code: string;
  status: 'PRESENT' | 'ABSENT';
  marked_date: string;
  timestamp: string;
}

export default function FullstackAttendance() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [target, setTarget] = useState(75);
  const [initialPresent, setInitialPresent] = useState(0);
  const [initialTotal, setInitialTotal] = useState(0);

  // Load persistent data
  useEffect(() => {
    setMounted(true);
    const savedSubs = localStorage.getItem('smarttrack_subjects');
    const savedLogs = localStorage.getItem('smarttrack_logs');
    if (savedSubs) {
      try { setSubjects(JSON.parse(savedSubs)); } catch (e) { console.error(e); }
    }
    if (savedLogs) {
      try { setAuditLogs(JSON.parse(savedLogs)); } catch (e) { console.error(e); }
    }
  }, []);

  // Save to persistent storage on change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('smarttrack_subjects', JSON.stringify(subjects));
      localStorage.setItem('smarttrack_logs', JSON.stringify(auditLogs));
    }
  }, [subjects, auditLogs, mounted]);

  if (!mounted) return null;

  // 1. Instant Entry Handler (Zero-lag, 100% Guaranteed Submission)
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSub: Subject = {
      id: Date.now().toString(),
      name: name.trim(),
      code: (code.trim() || 'SUB-' + (subjects.length + 1)).toUpperCase(),
      target_percentage: Number(target) || 75,
      present_count: Number(initialPresent) || 0,
      total_count: Number(initialTotal) || 0
    };

    setSubjects(prev => [newSub, ...prev]);

    // Reset form and close modal
    setName('');
    setCode('');
    setInitialPresent(0);
    setInitialTotal(0);
    setTarget(75);
    setShowModal(false);

    confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
  };

  // 2. Live Attendance Marker + Timestamped Audit Logger
  const markAttendance = (subjectId: string, status: 'PRESENT' | 'ABSENT') => {
    const targetSubject = subjects.find(s => s.id === subjectId);
    if (!targetSubject) return;

    setSubjects(prev => prev.map(s => {
      if (s.id !== subjectId) return s;
      const nextP = status === 'PRESENT' ? s.present_count + 1 : s.present_count;
      const nextT = s.total_count + 1;

      // Celebrate if crossing 75% target threshold
      if (status === 'PRESENT' && (nextP / nextT) * 100 >= s.target_percentage) {
        confetti({ particleCount: 65, spread: 60, origin: { y: 0.8 } });
      }

      return { ...s, present_count: nextP, total_count: nextT };
    }));

    // Record live date-wise audit log
    const now = new Date();
    const newLog: AuditLog = {
      id: Date.now().toString(),
      subject_name: targetSubject.name,
      subject_code: targetSubject.code,
      status: status,
      marked_date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAuditLogs(prev => [newLog, ...prev]);
  };

  // 3. Delete Subject
  const deleteSubject = (id: string) => {
    if (!confirm('Are you sure you want to remove this course and its records?')) return;
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  // 75% Bunk/Rescue Calculator
  const getBunkStatus = (present: number, total: number, target: number) => {
    if (total === 0) return { message: 'No classes tracked yet. Start by marking attendance!', safe: true };
    const current = (present / total) * 100;
    const targetDec = target / 100;

    if (current >= target) {
      const canBunk = Math.floor((present - targetDec * total) / targetDec);
      return {
        message: canBunk === 0 ? 'On borderline! Do not miss next lecture.' : `Safe to miss next ${canBunk} class${canBunk > 1 ? 'es' : ''}`,
        safe: true
      };
    } else {
      const mustAttend = Math.ceil((targetDec * total - present) / (1 - targetDec));
      return {
        message: `Must attend next ${mustAttend} class${mustAttend > 1 ? 'es' : ''} consecutively to reach ${target}%`,
        safe: false
      };
    }
  };

  // Aggregates
  const totalClasses = subjects.reduce((sum, s) => sum + s.total_count, 0);
  const totalAttended = subjects.reduce((sum, s) => sum + s.present_count, 0);
  const overallPercentage = totalClasses === 0 ? 0 : Math.round((totalAttended / totalClasses) * 100);
  const shortageCount = subjects.filter(s => s.total_count > 0 && (s.present_count / s.total_count) * 100 < s.target_percentage).length;

  // Export CSV Audit Report
  const exportCSV = () => {
    if (subjects.length === 0) return alert('Please enter at least one course before exporting.');
    const headers = ['Course Code,Course Name,Attended,Total Held,Percentage,Target %,Status'];
    const rows = subjects.map(s => {
      const pct = s.total_count === 0 ? 0 : ((s.present_count / s.total_count) * 100).toFixed(1);
      const status = Number(pct) >= s.target_percentage ? 'Eligible' : 'Detention Risk';
      return `"${s.code}","${s.name}",${s.present_count},${s.total_count},${pct}%,${s.target_percentage}%,${status}`;
    });
    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Audit_Report.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-indigo-500">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">SmartTrack Enterprise</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Database className="w-3 h-3" /> Live Engine Active
                </span>
              </div>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5">Academic Attendance Engine & Predictive Shortage Forecaster</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={() => setShowAuditModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition active:scale-95"
            >
              <History className="w-4 h-4 text-indigo-400" /> Date-Wise Logs ({auditLogs.length})
            </button>
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition active:scale-95"
            >
              <Download className="w-4 h-4 text-slate-400" /> Export CSV
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Course
            </button>
          </div>
        </header>

        {/* Analytics Top Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Overall Aggregate</span>
            <div className="text-3xl md:text-4xl font-black mt-2 text-white flex items-baseline gap-2">
              <span>{overallPercentage}%</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                subjects.length === 0 ? 'bg-slate-800 text-slate-400' :
                overallPercentage >= 75 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {subjects.length === 0 ? 'No Data' : overallPercentage >= 75 ? 'Safe' : 'Critical'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${overallPercentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                style={{ width: `${Math.min(overallPercentage, 100)}%` }} 
              />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Lectures</span>
            <div className="text-3xl md:text-4xl font-black mt-2 text-white">{totalClasses}</div>
            <div className="text-xs text-slate-400 mt-2">Across {subjects.length} enrolled subjects</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Attended Lectures</span>
            <div className="text-3xl md:text-4xl font-black mt-2 text-emerald-400">{totalAttended}</div>
            <div className="text-xs text-slate-400 mt-2">{totalClasses - totalAttended} Missed lectures</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Shortage Warnings</span>
            <div className="text-3xl md:text-4xl font-black mt-2 text-rose-400">{shortageCount}</div>
            <div className="text-xs text-slate-400 mt-2">Below individual cutoffs</div>
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-200">Enrolled Courses ({subjects.length})</h2>
            <span className="text-xs text-slate-400">Click Present (+) or Absent (−) to live update</span>
          </div>

          {subjects.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-800/80 rounded-3xl p-8 bg-slate-900/20">
              <div className="inline-flex p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl mb-4 border border-indigo-500/20">
                <BookOpenCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">No Courses Added Yet</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1.5 mb-6">
                Click the button below to add your courses. Entry will appear instantly!
              </p>
              <button 
                onClick={() => setShowModal(true)} 
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition active:scale-95 shadow-lg shadow-indigo-600/30"
              >
                + Add Your First Course
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map(sub => {
                const pct = sub.total_count === 0 ? 0 : Math.round((sub.present_count / sub.total_count) * 100);
                const isShortage = sub.total_count > 0 && pct < sub.target_percentage;
                const status = getBunkStatus(sub.present_count, sub.total_count, sub.target_percentage);

                return (
                  <div key={sub.id} className={`border rounded-2xl p-5 flex flex-col justify-between transition ${
                    isShortage ? 'bg-rose-950/20 border-rose-500/30' : 'bg-slate-900/40 border-slate-800'
                  }`}>
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold bg-slate-800 px-2.5 py-0.5 rounded-full text-slate-400 uppercase tracking-wider">
                            {sub.code}
                          </span>
                          <h3 className="text-base md:text-lg font-semibold text-white mt-1.5">{sub.name}</h3>
                        </div>
                        <button 
                          onClick={() => deleteSubject(sub.id)} 
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition"
                          title="Delete course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-2xl font-black text-white">
                          {pct}% 
                          <span className="text-xs font-normal text-slate-400 ml-1">
                            ({sub.present_count}/{sub.total_count})
                          </span>
                        </div>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          isShortage ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          Cutoff: {sub.target_percentage}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                        <div 
                          className={`h-full ${isShortage ? 'bg-rose-500' : 'bg-emerald-500'} transition-all duration-300`} 
                          style={{ width: `${Math.min(pct, 100)}%` }} 
                        />
                      </div>

                      <div className={`mt-3.5 text-xs font-medium p-2.5 rounded-xl flex items-center gap-2 ${
                        status.safe ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-900/40' : 'bg-rose-950/40 text-rose-300 border border-rose-900/40'
                      }`}>
                        {status.safe ? <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                        <span>{status.message}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80">
                      <button 
                        onClick={() => markAttendance(sub.id, 'PRESENT')} 
                        className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold text-xs transition active:scale-95"
                      >
                        <Check className="w-4 h-4" /> Present
                      </button>
                      <button 
                        onClick={() => markAttendance(sub.id, 'ABSENT')} 
                        className="flex items-center justify-center gap-1.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl font-semibold text-xs transition active:scale-95"
                      >
                        <X className="w-4 h-4" /> Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Add Course */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-4">Add Course / Subject</h3>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Subject Name <span className="text-rose-400">*</span></label>
                  <input 
                    required 
                    autoFocus
                    placeholder="e.g. Database Management Systems" 
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Course Code (Optional)</label>
                  <input 
                    placeholder="e.g. CS402" 
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Attended</label>
                    <input 
                      type="number" 
                      min="0" 
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" 
                      value={initialPresent} 
                      onChange={e => setInitialPresent(Number(e.target.value))} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Total Held</label>
                    <input 
                      type="number" 
                      min="0" 
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" 
                      value={initialTotal} 
                      onChange={e => setInitialTotal(Number(e.target.value))} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Target %</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="100" 
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" 
                      value={target} 
                      onChange={e => setTarget(Number(e.target.value))} 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold active:scale-95 transition"
                  >
                    Save Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Date-Wise Timestamped Audit Logs */}
        {showAuditModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" /> Relational Attendance Audit Trail
                </h3>
                <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-white text-sm">✕ Close</button>
              </div>
              <p className="text-xs text-slate-400 mb-4">Live chronological records showing exactly when each attendance was marked.</p>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No attendance logged yet. Click Present or Absent on any course card to create logs!</p>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs">
                      <div>
                        <div className="font-semibold text-white">{log.subject_name} <span className="text-slate-500">({log.subject_code})</span></div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Date: {log.marked_date} • Time: {log.timestamp}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md font-bold ${
                        log.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
