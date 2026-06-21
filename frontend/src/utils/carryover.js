// 3-Month Rolling Carryover Engine — pure function, no side effects.
// Implements spec §1.C exactly.

/**
 * @param {string} categoryId
 * @param {number} baseBudgetCents  — monthly allocation for this category
 * @param {Array}  closedSnapshots  — last ≤3 closed month_snapshots, newest first
 * @param {number} currentSpentCents — spent so far this (open) month
 * @returns {CarryoverResult}
 */
export function computeCarryover(categoryId, baseBudgetCents, closedSnapshots, currentSpentCents) {
  // Collect per-month deltas from closed snapshots (up to 2 prior months)
  const priorMonths = closedSnapshots.slice(0, 2).map(snap => {
    const cat = snap.category_totals?.[categoryId];
    if (!cat) return { surplus: 0, deficit: 0 };
    const remaining = cat.budgeted - cat.spent;
    return remaining >= 0
      ? { surplus: remaining, deficit: 0 }
      : { surplus: 0, deficit: Math.abs(remaining) };
  });

  // Accumulated surplus from prior 2 months
  const carriedSurplus = priorMonths.reduce((sum, m) => sum + m.surplus, 0);

  // Total available this month before spending
  const totalAvailable = baseBudgetCents + carriedSurplus;

  // How much over-budget this month?
  const overspend = Math.max(0, currentSpentCents - totalAvailable);

  // Borrowing forward: overspend above available
  const borrowedForward = overspend;

  // Guardrail: borrowed > 2× base budget, OR 3 consecutive negative months
  const consecutiveNegative = closedSnapshots.slice(0, 3).filter(snap => {
    const cat = snap.category_totals?.[categoryId];
    return cat && (cat.spent > cat.budgeted);
  }).length;

  const isLocked =
    borrowedForward > 2 * baseBudgetCents ||
    consecutiveNegative >= 3;

  return {
    categoryId,
    baseBudget: baseBudgetCents,
    carriedSurplus,
    borrowedForward,
    totalAvailable,
    currentSpent: currentSpentCents,
    remaining: totalAvailable - currentSpentCents,
    isLocked,
  };
}

/**
 * Run computeCarryover for all categories at once.
 * @param {Array} categories          — [{ id, monthly_amount_cents }]
 * @param {Array} closedSnapshots     — month_snapshots rows
 * @param {Object} currentSpentMap    — { categoryId: centsSpent }
 * @returns {Object}                  — { [categoryId]: CarryoverResult }
 */
export function computeAllCarryovers(categories, closedSnapshots, currentSpentMap) {
  const results = {};
  for (const cat of categories) {
    results[cat.id] = computeCarryover(
      cat.id,
      cat.monthly_amount_cents,
      closedSnapshots,
      currentSpentMap[cat.id] || 0
    );
  }
  return results;
}
