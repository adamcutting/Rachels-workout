/* The training programme.
   Built for fat loss while keeping (and building) muscle: three strength sessions with a
   conditioning finisher, plus a sprint and circuit session on a fourth day.
   Sessions run 30 to 45 minutes; the short version is about 25.
   The plan moves on by workouts done, not by the calendar: a "week" is complete once
   you've done one of each workout in your rotation, and four of those make a month. */

const COLORS = {
  pink:   {c: "#D63C76", on: "#FFFFFF", t: "#C1316A"},
  blue:   {c: "#2F6FD6", on: "#FFFFFF", t: "#2F6FD6"},
  yellow: {c: "#F2B81C", on: "#23282E", t: "#946A00"},
  purple: {c: "#7A4FC9", on: "#FFFFFF", t: "#7A4FC9"},
  green:  {c: "#238A4E", on: "#FFFFFF", t: "#238A4E"},
  grey:   {c: "#6B7682", on: "#FFFFFF", t: "#5C6570"}
};

/* ---------- the move library ---------- */
const MOVES = {
  "goblet-squat": {name: "Goblet squat", lift: true, start: [10, 10], pattern: "Squat",
    steps: ["Stand with feet a little wider than your hips, toes turned out slightly.", "Hold the bell by the sides of its handle at chest height, elbows tucked in.", "Sit down between your heels, chest up, knees following your toes.", "Go as low as you can with a flat back, then drive up through the whole foot."],
    watch: ["Heels lifting: widen your stance or put a thin book under your heels.", "Knees caving in: push them out over your little toes."],
    easier: "Squat to a chair or the sofa edge and stand straight back up.", harder: "Three seconds on the way down and a one-second pause at the bottom.",
    video: "kettlebell goblet squat form"},
  "goblet-squat-tempo": {name: "Slow goblet squat", demo: "goblet-squat-tempo", lift: true, start: [10, 16], pattern: "Squat",
    steps: ["Set up exactly like the goblet squat.", "Count three seconds on the way down.", "Pause for one second at the bottom without bouncing.", "Stand up at normal speed."],
    watch: ["Rushing the lowering: the slow part is where the work is."],
    easier: "Normal-speed goblet squats.", harder: "Use the 16kg bell.",
    video: "tempo goblet squat"},
  "rdl": {name: "Romanian deadlift", lift: true, start: [10, 16], pattern: "Hinge",
    steps: ["Stand tall holding the bell in both hands in front of your thighs.", "Soften your knees, then push your hips back as if shutting a car door with your bum.", "Let the bell slide down close to your legs, back flat, until you feel a stretch in your hamstrings.", "Squeeze your glutes to stand back up tall."],
    watch: ["Rounding your back: stop higher up.", "Turning it into a squat: the knees barely bend; the hips go back."],
    easier: "Bodyweight hip hinges with hands on hips.", harder: "Single-leg version holding a chair for balance.",
    video: "kettlebell romanian deadlift form"},
  "kb-deadlift": {name: "Kettlebell deadlift", lift: true, start: [16, 16], pattern: "Hinge",
    steps: ["Bell on the floor between your feet, in line with your ankles.", "Push your hips back and bend your knees to reach the handle with a flat back.", "Grip hard, pull your shoulders down and back.", "Stand up by pushing the floor away, finish tall with glutes squeezed."],
    watch: ["Bell too far forward: it should sit between your ankles.", "Back rounding as you lift: lower your hips a little."],
    easier: "Put the bell on a thick book so you don't have to reach as low.", harder: "Hold two bells (16kg and 10kg), one in each hand.",
    video: "kettlebell deadlift form"},
  "swing": {name: "Kettlebell swing", lift: true, start: [10, 10], pattern: "Hinge",
    steps: ["Bell on the floor a foot in front of you. Hinge down and grab the handle with both hands.", "Hike it back between your legs like a rugby pass.", "Stand up hard, squeezing your glutes, so the bell floats up to chest height. Your arms just guide it.", "Let it fall back between your legs and hinge to catch it. Repeat."],
    watch: ["Lifting with your arms: the power comes from your hips.", "Squatting: it's a hinge, knees only slightly bent.", "Leaking or pressure down below: swap to deadlifts and mention it to your GP. Very common and very treatable."],
    easier: "Kettlebell deadlifts, standing up fast at the top.", harder: "The 16kg bell.",
    video: "kettlebell swing for beginners"},
  "reverse-lunge": {name: "Reverse lunge", pattern: "Lunge", bodyweight: true,
    steps: ["Stand tall, hands on hips or holding a chair for balance.", "Take a big step backwards and lower your back knee towards the floor.", "Keep your front heel down and your chest up.", "Push through the front foot to step back to standing."],
    watch: ["Front knee shooting forward: take a longer step back.", "Wobbling: hold a chair. Balance improves quickly."],
    easier: "Step-ups on the bottom stair.", harder: "Hold the bell at your chest.",
    video: "reverse lunge form"},
  "goblet-reverse-lunge": {name: "Reverse lunge with the bell", demo: "goblet-reverse-lunge", lift: true, start: [6, 10], pattern: "Lunge",
    steps: ["Hold the bell at your chest like a goblet squat.", "Step back and lower the back knee towards the floor.", "Front heel stays down, chest stays up.", "Drive through the front foot to come back up."],
    watch: ["Leaning forward: keep the bell close to your chest."],
    easier: "Bodyweight reverse lunges.", harder: "Pause for a second with the knee just off the floor.",
    video: "goblet reverse lunge"},
  "split-squat": {name: "Split squat", lift: true, start: [6, 10], pattern: "Lunge",
    steps: ["Take a long step forward so your feet are like on train tracks, not a tightrope.", "Hold the bell at your chest (or a chair for balance).", "Lower straight down until your back knee nearly touches the floor.", "Push up through the front foot. Do all reps on one side, then swap."],
    watch: ["Feet in one line: widen them so you're steady."],
    easier: "Bodyweight, holding a chair.", harder: "The 10kg or 16kg bell.",
    video: "kettlebell split squat"},
  "step-up": {name: "Step-up", pattern: "Lunge", bodyweight: true,
    steps: ["Use the bottom stair or a sturdy step.", "Put your whole foot on the step.", "Drive up through that heel, trying not to push off the back foot.", "Step down slowly and under control."],
    watch: ["Pushing off the floor foot: keep that leg lazy."],
    easier: "Hold the banister.", harder: "Hold the 6kg bell at your chest or a bell in each hand.",
    video: "step up exercise form"},
  "glute-bridge": {name: "Glute bridge", pattern: "Hinge", bodyweight: true,
    steps: ["Lie on your back, knees bent, feet flat and hip-width apart.", "Press through your heels to lift your hips.", "Squeeze your glutes hard at the top for a second.", "Lower slowly."],
    watch: ["Arching your lower back: lift only as high as your glutes take you."],
    easier: "Smaller range.", harder: "Rest a bell across your hips.",
    video: "glute bridge form"},
  "bell-bridge": {name: "Glute bridge with the bell", demo: "bell-bridge", lift: true, start: [10, 16], pattern: "Hinge",
    steps: ["Lie on your back, knees bent, feet flat.", "Rest the bell across your hips on a folded towel and hold it steady.", "Press through your heels to lift your hips, squeeze for a second at the top.", "Lower slowly."],
    watch: ["Pushing through your toes: keep the pressure in your heels."],
    easier: "No bell.", harder: "The 16kg bell, or pause for three seconds at the top.",
    video: "weighted glute bridge kettlebell"},
  "single-leg-bridge": {name: "Single-leg glute bridge", demo: "single-leg-bridge", pattern: "Hinge", bodyweight: true,
    steps: ["Lie on your back with one foot planted and the other leg straight.", "Press through the planted heel to lift your hips.", "Keep your hips level at the top and squeeze.", "Lower slowly. Do all reps, then swap."],
    watch: ["Hips tipping to one side: go lower until you can keep them level."],
    easier: "Two-leg bridge with the bell.", harder: "Pause three seconds at the top.",
    video: "single leg glute bridge"},
  "floor-press": {name: "Floor press", lift: true, start: [6, 10], pattern: "Push",
    steps: ["Lie on your back, knees bent, bell in one hand by your chest.", "Press it straight up until your arm is straight.", "Lower until your upper arm touches the floor.", "Keep your elbow about 45 degrees from your body, not flared out wide."],
    watch: ["Wrist bent back: keep it straight with the bell resting on your forearm."],
    easier: "Two hands on one lighter bell.", harder: "The 10kg bell.",
    video: "single arm kettlebell floor press"},
  "hk-press": {name: "Half-kneeling overhead press", lift: true, start: [6, 6], pattern: "Push",
    steps: ["Kneel on one knee on a cushion, other foot forward.", "Hold the bell at your shoulder on the same side as the down knee.", "Squeeze that glute, ribs down, and press straight up.", "Finish with your bicep by your ear, then lower slowly."],
    watch: ["Leaning back to push it up: go lighter.", "Shoulder pain: switch to the floor press."],
    easier: "The 2.5kg bell, or seated on a chair.", harder: "Standing press.",
    video: "half kneeling kettlebell press"},
  "incline-push-up": {name: "Incline push-up", pattern: "Push", bodyweight: true,
    steps: ["Hands on the kitchen worktop, a little wider than your shoulders.", "Walk your feet back until your body is one straight line.", "Lower your chest to the edge.", "Push away until your arms are straight."],
    watch: ["Hips sagging: squeeze your glutes and thighs."],
    easier: "A higher surface, or push-ups against the wall.", harder: "A lower surface: the sofa arm, then a stair, then the floor.",
    video: "incline push up form"},
  "push-up": {name: "Push-up", pattern: "Push", bodyweight: true,
    steps: ["Pick the lowest surface where you can do 8 tidy reps: worktop, sofa, stair, knees or floor.", "Hands under your shoulders, body straight from head to heels (or knees).", "Lower your chest towards your hands.", "Push the floor away."],
    watch: ["Head dropping first: lead with your chest."],
    easier: "A higher surface.", harder: "A lower one. Floor push-ups are a brilliant goal.",
    video: "how to do a push up beginner"},
  "sa-row": {name: "Single-arm row", lift: true, start: [10, 16], pattern: "Pull",
    steps: ["One hand on a chair seat, same-side foot back, back flat.", "Let the bell hang from your other hand.", "Pull it towards your hip pocket, elbow close to your side.", "Pause, then lower slowly."],
    watch: ["Twisting to lift it: keep your chest facing the floor."],
    easier: "The 6kg bell.", harder: "The 16kg bell.",
    video: "single arm kettlebell row"},
  "bent-row": {name: "Two-handed bent-over row", lift: true, start: [10, 16], pattern: "Pull",
    steps: ["Hold the bell by the handle with both hands.", "Hinge forward to about 45 degrees with a flat back.", "Pull the bell to your belly button and squeeze your shoulder blades together.", "Lower slowly."],
    watch: ["Standing up as you pull: stay hinged."],
    easier: "Single-arm row supported on a chair.", harder: "The 16kg bell.",
    video: "kettlebell bent over row two hands"},
  "curl": {name: "Kettlebell curl", lift: true, start: [6, 10], pattern: "Arms",
    steps: ["Hold the bell by the sides of the handle, arms straight.", "Keep your elbows pinned to your sides.", "Curl the bell up to your chest.", "Lower slowly, taking two seconds."],
    watch: ["Swinging your body: go lighter."],
    easier: "The 2.5kg bell in each hand in turn.", harder: "The 10kg bell.",
    video: "kettlebell bicep curl"},
  "tri-ext": {name: "Overhead triceps extension", lift: true, start: [6, 6], pattern: "Arms",
    steps: ["Hold the bell by the horns behind your head, elbows pointing up.", "Keep your elbows close together.", "Straighten your arms to the ceiling.", "Lower behind your head slowly."],
    watch: ["Elbows flaring wide: squeeze them in.", "Arching your back: brace your stomach."],
    easier: "The 2.5kg bell.", harder: "The 10kg bell.",
    video: "kettlebell overhead tricep extension"},
  "suitcase-carry": {name: "Suitcase carry", lift: true, start: [10, 16], pattern: "Carry", secs: 30,
    steps: ["Bell in one hand by your side.", "Stand tall, shoulders level.", "Walk slowly round the room or garden without leaning away from the weight.", "Swap hands halfway."],
    watch: ["Leaning: imagine carrying one heavy shopping bag without letting it show."],
    easier: "The 6kg bell.", harder: "The 16kg bell.",
    video: "kettlebell suitcase carry"},
  "goblet-carry": {name: "Goblet carry", lift: true, start: [10, 16], pattern: "Carry", secs: 40,
    steps: ["Hold the bell at your chest as in the goblet squat.", "Stand tall and walk slowly.", "Keep breathing rather than holding your breath."],
    watch: ["Leaning back: brace your stomach."],
    easier: "The 6kg bell.", harder: "The 16kg bell.",
    video: "kettlebell goblet carry"},
  "dead-bug": {name: "Dead bug", pattern: "Core", bodyweight: true,
    steps: ["Lie on your back, arms to the ceiling, knees bent over your hips.", "Press your lower back into the floor and keep it there.", "Slowly lower one arm overhead and the opposite leg towards the floor.", "Bring them back and swap sides. Breathe out as they go down."],
    watch: ["Back lifting off the floor: don't lower as far."],
    easier: "Move only the legs.", harder: "Hold the 2.5kg bell in your hands.",
    video: "dead bug exercise"},
  "plank": {name: "Plank", pattern: "Core", bodyweight: true, secs: 25,
    steps: ["Forearms on the floor, elbows under shoulders.", "Step your feet back so your body is one straight line.", "Squeeze your glutes and thighs.", "Breathe steadily."],
    watch: ["Hips sagging or piking up: aim for a straight line."],
    easier: "Knees down.", harder: "Lift one foot at a time.",
    video: "forearm plank form"},
  "side-plank": {name: "Side plank", pattern: "Core", bodyweight: true, secs: 20,
    steps: ["Lie on your side, elbow under your shoulder.", "Lift your hips so you're in a straight line.", "Top arm on your hip or up to the ceiling.", "Hold, then swap sides."],
    watch: ["Hips drooping: bend your bottom knee and rest it on the floor."],
    easier: "Bottom knee down.", harder: "Lift the top leg.",
    video: "side plank for beginners"},
  "mountain-climber": {name: "Mountain climbers", pattern: "Conditioning", bodyweight: true, secs: 20,
    steps: ["Hands on the sofa edge, a stair or the floor, body straight.", "Drive one knee towards your chest.", "Swap legs, keeping a steady rhythm.", "Keep your hips level."],
    watch: ["Bum in the air: lower it into a straight line."],
    easier: "Hands higher (the sofa edge) and step rather than run.", harder: "Hands on the floor, faster.",
    video: "mountain climbers beginner"},
  "burpee": {name: "Step-back burpee", pattern: "Conditioning", bodyweight: true,
    steps: ["Squat down and put your hands on the floor.", "Step one foot back, then the other, into a plank.", "Step them back in, one at a time.", "Stand up tall."],
    watch: ["Rushing and losing form: steady is fine."],
    easier: "Hands on a chair seat instead of the floor.", harder: "Jump the feet back and in, and add a small jump at the top.",
    video: "step back burpee low impact"},
  "squat-to-press": {name: "Squat to press", lift: true, start: [6, 6], pattern: "Conditioning",
    steps: ["Hold a light bell at your chest.", "Squat down.", "As you stand, press the bell overhead with both hands.", "Bring it back to your chest and go again."],
    watch: ["Arching your back at the top: ribs down, glutes squeezed."],
    easier: "The 2.5kg bell.", harder: "The 10kg bell.",
    video: "kettlebell squat to press"},
  "high-knees": {name: "Sprint on the spot", pattern: "Sprint", bodyweight: true,
    steps: ["Stand tall on the balls of your feet.", "Drive your knees up as fast as you can.", "Pump your arms hard.", "Go at about 8 out of 10 effort, not flat out."],
    watch: ["Heavy landing: stay light and quick.", "Knees or pelvic floor complaining: fast marching with big arm swings works too."],
    easier: "Fast march.", harder: "Longer intervals.",
    video: "high knees exercise"},
  "sprint": {name: "Sprint", pattern: "Sprint", bodyweight: true,
    steps: ["Outside, on a flat path or a gentle hill (hills are kinder on the joints).", "Start from a walk, build up over the first few steps.", "Run hard at about 8 out of 10, leaning slightly forward, arms driving.", "Walk back slowly to recover."],
    watch: ["Going all-out on the first one: the first two should feel like 7 out of 10.", "Sharp pain in a calf or hamstring: stop and walk."],
    easier: "Brisk uphill walking intervals.", harder: "Longer hill, or add a couple of reps.",
    video: "hill sprints for beginners"},
  "halo": {name: "Kettlebell halo", lift: true, start: [2.5, 6], pattern: "Mobility",
    steps: ["Hold a light bell upside down by the horns at your chest.", "Circle it close around your head.", "Keep your ribs down and stomach braced.", "Go both ways."],
    watch: ["Big circles far from your head: keep it close."],
    easier: "The 2.5kg bell.", harder: "The 6kg bell.",
    video: "kettlebell halo"},
  "heel-drops": {name: "Heel drops", pattern: "Mobility", bodyweight: true,
    steps: ["Stand tall, holding a wall if you like.", "Rise up onto your toes.", "Drop your heels down firmly so you feel a small jolt.", "That jolt is good for your bones."],
    watch: ["Sore knees: soften them a little on landing."],
    easier: "Gentler drops.", harder: "Small hops on the spot.",
    video: "heel drops bone density"},
  "bw-squat": {name: "Bodyweight squat", pattern: "Squat", bodyweight: true,
    steps: ["Feet shoulder-width apart.", "Reach your arms forward as you sit back and down.", "Chest up, knees over toes.", "Stand up tall."],
    watch: ["Heels lifting: go less deep."],
    easier: "Squat to a chair.", harder: "Pause at the bottom.",
    video: "bodyweight squat form"},
  "hip-hinge": {name: "Hip hinge", pattern: "Hinge", bodyweight: true,
    steps: ["Hands on hips, knees soft.", "Push your hips back, keeping your back flat.", "Stop when you feel the backs of your legs stretch.", "Squeeze your glutes to stand."],
    watch: ["Rounding your back."],
    easier: "Smaller range.", harder: "Hold a light bell.",
    video: "hip hinge drill"},
  "march": {name: "March on the spot", pattern: "Warm-up", bodyweight: true,
    steps: ["Lift your knees to hip height.", "Swing your arms.", "Build the pace over the minute."], watch: [], video: "march on the spot warm up"}
};

