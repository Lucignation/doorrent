const DB_NAME = "doorrent-offline";
const DB_VERSION = 1;
const RESPONSE_STORE = "responses";
const MUTATION_STORE = "mutations";

interface StoredResponse {
  key: string;
  payload: string;
  updatedAt: number;
}

interface StoredMutation {
  id: string;
  method: string;
  path: string;
  body: string | null;
  headers: string | null;
  token: string | null;
  dedupeKey: string | null;
  invalidatePaths: string | null;
  queuedAt: number;
  updatedAt: number;
}

interface QueueOfflineMutationInput {
  method: string;
  path: string;
  body?: unknown;
  headers?: HeadersInit;
  token?: string;
  dedupeKey?: string;
  invalidatePaths?: string[];
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
let flushPromise: Promise<number> | null = null;

function canUseOfflineStore() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function requestToPromise<T = undefined>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionToPromise(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

async function openOfflineDatabase() {
  if (!canUseOfflineStore()) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase | null>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(RESPONSE_STORE)) {
          database.createObjectStore(RESPONSE_STORE, { keyPath: "key" });
        }

        if (!database.objectStoreNames.contains(MUTATION_STORE)) {
          const store = database.createObjectStore(MUTATION_STORE, {
            keyPath: "id",
          });
          store.createIndex("byDedupeKey", "dedupeKey", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Could not open offline database."));
    }).catch(() => null);
  }

  return dbPromise;
}

function normalizeHeaders(headers?: HeadersInit) {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}

function buildQueueId() {
  return `mutation_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildOfflineCacheKey(path: string, token?: string) {
  return `${token ?? "public"}::${path}`;
}

export async function getOfflineCachedResponse<T>(key: string) {
  const database = await openOfflineDatabase();

  if (!database) {
    return null;
  }

  const transaction = database.transaction(RESPONSE_STORE, "readonly");
  const request = transaction.objectStore(RESPONSE_STORE).get(key);
  const record = await requestToPromise<StoredResponse | undefined>(request);

  if (!record?.payload) {
    return null;
  }

  try {
    return JSON.parse(record.payload) as T;
  } catch {
    return null;
  }
}

export async function setOfflineCachedResponse(key: string, payload: unknown) {
  const database = await openOfflineDatabase();

  if (!database) {
    return;
  }

  const transaction = database.transaction(RESPONSE_STORE, "readwrite");
  transaction.objectStore(RESPONSE_STORE).put({
    key,
    payload: JSON.stringify(payload),
    updatedAt: Date.now(),
  } satisfies StoredResponse);
  await transactionToPromise(transaction);
}

async function removeOfflineCachedResponses(keys: string[]) {
  if (!keys.length) {
    return;
  }

  const database = await openOfflineDatabase();

  if (!database) {
    return;
  }

  const transaction = database.transaction(RESPONSE_STORE, "readwrite");
  const store = transaction.objectStore(RESPONSE_STORE);

  keys.forEach((key) => store.delete(key));

  await transactionToPromise(transaction);
}

export async function queueOfflineMutation(input: QueueOfflineMutationInput) {
  const database = await openOfflineDatabase();

  if (!database) {
    return;
  }

  const transaction = database.transaction(MUTATION_STORE, "readwrite");
  const store = transaction.objectStore(MUTATION_STORE);
  const now = Date.now();
  const dedupeKey = input.dedupeKey ?? null;

  let existing: StoredMutation | undefined;

  if (dedupeKey) {
    existing = await requestToPromise<StoredMutation | undefined>(
      store.index("byDedupeKey").get(dedupeKey),
    );
  }

  store.put({
    id: existing?.id ?? buildQueueId(),
    method: input.method,
    path: input.path,
    body: input.body === undefined ? null : JSON.stringify(input.body),
    headers: JSON.stringify(normalizeHeaders(input.headers)),
    token: input.token ?? null,
    dedupeKey,
    invalidatePaths: JSON.stringify(input.invalidatePaths ?? []),
    queuedAt: existing?.queuedAt ?? now,
    updatedAt: now,
  } satisfies StoredMutation);

  await transactionToPromise(transaction);
}

async function listQueuedMutations() {
  const database = await openOfflineDatabase();

  if (!database) {
    return [];
  }

  const transaction = database.transaction(MUTATION_STORE, "readonly");
  const request = transaction.objectStore(MUTATION_STORE).getAll();
  const mutations = await requestToPromise<StoredMutation[]>(request);

  return mutations.sort((left, right) => left.queuedAt - right.queuedAt);
}

async function deleteQueuedMutation(id: string) {
  const database = await openOfflineDatabase();

  if (!database) {
    return;
  }

  const transaction = database.transaction(MUTATION_STORE, "readwrite");
  transaction.objectStore(MUTATION_STORE).delete(id);
  await transactionToPromise(transaction);
}

function shouldDropQueuedMutation(status: number) {
  return status >= 400 && status < 500 && ![401, 403, 408, 429].includes(status);
}

export async function flushOfflineMutations(baseUrl: string) {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    const queuedMutations = await listQueuedMutations();
    let flushedCount = 0;

    for (const mutation of queuedMutations) {
      const headers = mutation.headers
        ? (JSON.parse(mutation.headers) as Record<string, string>)
        : {};

      if (mutation.token) {
        headers.Authorization = `Bearer ${mutation.token}`;
      }

      try {
        const response = await fetch(`${baseUrl}${mutation.path}`, {
          method: mutation.method,
          headers,
          body: mutation.body ?? undefined,
        });

        if (!response.ok) {
          if (shouldDropQueuedMutation(response.status)) {
            await deleteQueuedMutation(mutation.id);
          } else {
            break;
          }

          continue;
        }

        await deleteQueuedMutation(mutation.id);
        flushedCount += 1;

        const invalidatePaths = mutation.invalidatePaths
          ? (JSON.parse(mutation.invalidatePaths) as string[])
          : [];

        if (invalidatePaths.length) {
          await removeOfflineCachedResponses(
            invalidatePaths.map((path) => buildOfflineCacheKey(path, mutation.token ?? undefined)),
          );
        }
      } catch {
        break;
      }
    }

    return flushedCount;
  })();

  try {
    return await flushPromise;
  } finally {
    flushPromise = null;
  }
}

export async function clearOfflineMutationQueue() {
  const database = await openOfflineDatabase();

  if (!database) {
    return;
  }

  const transaction = database.transaction(MUTATION_STORE, "readwrite");
  transaction.objectStore(MUTATION_STORE).clear();
  await transactionToPromise(transaction);
}
