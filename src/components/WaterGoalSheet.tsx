import { useSyncExternalStore } from 'react';
import { Sheet, useSheetDismiss } from './Sheet';
import { GOAL_PRESETS, formatL, loadGoal, setWaterGoal, subscribeWaterGoal } from '../logic/water';

// Set the daily water goal once (like a routine's parameter), not inline chips.
export function WaterGoalSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const goal = useSyncExternalStore(subscribeWaterGoal, loadGoal);
  const { closing, close } = useSheetDismiss(onClose);
  return (
    <Sheet open={open} closing={closing} onClose={close} title="Daily water goal">
      <div className="goal-picker" role="group" aria-label="Daily water goal">
        {GOAL_PRESETS.map((g) => (
          <button
            key={g}
            type="button"
            className={g === goal ? 'goal-opt on' : 'goal-opt'}
            aria-pressed={g === goal}
            onClick={() => { setWaterGoal(g); close(); }}
          >
            {formatL(g)}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
