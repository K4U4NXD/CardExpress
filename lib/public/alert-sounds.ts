const PUBLIC_PANEL_SOUND_ENABLED_PREFIX = "cardexpress:public-panel-sound-enabled:";

let sharedAudioContext: AudioContext | null = null;
let interactionTrackingInstalled = false;
let hasUserInteractionInSession = false;

function canPlayAudioNow() {
  if (typeof window === "undefined") {
    return false;
  }

  const userActivation = (window.navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } }).userActivation;
  if (userActivation?.hasBeenActive) {
    return true;
  }

  return hasUserInteractionInSession;
}

export function ensurePublicAudioInteractionTracking() {
  if (typeof window === "undefined" || interactionTrackingInstalled) {
    return;
  }

  interactionTrackingInstalled = true;

  const markInteraction = () => {
    hasUserInteractionInSession = true;
    window.removeEventListener("pointerdown", markInteraction, true);
    window.removeEventListener("keydown", markInteraction, true);
    window.removeEventListener("touchstart", markInteraction, true);
  };

  window.addEventListener("pointerdown", markInteraction, true);
  window.addEventListener("keydown", markInteraction, true);
  window.addEventListener("touchstart", markInteraction, true);
}

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextCtor();
  }

  return sharedAudioContext;
}

async function prepareContext() {
  ensurePublicAudioInteractionTracking();

  if (!canPlayAudioNow()) {
    return null;
  }

  const context = getAudioContext();
  if (!context) {
    return null;
  }

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    return context;
  } catch {
    return null;
  }
}

function scheduleTone(
  context: AudioContext,
  options: {
    startAt: number;
    frequency: number;
    duration: number;
    gainPeak: number;
    type: OscillatorType;
  }
) {
  const gain = context.createGain();
  const oscillator = context.createOscillator();

  gain.gain.setValueAtTime(0.0001, options.startAt);
  gain.gain.exponentialRampToValueAtTime(options.gainPeak, options.startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, options.startAt + options.duration);

  oscillator.type = options.type;
  oscillator.frequency.setValueAtTime(options.frequency, options.startAt);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(options.startAt);
  oscillator.stop(options.startAt + options.duration + 0.01);
}

export async function playPublicOrderStatusSound() {
  const context = await prepareContext();
  if (!context) {
    return false;
  }

  const now = context.currentTime;

  // Som curto e suave para cliente final.
  scheduleTone(context, {
    startAt: now,
    frequency: 622,
    duration: 0.14,
    gainPeak: 0.045,
    type: "sine",
  });

  scheduleTone(context, {
    startAt: now + 0.17,
    frequency: 698,
    duration: 0.16,
    gainPeak: 0.05,
    type: "sine",
  });

  return true;
}

function getPublicPanelSoundKey(slug: string) {
  return `${PUBLIC_PANEL_SOUND_ENABLED_PREFIX}${slug}`;
}

export function readPublicPanelSoundEnabled(slug: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(getPublicPanelSoundKey(slug)) === "1";
  } catch {
    return false;
  }
}

export function writePublicPanelSoundEnabled(slug: string, enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getPublicPanelSoundKey(slug), enabled ? "1" : "0");
  } catch {
    // Nao bloqueia UX quando localStorage estiver indisponivel.
  }
}

export async function playPublicPanelCallSound() {
  const context = await prepareContext();
  if (!context) {
    return false;
  }

  const now = context.currentTime;

  // Som mais perceptivel para painel de retirada, sem ficar estridente.
  scheduleTone(context, {
    startAt: now,
    frequency: 784,
    duration: 0.16,
    gainPeak: 0.09,
    type: "triangle",
  });

  scheduleTone(context, {
    startAt: now + 0.2,
    frequency: 988,
    duration: 0.18,
    gainPeak: 0.1,
    type: "triangle",
  });

  scheduleTone(context, {
    startAt: now + 0.42,
    frequency: 1175,
    duration: 0.2,
    gainPeak: 0.11,
    type: "triangle",
  });

  return true;
}
