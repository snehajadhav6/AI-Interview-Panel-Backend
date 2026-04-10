const axios = require("axios");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

const extractResumeText = async (url) => {
  try {
    console.log("Fetching URL:", url);

    const res = await axios.get(url, {
      responseType: "arraybuffer",
    });

    console.log("Content-Type:", res.headers["content-type"]);

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(res.data),
    });

    const pdf = await loadingTask.promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const pageText = content.items.map((item) => item.str).join(" ");
      text += pageText + "\n";
    }

    console.log("Extracted text length:", text.length);

    return text;
  } catch (err) {
    console.error("Resume Parse Error FULL:", err);
    throw new Error("Failed to parse resume");
  }
};

module.exports = { extractResumeText };