export const PASSAGE_TITLE = "A Windy Afternoon at the Park";

export const PASSAGE = `The weather changes how a day feels. A warm breeze can make people glad to be outside. A cold wind can make those same people hurry indoors. Weather is more than a mood. It can also wear things out.

At a neighborhood park, the most common sky is bright and clear. Sunshine helps the grass grow and gives people a reason to play. That does not mean the sun is always gentle. Stay out too long with no cover, and skin can burn. A burn can hurt for days. Too much sun, year after year, can even lead to an illness called skin cancer.

People have simple ways to stay safer. One way is to put on sunscreen before a long game. A hat with a brim helps too. Light shirts and pants can cover skin without feeling heavy. Many players choose those clothes on hot days because they still feel cool.

The park building needs protection as well. Sunlight through a big window can warm the room. That feels good in winter and too hot in summer. The same light can fade the color of chairs and posters inside. Helpers pull the shades down when the sun is strong. They pull the shades up again when they want the light.

A wooden roof over the picnic tables is another cover. People can eat outside and still sit in the shade. The roof also keeps rain off the tables. Rain and sun both wear wood down. Once a year, workers rub on a coat of stain. The stain helps the wood last, and it makes the tables look bright.

The last idea in the park plan is simple: drink water and take breaks in the shade. Being outside is worth it when people also guard against the rough parts of the weather.`;

