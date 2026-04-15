import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, metadata, timestamp } = body;

    // In a real-world scenario, you would send this to a service like Axiom, Datadog, or a database.
    // For now, we'll log it to the server console with a clear structure.
    console.log(`[VAPI_LOG] ${new Date(timestamp).toISOString()} - Event: ${event}`, {
      metadata,
    });

    // You could also add logic here to alert via email/Slack if the event is an 'error'
    if (event === 'error') {
      console.error(`[VAPI_ERROR_ALERT]`, metadata);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logging API Error:', error);
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}
