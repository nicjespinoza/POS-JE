import { GoogleGenAI } from "@google/genai";
import { Transaction } from '../types';

export const analyzeBusinessData = async (transactions: Transaction[]): Promise<string> => {
  try {
    // Check if API key is available securely (simulated check as we use process.env)
    const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
    
    if (!apiKey) {
      return "Error de configuración: API Key no encontrada.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Simplify data for token efficiency
    const dataSummary = transactions.map(t => ({
      type: t.type,
      amount: t.amount,
      desc: t.description,
      date: t.date.split('T')[0]
    }));

    const prompt = `
      Actúa como un analista financiero experto. Analiza las siguientes transacciones recientes de una tienda minorista.
      
      JSON de Transacciones:
      ${JSON.stringify(dataSummary)}

      Por favor, proporciona un resumen ejecutivo estratégico y conciso en formato Markdown (sin bloques de código JSON).
      El idioma DEBE SER ESPAÑOL.

      Incluye:
      1. Chequeo de Salud Financiera (Solvencia, Flujo de Caja).
      2. Tendencias de Ingresos (¿Qué se está vendiendo?, ¿Hay pérdidas?).
      3. Consejos Accionables para el dueño del negocio para aumentar la utilidad o reducir gastos.
      
      Mantén el tono profesional, alentador y directo.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Speed over deep thought for this dashboard widget
      }
    });

    return response.text || "No se generaron insights.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "No se pudieron generar insights de IA en este momento. Por favor verifica tu conexión o configuración.";
  }
};