// api/ai-companion.js
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, habits, transactions, goals, reflections } = req.body;

  // Build a prompt based on the request type and user data
  let prompt = '';
  const habitSummary = habits.map(h => `${h.name}: ${h.streak} day streak, completed today: ${h.completedToday}`).join('\n');
  const transactionSummary = transactions.map(t => `${t.description}: $${t.amount} (${t.type})`).join('\n');
  const goalSummary = goals.map(g => `${g.name}: ${g.progress}% complete`).join('\n');
  const reflectionSummary = reflections.map(r => r.text).join('\n');

  const context = `
User's habits:
${habitSummary || 'No habits yet.'}

Transactions:
${transactionSummary || 'No transactions.'}

Goals:
${goalSummary || 'No goals.'}

Recent reflections:
${reflectionSummary || 'No reflections.'}
`;

  switch (type) {
    case 'habits':
      prompt = `Based on the user's habits below, give a short, encouraging message (2-3 sentences) with a tip to stay consistent or improve. Be friendly and use emojis.\n\n${context}`;
      break;
    case 'money':
      prompt = `Look at the user's income and expenses below. Give one practical tip to save money or reduce expenses, in a positive tone. Use emojis.\n\n${context}`;
      break;
    case 'goals':
      prompt = `The user has these goals. Give a motivational message that acknowledges their progress and encourages them to keep going. Be warm and use emojis.\n\n${context}`;
      break;
    case 'weeklySummary':
      prompt = `Create a friendly weekly summary for the user based on their habits, transactions, and goals. Highlight one win and one area for improvement. Keep it to 4 sentences. Use emojis.\n\n${context}`;
      break;
    case 'dailyMotivation':
      prompt = `Give a short, uplifting daily motivation message (2-3 sentences) that relates to self-improvement. Use an emoji.`;
      break;
    case 'reflectionPrompt':
      prompt = `Based on the user's recent reflections and data, suggest a thoughtful question they could reflect on today. Be concise and insightful.\n\n${context}`;
      break;
    default:
      prompt = `Greet the user warmly and ask how you can help them today.`;
  }

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.8,
    });

    const message = completion.data.choices[0].message.content;
    res.status(200).json({ message });
  } catch (error) {
    console.error('OpenAI error:', error.response?.data || error.message);
    res.status(500).json({ error: 'AI service error' });
  }
}