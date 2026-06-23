import { NextResponse } from "next/server";

// ─── Hardcoded mock quiz data per country ────────────────────────────────────
// Used for testing video generation without consuming Groq/Gemini API quota.

const MOCK_QUIZZES: Record<string, {
  hook: string;
  questions: Array<{
    question: string;
    options: string[];
    answerIndex: number;
    difficulty: "easy" | "medium" | "hard";
  }>;
  visualPrompt: string;
}> = {
  US: {
    hook: "Think you know the United States? Most Americans fail question 2!",
    questions: [
      {
        question: "What is the capital of the United States?",
        options: ["New York", "Washington D.C.", "Los Angeles", "Chicago"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "In which year did the United States declare independence?",
        options: ["1776", "1789", "1812", "1865"],
        answerIndex: 0,
        difficulty: "medium",
      },
      {
        question: "Which US state is the largest by area?",
        options: ["Texas", "California", "Montana", "Alaska"],
        answerIndex: 3,
        difficulty: "easy",
      },
      {
        question: "How many stripes are on the official US flag?",
        options: ["10", "13", "15", "50"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "What is the national bird of the United States?",
        options: ["Golden Eagle", "American Robin", "Bald Eagle", "Wild Turkey"],
        answerIndex: 2,
        difficulty: "easy",
      },
      {
        question: "In which state is the Golden Gate Bridge located?",
        options: ["Washington", "California", "Oregon", "Nevada"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "Who is depicted on the United States one-dollar bill?",
        options: ["George Washington", "Benjamin Franklin", "Abraham Lincoln", "Alexander Hamilton"],
        answerIndex: 0,
        difficulty: "easy",
      },
      {
        question: "What is the tallest mountain in the United States?",
        options: ["Mount Rainier", "Mount Whitney", "Mount Elbert", "Denali"],
        answerIndex: 3,
        difficulty: "medium",
      },
    ],
    visualPrompt: "American flag waving with Capitol Building in background, patriotic colors",
  },
  IN: {
    hook: "Are you a true Indian? Only 1 in 10 get all 8 correct!",
    questions: [
      {
        question: "What is the national language of India as per the constitution?",
        options: ["Hindi", "English", "Sanskrit", "No single national language"],
        answerIndex: 3,
        difficulty: "hard",
      },
      {
        question: "Which river is considered the holiest in India?",
        options: ["Yamuna", "Ganga", "Brahmaputra", "Godavari"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "Who was the first Prime Minister of independent India?",
        options: ["Mahatma Gandhi", "Sardar Patel", "Jawaharlal Nehru", "B.R. Ambedkar"],
        answerIndex: 2,
        difficulty: "easy",
      },
      {
        question: "What is the national animal of India?",
        options: ["Asiatic Lion", "Royal Bengal Tiger", "Indian Elephant", "Leopard"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "Which city is known as the Silicon Valley of India?",
        options: ["Mumbai", "Bengaluru", "Hyderabad", "Pune"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "Who authored the Indian national anthem, Jana Gana Mana?",
        options: ["Bankim Chandra Chatterjee", "Rabindranath Tagore", "Sarojini Naidu", "Sri Aurobindo"],
        answerIndex: 1,
        difficulty: "medium",
      },
      {
        question: "Which Indian state has the longest mainland coastline?",
        options: ["Maharashtra", "Tamil Nadu", "Kerala", "Gujarat"],
        answerIndex: 3,
        difficulty: "medium",
      },
      {
        question: "In which year did India win its first Cricket World Cup?",
        options: ["1975", "1983", "1999", "2011"],
        answerIndex: 1,
        difficulty: "easy",
      },
    ],
    visualPrompt: "Indian flag with Taj Mahal silhouette at sunset, vibrant colors",
  },
  GB: {
    hook: "How well do you know Great Britain? This quiz separates tourists from locals!",
    questions: [
      {
        question: "What is the official currency of the United Kingdom?",
        options: ["Euro", "Pound Sterling", "Dollar", "Franc"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "Which famous monument is located in Wiltshire, England?",
        options: ["Big Ben", "Stonehenge", "Tower of London", "Hadrian's Wall"],
        answerIndex: 1,
        difficulty: "medium",
      },
      {
        question: "How many countries make up the United Kingdom?",
        options: ["2", "3", "4", "5"],
        answerIndex: 2,
        difficulty: "medium",
      },
      {
        question: "What is the capital city of Scotland?",
        options: ["Glasgow", "Edinburgh", "Aberdeen", "Dundee"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "Who was the first female Prime Minister of the United Kingdom?",
        options: ["Theresa May", "Margaret Thatcher", "Liz Truss", "Angela Merkel"],
        answerIndex: 1,
        difficulty: "medium",
      },
      {
        question: "Which Scottish lake is famously associated with a mythical monster?",
        options: ["Loch Lomond", "Loch Ness", "Loch Katrine", "Loch Awe"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "What is the name of the official residence of the British Monarch in London?",
        options: ["Kensington Palace", "Buckingham Palace", "Windsor Castle", "Tower of London"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "Which major river flows directly through London?",
        options: ["River Avon", "River Mersey", "River Thames", "River Severn"],
        answerIndex: 2,
        difficulty: "easy",
      },
    ],
    visualPrompt: "British flag Union Jack with Big Ben and London skyline",
  },
  JP: {
    hook: "Japan has 7,000 islands — but do you know the facts that even Japanese miss?",
    questions: [
      {
        question: "What is the capital city of Japan?",
        options: ["Osaka", "Kyoto", "Tokyo", "Hiroshima"],
        answerIndex: 2,
        difficulty: "easy",
      },
      {
        question: "What is the traditional Japanese theatre form using elaborate costumes?",
        options: ["Noh", "Kabuki", "Bunraku", "Rakugo"],
        answerIndex: 1,
        difficulty: "medium",
      },
      {
        question: "Mount Fuji last erupted in which year?",
        options: ["1707", "1850", "1923", "1945"],
        answerIndex: 0,
        difficulty: "hard",
      },
      {
        question: "What is the official currency of Japan?",
        options: ["Yuan", "Won", "Yen", "Ringgit"],
        answerIndex: 2,
        difficulty: "easy",
      },
      {
        question: "Which city served as the historic capital of Japan before Tokyo?",
        options: ["Osaka", "Kyoto", "Nara", "Kobe"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "What is the traditional Japanese wrap-around robe dress called?",
        options: ["Kimono", "Yukata", "Hanbok", "Sari"],
        answerIndex: 0,
        difficulty: "easy",
      },
      {
        question: "What is the highest mountain in all of Japan?",
        options: ["Mount Kita", "Mount Tate", "Mount Aso", "Mount Fuji"],
        answerIndex: 3,
        difficulty: "easy",
      },
      {
        question: "What is the name of the famous high-speed Japanese bullet train?",
        options: ["Subway", "Monorail", "Shinkansen", "Maglev"],
        answerIndex: 2,
        difficulty: "easy",
      },
    ],
    visualPrompt: "Mount Fuji with cherry blossoms in foreground, Japanese flag elements",
  },
  IT: {
    hook: "Italy gave the world pizza and pasta — but can you pass this Italian knowledge test?",
    questions: [
      {
        question: "What is the capital of Italy?",
        options: ["Milan", "Naples", "Florence", "Rome"],
        answerIndex: 3,
        difficulty: "easy",
      },
      {
        question: "The Colosseum in Rome was completed in which century?",
        options: ["1st century BC", "1st century AD", "2nd century AD", "3rd century AD"],
        answerIndex: 1,
        difficulty: "hard",
      },
      {
        question: "Which Italian city is known as 'La Serenissima' (The Serene One)?",
        options: ["Florence", "Venice", "Genoa", "Turin"],
        answerIndex: 1,
        difficulty: "medium",
      },
      {
        question: "Which volcano erupted in 79 AD, destroying the city of Pompeii?",
        options: ["Mount Etna", "Mount Vesuvius", "Mount Stromboli", "Mount Vulcano"],
        answerIndex: 1,
        difficulty: "medium",
      },
      {
        question: "What is the national currency of Italy?",
        options: ["Lira", "Euro", "Franc", "Mark"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "Which Italian city is famous for its leaning bell tower?",
        options: ["Rome", "Pisa", "Florence", "Milan"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "Who painted the iconic masterpiece Mona Lisa?",
        options: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "What is the largest island in the Mediterranean Sea, which is part of Italy?",
        options: ["Sardinia", "Elba", "Sicily", "Capri"],
        answerIndex: 2,
        difficulty: "medium",
      },
    ],
    visualPrompt: "Italian flag with Colosseum and rolling Tuscan hills at golden hour",
  },
  BR: {
    hook: "Brazil is bigger than you think — prove you know it better than most Brazilians!",
    questions: [
      {
        question: "What is the official language of Brazil?",
        options: ["Spanish", "Portuguese", "English", "French"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "What is the capital city of Brazil?",
        options: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"],
        answerIndex: 2,
        difficulty: "medium",
      },
      {
        question: "The Amazon River flows through Brazil and which other country where it originates?",
        options: ["Colombia", "Venezuela", "Peru", "Bolivia"],
        answerIndex: 2,
        difficulty: "hard",
      },
      {
        question: "Which Brazilian city hosts the famous Copacabana beach?",
        options: ["São Paulo", "Rio de Janeiro", "Salvador", "Fortaleza"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "What is the national currency of Brazil?",
        options: ["Peso", "Real", "Cruzeiro", "Dollar"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "How many times has Brazil won the FIFA World Cup?",
        options: ["3", "4", "5", "6"],
        answerIndex: 2,
        difficulty: "easy",
      },
      {
        question: "What is widely considered the national sport of Brazil?",
        options: ["Volleyball", "Capoeira", "Basketball", "Football"],
        answerIndex: 3,
        difficulty: "easy",
      },
      {
        question: "Which rainforest covers most of northwestern Brazil?",
        options: ["Amazon", "Congo", "Atlantic", "Valdivian"],
        answerIndex: 0,
        difficulty: "easy",
      },
    ],
    visualPrompt: "Brazilian flag with Amazon rainforest and Christ the Redeemer silhouette",
  },
  DE: {
    hook: "Germany is the land of engineers and philosophers — do you know it like a true German?",
    questions: [
      {
        question: "What is the capital of Germany?",
        options: ["Munich", "Hamburg", "Frankfurt", "Berlin"],
        answerIndex: 3,
        difficulty: "easy",
      },
      {
        question: "In which year was the Berlin Wall torn down?",
        options: ["1985", "1987", "1989", "1991"],
        answerIndex: 2,
        difficulty: "medium",
      },
      {
        question: "What is the name of the famous German highway with no general speed limit?",
        options: ["Straße", "Autobahn", "Schnellweg", "Fahrweg"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "What is the official currency of Germany?",
        options: ["Deutsche Mark", "Euro", "Schilling", "Guilder"],
        answerIndex: 1,
        difficulty: "easy",
      },
      {
        question: "Which German city hosts the annual Oktoberfest?",
        options: ["Berlin", "Frankfurt", "Munich", "Cologne"],
        answerIndex: 2,
        difficulty: "easy",
      },
      {
        question: "Who was the first Chancellor of the German Empire in 1871?",
        options: ["Wilhelm I", "Otto von Bismarck", "Friedrich Ebert", "Konrad Adenauer"],
        answerIndex: 1,
        difficulty: "hard",
      },
      {
        question: "Which major river is the longest entirely within or bordering Germany?",
        options: ["Danube", "Rhine", "Elbe", "Weser"],
        answerIndex: 1,
        difficulty: "medium",
      },
      {
        question: "What is the national animal of Germany?",
        options: ["Brown Bear", "Federal Eagle", "Red Fox", "Wild Boar"],
        answerIndex: 1,
        difficulty: "easy",
      },
    ],
    visualPrompt: "German Brandenburg Gate with Oktoberfest decorations, black-red-gold colors",
  },
};

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", IN: "India", GB: "United Kingdom",
  JP: "Japan", IT: "Italy", BR: "Brazil", DE: "Germany",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const countryCode = String(body?.countryCode ?? "US").toUpperCase().trim();
    const format = String(body?.format ?? "8_rapid").trim();

    const quiz = MOCK_QUIZZES[countryCode] ?? MOCK_QUIZZES.US;
    const countryName = COUNTRY_NAMES[countryCode] ?? "United States";
    const slug = `mock_quiz_${countryCode.toLowerCase()}_v1`;

    const numQuestions = format === "1_deep" ? 1 : (format === "3_rapid" ? 3 : (format === "5_rapid" ? 5 : 8));
    const slicedQuestions = quiz.questions.slice(0, numQuestions);

    const quizDoc = {
      quizId: slug,
      status: "draft",
      country: countryName,
      flagUrl: `https://flagcdn.com/w1280/${countryCode.toLowerCase()}.png`,
      hook: quiz.hook,
      questions: slicedQuestions.map((q) => ({
        question: q.question,
        options: q.options,
        answerIndex: q.answerIndex,
        answer: q.options[q.answerIndex],
        difficulty: q.difficulty,
        duration: 5,
      })),
      gradingScale: `0/${slicedQuestions.length}: Tourist. ${slicedQuestions.length}/${slicedQuestions.length}: True Citizen.`,
      visualPrompt: quiz.visualPrompt,
      tone: "challenging",
      format,
      version: 1,
      isMock: true,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(quizDoc, {
      status: 200,
      headers: { "X-Cache": "MOCK" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
