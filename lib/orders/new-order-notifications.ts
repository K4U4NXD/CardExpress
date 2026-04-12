const NEW_ORDER_SOUND_PREF_KEY = "cardexpress:new-order-sound-enabled";
const NEW_ORDER_SOUND_LEVEL_KEY = "cardexpress:new-order-sound-level";
const SEEN_ACTIVE_ORDERS_STORAGE_PREFIX = "cardexpress:seen-active-orders:";
const PENDING_NEW_ORDERS_STORAGE_PREFIX = "cardexpress:pending-new-orders:";
const ORDER_FOCUS_STORAGE_PREFIX = "cardexpress:order-focus-target:";
const PENDING_NEW_ORDERS_EVENT = "cardexpress:pending-new-orders-changed";
const ORDER_FOCUS_EVENT = "cardexpress:order-focus-request";
const MAX_STORED_SEEN_IDS = 500;
const MAX_STORED_PENDING_IDS = 500;

let audioContextInstance: AudioContext | null = null;
let interactionTrackingInstalled = false;
let hasUserInteractionInSession = false;

type SeenActiveOrdersSnapshot = {
  initialized: boolean;
  ids: Set<string>;
};

export type NewOrderSoundLevel = "off" | "default" | "high";

type PendingOrdersChangedDetail = {
  storeId: string;
};

type OrderFocusRequestDetail = {
  storeId: string;
  orderId: string;
};

function getSeenActiveOrdersStorageKey(storeId: string) {
  return `${SEEN_ACTIVE_ORDERS_STORAGE_PREFIX}${storeId}`;
}

function getPendingOrdersStorageKey(storeId: string) {
  return `${PENDING_NEW_ORDERS_STORAGE_PREFIX}${storeId}`;
}

function getOrderFocusStorageKey(storeId: string) {
  return `${ORDER_FOCUS_STORAGE_PREFIX}${storeId}`;
}

export function getOrderCardElementId(orderId: string) {
  return `dashboard-order-card-${orderId}`;
}

function safeParseStoredIds(raw: string | null) {
  if (!raw) {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    const ids = new Set<string>();
    for (const value of parsed) {
      if (typeof value === "string" && value.length > 0) {
        ids.add(value);
      }
    }

    return ids;
  } catch {
    return new Set<string>();
  }
}

function safeParseSeenIds(raw: string | null): SeenActiveOrdersSnapshot {
  if (!raw) {
    return { initialized: false, ids: new Set<string>() };
  }

  try {
    const parsed = JSON.parse(raw) as { initialized?: boolean; ids?: unknown };
    if (!parsed || typeof parsed !== "object") {
      return { initialized: false, ids: new Set<string>() };
    }

    const ids = new Set<string>();
    if (Array.isArray(parsed.ids)) {
      for (const value of parsed.ids) {
        if (typeof value === "string" && value.length > 0) {
          ids.add(value);
        }
      }
    }

    return {
      initialized: parsed.initialized === true,
      ids,
    };
  } catch {
    return { initialized: false, ids: new Set<string>() };
  }
}

function truncateSeenIds(ids: Iterable<string>) {
  const list = Array.from(new Set(ids));
  if (list.length <= MAX_STORED_SEEN_IDS) {
    return list;
  }

  return list.slice(list.length - MAX_STORED_SEEN_IDS);
}

function truncatePendingIds(ids: Iterable<string>) {
  const list = Array.from(new Set(ids));
  if (list.length <= MAX_STORED_PENDING_IDS) {
    return list;
  }

  return list.slice(list.length - MAX_STORED_PENDING_IDS);
}

function dispatchPendingOrdersChanged(storeId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<PendingOrdersChangedDetail>(PENDING_NEW_ORDERS_EVENT, {
      detail: { storeId },
    })
  );
}

