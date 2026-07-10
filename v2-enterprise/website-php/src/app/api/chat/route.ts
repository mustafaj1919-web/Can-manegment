import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'build-time-placeholder-key',
});

// Intelligent local regex-based parsing fallback when API key is missing
function fallbackParse(message: string, lang: 'ar' | 'en') {
  const msg = message.toLowerCase();
  const commands: { action: string; value: string | null }[] = [];
  let reply = '';

  // 1. Color matching
  if (msg.includes('أسود') || msg.includes('black') || msg.includes('أوبسيديان')) {
    commands.push({ action: 'setColor', value: 'obsidian' });
    reply += lang === 'ar' ? 'تم تغيير لون طلاء السيارة إلى الأسود الأوبسيديان الفاخر. ' : 'Car paint color changed to Obsidian Black. ';
  } else if (msg.includes('برونز') || msg.includes('bronze') || msg.includes('صحراوي')) {
    commands.push({ action: 'setColor', value: 'bronze' });
    reply += lang === 'ar' ? 'تم تطبيق لون برونز الصحراء المطفي الجميل. ' : 'Desert Bronze matte color applied. ';
  } else if (msg.includes('ذهبي') || msg.includes('gold')) {
    commands.push({ action: 'setColor', value: 'gold' });
    reply += lang === 'ar' ? 'تم اختيار اللون الذهبي الكربوني المتوهج. ' : 'Carbon Gold glossy color applied. ';
  } else if (msg.includes('أخضر') || msg.includes('emerald') || msg.includes('زمرد')) {
    commands.push({ action: 'setColor', value: 'emerald' });
    reply += lang === 'ar' ? 'تم تعديل الطلاء إلى اللون الأخضر الزمردي الأخاذ. ' : 'Iraqi Emerald deep green color applied. ';
  } else if (msg.includes('فضي') || msg.includes('silver')) {
    commands.push({ action: 'setColor', value: 'silver' });
    reply += lang === 'ar' ? 'تم اختيار الفضي النيزكي العاكس. ' : 'Meteor Silver paint applied. ';
  } else if (msg.includes('أحمر') || msg.includes('red') || msg.includes('قرمزي')) {
    commands.push({ action: 'setColor', value: 'crimson' });
    reply += lang === 'ar' ? 'تم تطبيق اللون الأحمر القرمزي الرياضي. ' : 'Crimson Red metallic color applied. ';
  }

  // 2. Wheel matching
  if (msg.includes('جنط') || msg.includes('عجلة') || msg.includes('wheels') || msg.includes('جنوط')) {
    if (msg.includes('رياضي') || msg.includes('توربين') || msg.includes('sport')) {
      commands.push({ action: 'setWheels', value: 'sport' });
      reply += lang === 'ar' ? 'تم تركيب جنوط التوربين الرياضية مقاس 21 بوصة. ' : 'Sport Turbine 21" wheels installed. ';
    } else if (msg.includes('كلاسيك') || msg.includes('فاخر') || msg.includes('luxury') || msg.includes('classic')) {
      commands.push({ action: 'setWheels', value: 'classic' });
      reply += lang === 'ar' ? 'تم تركيب الجنوط الفاخرة متعددة الأضلاع. ' : 'Luxury Multi-spoke classic wheels installed. ';
    } else if (msg.includes('وعر') || msg.includes('طرق') || msg.includes('offroad') || msg.includes('بر')) {
      commands.push({ action: 'setWheels', value: 'offroad' });
      reply += lang === 'ar' ? 'تم اختيار جنوط الطرق الوعرة المرتفعة. ' : 'Rugged Off-road wheels installed. ';
    }
  }

  // 3. Environment matching
  if (msg.includes('صحراء') || msg.includes('desert') || msg.includes('رمل')) {
    commands.push({ action: 'setEnvironment', value: 'desert' });
    reply += lang === 'ar' ? 'تم تغيير البيئة إلى صحراء العراق الذهبية عند الغروب. ' : 'Environment updated to Iraqi Golden Desert at sunset. ';
  } else if (msg.includes('بحر') || msg.includes('شاطئ') || msg.includes('sea') || msg.includes('ocean')) {
    commands.push({ action: 'setEnvironment', value: 'sea' });
    reply += lang === 'ar' ? 'تم نقلك إلى ساحل البحر الهادئ بمؤثرات مائية. ' : 'Environment changed to peaceful Sea Coast. ';
  } else if (msg.includes('جبل') || msg.includes('mountain') || msg.includes('ثلوج')) {
    commands.push({ action: 'setEnvironment', value: 'mountain' });
    reply += lang === 'ar' ? 'تم وضع السيارة في قمم الجبال الضبابية الباردة. ' : 'Environment switched to foggy Mountain Peak. ';
  } else if (msg.includes('مدينة') || msg.includes('city') || msg.includes('ليل') || msg.includes('night')) {
    commands.push({ action: 'setEnvironment', value: 'city' });
    reply += lang === 'ar' ? 'تم العودة إلى شوارع المدينة المضيئة بأنوار النيون الصاخبة. ' : 'Environment changed to glowing Neon City streets. ';
  }

  // 4. Lights & Doors
  if (msg.includes('أنوار') || msg.includes('ضوء') || msg.includes('lights') || msg.includes('إضاءة')) {
    commands.push({ action: 'toggleLights', value: null });
    reply += lang === 'ar' ? 'تم تبديل حالة الإضاءة والأنوار الأمامية. ' : 'Headlights toggled. ';
  }
  if (msg.includes('باب') || msg.includes('أبواب') || msg.includes('doors') || msg.includes('افتح')) {
    commands.push({ action: 'toggleDoors', value: null });
    reply += lang === 'ar' ? 'تم فتح/إغلاق الأبواب المجنحة. ' : 'Gullwing doors state toggled. ';
  }
  if (msg.includes('غطاء') || msg.includes('محرك') || msg.includes('hood') || msg.includes('مكينة')) {
    commands.push({ action: 'toggleHood', value: null });
    reply += lang === 'ar' ? 'تم تبديل حالة غطاء المحرك الأمامي. ' : 'Engine hood state toggled. ';
  }

  // 5. Default replies if no configuration matches
  if (reply === '') {
    if (msg.includes('سعر') || msg.includes('تقسيط') || msg.includes('كم القسط') || msg.includes('price') || msg.includes('installment')) {
      reply = lang === 'ar' 
        ? 'بخصوص أسعارنا وتسهيلات الدفع، تقدم شركة الأصدقاء خيار تقسيط مريح جداً يصل حتى 10 أشهر بدفعة أولى مناسبة وبدون فوائد معقدة. تفضل بترك اسمك ورقمك وسنتواصل معك لشرح التفاصيل وحجز موعد!' 
        : 'Regarding prices and payment options, Al-Sadaka Showroom offers a flexible installment plan up to 10 months with a reasonable down payment and zero hidden fees. Leave your name and number, and we will contact you directly!';
    } else if (msg.includes('عنوان') || msg.includes('مكان') || msg.includes('موقع') || msg.includes('address') || msg.includes('location')) {
      reply = lang === 'ar'
        ? 'صالة عرض شركة الأصدقاء تقع في بغداد / الكريعات / شارع الوقف السني / قرب كلية القانون. نرحب بزيارتكم!'
        : 'Al-Sadaka showroom is located in Baghdad / Krayat / Sunni Endowment St / Near Law College. We look forward to your visit!';
    } else {
      reply = lang === 'ar'
        ? 'فهمت طلبك، أنا هنا لمساعدتك! يمكنك أن تطلب مني تغيير طلاء السيارة (أسود، ذهبي، أحمر، برونزي)، تغيير البيئة (صحراء، بحر، جبل، مدينة)، فتح الأبواب أو تشغيل الأنوار.'
        : 'I hear you! You can ask me to change the car color (black, gold, red, bronze, silver), switch environments (desert, sea, mountain, city), open doors, turn on lights, or guide you to book a test drive.';
    }
  }

  return { response: reply, commands };
}

