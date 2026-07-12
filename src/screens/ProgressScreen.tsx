import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { todayStr } from '../logic/dates';
import { streak, last7 } from '../logic/routines';
import { activityByDay, overallStreak, activityWindow, heatLevel, taskStats } from '../logic/stats';
import { Flame } from '../components/icons';

export function ProgressScreen() {
  const today = todayStr();
  const data = useLiveQuery(async () => {
    const [tasks, routines, routineDone] = await Promise.all([
      db.tasks.toArray(),
      db.routines.orderBy('sortOrder').toArray(),
      db.routineDone.toArray()
    ]);
    const byRoutine = new Map<string, Set<string>>();
    for (const r of routineDone) {
      let s = byRoutine.get(r.routineId);
      if (!s) { s = new Set(); byRoutine.set(r.routineId, s); }
      s.add(r.date);
    }
    return { tasks, routines, routineDone, byRoutine };
  });

  const header = <header className="screen-header"><h1 className="screen-title">Progress</h1></header>;
  if (!data) return <div className="progress-screen">{header}</div>;

  const activity = activityByDay(data.tasks, data.routineDone);
  const { current, best } = overallStreak(activity, today);
  const window30 = activityWindow(activity, today, 30);
  const ts = taskStats(data.tasks, today);
  const noHistory = current === 0 && best === 0;

  // weekday-align the grid: leading blanks before the first cell's weekday (Sun=0)
  const firstDow = new Date(`${window30[0].date}T00:00:00`).getDay();
  const activeDays = window30.filter((c) => c.count > 0).length;

  return (
    <div className="progress-screen">
      {header}

      {noHistory ? (
        <p className="empty-hint">Complete a routine or task to start a streak</p>
      ) : (
        <div className="progress-hero">
          <Flame filled={current > 0} size={40} />
          <div className="hero-streak">{current}</div>
          <div className="hero-label">
            day streak{best > 0 && <span className="hero-best"> · best {best}</span>}
          </div>
        </div>
      )}

      <section className="progress-section">
        <h2 className="section-label">30-day activity</h2>
        <div className="heatmap" aria-hidden="true">
          {Array.from({ length: firstDow }, (_, i) => <span key={`b${i}`} className="hcell blank" />)}
          {window30.map((c) => <span key={c.date} className={`hcell heat-${heatLevel(c.count)}`} />)}
        </div>
        <p className="sr-only">{activeDays} active days in the last 30</p>
      </section>

      <section className="progress-section">
        <h2 className="section-label">Routines</h2>
        {data.routines.length === 0 && <p className="routines-empty">No routines yet</p>}
        {data.routines.map((r) => {
          const dd = data.byRoutine.get(r.id) ?? new Set<string>();
          const s = streak(r.days, dd, today);
          const dots = last7(r.days, dd, today);
          return (
            <div className="routine-row" key={r.id}>
              <div className="routine-main">
                <div className="routine-top">
                  <span className="routine-title">{r.title}</span>
                  <span className={s > 0 ? 'routine-streak' : 'routine-streak zero'}>
                    <Flame filled={s > 0} size={14} /> {s}
                  </span>
                </div>
                <div className="routine-dots">{dots.map((d, i) => <span key={i} className={`rdot ${d}`} />)}</div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="progress-section">
        <h2 className="section-label">Tasks</h2>
        <div className="settings-row"><span>Done today</span><span className="settings-value">{ts.doneToday}</span></div>
        <div className="settings-row"><span>Done this week</span><span className="settings-value">{ts.doneWeek}</span></div>
        <div className="settings-row"><span>Kept up</span><span className="settings-value">{ts.keepUpRate === null ? '—' : `${ts.keepUpRate}%`}</span></div>
        <div className="settings-row"><span>Overdue</span><span className="settings-value">{ts.overdue}</span></div>
      </section>
    </div>
  );
}
