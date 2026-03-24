import { Answers, BranchRule, Condition, Question } from "@/lib/quizTypes";

export const TRT_ELIGIBLE_STATES = ["CA", "TX", "FL", "WA", "AZ", "NV"];

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    section: "A",
    type: "multi",
    question: "What are your top goals right now?",
    helperText: "Choose up to 2",
    maxSelections: 2,
    required: true,
    options: [
      { label: "Build lean muscle", value: "build_muscle" },
      { label: "Lose body fat", value: "lose_fat" },
      { label: "Increase energy", value: "increase_energy" },
      { label: "Preserve fertility", value: "preserve_fertility" },
      { label: "Improve recovery", value: "improve_recovery" },
    ],
  },
  {
    id: "q2",
    section: "A",
    type: "single",
    question: "What sex were you assigned at birth?",
    required: true,
    options: [
      { label: "Male", value: "male" },
      { label: "Female", value: "female" },
    ],
  },
  {
    id: "q3",
    section: "A",
    type: "input",
    question: "How old are you?",
    helperText: "You must be 18+ to qualify",
    placeholder: "Enter age",
    required: true,
    branchRules: [
      {
        all: [{ key: "q3", operator: "lt", value: 18 }],
        goTo: "DISQUALIFY",
      },
      {
        all: [{ key: "q2", operator: "equals", value: "female" }],
        goTo: "q8",
      },
    ],
  },
  {
    id: "q4",
    section: "B",
    type: "single",
    question: "Are you open to testosterone optimization support?",
    required: true,
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
    branchRules: [
      {
        all: [{ key: "q4", operator: "equals", value: "no" }],
        goTo: "q8",
      },
    ],
  },
  {
    id: "q5",
    section: "B",
    type: "dropdown",
    question: "Which state do you currently live in?",
    required: true,
    options: [
      ...TRT_ELIGIBLE_STATES.map((state) => ({ label: state, value: state })),
      { label: "Other", value: "OTHER" },
    ],
  },
  {
    id: "q6",
    section: "B",
    type: "single",
    question: "Which treatment style fits you best?",
    required: true,
    options: [
      {
        label: "Preserve testicular function",
        value: "preserve_testicular_function",
      },
      { label: "Avoid injections", value: "avoid_injections" },
      { label: "Injections are fine", value: "injections_ok" },
      { label: "Strongest option", value: "strongest" },
      { label: "Not sure", value: "unsure" },
    ],
  },
  {
    id: "q7",
    section: "B",
    type: "single",
    question: "Would you like to add HCG support if eligible?",
    required: true,
    showIf: [{ key: "$injectableCandidate", operator: "equals", value: "yes" }],
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
  {
    id: "q8",
    section: "C",
    type: "single",
    question: "Do you want a metabolic / GLP-1 option in your plan?",
    required: true,
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
    branchRules: [
      {
        all: [{ key: "q8", operator: "equals", value: "no" }],
        goTo: "q11",
      },
    ],
  },
  {
    id: "q9",
    section: "C",
    type: "multi",
    question: "What matters most for weight support?",
    helperText: "Choose up to 2",
    maxSelections: 2,
    required: true,
    options: [
      { label: "Scale movement", value: "scale_movement" },
      { label: "Appetite control", value: "appetite_control" },
      { label: "Minimal side effects", value: "minimal_side_effects" },
      { label: "Long-term sustainability", value: "sustainability" },
    ],
  },
  {
    id: "q10",
    section: "C",
    type: "single",
    question: "Which metabolic approach do you prefer?",
    required: true,
    options: [
      { label: "Maximum weight loss", value: "maximum_weight_loss" },
      { label: "Tolerance / familiarity", value: "tolerance_familiarity" },
      { label: "Gentler support", value: "gentler_support" },
    ],
  },
  {
    id: "q11",
    section: "D",
    type: "single",
    question: "Do you want recovery and performance support too?",
    required: true,
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
    branchRules: [
      {
        all: [{ key: "q11", operator: "equals", value: "no" }],
        goTo: "RECOMMENDATIONS",
      },
    ],
  },
  {
    id: "q12",
    section: "D",
    type: "multi",
    question: "Which recovery outcomes do you want most?",
    helperText: "Choose up to 2",
    maxSelections: 2,
    required: true,
    options: [
      {
        label: "Sleep / recovery / muscle retention",
        value: "sleep_recovery_muscle",
      },
      { label: "Aggressive fat targeting", value: "aggressive_fat" },
      { label: "Skin / hair quality", value: "skin_hair" },
      { label: "Blood flow / training", value: "blood_flow_training" },
    ],
  },
  {
    id: "q13",
    section: "D",
    type: "single",
    question: "Are you comfortable with peptide-based recovery options?",
    required: true,
    options: [
      { label: "Yes", value: "yes" },
      { label: "Prefer simpler options", value: "simple_only" },
    ],
  },
];

