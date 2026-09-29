/* Keyframes for the exercise demonstrations drawn by figure.js.
   h = hip, t = torso angle, nf/ff = near/far ankle, nh/fh = near/far hand,
   nhs/fhs = hand relative to the shoulder, nhh/fhh = hand relative to the hip,
   ta = toe angles, bell = which hand holds the kettlebell, bo = bell offset from the hand,
   plank = {a: ankle, s: shoulder} for a straight body line. d = seconds moving to the next frame, hold = pause. */
(function () {
"use strict";
const ARMS_DOWN = {nhs: [3, 62], fhs: [-2, 62]};
const GOBLET = {nhs: [16, 16], fhs: [14, 18], bell: "both", bo: [0, 11]};
const HIPS = {nhs: null, fhs: null, nhh: [9, -2], fhh: [-7, -2]};
const STAND = Object.assign({h: [110, 93], t: 180, nf: [110, 181], ff: [115, 181]}, ARMS_DOWN);
const LYING = {h: [132, 176], t: -90, hd: -90, nf: [172, 181], ff: [176, 181]};
const S = (o) => Object.assign({}, STAND, o);

window.DEMOS = {
  "goblet-squat": {alt: "Goblet squat: sit down between the heels holding the bell at the chest, then stand.",
    base: S(GOBLET),
    frames: [{d: 1.1, hold: 0.5}, {h: [84, 138], t: 150, d: 0.9, hold: 0.3}]},

  "goblet-squat-tempo": {alt: "Slow goblet squat: three seconds down, pause, stand.",
    base: S(GOBLET),
    frames: [{d: 2.6, hold: 0.4}, {h: [84, 138], t: 150, d: 0.8, hold: 0.6}]},

  "bw-squat": {alt: "Bodyweight squat with arms reaching forward.",
    base: S({}),
    frames: [{d: 1, hold: 0.4}, {h: [84, 138], t: 150, nhs: [60, 8], fhs: [58, 10], d: 0.9, hold: 0.3}]},

  "squat-to-press": {alt: "Squat with the bell at the chest, then press it overhead as you stand.",
    base: S(GOBLET),
    frames: [{h: [84, 138], t: 150, d: 0.7, hold: 0.2}, {d: 0.4, hold: 0}, {nhs: [4, -60], fhs: [2, -60], d: 0.7, hold: 0.3}]},

  "rdl": {alt: "Romanian deadlift: push the hips back with soft knees, bell sliding down the legs, then stand tall.",
    base: S({bell: "both", bo: [0, 12]}),
    frames: [{d: 1.2, hold: 0.4}, {h: [90, 97], t: 105, nhs: null, fhs: null, nh: [140, 150], fh: [136, 150], d: 1, hold: 0.3}]},

  "kb-deadlift": {alt: "Kettlebell deadlift: hinge down to the bell between the feet with a flat back, then stand up.",
    base: S({bell: "both", bo: [0, 14]}),
    frames: [{d: 1.2, hold: 0.4}, {h: [84, 134], t: 138, nhs: null, fhs: null, nh: [121, 158], fh: [117, 158], d: 1, hold: 0.4}]},

  "swing": {alt: "Kettlebell swing: hike the bell back between the legs, then snap the hips forward so it floats to chest height.",
    base: S({bell: "both"}), speed: 1,
    frames: [
      {h: [90, 100], t: 108, nhs: null, fhs: null, nh: [100, 142], fh: [97, 142], bo: [-8, 8], d: 0.32, hold: 0.04},
      {h: [106, 94], t: 176, nhs: null, fhs: null, nh: [140, 96], fh: [137, 98], bo: [6, 9], d: 0.3, hold: 0},
      {h: [110, 93], t: 184, nhs: null, fhs: null, nh: [168, 48], fh: [166, 50], bo: [11, 1], d: 0.3, hold: 0.12},
      {h: [106, 94], t: 176, nhs: null, fhs: null, nh: [140, 96], fh: [137, 98], bo: [6, 9], d: 0.3, hold: 0}]},

  "reverse-lunge": {alt: "Reverse lunge: step back and lower the back knee towards the floor, then push back up through the front foot.",
    base: S(HIPS),
    frames: [
      {d: 0.5, hold: 0.4},
      {h: [98, 102], ff: [70, 166], ta: [90, 45], d: 0.6, hold: 0},
      {h: [80, 135], t: 178, ff: [36, 173], ta: [90, 25], d: 0.6, hold: 0.3},
      {h: [98, 102], ff: [70, 166], ta: [90, 45], d: 0.5, hold: 0}]},

  "goblet-reverse-lunge": {alt: "Reverse lunge holding the bell at the chest.",
    base: S(GOBLET),
    frames: [
      {d: 0.5, hold: 0.4},
      {h: [98, 102], ff: [70, 166], ta: [90, 45], d: 0.6, hold: 0},
      {h: [80, 135], t: 178, ff: [36, 173], ta: [90, 25], d: 0.6, hold: 0.3},
      {h: [98, 102], ff: [70, 166], ta: [90, 45], d: 0.5, hold: 0}]},

  "split-squat": {alt: "Split squat: feet in a long stagger, lower straight down until the back knee nearly touches the floor.",
    base: S(Object.assign({ff: [40, 176], ta: [90, 30]}, GOBLET)),
    frames: [{h: [84, 104], d: 1, hold: 0.4}, {h: [80, 135], t: 178, d: 1, hold: 0.3}]},

  "step-up": {alt: "Step-up: whole foot on the step, drive up through the heel, then step down slowly.",
    props: [{type: "box", x: 122, y: 150, w: 72}],
    base: S(HIPS),
    frames: [
      {h: [106, 98], t: 174, nf: [146, 145], ff: [104, 181], d: 0.6, hold: 0.3},
      {h: [126, 76], t: 178, nf: [146, 145], ff: [128, 160], ta: [90, 60], d: 0.5, hold: 0},
      {h: [144, 58], t: 180, nf: [146, 145], ff: [151, 145], d: 0.8, hold: 0.3},
      {h: [126, 76], t: 178, nf: [146, 145], ff: [128, 160], ta: [90, 60], d: 0.6, hold: 0}]},

  "glute-bridge": {alt: "Glute bridge: lying on your back, press through the heels to lift the hips, squeeze, then lower.",
    base: Object.assign({}, LYING, {nh: [114, 183], fh: [110, 183]}),
    frames: [{d: 0.9, hold: 0.3}, {h: [132, 150], t: -58, hd: -82, d: 0.9, hold: 0.6}]},

  "bell-bridge": {alt: "Glute bridge with the bell resting across the hips.",
    base: Object.assign({}, LYING, {nhh: [-2, -16], fhh: [-5, -16], bell: "hip", bo: [0, -13]}),
    frames: [{d: 0.9, hold: 0.3}, {h: [132, 150], t: -58, hd: -82, d: 0.9, hold: 0.6}]},

  "single-leg-bridge": {alt: "Single-leg glute bridge: one foot planted, the other leg straight, lift the hips level.",
    base: Object.assign({}, LYING, {nh: [114, 183], fh: [110, 183], ff: [212, 150]}),
    frames: [{d: 0.9, hold: 0.3}, {h: [132, 150], t: -58, hd: -82, ff: [214, 118], d: 0.9, hold: 0.6}]},

  "floor-press": {alt: "Floor press: lying on your back, press the bell up until the arm is straight, lower until the upper arm touches the floor.",
    base: Object.assign({}, LYING, {fh: [112, 183], bell: "near", bo: [6, 8]}),
    frames: [{nh: [96, 152], d: 0.8, hold: 0.3}, {nh: [84, 115], d: 1, hold: 0.3}]},

  "dead-bug": {alt: "Dead bug: back pressed into the floor, slowly lower the opposite arm and leg, then swap.",
    base: Object.assign({}, LYING, {nf: [170, 140], ff: [174, 140], nh: [84, 114], fh: [86, 114]}),
    frames: [
      {d: 1, hold: 0.2},
      {nh: [26, 168], ff: [218, 168], d: 1, hold: 0.3},
      {d: 1, hold: 0.2},
      {fh: [28, 168], nf: [218, 168], d: 1, hold: 0.3}]},

  "plank": {alt: "Forearm plank: elbows under shoulders, body in one straight line.",
    base: {plank: {a: [34, 176], s: [172, 148]}, nh: [196, 182], fh: [192, 182], ta: [20, 20]},
    frames: [{d: 1.6, hold: 0.6}, {plank: {a: [34, 176], s: [172, 146]}, d: 1.6, hold: 0.6}]},

  "side-plank": {alt: "Side plank on the forearm, lifting the hips so the body is in a straight line.",
    base: {nh: [196, 182], fhs: [2, -60], ta: [20, 20]},
    frames: [
      {h: [112, 176], t: 114, nf: [30, 178], ff: [33, 178], d: 1, hold: 0.3},
      {plank: {a: [30, 178], s: [172, 146]}, d: 1, hold: 1}]},

  "push-up": {alt: "Push-up: body straight from head to heels, lower the chest towards the floor, push away.",
    base: {nh: [164, 181], fh: [160, 181], ta: [20, 20]},
    frames: [{plank: {a: [34, 176], s: [161, 120]}, d: 1, hold: 0.3}, {plank: {a: [30, 177], s: [160, 160]}, d: 0.8, hold: 0.2}]},

  "incline-push-up": {alt: "Incline push-up with hands on the kitchen worktop.",
    props: [{type: "box", x: 150, y: 104, w: 90}],
    base: {nh: [166, 104], fh: [162, 104], ta: [30, 30]},
    frames: [{plank: {a: [58, 176], s: [140, 62]}, d: 1, hold: 0.3}, {plank: {a: [56, 178], s: [157, 86]}, d: 0.8, hold: 0.2}]},

  "sa-row": {alt: "Single-arm row: one hand on a chair, pull the bell up to your hip pocket, lower slowly.",
    props: [{type: "chair", x: 150, y: 128, w: 54}],
    base: {h: [96, 98], t: 100, nf: [84, 181], ff: [114, 181], fh: [174, 128], bell: "near", bo: [0, 12]},
    frames: [{nh: [146, 150], d: 0.8, hold: 0.3}, {nh: [124, 106], d: 1, hold: 0.4}]},

  "bent-row": {alt: "Bent-over row: hinge forward with a flat back and pull the bell to your belly button.",
    base: S({h: [92, 97], t: 112, nhs: null, fhs: null, bell: "both", bo: [0, 12]}),
    frames: [{nh: [141, 152], fh: [138, 152], d: 0.8, hold: 0.3}, {nh: [116, 118], fh: [113, 118], d: 1, hold: 0.4}]},

  "hk-press": {alt: "Half-kneeling overhead press: kneel on one knee and press the bell on that side straight up.",
    props: [{type: "cushion", x: 78, w: 30}],
    base: {h: [100, 128], t: 180, nf: [48, 176], ff: [150, 181], ta: [-80, 90], fhh: [9, -4], bell: "near", bo: [-3, 9]},
    frames: [{nhs: [11, -6], d: 0.9, hold: 0.3}, {nhs: [2, -61], d: 1.1, hold: 0.4}]},

  "curl": {alt: "Kettlebell curl: elbows by your sides, curl the bell up, lower slowly.",
    base: S({bell: "both", bo: [0, 10]}),
    frames: [{nhs: [4, 58], fhs: [1, 58], d: 0.9, hold: 0.2}, {nhs: [17, 8], fhs: [14, 10], d: 1.2, hold: 0.3}]},

  "tri-ext": {alt: "Overhead triceps extension: bell behind your head, straighten the arms to the ceiling.",
    base: S({bell: "both", bo: [-4, 9]}),
    frames: [{nhs: [-12, -30], fhs: [-14, -30], d: 0.9, hold: 0.3}, {nhs: [3, -61], fhs: [1, -61], d: 1.1, hold: 0.3}]},

  "suitcase-carry": {alt: "Suitcase carry: bell in one hand, walk tall without leaning.",
    base: S({bell: "near", bo: [0, 12], nhs: [3, 62]}),
    frames: [
      {nf: [130, 181], ff: [92, 181], ta: [90, 55], fhs: [16, 58], d: 0.35, hold: 0},
      {h: [110, 90], nf: [110, 181], ff: [112, 166], ta: [90, 60], fhs: [2, 62], d: 0.35, hold: 0},
      {nf: [92, 181], ff: [130, 181], ta: [55, 90], fhs: [-14, 59], d: 0.35, hold: 0},
      {h: [110, 90], nf: [112, 166], ff: [110, 181], ta: [60, 90], fhs: [2, 62], d: 0.35, hold: 0}]},

  "goblet-carry": {alt: "Goblet carry: bell held at the chest, walk tall and keep breathing.",
    base: S(GOBLET),
    frames: [
      {nf: [130, 181], ff: [92, 181], ta: [90, 55], d: 0.35, hold: 0},
      {h: [110, 90], nf: [110, 181], ff: [112, 166], ta: [90, 60], d: 0.35, hold: 0},
      {nf: [92, 181], ff: [130, 181], ta: [55, 90], d: 0.35, hold: 0},
      {h: [110, 90], nf: [112, 166], ff: [110, 181], ta: [60, 90], d: 0.35, hold: 0}]},

  "halo": {alt: "Kettlebell halo: circle a light bell around your head, close to it, then reverse.",
    base: S({bell: "both", bo: [0, 9]}),
    frames: [
      {nhs: [20, -16], fhs: [18, -14], d: 0.5, hold: 0},
      {nhs: [2, -44], fhs: [0, -42], d: 0.5, hold: 0},
      {nhs: [-18, -18], fhs: [-20, -16], d: 0.5, hold: 0},
      {nhs: [2, -44], fhs: [0, -42], d: 0.5, hold: 0}]},

  "mountain-climber": {alt: "Mountain climbers: from a push-up position, drive one knee towards your chest, then swap.",
    base: {plank: {a: [34, 176], s: [161, 120]}, nh: [164, 181], fh: [160, 181], ta: [20, 20]},
    frames: [{nf: [118, 176], ta: [50, 20], d: 0.3, hold: 0.05}, {ff: [118, 176], ta: [20, 50], d: 0.3, hold: 0.05}]},

  "burpee": {alt: "Step-back burpee: hands down, step back to a plank one foot at a time, step in, stand up.",
    base: S({}),
    frames: [
      {d: 0.6, hold: 0.3},
      {h: [88, 136], t: 128, nhs: null, fhs: null, nh: [140, 182], fh: [136, 182], d: 0.5, hold: 0.1},
      {h: [100, 132], t: 112, nhs: null, fhs: null, nh: [150, 182], fh: [146, 182], ff: [40, 177], ta: [90, 20], d: 0.5, hold: 0},
      {plank: {a: [36, 176], s: [150, 120]}, nhs: null, fhs: null, nh: [152, 182], fh: [148, 182], nf: null, ff: null, ta: [20, 20], d: 0.5, hold: 0.2},
      {h: [100, 132], t: 112, nhs: null, fhs: null, nh: [150, 182], fh: [146, 182], ff: [40, 177], ta: [90, 20], d: 0.5, hold: 0},
      {h: [88, 136], t: 128, nhs: null, fhs: null, nh: [140, 182], fh: [136, 182], d: 0.6, hold: 0.1}]},

  "high-knees": {alt: "Sprint on the spot: drive the knees up fast and pump the arms.",
    base: S({h: [110, 91], t: 176}),
    frames: [
      {nf: [126, 146], ff: [112, 181], ta: [70, 90], nhs: [-18, 50], fhs: [24, 26], d: 0.2, hold: 0},
      {nf: [110, 181], ff: [128, 146], ta: [90, 70], nhs: [24, 26], fhs: [-18, 50], d: 0.2, hold: 0}]},

  "march": {alt: "March on the spot, lifting the knees and swinging the arms.",
    base: S({t: 180}),
    frames: [
      {nf: [120, 160], ff: [113, 181], ta: [80, 90], nhs: [-10, 58], fhs: [14, 56], d: 0.45, hold: 0},
      {nf: [110, 181], ff: [122, 160], ta: [90, 80], nhs: [14, 56], fhs: [-10, 58], d: 0.45, hold: 0}]},

  "sprint": {alt: "Sprinting: lean slightly forward, drive the arms and knees.",
    base: S({h: [110, 96], t: 168}),
    frames: [
      {nf: [150, 176], ff: [70, 152], ta: [90, 150], nhs: [-26, 44], fhs: [28, 22], d: 0.24, hold: 0},
      {h: [110, 92], nf: [118, 150], ff: [100, 181], ta: [80, 90], nhs: [2, 50], fhs: [2, 50], d: 0.2, hold: 0},
      {nf: [70, 152], ff: [150, 176], ta: [150, 90], nhs: [28, 22], fhs: [-26, 44], d: 0.24, hold: 0},
      {h: [110, 92], nf: [100, 181], ff: [118, 150], ta: [90, 80], nhs: [2, 50], fhs: [2, 50], d: 0.2, hold: 0}]},

  "heel-drops": {alt: "Heel drops: rise up onto your toes, then drop your heels down firmly.",
    base: S({}),
    frames: [{d: 0.5, hold: 0.25}, {h: [110, 84], nf: [110, 172], ff: [115, 172], ta: [25, 25], d: 0.15, hold: 0.2}]},

  "hip-hinge": {alt: "Hip hinge: hands on hips, push the hips back with a flat back, then stand tall.",
    base: S(HIPS),
    frames: [{d: 1, hold: 0.3}, {h: [90, 97], t: 110, d: 1, hold: 0.3}]}
};
})();
