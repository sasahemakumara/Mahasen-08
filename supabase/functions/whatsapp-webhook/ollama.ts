export async function getOllamaResponse(prompt: string, context: string = '', OLLAMA_BASE_URL: string): Promise<string> {
  try {
    if (!OLLAMA_BASE_URL) {
      throw new Error('OLLAMA_BASE_URL is not defined');
    }

    // Ensure the base URL is properly formatted
    const baseUrl = OLLAMA_BASE_URL.endsWith('/') ? OLLAMA_BASE_URL : `${OLLAMA_BASE_URL}/`;
    const ollamaUrl = new URL('api/generate', baseUrl).toString();
    
    console.log('Using Ollama base URL:', OLLAMA_BASE_URL);
    console.log('Full Ollama URL:', ollamaUrl);

    const systemPrompt = context ? 
      `You are a helpful AI assistant with access to a knowledge base. ${context}` :
      'You are a helpful AI assistant. Please provide a general response if no specific information is available.';

    console.log('Sending request to Ollama with prompt:', prompt);

    const response = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama2:latest",
        prompt: `${systemPrompt}\n\nUser Question: ${prompt}\n\nPlease provide your response:`,
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