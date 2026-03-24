import { Answers, Product } from "@/lib/quizTypes";
import { TRT_ELIGIBLE_STATES, getDerivedFlags } from "@/lib/quizConfig";

const PRODUCTS: Record<string, Product> = {
  enclomiphene: {
    id: "enclomiphene",
    name: "Enclomiphene",
    description: "Fertility-conscious hormone support.",
    lane: "androgen",
    type: "lab",
  },
  trt_cream: {
    id: "trt_cream",
    name: "TRT Cream",
    description: "Daily topical testosterone replacement support.",
    lane: "androgen",
    type: "lab",
  },
  injectable_trt: {
    id: "injectable_trt",
    name: "Injectable TRT",
    description: "Higher-potency testosterone replacement support.",
    lane: "androgen",
    type: "lab",
  },
  hcg: {
    id: "hcg",
    name: "HCG Add-on",
    description: "Optional add-on for testicular support.",
    lane: "androgen",
    type: "product",
  },
  tirzepatide: {
    id: "tirzepatide",
    name: "Tirzepatide",
    description: "Metabolic support optimized for stronger weight outcomes.",
    lane: "metabolic",
    type: "product",
  },
  semaglutide: {
    id: "semaglutide",
    name: "Semaglutide",
    description: "Metabolic support with broad familiarity.",
    lane: "metabolic",
    type: "product",
  },
  tirzepatide_micro: {
    id: "tirzepatide_micro",
    name: "Tirzepatide (Microdose)",
    description: "Gentler titration path for metabolic support.",
    lane: "metabolic",
    type: "product",
  },
  sermorelin: {
    id: "sermorelin",
    name: "Sermorelin",
    description: "Recovery, sleep quality, and muscle retention support.",
    lane: "recovery",
    type: "product",
  },
  tesamorelin: {
    id: "tesamorelin",
    name: "Tesamorelin",
    description: "Peptide option for more aggressive fat targeting.",
    lane: "recovery",
    type: "product",
  },
  ghk_cu: {
    id: "ghk_cu",
    name: "GHK-Cu (Topical)",
    description: "Topical support for skin and hair quality.",
    lane: "recovery",
    type: "product",
  },
  tadalafil_low: {
    id: "tadalafil_low",
    name: "Low-dose Tadalafil",
    description: "Blood-flow support for training performance.",
    lane: "recovery",
    type: "product",
  },
  fallback_semaglutide: {
    id: "fallback_semaglutide",
    name: "Semaglutide",
    description: "Baseline recommendation when no lanes are selected.",
    lane: "fallback",
    type: "product",
  },
};

const takeUnique = (items: Product[], max: number) => {
  const deduped: Product[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      deduped.push(item);
    }
    if (deduped.length >= max) {
      break;
    }
  }

  return deduped;
};

const pickRecoveryCandidates = (answers: Answers) => {
  const selected = Array.isArray(answers.q12) ? answers.q12 : [];
  const peptideComfort = answers.q13 !== "simple_only";
  const candidates: Product[] = [];

  if (selected.includes("sleep_recovery_muscle")) {
    candidates.push(PRODUCTS.sermorelin);
  }
  if (selected.includes("aggressive_fat") && peptideComfort) {
    candidates.push(PRODUCTS.tesamorelin);
  }
  if (selected.includes("skin_hair")) {
    candidates.push(PRODUCTS.ghk_cu);
  }
  if (selected.includes("blood_flow_training")) {
    candidates.push(PRODUCTS.tadalafil_low);
  }

  if (candidates.length === 0) {
    candidates.push(PRODUCTS.sermorelin);
    if (peptideComfort) {
      candidates.push(PRODUCTS.tadalafil_low);
    }
  }

  return takeUnique(candidates, 2);
};

