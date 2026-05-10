/**
 * Enhanced Watchdog Engine - Enforces Axiomatic Constraints
 *
 * Implements full validation per AGENTS.md:
 * - A1: Relational Integrity
 * - A2: Historical Persistence
 * - A3: Emergent Complexity
 * - A4: Watchdog Enforcement
 * - A5: Continuous Ingestion
 */

import { H } from './heuristic.engine';
import { Graph } from './graph.engine';

export interface ValidationResult {
  valid: boolean;
  normalized?: any;
  reason?: string;
}

/**
 * A1 - Relational Integrity: Validate graph constraints
 */
function validateRelationalIntegrity(action: any, graph: Graph): boolean {
  if (!action.entityId) return true; // No entity context

  const relations = graph.relations(action.entityId);
  const totalWeight = graph.value(action.entityId);

  // Constraint: Entity cannot have negative total relationship weight
  if (totalWeight < -100) {
    console.warn(`[Watchdog] Entity ${action.entityId} has dangerously low relationship weight: ${totalWeight}`);
    return false;
  }

  return true;
}

/**
 * A2 - Historical Persistence: Validate against historical patterns
 */
function validateHistoricalPersistence(action: any, history: any[]): boolean {
  if (!history || history.length === 0) return true;

  // Constraint: Rapid action reversal (e.g., buy-sell-buy in 1 second) is suspicious
  const recentActions = history.filter(a => Date.now() - a.timestamp < 1000);
  const actionTypes = recentActions.map(a => a.type);

  if (actionTypes.includes('buy') && actionTypes.includes('sell') && actionTypes.includes('buy')) {
    console.warn(`[Watchdog] Suspicious rapid action pattern detected: ${actionTypes.join(' -> ')}`);
    return false;
  }

  return true;
}

/**
 * A3 - Emergent Complexity: Validate action doesn't break system rules
 */
function validateEmergentComplexity(action: any): boolean {
  // Constraint: No negative values in game state
  if (action.value !== undefined && action.value < 0) {
    return false;
  }

  // Constraint: Resource transfers must be positive
  if (action.type === 'transfer' && action.amount <= 0) {
    return false;
  }

  // Constraint: Prices must be positive
  if (action.type === 'trade' && action.price <= 0) {
    return false;
  }

  return true;
}

/**
 * A4 - Watchdog Enforcement: Validate heuristic boundaries
 */
function validateHeuristicBoundaries(action: any): boolean {
  // Constraint: Heuristic values must stay in [0, 1] range
  if (action.type === 'heuristic_update') {
    const newH = action.newH || [];
    for (let i = 0; i < newH.length; i++) {
      if (newH[i] < 0 || newH[i] > 1) {
        console.warn(`[Watchdog] Heuristic H${i} out of bounds: ${newH[i]}`);
        return false;
      }
    }
  }

  // Constraint: Conflict (H8) cannot exceed 0.9 without chaos (H10) > 0.7
  if (action.type === 'conflict_action' && H[7] > 0.9 && H[9] < 0.7) {
    console.warn(`[Watchdog] Conflict too high without sufficient chaos`);
    return false;
  }

  return true;
}

/**
 * A5 - Continuous Ingestion: Validate event vector structure
 */
function validateEventVector(E: number[]): boolean {
  if (!Array.isArray(E) || E.length !== 13) {
    console.warn(`[Watchdog] Invalid event vector: must be array of 13 elements`);
    return false;
  }

  // All elements should be in reasonable range [-1, 1]
  for (let i = 0; i < E.length; i++) {
    if (E[i] < -1 || E[i] > 1) {
      console.warn(`[Watchdog] Event vector E${i} out of range: ${E[i]}`);
      return false;
    }
  }

  return true;
}

/**
 * Normalize invalid state to safe defaults
 */
export function normalize(action: any): any {
  const normalized = { ...action };

  // Clamp values to valid ranges
  if (normalized.value !== undefined) {
    normalized.value = Math.max(0, normalized.value);
  }

  if (normalized.price !== undefined) {
    normalized.price = Math.max(1, normalized.price);
  }

  if (normalized.amount !== undefined) {
    normalized.amount = Math.max(0, normalized.amount);
  }

  // Clamp heuristic values
  if (normalized.newH && Array.isArray(normalized.newH)) {
    normalized.newH = normalized.newH.map((h: number) => Math.max(0, Math.min(1, h)));
  }

  return normalized;
}

/**
 * Main validation function - Enforces all axioms
 */
export function validate(action: any, graph?: Graph, history?: any[]): ValidationResult {
  // Null check
  if (!action) {
    return { valid: false, reason: 'Action is null or undefined' };
  }

  // A3 - Emergent Complexity
  if (!validateEmergentComplexity(action)) {
    return {
      valid: false,
      reason: 'Action violates emergent complexity rules',
      normalized: normalize(action)
    };
  }

  // A1 - Relational Integrity
  if (graph && !validateRelationalIntegrity(action, graph)) {
    return {
      valid: false,
      reason: 'Action violates relational integrity',
      normalized: normalize(action)
    };
  }

  // A2 - Historical Persistence
  if (history && !validateHistoricalPersistence(action, history)) {
    return {
      valid: false,
      reason: 'Action violates historical persistence patterns',
      normalized: normalize(action)
    };
  }

  // A4 - Watchdog Enforcement (Heuristic Boundaries)
  if (!validateHeuristicBoundaries(action)) {
    return {
      valid: false,
      reason: 'Action violates heuristic boundaries',
      normalized: normalize(action)
    };
  }

  // A5 - Continuous Ingestion (Event Vector)
  if (action.eventVector && !validateEventVector(action.eventVector)) {
    return {
      valid: false,
      reason: 'Invalid event vector structure',
      normalized: normalize(action)
    };
  }

  return { valid: true };
}

/**
 * Batch validation for multiple actions
 */
export function validateBatch(actions: any[], graph?: Graph, history?: any[]): ValidationResult[] {
  return actions.map(action => validate(action, graph, history));
}

/**
 * Get validation statistics
 */
export function getValidationStats(results: ValidationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  normalizable: number;
} {
  return {
    total: results.length,
    valid: results.filter(r => r.valid).length,
    invalid: results.filter(r => !r.valid).length,
    normalizable: results.filter(r => !r.valid && r.normalized).length
  };
}
