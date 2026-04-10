const express = require("express");
const router = express.Router();

const {
  verifyUser,
  generateQuestions,
  submitInterview,
} = require("../controllers/interviewController");

router.post("/verify-user", verifyUser);
router.get("/questions/:token", generateQuestions);
router.post("/submit", submitInterview);

module.exports = router;