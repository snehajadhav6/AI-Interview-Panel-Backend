const { OpenRouter } = require("@openrouter/sdk");

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const callAI = async (messages) => {
  try {
    const completion = await openRouter.chat.send({
      chatRequest: {   // ✅ FIX HERE
        model: "openai/gpt-4o-mini", // also fix model
        messages: messages,
      },
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("AI ERROR:", err);
    throw new Error("AI request failed");
  }
};

module.exports = { callAI };