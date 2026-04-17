import Groq from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';

// Fuerza evaluación en runtime, no en build time.
// Sin esto, Next.js intenta prerender la ruta y rompe si falta GROQ_API_KEY.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 });
  }

  const formData = await req.formData();
  const audioFile = formData.get('audio') as File | null;
  if (!audioFile) return Response.json({ error: 'Sin archivo de audio' }, { status: 400 });

  try {
    const groq = new Groq({ apiKey });
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'es',
      response_format: 'json',
    });

    return Response.json({ success: true, text: transcription.text });
  } catch (err: any) {
    console.error('[ACM transcribe]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
