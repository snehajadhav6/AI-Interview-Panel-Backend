const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Invalid JSON from AI:", text);
    return null;
  }
};

module.exports = safeJsonParse;