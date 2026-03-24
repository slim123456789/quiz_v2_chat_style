export type AnswerValue = string | string[] | number;

export type Answers = Record<string, AnswerValue | undefined>;

export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "includes"
  | "notIncludes"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "in";

export type Condition = {
  key: string;
  operator: ConditionOperator;
  value: string | number | string[];
};

export type BranchTarget = string | "RECOMMENDATIONS" | "DISQUALIFY";

export type BranchRule = {
  all?: Condition[];
  any?: Condition[];
  goTo: BranchTarget;
};

export type QuizOption = {
  label: string;
  value: string;
};

export type QuestionType = "single" | "multi" | "dropdown" | "input";

export type Question = {
  id: string;
  section: "A" | "B" | "C" | "D";
  type: QuestionType;
  question: string;
  helperText?: string;
  placeholder?: string;
  options?: QuizOption[];
  maxSelections?: number;
  required?: boolean;
  showIf?: Condition[];
  branchRules?: BranchRule[];
};

export type ProductType = "lab" | "product";

export type Product = {
  id: string;
  name: string;
  description: string;
  lane: "androgen" | "metabolic" | "recovery" | "fallback";
  type: ProductType;
};
