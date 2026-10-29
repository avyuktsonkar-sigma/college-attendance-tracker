'use client';

import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Plus, Download, Check, X, Trash2, 
  AlertCircle, Sparkles, History, Loader2, Database 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Subject {
  id: number;
  name: string;
  code: string;
  target_percentage: number;
  present_count: number;
  total_count: number;
}

interface AuditLog {
  id: number;
  subject_name: string;
  subject_code: string;
  status: 'PRESENT' | 'ABSENT';
  marked_date: string;
}

export default function FullstackAttendance() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({ name: '', code: '', target: 75 });

  // 1. Fetch live data from Backend API
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subjects');
      const json = await res.json();
      if (json.success) setSubjects(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/attendance');
      const json = await res.json();
      if (json.success) setAuditLogs(json.data);
      setShowAuditModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Mark Attendance via Backend API POST
  const markAttendance = async (subjectId: number, status: 'PRESENT' | 'ABSENT') => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, status })
      });
      if (res.ok) {
        if (status === 'PRESENT') {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        }
        fetchData(); // Sync with updated database aggregate
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Delete Subject via Backend API DELETE
  const deleteSubject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this course and its database records?')) return;
    try {
      await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Create Subject via Backend API POST
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          target_percentage: Number(formData.target)
        })
      });
      if (res.ok) {
        setFormData({ name: '', code: '', target: 75 });
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 75% Bunk Forecasting Logic
  const getBunkStatus = (present: number, total: number, target: number) => {
    if (total === 0) return { message: 'No lectures registered yet in database', safe: true };
    const current = (present / total) * 100;
    const targetDec = target / 100;

    if (current >= target) {
      const canBunk = Math.floor((present - targetDec * total) / targetDec);
      return {
        message: canBunk === 0 ? 'On borderline! Do not miss next lecture.' : `Safe to bunk next ${canBunk} lecture${canBunk > 1 ? 's' : ''}`,
        safe: true
      };
    } else {
      const mustAttend = Math.ceil((targetDec * total - present) / (1 - targetDec));
      return {
        message: `Must attend next ${mustAttend} class${mustAttend > 1 ? 'es' : ''} consecutively`,
        safe: false
      };
    }
  };

  // Calculations
  const totalClasses = subjects.reduce((sum, s) => sum + s.total_count, 0);
  const totalAttended = subjects.reduce((sum, s) => sum + s.present_count, 0);
  const overallPercentage = totalClasses === 0 ? 0 : Math.round((totalAttended / totalClasses) * 100);
  const shortageCount = subjects.filter(s => s.total_count > 0 && (s.present_count / s.total_count) * 100 < s.target_percentage).length;

  const exportCSV = () => {
    if (subjects.length === 0) return alert('No database records to export.');
    const headers = ['Course Code,Course Name,Present,Total,Percentage,Target,Status'];
    const rows = subjects.map(s => {
      const pct = s.total_count === 0 ? 0 : ((s.present_count / s.total_count) * 100).toFixed(1);
      const status = Number(pct) >= s.target_percentage ? 'Eligible' : 'Detained';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
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
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <Database className="w-3 h-3" /> PostgreSQL Connected
                </span>
              </div>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5">Full-Stack Attendance Engine with Relational Date-Logging</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={fetchAuditLogs}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              <History className="w-4 h-4 text-indigo-400" /> Date-Wise Logs
            </button>
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              <Download className="w-4 h-4 text-slate-400" /> Export CSV
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>
        </header>

        {/* Analytics Top Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Overall Aggregate</span>
            <div className="text-3xl md:text-4xl font-black mt-2 text-white flex items-baseline gap-2">
              <span>{overallPercentage}%</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${overallPercentage >= 75 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {overallPercentage >= 75 ? 'Safe' : 'Critical'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className={`h-full transition-all duration-500 ${overallPercentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(overallPercentage, 100)}%` }} />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Classes</span>
            <div className="text-3xl md:text-4xl font-black mt-2 text-white">{totalClasses}</div>
            <div className="text-xs text-slate-400 mt-2">Recorded across DB</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Attended</span>
            <div className="text-3xl md:text-4xl font-black mt-2 text-emerald-400">{totalAttended}</div>
            <div className="text-xs text-slate-400 mt-2">{totalClasses - totalAttended} Missed lectures</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Shortage Warnings</span>
            <div className="text-3xl md:text-4xl font-black mt-2 text-rose-400">{shortageCount}</div>
            <div className="text-xs text-slate-400 mt-2">Below 75% cutoff</div>
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-200">Enrolled Courses ({subjects.length})</h2>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
          </div>

          {subjects.length === 0 && !loading ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-800/80 rounded-3xl p-8 bg-slate-900/20">
              <h3 className="text-xl font-bold text-white">Database is Empty</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1.5 mb-6">Create your first subject record to test backend insertion and linear forecasting.</p>
              <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition">
                + Add Subject
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map(sub => {
                const pct = sub.total_count === 0 ? 0 : Math.round((sub.present_count / sub.total_count) * 100);
                const isShortage = sub.total_count > 0 && pct < sub.target_percentage;
                const status = getBunkStatus(sub.present_count, sub.total_count, sub.target_percentage);

                return (
                  <div key={sub.id} className={`border rounded-2xl p-5 flex flex-col justify-between transition ${isShortage ? 'bg-rose-950/20 border-rose-500/30' : 'bg-slate-900/40 border-slate-800'}`}>
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold bg-slate-800 px-2.5 py-0.5 rounded-full text-slate-400 uppercase tracking-wider">{sub.code}</span>
                          <h3 className="text-base md:text-lg font-semibold text-white mt-1.5">{sub.name}</h3>
                        </div>
                        <button onClick={() => deleteSubject(sub.id)} className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-2xl font-black text-white">
                          {pct}% 
                          <span className="text-xs font-normal text-slate-400 ml-1">({sub.present_count}/{sub.total_count})</span>
                        </div>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isShortage ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          Cutoff: {sub.target_percentage}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                        <div className={`h-full ${isShortage ? 'bg-rose-500' : 'bg-emerald-500'} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>

                      <div className={`mt-3.5 text-xs font-medium p-2.5 rounded-xl flex items-center gap-2 ${status.safe ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-900/40' : 'bg-rose-950/40 text-rose-300 border border-rose-900/40'}`}>
                        {status.safe ? <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                        <span>{status.message}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80">
                      <button onClick={() => markAttendance(sub.id, 'PRESENT')} className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold text-xs transition active:scale-95">
                        <Check className="w-4 h-4" /> Present
                      </button>
                      <button onClick={() => markAttendance(sub.id, 'ABSENT')} className="flex items-center justify-center gap-1.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl font-semibold text-xs transition active:scale-95">
                        <X className="w-4 h-4" /> Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Subject Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-4">Add Course via Backend API</h3>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Subject Name</label>
                  <input required placeholder="e.g. Distributed Systems" className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Code</label>
                    <input placeholder="e.g. CS501" className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Target %</label>
                    <input type="number" min="1" max="100" className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" value={formData.target} onChange={e => setFormData({ ...formData, target: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold">Execute SQL Insert</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Date-wise Audit Logs Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" /> Relational Audit Trail
                </h3>
                <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <p className="text-xs text-slate-400 mb-4">Recent records stored in PostgreSQL with timestamp and status.</p>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">No logs available in database.</p>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl text-xs">
                      <div>
                        <span className="font-semibold text-white">{log.subject_name}</span>
                        <span className="text-slate-500 ml-2">({log.subject_code})</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Date: {new Date(log.marked_date).toLocaleDateString()}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-bold ${log.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
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