/* ---------- months ---------- */
/* sets, extra reps, finisher minutes, sprints [reps, seconds on, seconds off], circuit [rounds, work, rest] */
const MONTHS_PLAN = [
  {name: "Foundations", aim: "Learn the moves, build the habit, find your bells.", phase: "base", restScale: 1,
   weeks: [
     {sets: 2, add: 0, fin: 4, sprint: [5, 15, 75], circ: [2, 30, 30], note: "Welcome to month 1. Two sets of everything so you can learn the moves. Finish every set with 2 or 3 reps still in the tank."},
     {sets: 3, add: 0, fin: 5, sprint: [6, 15, 75], circ: [2, 30, 30], note: "A third set on everything. Same bells as last week."},
     {sets: 3, add: 2, fin: 6, sprint: [6, 15, 60], circ: [3, 30, 30], note: "Two more reps per set and a longer finisher. The last reps should feel like work."},
     {sets: 3, add: 2, fin: 6, sprint: [8, 15, 60], circ: [3, 30, 30], note: "Last week of the month. If squats and deadlifts feel comfortable, try the next bell up for your first set."}]},
  {name: "Build", aim: "Harder versions of the moves and the 16kg bell for your legs.", phase: "build", restScale: 1,
   weeks: [
     {sets: 3, add: 0, fin: 6, sprint: [6, 20, 70], circ: [3, 40, 20], note: "Month 2 brings in harder versions: slow squats, lunges holding the bell, single-leg bridges. Three sets from the start."},
     {sets: 3, add: 1, fin: 7, sprint: [7, 20, 70], circ: [3, 40, 20], note: "One more rep per set and a longer finisher."},
     {sets: 3, add: 2, fin: 8, sprint: [8, 20, 60], circ: [3, 40, 20], note: "Two more reps than week 1. If you haven't yet, use 16kg for deadlifts and Romanian deadlifts."},
     {sets: 3, add: 3, fin: 8, sprint: [8, 20, 60], circ: [4, 40, 20], note: "Three more reps than week 1 and an extra circuit round."}]},
  {name: "Burn", aim: "Shorter rests, longer finishers, more sprints.", phase: "build", restScale: 0.75,
   weeks: [
     {sets: 3, add: 0, fin: 8, sprint: [8, 20, 60], circ: [3, 45, 15], note: "Month 3 cuts every rest by a quarter and lengthens the finishers. Keep month 2's bells."},
     {sets: 3, add: 2, fin: 8, sprint: [9, 20, 60], circ: [3, 45, 15], note: "Two more reps per set. Push the pace on the finishers."},
     {sets: 3, add: 2, fin: 9, sprint: [10, 20, 50], circ: [4, 45, 15], note: "Longer finishers this week. Breathe, and keep your form tidy."},
     {sets: 3, add: 3, fin: 9, sprint: [10, 25, 50], circ: [4, 45, 15], note: "Three more reps than week 1. After this the plan keeps going in this format; go heavier wherever it felt easy."}]}
];
function monthPlan(n) {
  if (n <= MONTHS_PLAN.length) return MONTHS_PLAN[n - 1];
  const m = MONTHS_PLAN[MONTHS_PLAN.length - 1];
  return Object.assign({}, m, {name: "Keep going", aim: "The month 3 format with heavier bells or harder versions wherever the last month felt comfortable."});
}