const quotaMap = (
  lanes: { androgen: boolean; metabolic: boolean; recovery: boolean },
  androgenHasTwo: boolean,
) => {
  if (lanes.androgen && lanes.metabolic && lanes.recovery) {
    return androgenHasTwo
      ? { androgen: 2, metabolic: 1, recovery: 1 }
      : { androgen: 1, metabolic: 1, recovery: 2 };
  }

  if (lanes.androgen && lanes.recovery) {
    return androgenHasTwo
      ? { androgen: 2, metabolic: 0, recovery: 2 }
      : { androgen: 1, metabolic: 0, recovery: 2 };
  }

  if (lanes.androgen && lanes.metabolic) {
    return androgenHasTwo
      ? { androgen: 2, metabolic: 1, recovery: 0 }
      : { androgen: 1, metabolic: 1, recovery: 0 };
  }

  if (lanes.metabolic && lanes.recovery) {
    return { androgen: 0, metabolic: 1, recovery: 2 };
  }

  if (lanes.androgen) {
    return androgenHasTwo
      ? { androgen: 2, metabolic: 0, recovery: 0 }
      : { androgen: 1, metabolic: 0, recovery: 0 };
  }

  if (lanes.metabolic) {
    return { androgen: 0, metabolic: 1, recovery: 0 };
  }

  if (lanes.recovery) {
    return { androgen: 0, metabolic: 0, recovery: 2 };
  }

  return { androgen: 0, metabolic: 0, recovery: 0 };
};

export const getRecommendations = (answers: Answers): Product[] => {
  const sex = answers.q2;
  const age = Number(answers.q3);
  const state = String(answers.q5 ?? "");
  const derived = getDerivedFlags(answers);
  const fertilityFocused = derived.$fertilityFocused === "yes";

  const androgenCandidates: Product[] = [];
  const metabolicCandidates: Product[] = [];
  const recoveryCandidates: Product[] = [];

  const androgenEligible =
    answers.q4 === "yes" &&
    sex === "male" &&
    age >= 18 &&
    TRT_ELIGIBLE_STATES.includes(state);

  if (answers.q4 === "yes" && fertilityFocused) {
    androgenCandidates.push(PRODUCTS.enclomiphene);
  } else if (androgenEligible && age > 25) {
    if (answers.q6 === "avoid_injections") {
      androgenCandidates.push(PRODUCTS.trt_cream);
    }

    if (["injections_ok", "strongest", "unsure"].includes(String(answers.q6))) {
      androgenCandidates.push(PRODUCTS.injectable_trt);
      if (answers.q7 === "yes") {
        androgenCandidates.push(PRODUCTS.hcg);
      }
    }
  }

  if (answers.q8 === "yes") {
    if (answers.q10 === "maximum_weight_loss") {
      metabolicCandidates.push(PRODUCTS.tirzepatide);
    } else if (answers.q10 === "tolerance_familiarity") {
      metabolicCandidates.push(PRODUCTS.semaglutide);
    } else if (answers.q10 === "gentler_support") {
      metabolicCandidates.push(PRODUCTS.tirzepatide_micro);
    } else {
      metabolicCandidates.push(PRODUCTS.semaglutide);
    }
  }

  if (answers.q11 === "yes") {
    recoveryCandidates.push(...pickRecoveryCandidates(answers));
  }

  const lanes = {
    androgen: androgenCandidates.length > 0,
    metabolic: metabolicCandidates.length > 0,
    recovery: recoveryCandidates.length > 0,
  };

  const androgenHasTwo = androgenCandidates.some((product) => product.id === "injectable_trt") &&
    androgenCandidates.some((product) => product.id === "hcg");

  const quota = quotaMap(lanes, androgenHasTwo);

  const selected: Product[] = [
    ...takeUnique(androgenCandidates, Math.min(quota.androgen, 2)),
    ...takeUnique(metabolicCandidates, Math.min(quota.metabolic, 1)),
    ...takeUnique(recoveryCandidates, Math.min(quota.recovery, 2)),
  ];

  if (selected.length === 0) {
    return [PRODUCTS.fallback_semaglutide];
  }

  return selected.slice(0, 4);
};

export const splitCheckoutPayload = (products: Product[]) => {
  const labs = products
    .filter((product) => product.id === "injectable_trt" || product.id === "trt_cream" || product.id === "enclomiphene")
    .map((product) => product.id);

  const items = products
    .filter((product) => !labs.includes(product.id))
    .map((product) => product.id);

  return { labs, products: items };
};
