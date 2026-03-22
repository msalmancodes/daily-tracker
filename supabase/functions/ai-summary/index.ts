import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { date, prayers, quran, learning, health, work, notes, dayType } = await req.json()

    // Build a concise summary of the day's data for the prompt
    const prayersDone = Object.entries(prayers)
      .filter(([k, v]) => v && k !== 'jumuah')
      .map(([k]) => k)
    const allFive = prayersDone.length >= 5

    const gymMin = health?.gym || 0
    const quranJuzMin = quran?.juz || 0
    const memorizeMin = quran?.memorize || 0
    const reciteMin = quran?.recite || 0
    const totalQuran = quranJuzMin + memorizeMin + reciteMin

    const studyMin = (learning?.reading || 0) + (learning?.broad || 0) +
      (learning?.iqbal || 0) + (learning?.rl || 0) +
      (learning?.scholar || 0) + (learning?.finance || 0)

    const workMin = (work?.office || 0) + (work?.campus || 0)

    const prompt = `You are a personal coach reviewing someone's daily routine log. Write a single short paragraph (3-4 sentences max) as a warm, direct personal reflection for ${date}.

Data:
- Prayers: ${allFive ? 'All 5 prayed' : `Only ${prayersDone.join(', ') || 'none'} prayed`}
- Quran: ${totalQuran} minutes total (juz recitation: ${quranJuzMin}m, memorization: ${memorizeMin}m, recitation: ${reciteMin}m)
- Study/Learning: ${studyMin} minutes
- Gym: ${gymMin} minutes
- Work: ${workMin} minutes
- Personal notes: "${notes || 'none'}"

Be honest and encouraging. Don't use bullet points. Don't start with "Today". Keep it under 80 words.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content?.trim() || ''

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
