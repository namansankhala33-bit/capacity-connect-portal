import { useApp } from '../context/AppContext';

const STEPS = ['Learn', 'Assess', 'Measure', 'Identify Gaps', 'Recommend', 'Reassess', 'Track'];

export default function LearningLoop({ activeIndex }) {
  return (
    <div className="loop-indicator">
      {STEPS.map((step, i) => {
        const cls = i < activeIndex ? 'completed' : i === activeIndex ? 'active' : '';
        return (
          <span key={step} style={{ display: 'contents' }}>
            {i > 0 && <span className="loop-arrow">→</span>}
            <span className={`loop-step ${cls}`}>{step}</span>
          </span>
        );
      })}
    </div>
  );
}