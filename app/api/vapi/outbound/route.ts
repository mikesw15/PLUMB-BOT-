import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { phoneNumber, assistantId, chatHistory } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const vapiPrivateKey = process.env.VAPI_PRIVATE_KEY;
    const vapiAssistantId = assistantId || process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

    if (!vapiPrivateKey || !vapiAssistantId) {
      return NextResponse.json({ error: 'Vapi is not fully configured' }, { status: 500 });
    }

    let assistantPayload: any = { assistantId: vapiAssistantId };

    if (chatHistory) {
      try {
        const getAssistant = await fetch(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
          headers: { 'Authorization': `Bearer ${vapiPrivateKey}` }
        });
        
        if (getAssistant.ok) {
          const assistantData = await getAssistant.json();
          
          // Remove read-only fields to use as an inline assistant
          delete assistantData.id;
          delete assistantData.orgId;
          delete assistantData.createdAt;
          delete assistantData.updatedAt;
          
          if (!assistantData.model) assistantData.model = {};
          if (!assistantData.model.messages) assistantData.model.messages = [];
          
          assistantData.model.messages.push({
            role: "system",
            content: `The user just transitioned from a text chat to this voice call. Here is the text chat history so far:\n\n${chatHistory}\n\nPlease use this context to seamlessly continue the conversation.`
          });
          
          assistantPayload = { assistant: assistantData };
        } else {
          console.warn("Failed to fetch assistant for history injection, falling back to assistantId");
        }
      } catch (e) {
        console.error("Error fetching assistant for history injection:", e);
      }
    }

    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiPrivateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...assistantPayload,
        customer: {
          number: phoneNumber,
        },
      }),
    });

    const data = await vapiResponse.json();

    if (!vapiResponse.ok) {
      console.error('Vapi API Error Response:', data);
      // Vapi sometimes returns errors in an array or a message string
      const errorMessage = data.message || (Array.isArray(data.error) ? data.error[0]?.message : data.error) || 'Failed to trigger outbound call';
      return NextResponse.json({ 
        error: errorMessage,
        details: data 
      }, { status: vapiResponse.status });
    }

    return NextResponse.json({ success: true, call: data });
  } catch (error) {
    console.error('Vapi Outbound Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
