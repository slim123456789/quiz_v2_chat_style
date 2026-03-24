"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QUESTIONS, getNextTarget, isQuestionVisible } from "@/lib/quizConfig";
import { Answers, Question } from "@/lib/quizTypes";

type Stage = "quiz" | "disqualified";
type LegacyStage = Stage | "welcome" | "recommendations";

type PersistedState = {
  answers: Answers;
  currentQuestionId: string;
  history: string[];
  stage: LegacyStage;
};

const STORAGE_KEY = "quiz_v2_chat_state";
const FIRST_QUESTION_ID = QUESTIONS[0].id;
const CHECKOUT_URL = "https://telehealth-quiz-checkout-2026-03.vercel.app/";

const QUESTION_INDEX = QUESTIONS.reduce<Record<string, number>>((acc, question, index) => {
  acc[question.id] = index;
  return acc;
}, {});

const SECTION_LABEL: Record<Question["section"], string> = {
  A: "Goals + Safety",
  B: "Androgen Lane",
  C: "Metabolic / GLP-1 Lane",
  D: "Recovery / GHRH Lane",
};

const getFirstVisibleQuestionId = (answers: Answers) =>
  QUESTIONS.find((question) => isQuestionVisible(question, answers))?.id ?? FIRST_QUESTION_ID;

const getQuestionById = (questionId: string) =>
  QUESTIONS.find((question) => question.id === questionId);

const getOptionLabel = (question: Question, value: string) =>
  question.options?.find((option) => option.value === value)?.label ?? value;

const renderAnswerLabel = (question: Question, value: Answers[string]) => {
  if (value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((entry) => getOptionLabel(question, String(entry))).join(", ");
  }

  if (question.type === "input") {
    return String(value);
  }

  return getOptionLabel(question, String(value));
};

const normalizeAnswer = (question: Question, value: string | string[]) => {
  if (question.type === "input" && typeof value === "string") {
    const digitsOnly = value.replace(/\D/g, "");
    return digitsOnly;
  }
  return value;
};

const nextSequentialVisibleQuestion = (questionId: string, answers: Answers) => {
  const currentIndex = QUESTION_INDEX[questionId];
  for (let index = currentIndex + 1; index < QUESTIONS.length; index += 1) {
    const candidate = QUESTIONS[index];
    if (isQuestionVisible(candidate, answers)) {
      return candidate.id;
    }
  }
  return "RECOMMENDATIONS";
};

const getProgressPercent = (currentId: string) => {
  const visibleCount = QUESTIONS.length;
  const currentIndex = Math.max(QUESTION_INDEX[currentId], 0) + 1;
  return Math.max(5, Math.min(100, Math.round((currentIndex / visibleCount) * 100)));
};

