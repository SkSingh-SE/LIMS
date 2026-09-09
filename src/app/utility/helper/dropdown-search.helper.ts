/**
 * Universal Dropdown Search & Relevance Ranking Helper
 * 
 * Features:
 * 1. Full word / exact matches ranked at top (Score 6,000 - 10,000)
 * 2. Word prefix matches (Score 5,000)
 * 3. Substring matches (Score 4,000)
 * 4. Multi-token matches with characters in between (Score 3,000 - 3,500)
 * 5. Character sequence / fuzzy matches containing chars in between (Score 1,000 - 2,000)
 * 6. Tree / hierarchical group structure preservation (Headers + Children)
 */

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculates a relevance score for a string candidate against the search query.
 */
export function getDropdownSearchScore(candidate: string, query: string): number {
  if (!candidate || !query) return 0;

  const text = candidate.trim().toLowerCase();
  const q = query.trim().toLowerCase();

  if (!text || !q) return 0;

  // 1. Exact match (highest priority)
  if (text === q) {
    return 10000;
  }

  // 2. Starts with query
  if (text.startsWith(q)) {
    const diff = Math.max(0, text.length - q.length);
    return 8000 + Math.max(0, 500 - diff * 2);
  }

  // 3. Full word match (whole word bounded by space/punctuation/start/end)
  const escapedQ = escapeRegex(q);
  const wordBoundaryRegex = new RegExp(`(^|[\\s,._\\-/():;\\[\\]★])` + escapedQ + `([\\s,._\\-/():;\\[\\]★]|$)`, 'i');
  if (wordBoundaryRegex.test(text)) {
    const diff = Math.max(0, text.length - q.length);
    return 6000 + Math.max(0, 500 - diff * 2);
  }

  // 4. Word-Initials / Acronym match (e.g. "y s" or "ys" matching "Yield Strength")
  const words = text.split(/[^a-zA-Z0-9★]+/).filter(Boolean);
  const tokens = q.split(/[^a-zA-Z0-9★]+/).filter(Boolean);

  if (tokens.length >= 2 && words.length >= tokens.length) {
    // Multi-token initials: e.g. "y s" matching "Yield Strength"
    let wordIdx = 0;
    let matchCount = 0;
    for (const token of tokens) {
      while (wordIdx < words.length) {
        if (words[wordIdx].startsWith(token)) {
          matchCount++;
          wordIdx++;
          break;
        }
        wordIdx++;
      }
    }
    if (matchCount === tokens.length) {
      const diff = Math.max(0, words.length - tokens.length);
      return 7500 + Math.max(0, 300 - diff * 50); // High priority for intentional initials
    }
  } else if (tokens.length === 1 && q.length >= 2 && words.length >= q.length) {
    // Single-word initials: e.g. "ys" matching "Yield Strength"
    const initials = words.map(w => w[0]).join('');
    if (initials === q) {
      return 7200;
    }
    if (initials.startsWith(q)) {
      return 7000;
    }
    if (initials.includes(q)) {
      return 6800;
    }
  }

  // 5. Any word starts with query (e.g. "hard" matches "Rockwell Hardness")
  const wordStartRegex = new RegExp(`(^|[\\s,._\\-/():;\\[\\]★])` + escapedQ, 'i');
  if (wordStartRegex.test(text)) {
    const idx = text.search(wordStartRegex);
    return 5000 + Math.max(0, 400 - idx * 5);
  }

  // 6. Continuous substring match
  const substrIdx = text.indexOf(q);
  if (substrIdx !== -1) {
    return 4000 + Math.max(0, 400 - substrIdx * 5);
  }

  // 7. Multi-token match (all words in search query present with chars in between)
  if (tokens.length > 1) {
    let allFound = true;
    let inOrder = true;
    let lastPos = -1;

    for (const token of tokens) {
      const pos = text.indexOf(token);
      if (pos === -1) {
        allFound = false;
        break;
      }
      if (pos < lastPos) {
        inOrder = false;
      }
      lastPos = pos;
    }

    if (allFound) {
      return inOrder ? 3500 : 3000;
    }
  }

  // 7. Character sequence / fuzzy match (characters appear in order with characters in between)
  // e.g. "astm18" matches "ASTM E18" or "v32026" matches "v3 - 2026"
  let qIdx = 0;
  let tIdx = 0;
  let matchedChars = 0;
  let gapCount = 0;
  let firstMatchPos = -1;

  while (qIdx < q.length && tIdx < text.length) {
    if (q[qIdx] === text[tIdx]) {
      if (firstMatchPos === -1) firstMatchPos = tIdx;
      qIdx++;
      matchedChars++;
    } else if (firstMatchPos !== -1) {
      gapCount++;
    }
    tIdx++;
  }

  if (matchedChars === q.length && q.length >= 2) {
    return Math.max(1000, 2500 - gapCount * 10 - firstMatchPos * 15);
  }

  return 0;
}

/**
 * Extracts searchable text fields from a dropdown item.
 */
