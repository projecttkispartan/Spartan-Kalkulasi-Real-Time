import roundingRules from '../data/masters/rounding/rules.json' with { type: 'json' };

let rules = roundingRules;

export function setRoundingRules(list) {
  rules = list || roundingRules;
}

export function getRoundingRules() {
  return rules;
}

export function getRoundingRule(id) {
  return rules.find((r) => r.id === id && r.aktif !== false) || null;
}

export function applyRounding(value, ruleId) {
  const rule = getRoundingRule(ruleId);
  if (!rule) return Number(value) || 0;
  return applyRule(Number(value) || 0, rule);
}

export function applyRule(value, rule) {
  const step = Number(rule.step) || 1;
  if (step <= 0) return value;
  const v = Number(value) || 0;
  switch (rule.method) {
    case 'ceil':
      return Math.ceil(v / step) * step;
    case 'round':
      return Math.round(v / step) * step;
    case 'floor':
    default:
      return Math.floor(v / step) * step;
  }
}

export function applyRoundingForTarget(target, value) {
  const rule = rules.find((r) => r.target === target && r.aktif !== false);
  if (!rule) return Number(value) || 0;
  return applyRule(Number(value) || 0, rule);
}