export default function Home() {
  const [stage, setStage] = useState<Stage>("quiz");
  const [answers, setAnswers] = useState<Answers>({});
  const [currentQuestionId, setCurrentQuestionId] = useState(FIRST_QUESTION_ID);
  const [history, setHistory] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const hydrationFixDoneRef = useRef(false);

  const scrollThreadToBottom = (behavior: ScrollBehavior = "auto") => {
    const run = () => {
      if (!threadRef.current) {
        return;
      }
      threadRef.current.scrollTo({
        top: threadRef.current.scrollHeight,
        behavior,
      });
    };

    run();
    window.requestAnimationFrame(run);
  };

  const currentQuestion = getQuestionById(currentQuestionId);

  const appendHistory = (questionId: string) => {
    setHistory((prev) => {
      if (prev[prev.length - 1] === questionId) {
        return prev;
      }
      return [...prev, questionId];
    });
  };

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setIsHydrated(true);
      return;
    }

    try {
      const persisted = JSON.parse(raw) as PersistedState;
      if (persisted.stage === "recommendations") {
        window.location.assign(CHECKOUT_URL);
        return;
      }
      setAnswers(persisted.answers ?? {});
      setCurrentQuestionId(persisted.currentQuestionId ?? FIRST_QUESTION_ID);
      setHistory(persisted.history ?? []);
      setStage(persisted.stage === "welcome" ? "quiz" : (persisted.stage ?? "quiz"));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const payload: PersistedState = {
      answers,
      currentQuestionId,
      history,
      stage,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [answers, currentQuestionId, history, isHydrated, stage]);

  useEffect(() => {
    if (!isHydrated || hydrationFixDoneRef.current || stage !== "quiz" || !currentQuestion) {
      return;
    }

    hydrationFixDoneRef.current = true;
    const existing = answers[currentQuestion.id];
    const isAnswered =
      existing !== undefined &&
      existing !== "" &&
      (!Array.isArray(existing) || existing.length > 0);

    if (!isAnswered) {
      return;
    }

    const target =
      getNextTarget(currentQuestion, answers) ??
      nextSequentialVisibleQuestion(currentQuestion.id, answers);

    if (target === "RECOMMENDATIONS") {
      window.location.assign(CHECKOUT_URL);
      return;
    }

    if (target !== "DISQUALIFY") {
      setCurrentQuestionId(target);
    }
  }, [answers, currentQuestion, isHydrated, stage]);

  useEffect(() => {
    if (stage !== "quiz") {
      return;
    }

    setIsTyping(true);
    const timer = window.setTimeout(() => setIsTyping(false), 550);
    return () => window.clearTimeout(timer);
  }, [stage, currentQuestionId]);

  useEffect(() => {
    scrollThreadToBottom("auto");
  }, [currentQuestionId, history, isTyping, stage]);

  const moveToNext = (question: Question, nextAnswers: Answers) => {
    const branchTarget = getNextTarget(question, nextAnswers);
    const target = branchTarget ?? nextSequentialVisibleQuestion(question.id, nextAnswers);

    if (target === "DISQUALIFY") {
      setStage("disqualified");
      return;
    }

    if (target === "RECOMMENDATIONS") {
      window.location.assign(CHECKOUT_URL);
      return;
    }

    setCurrentQuestionId(target);
  };

  const answerQuestion = (question: Question, value: string | string[]) => {
    const normalized = normalizeAnswer(question, value);
    const nextAnswers: Answers = {
      ...answers,
      [question.id]: normalized,
    };

    setAnswers(nextAnswers);
    appendHistory(question.id);
    scrollThreadToBottom("smooth");

    if (question.type === "single") {
      moveToNext(question, nextAnswers);
    }
  };

  const goNextFromContinue = () => {
    if (!currentQuestion) {
      return;
    }

    const value = answers[currentQuestion.id];
    const isAnswered =
      value !== undefined &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0);

    if (!isAnswered) {
      return;
    }

    appendHistory(currentQuestion.id);
    scrollThreadToBottom("smooth");
    moveToNext(currentQuestion, answers);
  };

  const goBack = () => {
    if (stage === "disqualified") {
      setStage("quiz");
      setCurrentQuestionId("q3");
      return;
    }

    const previousQuestionId = history[history.length - 1];
    if (!previousQuestionId) {
      setCurrentQuestionId(getFirstVisibleQuestionId(answers));
      return;
    }

    const nextHistory = history.slice(0, -1);
    const nextAnswers = { ...answers };
    delete nextAnswers[previousQuestionId];

    setHistory(nextHistory);
    setAnswers(nextAnswers);
    setCurrentQuestionId(previousQuestionId);
  };

  const toggleMultiSelect = (question: Question, value: string) => {
    const current = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];

    let nextValues: string[];
    if (current.includes(value)) {
      nextValues = current.filter((item) => item !== value);
    } else {
      const cap = question.maxSelections ?? current.length + 1;
      nextValues = [...current, value].slice(-cap);
    }

    setAnswers((prev) => ({
      ...prev,
      [question.id]: nextValues,
    }));
  };

  const canContinue = useMemo(() => {
    if (!currentQuestion) {
      return false;
    }

    const value = answers[currentQuestion.id];
    if (currentQuestion.type === "multi") {
      return Array.isArray(value) && value.length > 0;
    }

    return value !== undefined && value !== "";
  }, [answers, currentQuestion]);

  if (!isHydrated) {
    return <main className="app-shell" />;
  }

  return (
    <main className="app-shell">
      <div className="quiz-container">
        <header className="quiz-header">
          <button type="button" className="ghost-button" onClick={goBack}>
            Back
          </button>
          <div className="progress-wrap" aria-label="Quiz progress">
            <div className="progress-bar" style={{ width: `${getProgressPercent(currentQuestionId)}%` }} />
          </div>
        </header>

        {stage === "disqualified" && (
          <section className="panel">
            <p className="eyebrow">Eligibility Required</p>
            <h2>We can only serve patients 18 years or older.</h2>
            <p>
              Based on your response, you do not currently meet minimum eligibility. You can go
              back and update your age if needed.
            </p>
            <button type="button" className="primary-button" onClick={goBack}>
              Go back
            </button>
          </section>
        )}

        {stage === "quiz" && currentQuestion && (
          <section className="panel chat-shell">
            <div className="chat-thread" ref={threadRef}>
              <div className="bubble bubble-question">
                <p>Let&apos;s build your personalized plan. I&apos;ll ask one question at a time.</p>
              </div>
              {history
                .map((questionId) => getQuestionById(questionId))
                .filter(Boolean)
                .map((question, index) => {
                  const answer = answers[question!.id];
                  return (
                    <div key={`${question!.id}-${index}`} className="chat-history-block">
                      <div className="bubble bubble-question">{question!.question}</div>
                      <div className="bubble bubble-answer">
                        {renderAnswerLabel(question!, answer)}
                      </div>
                    </div>
                  );
                })}

              {isTyping ? (
                <div className="bubble bubble-question typing">Typing...</div>
              ) : (
                <div className="bubble bubble-question">
                  <p className="section-label">Section {currentQuestion.section}: {SECTION_LABEL[currentQuestion.section]}</p>
                  <p>{currentQuestion.question}</p>
                  {currentQuestion.helperText && <small>{currentQuestion.helperText}</small>}
                </div>
              )}
            </div>

            <div className="chat-composer">
              {!isTyping && currentQuestion.type === "single" && (
                <div className="answer-grid">
                  {currentQuestion.options?.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`answer-card ${answers[currentQuestion.id] === option.value ? "selected" : ""}`}
                      onClick={() => answerQuestion(currentQuestion, option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {!isTyping && currentQuestion.type === "multi" && (
                <div className="answer-grid">
                  {currentQuestion.options?.map((option) => {
                    const isSelected =
                      Array.isArray(answers[currentQuestion.id]) &&
                      (answers[currentQuestion.id] as string[]).includes(option.value);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`answer-card ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleMultiSelect(currentQuestion, option.value)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {!isTyping && currentQuestion.type === "dropdown" && (
                <div className="input-wrap">
                  <select
                    className="select-field"
                    value={String(answers[currentQuestion.id] ?? "")}
                    onChange={(event) =>
                      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: event.target.value }))
                    }
                  >
                    <option value="">Select one</option>
                    {currentQuestion.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!isTyping && currentQuestion.type === "input" && (
                <div className="input-wrap">
                  <input
                    className="text-field"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={currentQuestion.placeholder}
                    value={String(answers[currentQuestion.id] ?? "")}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQuestion.id]: event.target.value.replace(/\D/g, "").slice(0, 2),
                      }))
                    }
                  />
                </div>
              )}

              {!isTyping && currentQuestion.type !== "single" && (
                <button
                  type="button"
                  className="primary-button"
                  disabled={!canContinue}
                  onClick={goNextFromContinue}
                >
                  Continue
                </button>
              )}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
