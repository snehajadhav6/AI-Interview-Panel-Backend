const express = require("express");
const cors = require("cors");
const pool= require("./db/db.js");

const interviewRoutes = require("./routes/interviewRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/interview", interviewRoutes);

app.get("/api/interview/result/:token", async (req, res) => {
  const { token } = req.params;

  const link = await pool.query(
    "SELECT * FROM interview_links WHERE token=$1",
    [token]
  );

  if (!link.rows.length) {
    return res.status(400).json({ error: "Invalid token" });
  }

  const userId = link.rows[0].user_id;

  const result = await pool.query(
    `SELECT * FROM interview_results
     WHERE user_id=$1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (!result.rows.length) {
    return res.json({ score: 0 });
  }

  res.json(result.rows[0].feedback);
});

module.exports = app;