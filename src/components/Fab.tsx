export function Fab({ onPress }: { onPress(): void }) {
  return (
    <button className="fab" aria-label="capture" onClick={onPress}>
      <span aria-hidden="true">+</span>
    </button>
  );
}
