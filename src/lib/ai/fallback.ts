import { generateText, streamText, generateObject } from 'ai';
import type { GenerateTextResult, StreamTextResult, GenerateObjectResult } from 'ai';
import { AI_PROVIDERS } from './providers';
import type { AiProvider } from './providers';

type GenerateTextParams = Parameters<typeof generateText>[0];
type StreamTextParams = Parameters<typeof streamText>[0];
type GenerateObjectParams = Parameters<typeof generateObject>[0];

/**
 * Intenta generateText con cada proveedor en orden.
 * Si uno falla, pasa al siguiente automáticamente.
 */
export async function generateWithFallback(
  params: Omit<GenerateTextParams, 'model'>,
  providers: AiProvider[] = AI_PROVIDERS
): Promise<GenerateTextResult<any, any>> {
  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const result = await generateText({
        ...params,
        model: provider.model,
      } as GenerateTextParams);
      return result;
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI Fallback] ${provider.name} falló: ${err.message}. Probando siguiente...`);
    }
  }

  throw lastError || new Error('Todos los proveedores de IA fallaron');
}

/**
 * Intenta generateObject con cada proveedor en orden.
 */
export async function generateObjectWithFallback<T>(
  params: Omit<GenerateObjectParams, 'model'>,
  providers: AiProvider[] = AI_PROVIDERS
): Promise<GenerateObjectResult<T>> {
  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const result = await generateObject({
        ...params,
        model: provider.model,
      } as GenerateObjectParams);
      return result as GenerateObjectResult<T>;
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI Fallback] ${provider.name} falló: ${err.message}. Probando siguiente...`);
    }
  }

  throw lastError || new Error('Todos los proveedores de IA fallaron');
}

/**
 * streamText con fallback: intenta Gemini primero, si falla usa el siguiente.
 * NOTA: el streaming ya inició si el primer proveedor devuelve chunks, así que
 * el fallback solo aplica si el proveedor falla antes de emitir.
 */
export async function streamWithFallback(
  params: Omit<StreamTextParams, 'model'>,
  providers: AiProvider[] = AI_PROVIDERS
): Promise<StreamTextResult<any, any>> {
  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const result = streamText({
        ...params,
        model: provider.model,
      } as StreamTextParams);
      return result;
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI Fallback] ${provider.name} falló: ${err.message}. Probando siguiente...`);
    }
  }

  throw lastError || new Error('Todos los proveedores de IA fallaron');
}
