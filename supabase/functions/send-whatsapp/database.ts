import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export async function storeConversation(supabase: any, userId: string, userName: string, userMessage: string, aiResponse: string) {
  try {
    // Store the conversation in the messages table
    const { error: messageError } = await supabase
      .from('messages')
      .insert([
        {
          sender_name: userName,
          sender_number: userId,
          content: userMessage,
          status: 'received'
        },
        {
          sender_name: 'AI Assistant',
          sender_number: 'system',
          content: aiResponse,
          status: 'sent'
        }
      ]);

    if (messageError) {
      console.error('Error storing messages:', messageError);
      throw messageError;
    }

    console.log('Successfully stored conversation in database');
  } catch (error) {
    console.error('Error in storeConversation:', error);
    throw error;
  }
}