export async function POST(req: Request) {
  try {
    const { messages, lang } = await req.json();
    const userMessage = messages[messages.length - 1].content;

    // Check if OpenAI key is set. If not, bypass and run rule-based fallback immediately.
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'build-time-placeholder-key') {
      const parsed = fallbackParse(userMessage, lang);
      return NextResponse.json(parsed);
    }

    // Call OpenAI API for structured response
    const systemPrompt = `
      You are the AI Car Designer and Concierge for "Al-Sadaka Cars Showroom" (شركة الأصدقاء لتجارة السيارات) in Baghdad, Iraq.
      Your task is to hold an immersive, futuristic conversation with the user and dynamically adjust the 3D car showroom based on their preferences.
      
      You can execute these actions by writing a JSON response format. You must respond in a valid JSON structure only:
      {
        "response": "Your friendly conversational response in the requested language (Arabic or English)",
        "commands": [
          { "action": "setColor", "value": "obsidian" | "bronze" | "gold" | "emerald" | "silver" | "crimson" },
          { "action": "setWheels", "value": "sport" | "classic" | "offroad" },
          { "action": "setEnvironment", "value": "city" | "desert" | "mountain" | "sea" },
          { "action": "toggleLights", "value": null },
          { "action": "toggleDoors", "value": null },
          { "action": "toggleHood", "value": null }
        ]
      }

      Available configurations and mapping:
      - Color values: "obsidian" (black), "bronze" (desert bronze), "gold" (carbon gold), "emerald" (green), "silver" (meteor silver), "crimson" (crimson red).
      - Wheels values: "sport" (turbine 21"), "classic" (multi-spoke luxury), "offroad" (rugged off-road).
      - Environment values: "city" (neon night city), "desert" (sunset dunes), "mountain" (foggy mountains), "sea" (coastal ocean).
      
      Context Guidelines:
      - Language of prompt is: ${lang === 'ar' ? 'Arabic (RTL)' : 'English (LTR)'}. Respond in the matching language.
      - Al-Sadaka Cars Showroom offers 10-month interest-free installment plans.
      - Showroom address: Baghdad, Krayat, Sunni Endowment St, Near Law College.
      - If user asks to change environment to desert/desert storm, add "setEnvironment" with value "desert".
      - If user wants a sleek sporty look, change color to "crimson" or "gold" and set wheels to "sport".
      - Be extremely polite, premium, and welcoming. Do not output anything other than the JSON format.
    `;

    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      response_format: { type: 'json_object' }
    });

    const responseText = chatCompletion.choices[0].message.content || '{}';
    const parsedData = JSON.parse(responseText);

    return NextResponse.json({
      response: parsedData.response || '',
      commands: parsedData.commands || []
    });

  } catch {
    console.error('Error in chat API route');
    // If OpenAI API calls fail (e.g. rate limit, quota, invalid key), use the fallback parser to keep user experience smooth
    try {
      const { messages, lang } = await req.json();
      const userMessage = messages[messages.length - 1].content;
      const parsed = fallbackParse(userMessage, lang);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        response: 'حدث خطأ أثناء معالجة طلبك، يرجى المحاولة لاحقاً.',
        commands: []
      }, { status: 500 });
    }
  }
}
