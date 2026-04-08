import { H, updateHeuristics } from "../arelogic/heuristic.engine";

export function handleGetHeuristics(): { H: number[] } {
  return { H: [...H] };
}

export function handlePostHeuristics(body: {
  E?: number[];
  H?: number[];
}): { H: number[]; message: string } | { error: string } {
  const { E, H: newH } = body;

  if (newH && Array.isArray(newH) && newH.length === 13) {
    for (let i = 0; i < 13; i++) {
      H[i] = newH[i];
    }
    return { H: [...H], message: "Heuristics updated directly" };
  } else if (E && Array.isArray(E) && E.length === 13) {
    const updatedH = updateHeuristics(E);
    return { H: updatedH, message: "Heuristics updated via event vector" };
  }

  return {
    error:
      "Invalid request body. Expected { E: number[13] } or { H: number[13] }",
  };
}
