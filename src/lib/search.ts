// Scoring constants - higher values indicate better matches
const SCORING_WEIGHTS = {
  PERFECT_MATCH: 1.0, // Consecutive character matches
  WORD_BOUNDARY: 0.9, // Match after space or hyphen
  SPECIAL_CHAR_BOUNDARY: 0.8, // Match after special characters
  MIDDLE_MATCH: 0.17, // Match in middle of word (heavily penalized)
  INCOMPLETE_MATCH: 0.99, // Query fully matched but text has remaining chars
  GAP_PENALTY: 0.999, // Penalty multiplier for gaps (per gap: 0.999^n)
  CASE_MISMATCH_PENALTY: 0.9999, // Small penalty for case differences
  MIN_SCORE_THRESHOLD: 0.1, // Minimum viable score threshold
} as const;

// Regular expressions for boundary detection
const SPECIAL_CHARS_REGEX = /[\\\/_+.#"@\[\(\{&]/;
const SPECIAL_CHARS_GLOBAL_REGEX = /[\\\/_+.#"@\[\(\{&]/g;
const WORD_BOUNDARY_REGEX = /[\s-]/;
const WORD_BOUNDARY_GLOBAL_REGEX = /[\s-]/g;

/**
 * Configuration options for search behavior
 */
export interface SearchOptions<T> {
  /** Function to extract searchable text from items */
  getText?: (item: T) => string;
  /** Function to extract keywords/aliases for enhanced matching */
  getKeywords?: (item: T) => string[];
  /** Custom scoring weights to override defaults */
  weights?: Partial<typeof SCORING_WEIGHTS>;
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum score threshold for results */
  minScore?: number;
  /** Case sensitive matching */
  caseSensitive?: boolean;
}

/**
 * Represents a search result with scoring information
 */
export interface SearchResult<T> {
  /** The original item */
  item: T;
  /** Match score (0-1, higher is better) */
  score: number;
  /** The text that was matched */
  matchedText: string;
  /** Keywords that contributed to the match */
  matchedKeywords: string[];
}

/**
 * Represents highlighted text with match positions
 */
export interface HighlightedText {
  /** Original text */
  text: string;
  /** Array of {start, end, isMatch} segments */
  segments: Array<{
    text: string;
    start: number;
    end: number;
    isMatch: boolean;
  }>;
}


export interface SearchableItem {
  [key: string]: unknown;
}

type MemoCache = Record<string, number>;

/**
 * Normalizes text for case-insensitive matching
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(WORD_BOUNDARY_GLOBAL_REGEX, ' ');
}


function calculateMatchScore(
  originalText: string,
  query: string,
  lowerText: string,
  lowerQuery: string,
  textIndex: number,
  queryIndex: number,
  memoCache: MemoCache,
  weights: typeof SCORING_WEIGHTS
): number {
  // Base case: if we've matched the entire query
  if (queryIndex === query.length) {
    return textIndex === originalText.length ? weights.PERFECT_MATCH : weights.INCOMPLETE_MATCH;
  }

  // Memoization key
  const cacheKey = `${textIndex},${queryIndex}`;
  if (memoCache[cacheKey] !== undefined) {
    return memoCache[cacheKey];
  }

  const queryChar = lowerQuery.charAt(queryIndex);
  let matchPosition = lowerText.indexOf(queryChar, textIndex);
  let bestScore = 0;

  // Try all possible positions where the current query character can match
  while (matchPosition >= 0) {
    // Recursively calculate score for the rest of the query
    let score = calculateMatchScore(originalText, query, lowerText, lowerQuery, matchPosition + 1, queryIndex + 1, memoCache, weights);

    if (score > bestScore) {
      // Apply scoring rules based on match position
      if (matchPosition === textIndex) {
        // Consecutive match - best score
        score *= weights.PERFECT_MATCH;
      } else if (SPECIAL_CHARS_REGEX.test(originalText.charAt(matchPosition - 1))) {
        // Match after special character
        score *= weights.SPECIAL_CHAR_BOUNDARY;
        // Apply gap penalty for skipped special characters
        const skippedSpecialChars = originalText.slice(textIndex, matchPosition - 1).match(SPECIAL_CHARS_GLOBAL_REGEX);
        if (skippedSpecialChars && textIndex > 0) {
          score *= Math.pow(weights.GAP_PENALTY, skippedSpecialChars.length);
        }
      } else if (WORD_BOUNDARY_REGEX.test(originalText.charAt(matchPosition - 1))) {
        // Match after word boundary (space or hyphen)
        score *= weights.WORD_BOUNDARY;
        // Apply gap penalty for skipped word boundaries
        const skippedWordBoundaries = originalText.slice(textIndex, matchPosition - 1).match(WORD_BOUNDARY_GLOBAL_REGEX);
        if (skippedWordBoundaries && textIndex > 0) {
          score *= Math.pow(weights.GAP_PENALTY, skippedWordBoundaries.length);
        }
      } else {
        // Match in middle of word
        score *= weights.MIDDLE_MATCH;
        if (textIndex > 0) {
          // Apply gap penalty for distance
          score *= Math.pow(weights.GAP_PENALTY, matchPosition - textIndex);
        }
      }

      // Case mismatch penalty
      if (originalText.charAt(matchPosition) !== query.charAt(queryIndex)) {
        score *= weights.CASE_MISMATCH_PENALTY;
      }
    }

    // Special handling for transpositions and duplicate characters
    if (
      (score < weights.MIN_SCORE_THRESHOLD && lowerText.charAt(matchPosition - 1) === lowerQuery.charAt(queryIndex + 1)) ||
      (lowerQuery.charAt(queryIndex + 1) === lowerQuery.charAt(queryIndex) && lowerText.charAt(matchPosition - 1) !== lowerQuery.charAt(queryIndex))
    ) {
      const transpositionScore = calculateMatchScore(originalText, query, lowerText, lowerQuery, matchPosition + 1, queryIndex + 2, memoCache, weights);
      if (transpositionScore * weights.MIN_SCORE_THRESHOLD > score) {
        score = transpositionScore * weights.MIN_SCORE_THRESHOLD;
      }
    }

    if (score > bestScore) {
      bestScore = score;
    }

    // Find next possible match position
    matchPosition = lowerText.indexOf(queryChar, matchPosition + 1);
  }

  // Cache and return result
  memoCache[cacheKey] = bestScore;
  return bestScore;
}

/**
 * Calculate match score between text and query, including keywords
 */
export function scoreMatch(
  text: string, 
  query: string, 
  keywords: string[] = [],
  customWeights?: Partial<typeof SCORING_WEIGHTS>
): number {
  if (!query.trim()) return 0;
  if (!text.trim()) return 0;

  // Combine text with keywords for enhanced matching
  const searchableText = keywords.length > 0 ? `${text} ${keywords.join(' ')}` : text;

  const weights = { ...SCORING_WEIGHTS, ...customWeights };
  const normalizedSearchableText = normalizeText(searchableText);
  const normalizedQuery = normalizeText(query);

  return calculateMatchScore(searchableText, query, normalizedSearchableText, normalizedQuery, 0, 0, {}, weights);
}

/**
 * Default text extraction function for objects
 */
function defaultGetText<T>(item: T): string {
  if (typeof item === 'string') return item;
  if (typeof item === 'object' && item !== null) {
    // Try common text properties
    const obj = item as Record<string, unknown>;
    return String(obj.title || obj.name || obj.label || obj.text || JSON.stringify(item));
  }
  return String(item);
}

/**
 * Default keyword extraction function
 */
function defaultGetKeywords<T>(item: T): string[] {
  if (typeof item === 'object' && item !== null) {
    const obj = item as Record<string, unknown>;
    const keywords: string[] = [];

    // Extract from common keyword/alias properties
    if (obj.keywords && Array.isArray(obj.keywords)) {
      keywords.push(...obj.keywords.map(String));
    }
    if (obj.alias && typeof obj.alias === 'string') {
      keywords.push(obj.alias);
    }
    if (obj.aliases && Array.isArray(obj.aliases)) {
      keywords.push(...obj.aliases.map(String));
    }

    return keywords;
  }
  return [];
}

/**
 * Search through an array of items using fuzzy matching
 */
export function searchItems<T extends SearchableItem>(items: T[], query: string, options: SearchOptions<T> = {}): SearchResult<T>[] {
  const { getText = defaultGetText, getKeywords = defaultGetKeywords, weights = {}, limit = 100, minScore = 0.01, caseSensitive = false } = options;

  if (!query.trim()) return [];

  const searchQuery = caseSensitive ? query : query.toLowerCase();

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    const text = getText(item);
    const keywords = getKeywords(item);

    if (!text) continue;

    const searchText = caseSensitive ? text : text.toLowerCase();
    const score = scoreMatch(searchText, searchQuery, keywords, weights);

    if (score >= minScore) {
      results.push({
        item,
        score,
        matchedText: text,
        matchedKeywords: keywords.filter(keyword => 
          scoreMatch(caseSensitive ? keyword : keyword.toLowerCase(), searchQuery, [], weights) > 0
        ),
      });
    }
  }

  // Sort by score (highest first) and limit results
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Generate highlighted text showing match positions
 * This is a simplified implementation - can be enhanced for complex highlighting
 */
export function highlightMatch(text: string, query: string): HighlightedText {
  if (!query.trim() || !text.trim()) {
    return {
      text,
      segments: [{ text, start: 0, end: text.length, isMatch: false }],
    };
  }

  const segments: HighlightedText['segments'] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let textIndex = 0;
  let queryIndex = 0;

  // Simple greedy matching for highlighting
  // This could be enhanced to use the same algorithm as scoring for more accurate highlights
  while (textIndex < text.length && queryIndex < query.length) {
    const queryChar = lowerQuery[queryIndex];
    const matchIndex = lowerText.indexOf(queryChar, textIndex);

    if (matchIndex === -1) break;

    // Add non-matching segment before the match
    if (matchIndex > textIndex) {
      segments.push({
        text: text.slice(textIndex, matchIndex),
        start: textIndex,
        end: matchIndex,
        isMatch: false,
      });
    }

    // Add matching segment
    segments.push({
      text: text.slice(matchIndex, matchIndex + 1),
      start: matchIndex,
      end: matchIndex + 1,
      isMatch: true,
    });

    textIndex = matchIndex + 1;
    queryIndex++;
  }

  // Add remaining non-matching text
  if (textIndex < text.length) {
    segments.push({
      text: text.slice(textIndex),
      start: textIndex,
      end: text.length,
      isMatch: false,
    });
  }

  return { text, segments };
}

