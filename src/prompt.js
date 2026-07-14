export const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    detected_language: { type: "string" },
    summary: { type: "string" },
    comments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string" },
          line: { type: "number" },
          message: { type: "string" },
          fix: { type: "string" },
        },
      },
    },
    corrected_code: { type: "string" },
  },
};

export const FOCUS_AREA_OPTIONS = [
  { id: "security",       label: "Security",        description: "Prioritize vulnerabilities, injections, auth issues" },
  { id: "performance",    label: "Performance",     description: "Focus on speed, memory, algorithm efficiency" },
  { id: "readability",    label: "Readability",     description: "Emphasize naming, structure, documentation" },
  { id: "error_handling", label: "Error Handling",  description: "Highlight missing try/catch, null checks, edge cases" },
  { id: "best_practices", label: "Best Practices",  description: "Modern language features, patterns, standards" },
  { id: "testing",        label: "Testability",     description: "Suggest how code can be made more testable" },
];

export function pickReviewModel(code) {
  const lines = (code || "").split("\n").length;
  if (lines > 400) return "claude_sonnet_4_6";
  return undefined;
}

export function buildReviewPrompt(code, language = "auto", filename = null, settings = {}) {
  const langLabel = language === "auto" ? "auto-detect the language" : language;
  const focusAreas = settings.focusAreas || [];
  const customRules = settings.customRules || "";
  const strictMode = settings.strictMode || false;

  const focusLines = focusAreas.length > 0
    ? `\n\nPRIORITY FOCUS AREAS (give extra weight to these):\n${focusAreas.map(id => {
        const opt = FOCUS_AREA_OPTIONS.find(o => o.id === id);
        return opt ? `- ${opt.label}: ${opt.description}` : `- ${id}`;
      }).join("\n")}`
    : "";

  const customLines = customRules.trim()
    ? `\n\nCUSTOM REVIEW RULES (from user, follow strictly):\n${customRules.trim()}`
    : "";

  const strictLine = strictMode
    ? "\n\nSTRICT MODE: Be thorough and unforgiving. Flag every issue, even minor style problems."
    : "";

  return `You are an expert code reviewer for ALL scripting and programming languages. Analyze the following script and provide a detailed review.

Language: ${langLabel}${filename ? `\nFile: ${filename}` : ""}${focusLines}${customLines}${strictLine}

Script:
\`\`\`
${code}
\`\`\`

Provide your review as a JSON object with this exact structure:
- "detected_language": the language you detected (string)
- "summary": a 2-3 sentence overall assessment of the code quality
- "comments": an array of review comments, each with:
  - "severity": one of "critical", "warning", "suggestion", "performance", "security", "good"
  - "line": the line number (number or null if general)
  - "message": a clear explanation of the issue or suggestion
  - "fix": a short code fix or recommendation (string or null)
- "corrected_code": the full corrected version of the script`;
}

export function buildSecurityPrompt(code, language = "auto", filename = null) {
  return buildReviewPrompt(code, language, filename, {
    focusAreas: ["security"],
    customRules: `SECURITY AUDIT MODE: Focus exclusively on security vulnerabilities.
Check for: command injection, SQL injection, XSS, hardcoded credentials/secrets/API keys,
unsafe permissions (chmod 777 etc), path traversal, insecure deserialization,
improper authentication/authorization, use of deprecated insecure functions,
unvalidated input, sensitive data exposure, insecure dependencies, and privilege escalation risks.
Rate every finding by CVSS severity. Be exhaustive — missing a vulnerability is worse than a false positive.`,
  });
}
