// Decision Neuron — Tone Messages & Convince-Me Content

const TONE_MESSAGES = {
  gentle: [
    "You seem to have some energy left — no rush. Just keep an eye on the clock.",
    "Tonight's looking manageable. Rest when you're ready.",
    "Your body seems okay for now. Maybe wind down in the next hour or so?",
    "No alarms going off yet. You've got some runway left.",
    "The night is still young. Enjoy it — responsibly.",
    "All systems nominal. No pressing need to crash just yet.",
    "You're doing fine. But maybe bookmark this page for later.",
  ],
  nudging: [
    "The signs are starting to add up. Worth thinking about wrapping up soon.",
    "Not critical yet, but your future self would probably appreciate an earlier night.",
    "You're in the yellow zone. Nothing alarming, but the math isn't working in your favor.",
    "Just doing some quick calculations here... and they all point toward your pillow.",
    "Your bed called. It says it misses you.",
    "The window for a solid night's sleep is starting to close.",
    "You could stay up. But should you? The data says probably not.",
  ],
  sarcastic: [
    "Oh sure, midnight is *absolutely* the right time to start reorganizing your desktop.",
    "Bold strategy staying up. Let's see how that plays out tomorrow at 8 AM.",
    "One more episode. Famous last words.",
    "You know what sounds better than whatever you're doing right now? Sleep.",
    "The neuron is raising an eyebrow. It only has one, and it's concerned.",
    "Your melatonin has been waiting in the lobby for an hour.",
    "I'm not saying you're making a mistake. I'm saying the math is.",
  ],
  moreSarcastic: [
    "Your future self has already filed a formal complaint.",
    "The bags under your eyes are going to need their own bags.",
    "Genuinely curious what you think is going to happen if you stay up another hour.",
    "Cool, cool. Sleep deprivation is a great look.",
    "At this point, you're not a night owl. You're just making poor decisions.",
    "Even your phone's battery is higher than your remaining functionality.",
    "Tomorrow-you is going to be *so* grateful. That's sarcasm, by the way.",
    "Your circadian rhythm just unfollowed you.",
  ],
  strict: [
    "Put the phone down. Close the tab. Go to bed. Now.",
    "This is not a suggestion. Your body is running on fumes and tomorrow is not optional.",
    "The neuron has spoken. Sleep. Immediately.",
    "There is nothing on this screen more important than sleep right now. Nothing.",
    "GO. TO. BED. This is your final warning.",
    "Every second you spend reading this is a second you should be sleeping.",
    "Shut it down. All of it. Eyes closed. Now.",
  ],
};

const VERDICT_LABELS = {
  gentle: "You're fine",
  nudging: "Maybe soon...",
  sarcastic: "Seriously though...",
  moreSarcastic: "Come on now.",
  strict: "GO. TO. BED.",
};

function getToneBand(score) {
  if (score <= 40) return "gentle";
  if (score <= 65) return "nudging";
  if (score <= 80) return "sarcastic";
  if (score <= 94) return "moreSarcastic";
  return "strict";
}

function getRandomMessage(band) {
  const messages = TONE_MESSAGES[band];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getConvinceMeMessage(state) {
  const messages = [
    `During sleep, your brain clears metabolic waste through the glymphatic system — including beta-amyloid proteins linked to Alzheimer's. ${state.availableSleep < 7 ? "With limited time left, every minute of sleep counts." : "Give your brain the full cleaning cycle it needs."}`,

    `With only ${state.availableSleep.toFixed(1)} hours until your alarm, you'll ${state.availableSleep < 6 ? "miss critical REM cycles entirely. REM is when your brain consolidates memory and processes emotions. You literally can't think straight without it." : "be cutting it close on full sleep cycles. Each cycle is about 90 minutes — do the math."}`,

    state.caffeineQuantity > 0
      ? `You've had ${state.caffeineQuantity} caffeinated drink${state.caffeineQuantity > 1 ? "s" : ""} today. Caffeine has a half-life of about 5 hours — it's ${state.caffeineRecency < 4 ? "still very much" : "likely still"} in your system. Sleep quality is already compromised; getting more hours is the only lever you have left.`
      : "You haven't had any caffeine today, which means your body's natural sleep drive is fully intact. Your adenosine levels are primed for deep sleep. Don't waste that advantage.",

    "Sleep deprivation impairs judgment at a level comparable to alcohol intoxication. After 17 hours awake, your cognitive performance drops to the equivalent of a 0.05% blood alcohol level. Would you drive like that?",

    "Your body temperature naturally drops at night to initiate sleep. Fighting this biological signal doesn't make you more productive — it makes you worse at everything you're trying to do.",

    state.busynessTomorrow > 50
      ? `You rated tomorrow's busyness at ${state.busynessTomorrow}%. Studies show that well-rested people complete tasks up to 40% faster. Sleep isn't lost time — it's an investment in tomorrow's performance.`
      : "Even with a lighter day ahead, sleep debt accumulates. One bad night can take up to four recovery nights to fully compensate for. The interest rate on sleep debt is brutal.",

    "During deep sleep, your body releases growth hormone, repairs tissue, and strengthens your immune system. This isn't optional maintenance — it's how you stay functional as a human being.",

    state.mentalExhaustion > 60
      ? "You reported high mental exhaustion. Your prefrontal cortex — responsible for decision-making, impulse control, and focus — is the first brain region to suffer from sleep deprivation. It literally cannot recover without sleep."
      : "Your brain uses sleep to strengthen neural connections formed during the day. Whatever you learned or worked on today won't solidify without proper rest. You're leaving performance on the table.",

    "Chronic sleep deprivation is linked to increased risk of heart disease, obesity, diabetes, and depression. Tonight's sleep isn't just about tomorrow — it's about whether you're still healthy in ten years.",

    state.stressLevel > 50
      ? "You're reporting elevated stress. Cortisol — your primary stress hormone — is regulated during sleep. Skipping rest keeps cortisol elevated, which increases anxiety and makes tomorrow's sleep harder too. Break the cycle now."
      : "Even when you feel calm, your body accumulates sleep pressure throughout the day. Adenosine has been building in your brain since you woke up. The only way to clear it is sleep.",

    "A single night of poor sleep reduces your ability to form new memories by up to 40%. Your hippocampus needs sleep to transfer today's experiences into long-term storage. That thing you're trying to remember tomorrow? It needs tonight.",

    state.physicalTiredness > 60
      ? "Your body is telling you it's tired. Ignoring physical exhaustion doesn't build resilience — it accelerates burnout and increases injury risk. Listen to your body. It's smarter than your excuses."
      : "Muscle recovery and cellular repair happen primarily during deep sleep. Even if you don't feel physically wrecked, your body is doing critical repair work overnight that it can't do while you're scrolling.",

    `You have ${state.availableSleep.toFixed(1)} hours of potential sleep left. The average adult needs 7-9 hours. ${state.availableSleep < 7 ? "You're already below the minimum. Every minute you stay up makes tomorrow measurably worse." : "You still have a shot at a full night — but that window is closing."}`,
  ];

  return messages;
}
