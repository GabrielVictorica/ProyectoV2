import Groq from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const formData = await req.formData();
  const audioFile = formData.get('audio') as File | null;
  if (!audioFile) return Response.json({ error: 'Sin archivo de audio' }, { status: 400 });

  try {
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
