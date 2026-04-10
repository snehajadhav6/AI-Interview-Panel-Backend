const safeJsonParse = (text) => {
  try {
    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    return JSON.parse(cleanText.trim());
  } catch (err) {
    console.error("Invalid JSON from AI:", text);
    return null;
  }
};

module.exports = safeJsonParse;