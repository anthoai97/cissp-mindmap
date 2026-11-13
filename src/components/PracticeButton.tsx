import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { runProgress } from '../quiz';
import Icon from './Icon';

/** Starts a practice run of every card, or resumes the saved one with its progress. */
export default function PracticeButton() {
  const progress = runProgress();
  const percent = progress ? (progress.answered / progress.total) * 100 : 0;

  return (
    <Link
      to="/quiz"
      className="practice-btn"
      style={{ '--progress': `${percent}%` } as CSSProperties}
      aria-label={progress ? `Resume practice, ${progress.answered} of ${progress.total} done` : 'Practice all cards'}
    >
      <Icon name="cards" />
      <span>{progress ? 'Resume' : 'Practice'}</span>
      {progress && (
        <span className="practice-count">
          {progress.answered}/{progress.total}
        </span>
      )}
    </Link>
  );
}
