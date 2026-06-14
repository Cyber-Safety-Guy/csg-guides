/**
 * Character validation module for CSG content pack platform limits
 * Validates text against BlueSky (300 chars) and X/Twitter (280 chars) limits
 */

const LIMITS = {
  BLUESKY: 300,
  X: 280
};

/**
 * Validate text against BlueSky's 300 character limit
 * @param {string} text - The text to validate
 * @returns {Object} Validation result with valid, length, limit, overage
 */
function validateBlueSky(text) {
  const length = text.length;
  const limit = LIMITS.BLUESKY;
  const valid = length <= limit;
  const overage = valid ? 0 : length - limit;

  return {
    valid,
    length,
    limit,
    overage
  };
}

/**
 * Validate text against X/Twitter's 280 character limit
 * @param {string} text - The text to validate
 * @returns {Object} Validation result with valid, length, limit, overage
 */
function validateX(text) {
  const length = text.length;
  const limit = LIMITS.X;
  const valid = length <= limit;
  const overage = valid ? 0 : length - limit;

  return {
    valid,
    length,
    limit,
    overage
  };
}

/**
 * Validate all platform character limits in a content pack JSON
 * @param {Object} json - The complete content pack JSON object
 * @returns {Object} Validation results for all platforms
 */
function validateAll(json) {
  const results = {
    bluesky: [],
    x: null,
    allValid: true
  };

  // Validate BlueSky thread (array of posts)
  if (json.bluesky_thread && Array.isArray(json.bluesky_thread)) {
    json.bluesky_thread.forEach((post, index) => {
      const validation = validateBlueSky(post.text);
      results.bluesky.push({
        post: index + 1,
        valid: validation.valid,
        length: validation.length,
        limit: validation.limit,
        overage: validation.overage
      });

      if (!validation.valid) {
        results.allValid = false;
      }
    });
  }

  // Validate X post
  if (json.x_post && json.x_post.text) {
    const validation = validateX(json.x_post.text);
    results.x = {
      valid: validation.valid,
      length: validation.length,
      limit: validation.limit,
      overage: validation.overage
    };

    if (!validation.valid) {
      results.allValid = false;
    }
  }

  return results;
}

module.exports = {
  validateBlueSky,
  validateX,
  validateAll,
  LIMITS
};
