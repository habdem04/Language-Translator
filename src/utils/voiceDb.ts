/**
 * Native IndexedDB utility for caching and managing downloaded high-quality TTS audio bases.
 */

const DB_NAME = "OfflineVoicePacksDB";
const STORE_NAME = "cachedAudio";
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export function initDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => {
      console.error("IndexedDB open error:", e);
      reject(new Error("Could not open Offline Voice database"));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // We'll index by combining language and phrase text or create a composite key
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

function getCacheKey(lang: string, phraseText: string): string {
  // Normalize key to avoid white space or casing issues
  return `${lang.toLowerCase()}:${phraseText.trim().toLowerCase()}`;
}

export async function saveAudio(lang: string, phraseText: string, audioBase64: string): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const key = getCacheKey(lang, phraseText);

    const data = {
      id: key,
      lang: lang.toLowerCase(),
      text: phraseText.trim(),
      audio: audioBase64,
      downloadedAt: new Date().toISOString()
    };

    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = (e) => {
      console.error("Failed to save voice cache:", e);
      reject(e);
    };
  });
}

export async function getAudio(lang: string, phraseText: string): Promise<string | null> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const key = getCacheKey(lang, phraseText);

    const request = store.get(key);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.audio);
      } else {
        resolve(null);
      }
    };

    request.onerror = (e) => {
      console.error("Failed to retrieve voice from cache:", e);
      reject(e);
    };
  });
}

export async function deleteAudio(lang: string, phraseText: string): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const key = getCacheKey(lang, phraseText);

    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export async function clearLanguage(lang: string): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const cursorRequest = store.openCursor();

    const targetLang = lang.toLowerCase();

    cursorRequest.onsuccess = (e) => {
      const cursor = (e.target as any).result;
      if (cursor) {
        if (cursor.value.lang === targetLang) {
          store.delete(cursor.primaryKey);
        }
        cursor.continue();
      } else {
        resolve();
      }
    };

    cursorRequest.onerror = (e) => reject(e);
  });
}

export async function getDownloadedCount(lang: string): Promise<number> {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const cursorRequest = store.openCursor();

      const targetLang = lang.toLowerCase();
      let count = 0;

      cursorRequest.onsuccess = (e) => {
        const cursor = (e.target as any).result;
        if (cursor) {
          if (cursor.value.lang === targetLang && cursor.value.audio) {
            count++;
          }
          cursor.continue();
        } else {
          resolve(count);
        }
      };

      cursorRequest.onerror = (e) => reject(e);
    });
  } catch {
    return 0;
  }
}

export async function getLanguageCacheSizeInKb(lang: string): Promise<number> {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const cursorRequest = store.openCursor();

      const targetLang = lang.toLowerCase();
      let totalBytes = 0;

      cursorRequest.onsuccess = (e) => {
        const cursor = (e.target as any).result;
        if (cursor) {
          if (cursor.value.lang === targetLang && cursor.value.audio) {
            // Approx size of base64 data
            totalBytes += cursor.value.audio.length;
          }
          cursor.continue();
        } else {
          const totalKb = +(totalBytes / 1024).toFixed(1);
          resolve(totalKb);
        }
      };

      cursorRequest.onerror = (e) => reject(e);
    });
  } catch {
    return 0;
  }
}
