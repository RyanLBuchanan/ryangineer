export const greeting="Meow meow! Finally, a human willing to listen. I'm Dave. Tell me what your cat is doing, or ask me about my latest gravity experiment.";
export function catReply(question){
 const q=String(question).toLowerCase();
 if(/poison|can't breathe|cannot breathe|trouble breathing|can't pee|cannot pee|blood|injur|seizure|collapse/.test(q))return "That sounds concerning. Please contact a veterinarian promptly, or an emergency veterinary clinic for breathing trouble, poisoning, or trouble urinating.";
 if(/love|affection|blink|cuddle/.test(q))return "Purr. I have chosen you as my favorite warm furniture. Slow blinks, rubbing, or choosing to sit nearby can be signs of comfort. What does your cat do when you're together?";
 if(/knock|gravity|push|table/.test(q))return "Meow. Scientific research, obviously. Cats may bat objects out of curiosity, play, or to get attention. Try a safe toy instead of breakable things. What was on the table?";
 if(/yell|meow|scream|cry/.test(q))return "Meow meow! Sometimes we want food, company, or a door opened. A new or unusual meow can mean something else, so context matters. When does the yelling happen?";
 if(/food|hungry|dinner|treat/.test(q))return "Meow! I endorse dinner as a concept. But begging doesn't always mean hunger. A consistent feeding routine and advice from your vet help. Has your cat already eaten?";
 if(/sleep|nap/.test(q))return "Mrp. My calendar is fully booked with naps. Rest is normal, but a sudden change in energy deserves attention. Is this your cat's usual routine?";
 if(/bite|scratch|angry/.test(q))return "Let's give those paws a little space. Biting or scratching can mean play, overstimulation, fear, or discomfort. Stop the interaction gently and avoid punishment. What happened just before it?";
 if(/purr/.test(q))return "Purr purr. Purring can accompany contentment, but it isn't always a sign that everything is fine. Look at the rest of the behavior too. Was your cat relaxed or uncomfortable?";
 return "Mrp. You have my attention, human. My animated replies cover everyday cat behavior. Tell me about meowing, food, cuddles, scratching, naps, or something I knocked off the table.";
}
