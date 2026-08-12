const STEPS = ["참가자 정보", "세션 선택", "확인"];

/** Shared 3-step progress indicator for steps 1–3 (the done page has no progress list). */
export default function ProgressList({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="wizard-progress">
      {STEPS.map((label, index) => (
        <li key={label} aria-current={index + 1 === current ? "step" : undefined}>
          {label}
        </li>
      ))}
    </ol>
  );
}