const toNumber = (value: Answers[string]) => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
};

const evaluateCondition = (
  condition: Condition,
  answers: Answers,
  derived: Record<string, string>,
) => {
  const source = condition.key.startsWith("$")
    ? derived[condition.key]
    : answers[condition.key];

  switch (condition.operator) {
    case "equals":
      return source === condition.value;
    case "notEquals":
      return source !== condition.value;
    case "includes":
      return Array.isArray(source)
        ? source.includes(condition.value as string)
        : typeof source === "string" && source.includes(String(condition.value));
    case "notIncludes":
      return Array.isArray(source)
        ? !source.includes(condition.value as string)
        : typeof source === "string" && !source.includes(String(condition.value));
    case "lt":
      return toNumber(source) < Number(condition.value);
    case "lte":
      return toNumber(source) <= Number(condition.value);
    case "gt":
      return toNumber(source) > Number(condition.value);
    case "gte":
      return toNumber(source) >= Number(condition.value);
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(String(source));
    default:
      return false;
  }
};

const matchesRule = (
  rule: BranchRule,
  answers: Answers,
  derived: Record<string, string>,
) => {
  const allPass =
    !rule.all ||
    (rule.all.length > 0 && rule.all.every((condition) => evaluateCondition(condition, answers, derived)));
  const anyPass =
    !rule.any ||
    (rule.any.length > 0 && rule.any.some((condition) => evaluateCondition(condition, answers, derived)));

  return allPass && anyPass;
};

export const getDerivedFlags = (answers: Answers): Record<string, string> => {
  const sex = answers.q2;
  const age = toNumber(answers.q3);
  const state = answers.q5;
  const treatmentPref = answers.q6;
  const androgenOptIn = answers.q4 === "yes";

  const fertilityFocused =
    (Array.isArray(answers.q1) && answers.q1.includes("preserve_fertility")) ||
    treatmentPref === "preserve_testicular_function";

  const injectableCandidate =
    androgenOptIn &&
    sex === "male" &&
    age > 25 &&
    TRT_ELIGIBLE_STATES.includes(String(state)) &&
    !fertilityFocused &&
    ["injections_ok", "strongest", "unsure"].includes(String(treatmentPref));

  return {
    $fertilityFocused: fertilityFocused ? "yes" : "no",
    $injectableCandidate: injectableCandidate ? "yes" : "no",
  };
};

export const isQuestionVisible = (question: Question, answers: Answers) => {
  if (!question.showIf || question.showIf.length === 0) {
    return true;
  }

  const derived = getDerivedFlags(answers);
  return question.showIf.every((condition) => evaluateCondition(condition, answers, derived));
};

export const getNextTarget = (question: Question, answers: Answers) => {
  if (!question.branchRules || question.branchRules.length === 0) {
    return null;
  }

  const derived = getDerivedFlags(answers);
  const match = question.branchRules.find((rule) => matchesRule(rule, answers, derived));
  return match?.goTo ?? null;
};
