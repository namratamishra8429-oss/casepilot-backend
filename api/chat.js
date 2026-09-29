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

Help the user manage real-world cases such as documents,
applications, deadlines, bills, refunds, scholarships,
insurance, travel paperwork, and other life-admin tasks.

Be concise, practical, and action-oriented.
Use the user's case context when it is relevant.

CURRENT CASES:
${caseContext || "No current cases."}

USER MESSAGE:
${userMessage}
`;

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": process.env.GEMINI_API_KEY
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

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data?.error?.message || "Gemini API request failed"
            });
        }

        const reply =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Sorry, I could not generate a response.";

        return res.status(200).json({
            reply: reply
        });

    } catch (error) {
        return res.status(500).json({
            error: "Server error",
            details: error.message
        });
    }
}
