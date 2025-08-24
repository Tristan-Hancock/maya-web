// // src/services/openAIservice.ts
import { fetchAuthSession } from "aws-amplify/auth";


  export async function sendMessage(content: string, threadId?: string): Promise<{ threadId: string; message: string }> {
    // 1) Get Cognito ID token
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();
    if (!idToken) throw new Error('Not authenticated');
  
    // 2) Call  backend
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // send the JWT so the server can verify the user
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content }],
        threadId,
      }),
    });
  
    // 3) Handle errors cleanly
    if (!res.ok) {
      let err = 'Request failed';
      try {
        const data = await res.json();
        err = data?.error || err;
      } catch {
        err = await res.text().catch(() => err);
      }
      throw new Error(err);
    }
  
    // 4) Map response to your app’s expected shape
    const data = await res.json(); // expect { text: string, threadId?: string } from server
    return {
      threadId: data.threadId ?? threadId ?? '',
      message: data.text ?? '',
    };
  }
  