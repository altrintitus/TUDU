import { useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Routine } from '../db';
import { todayStr } from '../logic/dates';
import { streak, last7 } from '../logic/routines';
import { activityByDay, overallStreak, activityWindow, heatLevel, taskStats, totalCompletions, weekTrend } from '../logic/stats';
import { goalMetDays, loadGoal, subscribeWaterGoal } from '../logic/water';
import { navigate } from '../hooks/useHashRoute';
import { Flame, Gear } from '../components/icons';
import { WaterMeter } from '../components/WaterMeter';
import { RoutineEditorSheet } from '../components/RoutineEditorSheet';

export function ProgressScreen() {
  const today = todayStr();
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const waterGoal = useSyncExternalStore(subscribeWaterGoal, loadGoal);
  const data = useLiveQuery(async () => {
    const [tasks, routines, routineDone, water] = await Promise.all([
      db.tasks.toArray(),
      db.routines.orderBy('sortOrder').toArray(),
      db.routineDone.toArray(),
      db.water.toArray()
    ]);
    const byRoutine = new Map<string, Set<string>>();
    for (const r of routineDone) {
      let s = byRoutine.get(r.routineId);
      if (!s) { s = new Set(); byRoutine.set(r.routineId, s); }
      s.add(r.date);
    }
    return { tasks, routines, routineDone, byRoutine, water };
  });

  const header = (
    <header className="screen-header spaces-header">
      <h1 className="screen-title">Progress</h1>
      <button className="icon-btn" aria-label="settings" onClick={() => navigate({ name: 'settings' })}>
        <Gear />
      </button>
    </header>
  );
  if (!data) return <div className="progress-screen">{header}</div>;

  const activity = activityByDay(data.tasks, data.routineDone);
  const { current, best } = overallStreak(activity, today);
  const window30 = activityWindow(activity, today, 30);
  const ts = taskStats(data.tasks, today);
  const waterMet = goalMetDays(data.water, waterGoal, today, 30);
  const total = totalCompletions(activity);
  const { thisWeek, lastWeek } = weekTrend(activity, today);
  const trend = thisWeek - lastWeek;
  const activeDays = window30.filter((c) => c.count > 0).length;
  const consistency = Math.round((activeDays / 30) * 100);
  const noHistory = current === 0 && best === 0;

  // weekday-align the grid: leading blanks before the first cell's weekday (Sun=0)
  const firstDow = new Date(`${window30[0].date}T00:00:00`).getDay();

  const routineRows = (
    <section className="progress-section">
      <h2 className="section-label">Routines</h2>
      {data.routines.length === 0 && <p className="routines-empty">No routines yet — add one from Today</p>}
      {data.routines.map((r) => {
        const dd = data.byRoutine.get(r.id) ?? new Set<string>();
        const s = streak(r.days, dd, today);
        const dots = last7(r.days, dd, today);
        return (
          <button type="button" className="routine-row progress-routine" key={r.id} onClick={() => setEditingRoutine(r)}>
            <div className="routine-main">
              <div className="routine-top">
                <span className="routine-title">{r.title}</span>
                <span className={s > 0 ? 'routine-streak' : 'routine-streak zero'}>
                  <Flame filled={s > 0} size={14} /> {s}
                </span>
              </div>
              <div className="routine-dots" aria-hidden="true">{dots.map((d, i) => <span key={i} className={`rdot ${d}`} />)}</div>
            </div>
          </button>
        );
      })}
    </section>
  );

  return (
    <div className="progress-screen">
      {header}

      {noHistory ? (
        <>
          <p className="progress-empty">Complete a routine or task to start your streak. Your stats will grow here.</p>
          {routineRows}
          <section className="progress-section">
            <h2 className="section-label">Water</h2>
            <WaterMeter readOnly />
          </section>
        </>
      ) : (
        <>
          <div className="progress-hero">
            <Flame filled={current > 0} size={40} />
            <div className="hero-streak">{current}</div>
            <div className="hero-label">
              day streak{best > 0 && <span className="hero-best"> · best {best}</span>}
            </div>
          </div>

          <section className="progress-section">
            <div className="stat-grid">
              <div className="stat"><span className="stat-num">{total}</span><span className="stat-label">total done</span></div>
              <div className="stat"><span className="stat-num">{consistency}%</span><span className="stat-label">30-day</span></div>
              <div className="stat"><span className="stat-num">{trend >= 0 ? `+${trend}` : trend}</span><span className="stat-label">vs last wk</span></div>
            </div>
          </section>

          <section className="progress-section">
            <h2 className="section-label">30-day activity</h2>
            <div className="heatmap" aria-hidden="true">
              {Array.from({ length: firstDow }, (_, i) => <span key={`b${i}`} className="hcell blank" />)}
              {window30.map((c) => <span key={c.date} className={`hcell heat-${heatLevel(c.count)}`} />)}
            </div>
            <p className="sr-only">{activeDays} active days in the last 30</p>
          </section>

          {routineRows}

          <section className="progress-section">
            <h2 className="section-label">Tasks</h2>
            <div className="settings-row"><span>Done today</span><span className="settings-value">{ts.doneToday}</span></div>
            <div className="settings-row"><span>Done this week</span><span className="settings-value">{ts.doneWeek}</span></div>
            <div className="settings-row"><span>Kept up</span><span className="settings-value">{ts.keepUpRate === null ? '—' : `${ts.keepUpRate}%`}</span></div>
            <div className="settings-row"><span>Overdue</span><span className="settings-value">{ts.overdue}</span></div>
          </section>

          <section className="progress-section">
            <h2 className="section-label">Water</h2>
            <WaterMeter readOnly />
            <div className="settings-row"><span>Goal met (30d)</span><span className="settings-value">{waterMet}</span></div>
          </section>
        </>
      )}

      {editingRoutine && (
        <RoutineEditorSheet key={editingRoutine.id} open routine={editingRoutine} onClose={() => setEditingRoutine(null)} />
      )}
    </div>
  );
}
