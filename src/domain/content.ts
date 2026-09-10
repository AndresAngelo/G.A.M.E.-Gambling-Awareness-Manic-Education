export interface Lesson {
  id: string
  title: string
  trigger: string
  explanation: string
  question: string
  healthierAction: string
  reviewStatus: 'provisional'
}

export const lessons: Record<string, Lesson> = {
  'payment-barrier': {
    id: 'payment-barrier',
    title: 'The payment barrier',
    trigger: 'You tried to exchange a money-like balance for more play credits.',
    explanation: 'A frictionless deposit turns an intention into spending before there is time to reconsider. This simulation stops before any transaction and never accepts financial details.',
    question: 'What were you hoping more credits would change about this session?',
    healthierAction: 'Pause for two minutes and contact your counselor or a trusted support person before opening a real gambling app.',
    reviewStatus: 'provisional',
  },
  'large-win': {
    id: 'large-win',
    title: 'Excitement is part of the product',
    trigger: 'A large fictional win was paired with intense visual feedback.',
    explanation: 'Celebration effects make a rare result easier to remember than routine losses. The next outcome is not improved by this win.',
    question: 'Which part felt strongest: the amount, sound, motion, or surprise?',
    healthierAction: 'Bank the moment as a lesson rather than replaying it. Try a grounding activity.',
    reviewStatus: 'provisional',
  },
  'rapid-play': {
    id: 'rapid-play',
    title: 'Speed removes reflection',
    trigger: 'Several wagers were placed in a short period.',
    explanation: 'Rapid rounds reduce natural stopping points and make it harder to track overall losses.',
    question: 'What changed in your attention as the rounds became faster?',
    healthierAction: 'Step away from the game surface and complete one paced breathing cycle.',
    reviewStatus: 'provisional',
  },
  'chasing-loss': {
    id: 'chasing-loss',
    title: 'A larger bet cannot repair the past',
    trigger: 'The wager increased shortly after a loss.',
    explanation: 'Past losses are sunk costs. Increasing the next wager adds new risk; it does not improve the probability of the next independent outcome.',
    question: 'Were you trying to erase a feeling, a number, or both?',
    healthierAction: 'Name the loss, stop the session, and choose an urge-surfing exercise.',
    reviewStatus: 'provisional',
  },
  'house-edge': {
    id: 'house-edge',
    title: 'Many small returns can hide a house edge',
    trigger: 'A vivid Color Game result made one color feel unusually promising.',
    explanation: 'Each selected color is a separate wager. With base payouts of 1:1, 2:1, and 3:1, each color wager has an expected house edge of about 7.87%.',
    question: 'Did you focus more on matching colors or on the total amount staked across colors?',
    healthierAction: 'Close the betting view and compare total stake with total return before doing anything else.',
    reviewStatus: 'provisional',
  },
  'near-miss': {
    id: 'near-miss',
    title: 'Almost completing a meld is not ownership of the next card',
    trigger: 'A Tong-its hand stayed one card away from a satisfying meld.',
    explanation: 'Near misses can feel like progress, but unseen cards are not promised to your hand. Time and prior draws are sunk costs.',
    question: 'What did “almost there” make you want to do next?',
    healthierAction: 'Treat the unfinished meld as information, not a debt. End the hand and take a grounding break.',
    reviewStatus: 'provisional',
  },
  'skill-variance': {
    id: 'skill-variance',
    title: 'Skill does not remove variance',
    trigger: 'A card-game result may feel like proof of control.',
    explanation: 'Good decisions can lose and poor decisions can win in the short term. Bots use only legal information, but chance still controls the cards.',
    question: 'Which part of the result came from a decision, and which part came from unseen cards?',
    healthierAction: 'Review one decision without using the outcome to judge its quality.',
    reviewStatus: 'provisional',
  },
}