export function readSeenActiveOrderIds(storeId: string): SeenActiveOrdersSnapshot {
  if (typeof window === "undefined") {
    return { initialized: false, ids: new Set<string>() };
  }

  try {
    const raw = window.sessionStorage.getItem(getSeenActiveOrdersStorageKey(storeId));
    return safeParseSeenIds(raw);
  } catch {
    return { initialized: false, ids: new Set<string>() };
  }
}

export function writeSeenActiveOrderIds(storeId: string, snapshot: SeenActiveOrdersSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getSeenActiveOrdersStorageKey(storeId),
      JSON.stringify({
        initialized: snapshot.initialized,
        ids: truncateSeenIds(snapshot.ids),
      })
    );
  } catch {
    // Mantemos apenas em memoria se sessionStorage estiver indisponivel.
  }
}

export function readPendingNewOrderIds(storeId: string) {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = window.sessionStorage.getItem(getPendingOrdersStorageKey(storeId));
    return safeParseStoredIds(raw);
  } catch {
    return new Set<string>();
  }
}

export function writePendingNewOrderIds(storeId: string, ids: Iterable<string>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const serialized = truncatePendingIds(ids);
    window.sessionStorage.setItem(getPendingOrdersStorageKey(storeId), JSON.stringify(serialized));
    dispatchPendingOrdersChanged(storeId);
  } catch {
    // Mantemos apenas em memoria se sessionStorage estiver indisponivel.
  }
}

export function addPendingNewOrderIds(storeId: string, ids: Iterable<string>) {
  const current = readPendingNewOrderIds(storeId);
  for (const id of ids) {
    if (typeof id === "string" && id.length > 0) {
      current.add(id);
    }
  }

  writePendingNewOrderIds(storeId, current);
  return current.size;
}

export function removePendingNewOrderIds(storeId: string, ids: Iterable<string>) {
  const current = readPendingNewOrderIds(storeId);
  let changed = false;

  for (const id of ids) {
    if (current.delete(id)) {
      changed = true;
    }
  }

  if (changed) {
    writePendingNewOrderIds(storeId, current);
  }

  return current.size;
}

export function clearPendingNewOrderIds(storeId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(getPendingOrdersStorageKey(storeId));
    dispatchPendingOrdersChanged(storeId);
  } catch {
    // Mantemos apenas em memoria se sessionStorage estiver indisponivel.
  }
}

export function subscribePendingNewOrderIds(storeId: string, onChange: (ids: Set<string>) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const notify = () => {
    onChange(readPendingNewOrderIds(storeId));
  };

  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== window.sessionStorage) {
      return;
    }

    if (event.key !== getPendingOrdersStorageKey(storeId)) {
      return;
    }

    notify();
  };

  const onPendingChanged = (event: Event) => {
    const customEvent = event as CustomEvent<PendingOrdersChangedDetail>;
    if (customEvent.detail?.storeId !== storeId) {
      return;
    }

    notify();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(PENDING_NEW_ORDERS_EVENT, onPendingChanged as EventListener);

  notify();

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PENDING_NEW_ORDERS_EVENT, onPendingChanged as EventListener);
  };
}

export function requestOrderCardFocus(storeId: string, orderId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(getOrderFocusStorageKey(storeId), orderId);
  } catch {
    // Mantemos apenas em memoria quando sessionStorage nao estiver disponivel.
  }

  window.dispatchEvent(
    new CustomEvent<OrderFocusRequestDetail>(ORDER_FOCUS_EVENT, {
      detail: { storeId, orderId },
    })
  );
}

export function consumePendingOrderCardFocus(storeId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const key = getOrderFocusStorageKey(storeId);
    const orderId = window.sessionStorage.getItem(key);
    if (!orderId) {
      return null;
    }

    window.sessionStorage.removeItem(key);
    return orderId;
  } catch {
    return null;
  }
}

