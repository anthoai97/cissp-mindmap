import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import Description from '../components/Description';
import Icon from '../components/Icon';
import { mapHues } from '../components/MapGrid';
import Page from '../components/Page';
import ReviewModal, { type ReviewFilter } from '../components/ReviewModal';
import { mindmaps } from '../data';
import {
  cardsOf,
  loadRun,
  loadStats,
  maskedDescription,
  newRun,
  recordRun,
  saveRun,
  score,
  type Card,
  type Run,
  type Stats,
} from '../quiz';

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const KEYS = ['1', '2', '3', '4'];

/**
 * Where a missed card sits, shown in the end-of-run list: its map, then the topics above it.
 * A map whose top section has the map's own name would repeat it, so repeats are dropped.
 */
const contextOf = (card: Card) =>
  [card.map.title, ...card.parents.map((p) => p.title)].filter((title, i, all) => title !== all[i - 1]).join(' › ');

/** Practice every card from every map, one shuffled run at a time. */
export default function QuizPage() {
  const cards = useMemo(() => cardsOf(mindmaps), []);
  const byKey = useMemo(() => new Map(cards.map((card) => [card.key, card])), [cards]);
  const hues = useMemo(
    () =>
      new Map<string, string>(
        mindmaps.flatMap((map) => [...mapHues(map)].map(([id, hue]): [string, string] => [`${map.id}/${id}`, hue])),
      ),
    [],
  );
  const [run, setRun] = useState<Run>(() => loadRun(cards) ?? newRun(cards));
  const [stats, setStats] = useState<Stats | undefined>(() => loadStats());
  const [review, setReview] = useState<ReviewFilter>();
  const closeReview = useCallback(() => setReview(undefined), []);

  useEffect(() => saveRun(run), [run]);

  const finished = run.position >= run.deck.length;
  const question = run.deck[run.position];
  const chosen = run.answers[run.position];
  const correct = score(run);

  const answer = useCallback(
    (optionId: string) => {
      if (finished || chosen !== undefined) return;
      const answers = [...run.answers, optionId];
      if (answers.length === run.deck.length) {
        const right = answers.filter((a, i) => a === run.deck[i]?.id).length;
        setStats(recordRun(Math.round((right / run.deck.length) * 100)));
      }
      setRun({ ...run, answers });
    },
    [run, finished, chosen],
  );

  const next = useCallback(() => {
    if (chosen !== undefined) setRun({ ...run, position: run.position + 1 });
  }, [run, chosen]);

  const restart = useCallback(() => setRun(newRun(cards)), [cards]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The review pop-up handles its own keys; do not answer behind it.
      if (review || e.metaKey || e.ctrlKey || e.altKey) return;
      if (finished) {
        if (e.key === 'Enter') restart();
        return;
      }
      const index = KEYS.indexOf(e.key);
      const option = question?.options[index];
      if (index >= 0 && option) answer(option);
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [review, finished, question, answer, next, restart]);

  const card = question && byKey.get(question.id);

  return (
    <Page className="quiz-page">
      <header className="map-toolbar">
        <Link to="/" className="icon-btn" aria-label="All mind maps" title="All mind maps">
          <Icon name="back" />
        </Link>
        <span className="toolbar-divider" aria-hidden="true" />
        <div className="map-heading">
          <span className="map-eyebrow">Practice</span>
          <h1>All domains</h1>
        </div>
        <div className="quiz-tally" aria-label="Score">
          <button
            type="button"
            className="tally-btn tally-right"
            disabled={correct === 0}
            onClick={() => setReview('right')}
            title="Review correct answers"
          >
            ✓ {correct}
          </button>
          <button
            type="button"
            className="tally-btn tally-wrong"
            disabled={run.answers.length - correct === 0}
            onClick={() => setReview('wrong')}
            title="Review wrong answers"
          >
            ✗ {run.answers.length - correct}
          </button>
          <span className="tally-count">
            {Math.min(run.position + 1, run.deck.length)} / {run.deck.length}
          </span>
        </div>
      </header>

      <div className="quiz-progress" aria-hidden="true">
        <motion.div
          className="quiz-progress-fill"
          animate={{ width: `${(run.answers.length / run.deck.length) * 100}%` }}
          transition={{ duration: 0.4, ease }}
        />
      </div>

      <div className="quiz-body">
        <AnimatePresence mode="wait" initial={false}>
          {finished ? (
            <Summary key="summary" run={run} byKey={byKey} stats={stats} onRestart={restart} />
          ) : (
            card &&
            question && (
              <QuestionView
                key={`${run.deck.length}-${run.position}-${question.id}`}
                card={card}
                options={question.options.map((key) => byKey.get(key)).filter((c): c is Card => !!c)}
                hue={hues.get(card.key)}
                chosen={chosen}
                isLast={run.position === run.deck.length - 1}
                onAnswer={answer}
                onNext={next}
              />
            )
          )}
        </AnimatePresence>
      </div>

      <ReviewModal
        filter={review}
        run={run}
        byKey={byKey}
        hues={hues}
        onFilter={setReview}
        onClose={closeReview}
      />
    </Page>
  );
}

