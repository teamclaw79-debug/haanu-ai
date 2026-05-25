let sarvamInstance: any = null;

export async function getZAI() {
  if (!sarvamInstance) {
    const apiKey = process.env.SARVAM_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        "SARVAM_API_KEY environment variable is not set. Please add it to your Vercel environment variables."
      );
    }
    
    sarvamInstance = {
      apiKey,
      chat: {
        completions: {
          create: async (options: any) => {
            const messages = options.messages || [];
            
            // Convert messages to Sarvam format
            const sarvamMessages = messages.map((msg: any) => ({
              role: msg.role === "assistant" ? "assistant" : msg.role === "system" ? "system" : "user",
              content: msg.content,
            }));
            
            try {
              const response = await fetch("https://api.sarvam.ai/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "api-subscription-key": apiKey,
                },
                body: JSON.stringify({
                  model: "Meta-Llama-3-8B-Instruct",
                  messages: sarvamMessages,
                  temperature: 0.7,
                  top_p: 0.9,
                  max_tokens: 2048,
                }),
              });

              if (!response.ok) {
                let errorData: any = {};
                try {
                  errorData = await response.json();
                } catch {
                  errorData = { text: await response.text() };
                }
                const errorMsg = errorData.message || errorData.error || JSON.stringify(errorData);
                throw new Error(
                  `Sarvam API error (${response.status}): ${errorMsg}`
                );
              }

              const data = await response.json();
              const content = data.choices?.[0]?.message?.content || "";

              if (!content) {
                throw new Error("No content in Sarvam API response");
              }

              return {
                choices: [
                  {
                    message: {
                      content,
                    },
                  },
                ],
              };
            } catch (error) {
              console.error("[Sarvam AI] Error:", error);
              throw error;
            }
          },
        },
      },
    };
  }
  
  return sarvamInstance;
}
