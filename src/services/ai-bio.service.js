import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { logger } from '../logging/logger.js';

const MAX_BIO_LENGTH = 500;

let aiClient = null;

const ensureClient = () => {
  if (!env.googleApiKey) {
    throw new AppError('AI bio service is not configured', 503, ERROR_CODES.INTERNAL_ERROR);
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: env.googleApiKey });
  }

  return aiClient;
};

const extractResponseText = (response) => {
  if (typeof response?.text === 'string') {
    return response.text.trim();
  }

  return '';
};

const clampBio = (value) => String(value || '').trim().slice(0, MAX_BIO_LENGTH);

const buildWritePrompt = ({ displayName, age, occupation, location, educationLevel }) => `Write a dating app bio (like Tinder, Hinge, or eHarmony style) for someone named ${displayName}, ${age} years old, works as ${occupation || 'a professional'}, lives in ${location || 'the area'}. Education: ${educationLevel || 'not specified'}.

Style guidelines:
- Write in first person
- Keep it casual, warm, and conversational like real dating app bios
- 2-3 short sentences max
- Show personality, not just facts
- Avoid hashtags, emojis, or Instagram-style formatting
- No cliches like "looking for my partner in crime"
- Make it feel genuine and approachable

Return only the bio text.
Keep under ${MAX_BIO_LENGTH} characters.`;

const buildPolishPrompt = (bio) => `Lightly edit and improve this dating app bio. Make minimal changes - only fix spelling errors, grammar issues, and slightly improve flow if needed. Keep the person's voice and meaning intact. Do NOT rewrite it completely or change the style drastically. Keep it in dating app style (like Tinder/Hinge/eHarmony).

Current bio: "${bio}"

Rules:
- Fix spelling and grammar errors
- Make only small flow improvements when needed
- Keep the same tone and personality
- Do not add hashtags or emojis
- Keep under ${MAX_BIO_LENGTH} characters

Return only the polished bio text.`;

const generateFromPrompt = async (prompt) => {
  try {
    const client = ensureClient();
    const response = await client.models.generateContent({
      model: env.googleGenAiModel,
      contents: prompt
    });

    const bio = clampBio(extractResponseText(response));
    if (!bio) {
      throw new AppError('AI response was empty. Please try again.', 502, ERROR_CODES.INTERNAL_ERROR);
    }

    return { bio };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Google Gen AI bio generation failed', {
      message: error?.message,
      status: error?.status,
      model: env.googleGenAiModel
    });

    throw new AppError('Unable to generate bio right now. Please try again.', 502, ERROR_CODES.INTERNAL_ERROR);
  }
};

export const aiBioService = {
  async writeBio(payload) {
    return generateFromPrompt(buildWritePrompt(payload));
  },

  async polishBio({ bio }) {
    return generateFromPrompt(buildPolishPrompt(bio));
  }
};