export function subscribeOrderCardFocusRequests(
  storeId: string,
  onRequest: (orderId: string) => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<OrderFocusRequestDetail>;
    if (customEvent.detail?.storeId !== storeId) {
      return;
    }

    const orderId = customEvent.detail.orderId;
    if (!orderId) {
      return;
    }

    onRequest(orderId);
  };

  window.addEventListener(ORDER_FOCUS_EVENT, listener as EventListener);

  return () => {
    window.removeEventListener(ORDER_FOCUS_EVENT, listener as EventListener);
  };
}

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

export function ensureNewOrderAudioInteractionTracking() {
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

function parseSoundLevel(raw: string | null): NewOrderSoundLevel | null {
  if (raw === "off" || raw === "default" || raw === "high") {
    return raw;
  }

  return null;
}

export function readNewOrderSoundLevel(): NewOrderSoundLevel {
  if (typeof window === "undefined") {
    return "default";
  }

  try {
    const levelRaw = window.localStorage.getItem(NEW_ORDER_SOUND_LEVEL_KEY);
    const parsedLevel = parseSoundLevel(levelRaw);
    if (parsedLevel) {
      return parsedLevel;
    }

    const legacy = window.localStorage.getItem(NEW_ORDER_SOUND_PREF_KEY);
    if (legacy === "0") {
      return "off";
    }

    return "default";
  } catch {
    return "default";
  }
}

export function writeNewOrderSoundLevel(level: NewOrderSoundLevel) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(NEW_ORDER_SOUND_LEVEL_KEY, level);
    window.localStorage.setItem(NEW_ORDER_SOUND_PREF_KEY, level === "off" ? "0" : "1");
  } catch {
    // Mantemos apenas em memoria se localStorage estiver indisponivel.
  }
}

export function readNewOrderSoundPreference() {
  return readNewOrderSoundLevel() !== "off";
}

export function writeNewOrderSoundPreference(enabled: boolean) {
  writeNewOrderSoundLevel(enabled ? "default" : "off");
}

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContextInstance) {
    audioContextInstance = new AudioContextCtor();
  }

  return audioContextInstance;
}

function scheduleTone(
  context: AudioContext,
  destination: AudioNode,
  options: { startAt: number; frequency: number; duration: number; gainPeak: number; type: OscillatorType }
) {
  const gain = context.createGain();
  const osc = context.createOscillator();

  gain.gain.setValueAtTime(0.0001, options.startAt);
  gain.gain.exponentialRampToValueAtTime(options.gainPeak, options.startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, options.startAt + options.duration);

  osc.type = options.type;
  osc.frequency.setValueAtTime(options.frequency, options.startAt);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(options.startAt);
  osc.stop(options.startAt + options.duration + 0.01);
}

export async function playNewOrderSound(level: NewOrderSoundLevel = readNewOrderSoundLevel()) {
  if (level === "off") {
    return false;
  }

  ensureNewOrderAudioInteractionTracking();

  if (!canPlayAudioNow()) {
    return false;
  }

  const context = getAudioContext();
  if (!context) {
    return false;
  }

  try {
    if (context.state === "suspended") {
      await context.resume();
    }
  } catch {
    return false;
  }

  const now = context.currentTime;

  if (level === "high") {
    scheduleTone(context, context.destination, {
      startAt: now,
      frequency: 1047,
      duration: 0.18,
      gainPeak: 0.14,
      type: "triangle",
    });
    scheduleTone(context, context.destination, {
      startAt: now + 0.2,
      frequency: 1175,
      duration: 0.2,
      gainPeak: 0.14,
      type: "triangle",
    });
    scheduleTone(context, context.destination, {
      startAt: now + 0.42,
      frequency: 1319,
      duration: 0.24,
      gainPeak: 0.16,
      type: "triangle",
    });
    return true;
  }

  scheduleTone(context, context.destination, {
    startAt: now,
    frequency: 880,
    duration: 0.2,
    gainPeak: 0.1,
    type: "sine",
  });
  scheduleTone(context, context.destination, {
    startAt: now + 0.24,
    frequency: 988,
    duration: 0.24,
    gainPeak: 0.11,
    type: "sine",
  });

  return true;
}