/* ---------- sessions ---------- */
/* main: [phase "base" list, phase "build" list]; pairs share a letter; rest in seconds */
const SESSIONS = [
  {
    id: "legs", short: "Legs", color: "pink", title: "Legs and glutes",
    kit: "the 10kg and 16kg bells, a mat and the bottom stair",
    warm: [
      {ex: "march", amt: "1 min", secs: 60},
      {ex: "bw-squat", amt: "10", secs: 40},
      {ex: "glute-bridge", amt: "10", secs: 40},
      {ex: "heel-drops", amt: "15", secs: 30, cue: "The jolt through your heels is good for your bones."},
      {ex: "halo", amt: "5 each way, 2.5kg", secs: 40}
    ],
    main: {
      base: [
        {ex: "goblet-squat", pair: "A", reps: 10, rest: 30},
        {ex: "rdl", pair: "A", reps: 10, rest: 60},
        {ex: "reverse-lunge", pair: "B", reps: 8, each: true, rest: 30},
        {ex: "bell-bridge", pair: "B", reps: 12, rest: 45},
        {ex: "step-up", pair: "C", reps: 8, each: true, rest: 30},
        {ex: "side-plank", pair: "C", secs: 20, each: true, rest: 30}],
      build: [
        {ex: "goblet-squat-tempo", pair: "A", reps: 8, rest: 30},
        {ex: "rdl", pair: "A", reps: 10, rest: 60},
        {ex: "goblet-reverse-lunge", pair: "B", reps: 8, each: true, rest: 30},
        {ex: "single-leg-bridge", pair: "B", reps: 10, each: true, rest: 45},
        {ex: "step-up", pair: "C", reps: 10, each: true, rest: 30},
        {ex: "side-plank", pair: "C", secs: 25, each: true, rest: 30}]
    },
    finisher: {kind: "emom", name: "A swing every minute", ex: "swing",
      text: m => `At the start of each minute do ${m.phase === "base" ? 10 : 12} kettlebell swings, then rest for the rest of the minute.`,
      cue: "Swings not feeling right yet? Do fast kettlebell deadlifts instead.",
      label: m => `${m.phase === "base" ? 10 : 12} swings, then rest`},
    cool: [
      {name: "Kneeling hip flexor stretch", amt: "30s each side", secs: 60},
      {name: "Figure-four stretch on your back", amt: "30s each side", secs: 60},
      {name: "Seated hamstring stretch", amt: "30s", secs: 30}
    ]
  },
  {
    id: "upper", short: "Upper", color: "blue", title: "Upper body and core",
    kit: "the 6kg and 10kg bells, a chair, a cushion and a mat",
    warm: [
      {name: "Arm circles", amt: "10 each way", secs: 40},
      {name: "Cat-cow", amt: "8", secs: 40, cue: "On hands and knees, slowly round then arch your back with your breath."},
      {ex: "halo", amt: "5 each way, 2.5kg", secs: 40},
      {ex: "incline-push-up", amt: "5, worktop", secs: 30}
    ],
    main: {
      base: [
        {ex: "sa-row", pair: "A", reps: 10, each: true, rest: 20},
        {ex: "floor-press", pair: "A", reps: 10, each: true, rest: 45},
        {ex: "hk-press", pair: "B", reps: 8, each: true, rest: 20},
        {ex: "incline-push-up", pair: "B", reps: 8, rest: 45},
        {ex: "curl", pair: "C", reps: 10, rest: 20},
        {ex: "tri-ext", pair: "C", reps: 10, rest: 30}],
      build: [
        {ex: "sa-row", pair: "A", reps: 12, each: true, rest: 20},
        {ex: "floor-press", pair: "A", reps: 10, each: true, rest: 45},
        {ex: "hk-press", pair: "B", reps: 8, each: true, rest: 20},
        {ex: "push-up", pair: "B", reps: 8, rest: 45},
        {ex: "curl", pair: "C", reps: 12, rest: 20},
        {ex: "tri-ext", pair: "C", reps: 12, rest: 30}]
    },
    finisher: {kind: "circuit", name: "Core round",
      text: () => "Dead bug, plank, then a suitcase carry in each hand. 30 seconds each, 15 seconds between.",
      moves: ["dead-bug", "plank", {ex: "suitcase-carry", name: "Suitcase carry, left hand"}, {ex: "suitcase-carry", name: "Suitcase carry, right hand"}], work: 30, rest: 15},
    cool: [
      {name: "Doorway chest stretch", amt: "30s each side", secs: 60},
      {name: "Child's pose, slow breathing", amt: "1 min", secs: 60},
      {name: "Thread the needle", amt: "30s each side", secs: 60}
    ]
  },
  {
    id: "sprint", short: "Sprints", color: "yellow", title: "Sprints and sweat",
    kit: "trainers, the 6kg and 10kg bells and some floor space. Outside for sprints if you can",
    warm: [
      {ex: "march", amt: "2 min, building to a jog", secs: 120},
      {name: "Leg swings", amt: "10 each leg", secs: 40, cue: "Hold a wall, swing each leg forwards and back."},
      {ex: "bw-squat", amt: "10", secs: 40},
      {ex: "reverse-lunge", amt: "5 each side", secs: 40},
      {ex: "high-knees", amt: "3 × 10s at half pace", secs: 60}
    ],
    sprints: {moves: ["sprint", "high-knees"],
      text: "Outside: a flat path or gentle hill, sprint then walk back. Inside: sprint on the spot. About 8 out of 10 effort, never flat out."},
    circuit: {moves: ["swing", "squat-to-press", "mountain-climber", {ex: "reverse-lunge", name: "Alternating reverse lunges"}, "burpee"], roundRest: 60},
    cool: [
      {name: "Walk it off", amt: "2 min", secs: 120},
      {name: "Standing quad stretch", amt: "30s each side", secs: 60},
      {name: "Calf stretch against a wall", amt: "30s each side", secs: 60}
    ]
  },
  {
    id: "full", short: "Full body", color: "purple", title: "Whole body burn",
    kit: "all your bells and a mat",
    warm: [
      {ex: "halo", amt: "5 each way, 2.5kg", secs: 40},
      {ex: "glute-bridge", amt: "10", secs: 40},
      {name: "World's greatest stretch", amt: "3 each side", secs: 60, cue: "Lunge forward, hand down inside the front foot, elbow towards the floor, then rotate that arm to the ceiling."},
      {ex: "heel-drops", amt: "15", secs: 30},
      {ex: "bw-squat", amt: "10", secs: 40}
    ],
    main: {
      base: [
        {ex: "kb-deadlift", pair: "A", reps: 10, rest: 30},
        {ex: "incline-push-up", pair: "A", reps: 8, rest: 60},
        {ex: "split-squat", pair: "B", reps: 8, each: true, rest: 30},
        {ex: "bent-row", pair: "B", reps: 10, rest: 60},
        {ex: "goblet-carry", pair: "C", secs: 40, rest: 20},
        {ex: "mountain-climber", pair: "C", secs: 20, rest: 30}],
      build: [
        {ex: "kb-deadlift", pair: "A", reps: 12, rest: 30},
        {ex: "push-up", pair: "A", reps: 8, rest: 60},
        {ex: "split-squat", pair: "B", reps: 10, each: true, rest: 30},
        {ex: "bent-row", pair: "B", reps: 12, rest: 60},
        {ex: "goblet-carry", pair: "C", secs: 45, rest: 20},
        {ex: "mountain-climber", pair: "C", secs: 30, rest: 30}]
    },
    finisher: {kind: "amrap", name: "Round-up", record: "rounds",
      text: m => `5 goblet squats, 5 push-ups, 10 swings. As many rounds as you can in ${m.fin} minutes with good form. Log your rounds and try to beat it.`,
      label: () => "5 squats, 5 push-ups, 10 swings", moves: ["goblet-squat", "push-up", "swing"]},
    cool: [
      {name: "Kneeling hip flexor stretch", amt: "30s each side", secs: 60},
      {name: "Child's pose, slow breathing", amt: "1 min", secs: 60},
      {name: "Doorway chest stretch", amt: "30s each side", secs: 60}
    ]
  },
  {
    id: "stretch", short: "Stretch", color: "green", title: "Stretch and reset",
    kit: "a mat and a chair",
    intro: "For rest days, stiff days or the evening. It doesn't move the plan on, but it helps recovery and sleep. The timer gives you 50 seconds per stretch.",
    follow: {work: 50, rest: 10, moves: [
      {name: "Cat-cow", cue: "On hands and knees, slowly round then arch your back with your breath."},
      {name: "Thread the needle, left", cue: "From hands and knees, slide your left arm under your body and rest your shoulder down."},
      {name: "Thread the needle, right"},
      {name: "World's greatest stretch, left", cue: "Lunge with your left foot forward, right hand down, left elbow towards the floor, then rotate your left arm to the ceiling."},
      {name: "World's greatest stretch, right"},
      {name: "90/90 hip switches", cue: "Sit with both knees bent at right angles to one side, then rotate them to the other side."},
      {name: "Figure-four stretch, left", cue: "On your back, left ankle over right knee, pull the right thigh towards you."},
      {name: "Figure-four stretch, right"},
      {name: "Supported deep squat", cue: "Hold the back of a chair and sink into a deep squat. Let your hips hang and breathe."},
      {name: "Open book, left", cue: "Lying on your left side, knees bent, open your top arm across to the other side and follow it with your eyes."},
      {name: "Open book, right"},
      {name: "Child's pose, slow breathing", cue: "Knees wide, arms long, long slow breaths out."}
    ]}
  }
];