export function extractItemSearchableTexts(item: any): string[] {
  if (!item) return [];
  const list: string[] = [];

  if (item.name) list.push(String(item.name));
  if (item.displayTitle) list.push(String(item.displayTitle));
  if (item.title) list.push(String(item.title));
  if (item.code) list.push(String(item.code));

  if (item.additionalValues && typeof item.additionalValues === 'object') {
    const av = item.additionalValues;
    if (av['fullDisplayName']) list.push(String(av['fullDisplayName']));
    if (av['displayTitle']) list.push(String(av['displayTitle']));
    if (av['PureName']) list.push(String(av['PureName']));
    if (av['testMethodStandard']) list.push(String(av['testMethodStandard']));
    if (av['testMethodSpecificationName']) list.push(String(av['testMethodSpecificationName']));
    if (av['versionName']) list.push(String(av['versionName']));
    if (av['year']) list.push(String(av['year']));
    if (av['standardOrgName']) list.push(String(av['standardOrgName']));
    if (av['Code']) list.push(String(av['Code']));
    if (av['Symbol']) list.push(String(av['Symbol']));
    if (av['ParameterType']) list.push(String(av['ParameterType']));
  }

  return list;
}

/**
 * Computes maximum relevance score for a dropdown item.
 */
export function scoreDropdownItem(item: any, searchTerm: string): number {
  if (!item || !searchTerm) return 0;
  const texts = extractItemSearchableTexts(item);
  let bestScore = 0;

  for (const text of texts) {
    const score = getDropdownSearchScore(text, searchTerm);
    if (score > bestScore) {
      bestScore = score;
    }
  }

  // Also check combined string for multi-token cross-field matching
  if (texts.length > 1) {
    const combined = texts.join(' ');
    const combinedScore = getDropdownSearchScore(combined, searchTerm);
    if (combinedScore > bestScore) {
      bestScore = combinedScore;
    }
  }

  return bestScore;
}

/**
 * Ranks and sorts dropdown items according to search relevance.
 * Supports both flat items and hierarchical grouped items (maintaining header/child relationships).
 */
export function rankAndFilterDropdownItems(items: any[], searchTerm: string): any[] {
  if (!items || !items.length) return [];
  if (!searchTerm || !searchTerm.trim()) return [...items];

  const term = searchTerm.trim();
  const hasTreeNodes = items.some(x => x && (x.isHeader || x.level !== undefined));

  if (!hasTreeNodes) {
    // Flat dropdown ranking
    const scored = items.map((item, originalIndex) => ({
      item,
      score: scoreDropdownItem(item, term),
      originalIndex,
    }));

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.originalIndex - b.originalIndex;
    });

    return scored.map(s => s.item);
  }

  // Hierarchical tree dropdown ranking
  // Group structure: Level 0 (Org) -> Level 1 (Spec/Group) -> Level 2 (Versions/Leaves)
  type LeafItem = { item: any; score: number };
  type SpecGroup = { header?: any; headerScore: number; leaves: LeafItem[]; maxScore: number };
  type OrgGroup = { header?: any; headerScore: number; specGroups: SpecGroup[]; maxScore: number };

  const orgGroups: OrgGroup[] = [];
  let currentOrg: OrgGroup | null = null;
  let currentSpec: SpecGroup | null = null;

  for (const item of items) {
    if (!item) continue;
    const score = scoreDropdownItem(item, term);

    if (item.isHeader && (item.level === 0 || item.level === undefined)) {
      currentOrg = {
        header: item,
        headerScore: score,
        specGroups: [],
        maxScore: score,
      };
      orgGroups.push(currentOrg);
      currentSpec = null;
    } else if (item.isHeader && item.level === 1) {
      if (!currentOrg) {
        currentOrg = { header: undefined, headerScore: 0, specGroups: [], maxScore: 0 };
        orgGroups.push(currentOrg);
      }
      currentSpec = {
        header: item,
        headerScore: score,
        leaves: [],
        maxScore: score,
      };
      currentOrg.specGroups.push(currentSpec);
    } else {
      // Selectable leaf
      if (!currentOrg) {
        currentOrg = { header: undefined, headerScore: 0, specGroups: [], maxScore: 0 };
        orgGroups.push(currentOrg);
      }
      if (!currentSpec) {
        currentSpec = { header: undefined, headerScore: 0, leaves: [], maxScore: 0 };
        currentOrg.specGroups.push(currentSpec);
      }
      currentSpec.leaves.push({ item, score });
      if (score > currentSpec.maxScore) {
        currentSpec.maxScore = score;
      }
      if (score > currentOrg.maxScore) {
        currentOrg.maxScore = score;
      }
    }
  }

  // Sort spec groups and leaves inside each org
  for (const org of orgGroups) {
    for (const spec of org.specGroups) {
      // Sort leaves within spec: highest score first
      spec.leaves.sort((a, b) => b.score - a.score);
    }

    // Sort spec groups within org: highest maxScore first
    org.specGroups.sort((a, b) => b.maxScore - a.maxScore);

    // Update org maxScore
    for (const spec of org.specGroups) {
      if (spec.maxScore > org.maxScore) {
        org.maxScore = spec.maxScore;
      }
    }
  }

  // Sort org groups: highest maxScore first
  orgGroups.sort((a, b) => b.maxScore - a.maxScore);

  // Flatten back to array
  const result: any[] = [];
  for (const org of orgGroups) {
    if (org.header) {
      result.push(org.header);
    }
    for (const spec of org.specGroups) {
      if (spec.header) {
        result.push(spec.header);
      }
      for (const leaf of spec.leaves) {
        result.push(leaf.item);
      }
    }
  }

  return result;
}
