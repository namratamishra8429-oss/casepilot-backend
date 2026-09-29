export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {
        const { userMessage, caseContext } = req.body || {};

        if (!userMessage) {
            return res.status(400).json({
                error: "userMessage is required"
            });
        }

        const prompt = `
You are CasePilot AI, an intelligent life-admin assistant.

Help the user manage real-world cases such as:
documents, applications, deadlines, bills, refunds, scholarships,
insurance, travel paperwork, and other life-admin tasks.

Be concise, practical, friendly, and action-oriented.

Use the user's current case context when relevant.

You can help with:
- understanding cases
- deadlines
- next actions
- document requirements
- drafting replies
- planning steps
- reminders
- follow-ups
- prioritization
- completing real-world tasks

If the user asks about a specific case, use the case context below.

CURRENT CASE CONTEXT:
${caseContext || "No active cases."}

USER MESSAGE:
${userMessage}

Give a useful answer that helps the user take the next real-world action.
`;

        // -----------------------------------------
        // 1. TRY GEMINI FIRST
        // -----------------------------------------

        if (process.env.GEMINI_API_KEY) {
            try {
                const geminiResponse = await fetch(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
                    process.env.GEMINI_API_KEY,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        {
                                            text: prompt
                                        }
                                    ]
                                }
                            ]
                        })
                    }
                );

                const geminiData = await geminiResponse.json();

                if (geminiResponse.ok) {
                    const geminiReply =
                        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (geminiReply) {
                        return res.status(200).json({
                            reply: geminiReply,
                            provider: "gemini"
                        });
                    }
                }
            } catch (geminiError) {
                console.error("Gemini failed:", geminiError);
            }
        }

        // -----------------------------------------
        // 2. GEMINI FAILED -> TRY GROK
        // -----------------------------------------

        if (process.env.XAI_API_KEY) {
            try {
                const grokResponse = await fetch(
                    "https://api.x.ai/v1/chat/completions",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization":
                                "Bearer " + process.env.XAI_API_KEY
                        },
                        body: JSON.stringify({
                            model: "grok-4.7",
                            messages: [
                                {
                                    role: "system",
                                    content:
                                        "You are CasePilot AI, an intelligent life-admin assistant. Be concise, practical, friendly, and action-oriented."
                                },
                                {
                                    role: "user",
                                    content: prompt
                                }
                            ]
                        })
                    }
                );

                const grokData = await grokResponse.json();

                if (grokResponse.ok) {
                    const grokReply =
                        grokData?.choices?.[0]?.message?.content;

                    if (grokReply) {
                        return res.status(200).json({
                            reply: grokReply,
                            provider: "grok"
                        });
                    }
                }
            } catch (grokError) {
                console.error("Grok failed:", grokError);
            }
        }

        // -----------------------------------------
        // 3. BOTH AI PROVIDERS FAILED
        // -----------------------------------------

        return res.status(503).json({
            reply:
                "CasePilot AI is temporarily unavailable. Please try again in a moment."
        });

    } catch (error) {
        console.error("CasePilot API error:", error);

        return res.status(500).json({
            reply:
                "Something went wrong while connecting to CasePilot AI."
        });
    }
}