/* The order workouts come round in. Three days: the three strength sessions. Four: sprints join. */
const ROTATIONS = {3: ["legs", "upper", "full"], 4: ["legs", "upper", "sprint", "full"]};

const SKIP_REASONS = [
  {id: "work", label: "Work got in the way"},
  {id: "time", label: "Ran out of time"},
  {id: "tired", label: "Tired or slept badly"},
  {id: "hormonal", label: "Period or hormonal symptoms"},
  {id: "unwell", label: "Unwell"},
  {id: "sore", label: "Sore or injured"},
  {id: "motivation", label: "Didn't feel like it"},
  {id: "away", label: "Away or busy day"},
  {id: "other", label: "Something else"}
];
const ACTIVITIES = ["Walk", "Run", "Yoga or Pilates", "Swim", "Cycle", "Class", "Other"];
const SYMPTOMS = ["Hot flushes", "Night sweats", "Joint aches", "Headache", "Brain fog", "Bloating", "Anxious", "Irritable", "Low mood", "Cramps", "Cravings"];
const EFFORT = [
  {v: 1, label: "Easy", sub: "Could have done loads more"},
  {v: 2, label: "Comfortable", sub: "A good steady session"},
  {v: 3, label: "Solid", sub: "Worked, 2 or 3 reps left"},
  {v: 4, label: "Hard", sub: "Last reps were a fight"},
  {v: 5, label: "Too much", sub: "Form slipped or felt awful"}
];
const NIGGLES = ["Knees", "Lower back", "Shoulders", "Hips", "Wrists", "Pelvic floor"];
const BELL_OPTIONS = [2.5, 4, 6, 8, 10, 12, 14, 16, 20, 24];

