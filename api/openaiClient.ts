import OpenAI from "openai";
import 'dotenv/config'


export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});
export const ASSISTANT_ID = process.env.ASSISTANT_ID!;
