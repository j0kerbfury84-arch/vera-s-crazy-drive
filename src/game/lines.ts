export const CRASH_LINES = [
  "COÑO! I pressed the brake!",
  "¡Ay, Dios mío! Why is he WALKING there?!",
  "What the coño was THAT?!",
  "¡Coño, coño, coño! I had it!",
  "Okay... that was NOT my fault.",
  "WHY DID HE MOVE?! ¡Coño!",
  "I swear the car did that by itself.",
  "¡Carajo! I almost had it!",
  "Okay, okay... nobody saw that.",
  "¡Ñó! That's a BIG problem.",
  "I meant to do that.",
  "That was calculated.",
  "There was no pedestrian there five seconds ago!",
];

export const PANIC_LINES = [
  "Okay... breathe, Vera. Breathe.",
  "Why is everybody looking at me?!",
  "This road hates me.",
  "Too many cars! ¡Coño!",
  "A LOT a little.",
  "Which pedal is the brake again?!",
  "¡Ay coño, coño, coño!",
  "I can't do this. I CAN do this.",
  "Okay. Calm. Calm. CALM!",
  "Why is everything so CLOSE?!",
];

export const CONFIDENT_LINES = [
  "Relax. I know what I'm doing.",
  "See? Easy.",
  "I've got this.",
  "This is actually going really well.",
  "I'm becoming a professional.",
  "Look at me! Perfect driving!",
  "I hate driving. I LOVE driving.",
];

export const BUILDING_LINES = [
  "I thought that was the road.",
  "Well, now it's a DRIVE-THRU.",
  "Who builds a wall THERE?!",
  "It's fine! It's just a little dent!",
  "I SAW the wall!",
];

export const INSTRUCTOR_CRASH = [
  "That was a SIDEWALK!",
  "BRAKE! BRAAAKE!",
  "¡Qué bola, carajo!",
  "That's minus 20 points!",
  "You KILLED the mailman!",
  "That's a BUILDING, Vera!",
  "I want a new job.",
  "Insurance will love this.",
];

export const INSTRUCTOR_CHECKPOINT = [
  "Checkpoint! Somehow.",
  "Keep going, don't stop!",
  "I can't believe that worked.",
  "Still alive. Barely.",
];

export const WIN_LINES = [
  "I DID IT! ¡Coño, I actually did it!",
  "Route complete! I'm alive!",
  "Nobody died. That's a win.",
];

export const LOSE_LINES = [
  "Okay... let's never talk about this again.",
  "I think I need a lawyer.",
  "¡Ay, Dios mío... what have I done?",
  "Well... technically, I finished.",
  "I'm never driving again.",
];

export const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]!;
