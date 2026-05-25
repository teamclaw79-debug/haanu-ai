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
                const error = await response.json();
                throw new Error(
                  error.message || `Sarvam API error: ${response.statusText}`
                );
              }

              const data = await response.json();
              const content = data.choices?.[0]?.message?.content || "";

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