const NOTES = [
  {h: "Your bells", p: "2.5kg for halos and warm-ups, 6kg for presses, curls and triceps, 10kg for rows, squats and swings, 16kg for deadlifts and, from month 2, Romanian deadlifts and bridges. The app remembers what you used and suggests when to move up."},
  {h: "How hard", p: "Finish each set feeling you could have done 2 or 3 more reps with good form. If the last reps get messy, the bell is too heavy for now."},
  {h: "Swings", p: "The one move where technique really matters. Watch the demo, and do fast deadlifts instead until the swing feels like a hip snap rather than an arm lift."},
  {h: "If something hurts", p: "Muscles feeling worked is normal. Sharp or joint pain isn't: stop that move and use the easier option shown with it. Log it as a niggle when you finish so you can spot a pattern."}
];
const LOSS_NOTES = [
  {h: "What actually moves the scales", p: "Food does most of the work for weight loss; training decides whether what you lose is fat or muscle. A modest, steady deficit (smaller portions, fewer liquid calories and snacks) beats a crash diet, which strips muscle and wrecks energy."},
  {h: "Protein at every meal", p: "Aim for a palm or two of protein at each meal (roughly 25 to 35g): eggs, Greek yoghurt, chicken, fish, tofu, lentils. It keeps you full, protects muscle while you lose fat, and helps recovery after a lunchtime session."},
  {h: "Steps matter more than you'd think", p: "Walking burns more over a week than any workout. Aim for 7,000 to 9,000 steps a day; a 10-minute walk after lunch or dinner also helps blood sugar. You can log steps in the daily check-in."},
  {h: "Judge progress monthly", p: "Weight swings by a kilo or two day to day, more around your period. Weigh at most once a week at the same time, and measure your waist monthly. Stronger lifts and looser clothes count as much as the scales."}
];
const MENO_NOTES = [
  {h: "Why lifting matters now", p: "Falling oestrogen speeds up the loss of muscle and bone and makes fat more likely to settle around the middle. Lifting properly heavy two or three times a week is one of the best-evidenced ways to fight all three, and it helps sleep and mood too."},
  {h: "Sprints over long cardio", p: "Short, hard efforts with full recovery give a big fitness return in little time and are kinder on cortisol and joints than long slogs. Hills are easier on the knees than flat ground."},
  {h: "Bones like a jolt", p: "Heel drops and swings add a little impact, which bone responds to. If your joints are happy, progress to small hops on the spot."},
  {h: "Low-energy days count", p: "On bad-sleep or rough-symptom days, do the short version or the stretch session. Showing up for 20 minutes keeps the habit alive."},
  {h: "Hot at lunchtime?", p: "Open a window or put a fan on before you start, keep cold water nearby, and have a change of top ready for going back to work."},
  {h: "Tracking helps", p: "The daily check-in builds a picture you can take to your GP, and shows whether skipped sessions line up with symptoms, sleep or your cycle. Nothing leaves your phone."}
];