function QuestionView({
  card,
  options,
  hue,
  chosen,
  isLast,
  onAnswer,
  onNext,
}: {
  card: Card;
  options: Card[];
  hue?: string;
  chosen?: string;
  isLast: boolean;
  onAnswer: (id: string) => void;
  onNext: () => void;
}) {
  const answered = chosen !== undefined;
  const gotIt = chosen === card.key;

  return (
    <motion.section
      className="question"
      style={hue ? ({ '--hue': hue } as CSSProperties) : undefined}
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -48 }}
      transition={{ duration: 0.35, ease }}
    >
      <div className="question-card">
        <p className="question-eyebrow">Which topic is this?</p>
        <Description text={answered ? card.node.description : maskedDescription(card.node)} />
      </div>

      <ol className="options">
        {options.map((option, i) => {
          const isAnswer = option.key === card.key;
          const state = !answered ? '' : isAnswer ? 'right' : option.key === chosen ? 'wrong' : 'faded';
          return (
            <motion.li
              key={option.key}
              initial={{ opacity: 0, y: 12 }}
              animate={
                state === 'wrong'
                  ? { opacity: 1, y: 0, x: [0, -8, 8, -5, 5, 0] }
                  : state === 'right'
                    ? { opacity: 1, y: 0, scale: [1, 1.03, 1] }
                    : { opacity: 1, y: 0 }
              }
              transition={{ delay: answered ? 0 : 0.08 + i * 0.05, duration: answered ? 0.4 : 0.3, ease }}
            >
              <button
                type="button"
                className={`option ${state}`}
                disabled={answered}
                onClick={() => onAnswer(option.key)}
              >
                <span className="option-key">{KEYS[i]}</span>
                <span className="option-title">{option.node.title}</span>
              </button>
            </motion.li>
          );
        })}
      </ol>

      <AnimatePresence>
        {answered && (
          <motion.div
            className={`feedback ${gotIt ? 'right' : 'wrong'}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease }}
          >
            <span>{gotIt ? 'Correct!' : `Not quite. It is ${card.node.title}.`}</span>
            <button type="button" className="pill filled" onClick={onNext} autoFocus>
              {isLast ? 'See results' : 'Continue'} →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function Summary({
  run,
  byKey,
  stats,
  onRestart,
}: {
  run: Run;
  byKey: Map<string, Card>;
  stats?: Stats;
  onRestart: () => void;
}) {
  const right = score(run);
  const percent = Math.round((right / run.deck.length) * 100);
  const missed = run.deck.filter((q, i) => run.answers[i] !== q.id).map((q) => byKey.get(q.id));

  return (
    <motion.section
      className="summary"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease }}
    >
      <p className="question-eyebrow">Run complete</p>
      <motion.p
        className="summary-score"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease }}
      >
        {percent}%
      </motion.p>
      <p className="summary-detail">
        {right} of {run.deck.length} correct
        {stats && ` · Best ${stats.best}% · ${stats.runs} ${stats.runs === 1 ? 'run' : 'runs'}`}
      </p>

      <div className="summary-actions">
        <button type="button" className="pill filled" onClick={onRestart} autoFocus>
          Run again with a new shuffle
        </button>
        <Link className="pill" to="/">
          Back to all maps
        </Link>
      </div>

      {missed.length > 0 && (
        <div className="missed">
          <h2>Missed this run</h2>
          <ul>
            {missed.map(
              (card) =>
                card && (
                  <li key={card.key}>
                    <strong>{card.node.title}</strong>
                    <span> · {contextOf(card)}</span>
                  </li>
                ),
            )}
          </ul>
        </div>
      )}
    </motion.section>
  );
}