export const QUESTIONS = [
  {
    id: "rd1",
    kind: "choice",
    prompt: "Part A. A helpful thing the sun does at the park is",
    choices: [
      { id: "rd1-grow", label: "help the grass grow and give people a reason to play" },
      { id: "rd1-rain", label: "keep rain off the picnic tables" },
      { id: "rd1-stain", label: "make the wooden tables last forever" },
      { id: "rd1-cold", label: "make every day feel like winter" },
    ],
    answer: "rd1-grow",
    explanation: "The passage says sunshine helps the grass grow and gives people a reason to play.",
  },
  {
    id: "rd2",
    kind: "choice",
    prompt: "Part B. Which sentence from the passage best supports the answer to Part A?",
    choices: [
      { id: "rd2-grow", label: "Sunshine helps the grass grow and gives people a reason to play." },
      { id: "rd2-burn", label: "A burn can hurt for days." },
      { id: "rd2-stain", label: "Workers rub on a coat of stain." },
      { id: "rd2-water", label: "Drink water and take breaks in the shade." },
    ],
    answer: "rd2-grow",
    explanation: "That sentence is the evidence for the helpful thing the sun does.",
  },
  {
    id: "rd3",
    kind: "choice",
    prompt: "Which of these is mentioned last in the passage?",
    choices: [
      { id: "rd3-screen", label: "putting on sunscreen" },
      { id: "rd3-shades", label: "pulling shades down" },
      { id: "rd3-stain", label: "rubbing stain on the wood" },
      { id: "rd3-water", label: "drinking water and taking shade breaks" },
    ],
    answer: "rd3-water",
    explanation: "The last idea in the park plan is to drink water and take breaks in the shade.",
  },
  {
    id: "rd4",
    kind: "choice",
    prompt: "The author wrote this passage to",
    choices: [
      { id: "rd4-buy", label: "persuade the reader to buy a picnic table" },
      { id: "rd4-inform", label: "inform the reader about weather and ways to stay safer" },
      { id: "rd4-joke", label: "entertain the reader with a joke about wind" },
      { id: "rd4-story", label: "tell a make-believe story about a magic roof" },
    ],
    answer: "rd4-inform",
    explanation: "The passage explains facts about weather and protection. It does not sell a product or tell a made-up story.",
  },
  {
    id: "rd5",
    kind: "choice",
    prompt: "Which picture would go best with this passage?",
    choices: [
      { id: "rd5-snow", label: "children playing in deep snow with no coats" },
      { id: "rd5-roof", label: "people eating at picnic tables under a wooden roof in the sun" },
      { id: "rd5-paint", label: "a person painting the walls inside a house" },
      { id: "rd5-clocks", label: "two clocks hanging on a wall" },
    ],
    answer: "rd5-roof",
    explanation: "The passage describes a wooden roof over picnic tables so people can sit in the shade.",
  },
  {
    id: "rd6",
    kind: "words",
    prompt: "Tap the two words that mean not good for you.",
    tokens: ["Sunshine", "can", "be", "pleasant", ",", "but", "too", "much", "sun", "can", "be", "harmful", "and", "unsafe", "."],
    picks: ["pleasant", "harmful", "unsafe", "much"],
    answer: "harmful|unsafe",
    explanation: "Harmful and unsafe both mean the sun can hurt you. Pleasant means the opposite.",
  },
  {
    id: "rd7",
    kind: "choice",
    prompt: "Why do many players choose light shirts and pants on hot days?",
    choices: [
      { id: "rd7-cool", label: "The clothes can cover skin and still feel cool." },
      { id: "rd7-rain", label: "The clothes keep rain off the grass." },
      { id: "rd7-wood", label: "The clothes make the wooden tables last." },
      { id: "rd7-winter", label: "The clothes are only for winter." },
    ],
    answer: "rd7-cool",
    explanation: "The passage says light shirts and pants cover skin without feeling heavy, and players still feel cool.",
  },
  {
    id: "rd8",
    kind: "choice",
    prompt: "What do helpers do when the sun is strong?",
    choices: [
      { id: "rd8-down", label: "They pull the shades down." },
      { id: "rd8-up", label: "They leave every shade up." },
      { id: "rd8-stain", label: "They stain the window glass." },
      { id: "rd8-snow", label: "They close the park for snow." },
    ],
    answer: "rd8-down",
    explanation: "Helpers pull the shades down when the sun is strong, and pull them up when they want the light.",
  },
  {
    id: "rd9",
    kind: "choice",
    prompt: "Besides shade, what else does the wooden roof keep off the tables?",
    choices: [
      { id: "rd9-rain", label: "rain" },
      { id: "rd9-hats", label: "hats" },
      { id: "rd9-cancer", label: "skin cancer" },
      { id: "rd9-posters", label: "posters" },
    ],
    answer: "rd9-rain",
    explanation: "The roof keeps rain off the tables as well as giving shade.",
  },
  {
    id: "rd10",
    kind: "choice",
    prompt: "Why do workers rub stain on the wood?",
    choices: [
      { id: "rd10-last", label: "The stain helps the wood last." },
      { id: "rd10-cool", label: "The stain makes the players feel cool." },
      { id: "rd10-grass", label: "The stain helps the grass grow." },
      { id: "rd10-window", label: "The stain covers the window." },
    ],
    answer: "rd10-last",
    explanation: "The passage says the stain helps the wood last and makes the tables look bright.",
  },
  {
    id: "rd11",
    kind: "choice",
    prompt: "Sunlight through the window feels good in which season?",
    choices: [
      { id: "rd11-winter", label: "winter" },
      { id: "rd11-only", label: "only on rainy days" },
      { id: "rd11-never", label: "never" },
      { id: "rd11-night", label: "the middle of the night" },
    ],
    answer: "rd11-winter",
    explanation: "Sunlight through the window can warm the room, which feels good in winter and too hot in summer.",
  },
  {
    id: "rd12",
    kind: "choice",
    prompt: "What can too much sun do to skin over many years?",
    choices: [
      { id: "rd12-cancer", label: "It can lead to skin cancer." },
      { id: "rd12-tables", label: "It stains the picnic tables." },
      { id: "rd12-hats", label: "It removes the need for hats." },
      { id: "rd12-rain", label: "It stops the rain." },
    ],
    answer: "rd12-cancer",
    explanation: "The passage says too much sun, year after year, can lead to skin cancer.",
  },
  {
    id: "rd13",
    kind: "choice",
    prompt: "When do helpers pull the shades up?",
    choices: [
      { id: "rd13-light", label: "when they want the light" },
      { id: "rd13-strong", label: "only when the sun is strongest" },
      { id: "rd13-rain", label: "when rain starts" },
      { id: "rd13-stain", label: "after the wood is stained" },
    ],
    answer: "rd13-light",
    explanation: "They pull the shades up again when they want the light.",
  },
  {
    id: "rd14",
    kind: "true_false",
    prompt: "True or false? The passage says the sun is always gentle.",
    answer: "false",
    explanation: "The passage says sunshine does not mean the sun is always gentle. Stay out too long and skin can burn.",
  },
  {
    id: "rd15",
    kind: "choice",
    prompt: "Which sentence best supports the idea that the roof does more than one job?",
    choices: [
      { id: "rd15-jobs", label: "The roof also keeps rain off the tables." },
      { id: "rd15-grass", label: "Sunshine helps the grass grow." },
      { id: "rd15-hat", label: "A hat with a brim helps too." },
      { id: "rd15-mood", label: "A warm breeze can make people glad to be outside." },
    ],
    answer: "rd15-jobs",
    explanation: "The word also shows the roof has another job besides shade: it keeps rain off.",
  },
  {
    id: "rd16",
    kind: "choice",
    prompt: "Which of these is a way the passage says people stay safer in the sun?",
    choices: [
      { id: "rd16-screen", label: "put on sunscreen before a long game" },
      { id: "rd16-close", label: "close the park on every sunny day" },
      { id: "rd16-heavy", label: "wear heavy winter coats in summer" },
      { id: "rd16-fade", label: "let the posters fade on purpose" },
    ],
    answer: "rd16-screen",
    explanation: "One way to stay safer is to put on sunscreen before a long game. A hat and light clothes help too.",
  },
  {
    id: "rdw1",
    kind: "written",
    prompt: "Write a sentence that tells one way people at the park stay safer in the sun, and how the passage shows it.",
    example: "People put on sunscreen before a long game so their skin is safer in the sun.",
  },
  {
    id: "rdw2",
    kind: "written",
    prompt: "Write a sentence that tells why the author wrote this passage.",
    example: "The author wrote it to inform readers about weather and ways to stay safer.",
  },
  {
    id: "rdw3",
    kind: "written",
    prompt: "Write a sentence that tells what the park plan says to do last.",
    example: "The last idea is to drink water and take breaks in the shade.",
  },
];
