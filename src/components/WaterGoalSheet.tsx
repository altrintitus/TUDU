import { useSyncExternalStore } from 'react';
import { Sheet } from './Sheet';
import { GOAL_PRESETS, formatL, loadGoal, setWaterGoal, subscribeWaterGoal } from '../logic/water';

// Set the daily water goal once (like a routine's parameter), not inline chips.
export function WaterGoalSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const goal = useSyncExternalStore(subscribeWaterGoal, loadGoal);
  return (
    <Sheet open={open} onClose={onClose} title="Daily water goal">
      <div className="goal-picker" role="group" aria-label="Daily water goal">
        {GOAL_PRESETS.map((g) => (
          <button
            key={g}
            type="button"
            className={g === goal ? 'goal-opt on' : 'goal-opt'}
            aria-pressed={g === goal}
            onClick={() => { setWaterGoal(g); onClose(); }}
          >
            {formatL(g)}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
