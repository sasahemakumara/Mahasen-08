export async function getOllamaResponse(prompt: string, OLLAMA_BASE_URL: string): Promise<string> {
  try {
    console.log('Sending request to Ollama with prompt:', prompt);
    console.log('Using Ollama base URL:', OLLAMA_BASE_URL);
    
    const ollamaUrl = `${OLLAMA_BASE_URL}/api/generate`;
    console.log('Full Ollama URL:', ollamaUrl);

    const response = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama2",
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Ollama API responded with status: ${response.status}. Body: ${errorText}`);
    }

    const text = await response.text();
    console.log('Raw Ollama response:', text);

    try {
      const data = JSON.parse(text);
      if (!data.response) {
        console.error('Unexpected Ollama response format:', data);
        throw new Error('Invalid response format from Ollama');
      }
      return data.response;
    } catch (parseError) {
      console.error('Error parsing Ollama response:', parseError);
      throw new Error('Invalid JSON response from Ollama');
    }
  } catch (error) {
    console.error('Error getting Ollama response:', error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
  }
}