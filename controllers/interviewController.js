const pool = require("../db/db");
const { callAI } = require("../services/aiService");
const {
  resumeAnalysisPrompt,
  questionPrompt,
  evaluationPrompt,
} = require("../services/aiPrompts");

const safeJsonParse = require("../utils/safeJson");

// VERIFY USER
exports.verifyUser = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        error: "Email is required"
      });
    }

    const link = await pool.query(
      `
      SELECT il.*
      FROM interview_links il
      JOIN users u ON il.user_id = u.id
      WHERE u.email = $1
      AND il.is_used = false
      AND il.expires_at > NOW()
      ORDER BY il.expires_at DESC
      LIMIT 1
      `,
      [email]
    );

    if (!link.rows.length) {
      return res.status(400).json({
        error: "No valid interview link found"
      });
    }

    return res.json({
      token: link.rows[0].token
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error"
    });
  }
};

// GENERATE QUESTIONS
exports.generateQuestions = async (req, res) => {
  const { token } = req.params;

  try {
    // 1. Validate token
    const link = await pool.query(
      "SELECT * FROM interview_links WHERE token=$1",
      [token]
    );

    if (!link.rows.length) {
      return res.status(400).json({ error: "Invalid token" });
    }

    const linkData = link.rows[0];

    if (linkData.is_used) {
      return res.status(400).json({ error: "Link already used" });
    }

    if (new Date(linkData.expires_at) < new Date()) {
      return res.status(400).json({ error: "Link expired" });
    }

    const userId = linkData.user_id;

    // 2. Get latest resume from applications table
    const application = await pool.query(
      `SELECT resume_url 
       FROM applications 
       WHERE user_id = $1 
       ORDER BY applied_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (!application.rows.length || !application.rows[0].resume_url) {
      return res.status(400).json({
        error: "No resume found for user in applications",
      });
    }

    const resumeUrl = application.rows[0].resume_url;

    // Optional safety check
    if (!resumeUrl.startsWith("http")) {
      return res.status(400).json({
        error: "Invalid resume URL format",
      });
    }

    // 3. Extract resume text
    const resumeText = resumeUrl;

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({
        error: "Resume content is too short or unreadable",
      });
    }

    // 4. Resume Analysis (AI)
    const rawResume = await callAI(resumeAnalysisPrompt(resumeText));
    const resumeData = safeJsonParse(rawResume);

    if (!resumeData) {
      console.error("Resume AI Raw:", rawResume);
      return res.status(500).json({
        error: "AI resume parsing failed",
      });
    }

    // 5. Generate Questions (AI)
    const rawQuestions = await callAI(questionPrompt(resumeData));
    const questions = safeJsonParse(rawQuestions);

    if (!questions) {
      console.error("Questions AI Raw:", rawQuestions);
      return res.status(500).json({
        error: "AI question generation failed",
      });
    }

    // 6. Send response
    res.json(questions);

  } catch (err) {
    console.error("Generate Questions Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// SUBMIT INTERVIEW
exports.submitInterview = async (req, res) => {
  const { token, answers } = req.body;

  try {
    const rawEval = await callAI(evaluationPrompt(answers));
    const evaluation = safeJsonParse(rawEval);

    if (!evaluation)
      return res.status(500).json({ error: "AI evaluation failed" });

    const link = await pool.query(
      "SELECT * FROM interview_links WHERE token=$1",
      [token]
    );

    const userId = link.rows[0].user_id;

    await pool.query(
      "INSERT INTO interview_results(user_id, score, feedback) VALUES($1,$2,$3)",
      [
        userId,
        evaluation.overall_score,
        JSON.stringify(evaluation),
      ]
    );

    await pool.query(
      "UPDATE interview_links SET is_used=true WHERE token=$1",
      [token]
    );

    res.json({
      message: "Interview submitted",
      evaluation,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};