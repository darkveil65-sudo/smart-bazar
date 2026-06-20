import {
  clientDb,
  clientStorage,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from '@smart-bazar/shared/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AppConfig, DEFAULT_APP_CONFIG } from '@smart-bazar/shared/types/firestore';

const CONFIG_DOC_PATH = 'config/app';

export const configService = {
  /** Upload UPI QR code image */
  async uploadQrCode(imageFile: File): Promise<string> {
    const storageRef = ref(clientStorage, `config/upi_qr_code_${Date.now()}_${imageFile.name}`);
    await uploadBytes(storageRef, imageFile);
    return getDownloadURL(storageRef);
  },
  /** One-time fetch of the app config */
  async getConfig(): Promise<AppConfig> {
    try {
      const snap = await getDoc(doc(clientDb, CONFIG_DOC_PATH));
      if (snap.exists()) {
        return { ...DEFAULT_APP_CONFIG, ...snap.data() } as AppConfig;
      }
      // If no config in Firestore yet, seed the defaults and return them
      await this.seedConfig();
      return DEFAULT_APP_CONFIG;
    } catch (err) {
      console.error('[configService] Failed to fetch config, using defaults:', err);
      return DEFAULT_APP_CONFIG;
    }
  },

  /** Seed the default config into Firestore (run once) */
  async seedConfig(): Promise<void> {
    try {
      await setDoc(doc(clientDb, CONFIG_DOC_PATH), {
        ...DEFAULT_APP_CONFIG,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[configService] Failed to seed config:', err);
    }
  },

  /** Real-time subscription to config changes */
  subscribeToConfig(callback: (config: AppConfig) => void): () => void {
    return onSnapshot(doc(clientDb, CONFIG_DOC_PATH), (snap) => {
      if (snap.exists()) {
        callback({ ...DEFAULT_APP_CONFIG, ...snap.data() } as AppConfig);
      } else {
        callback(DEFAULT_APP_CONFIG);
      }
    }, (err) => {
      console.error('[configService] Subscription error, using defaults:', err);
      callback(DEFAULT_APP_CONFIG);
    });
  },

  /** Update config (admin only) */
  async updateConfig(data: Partial<AppConfig>): Promise<void> {
    await setDoc(doc(clientDb, CONFIG_DOC_PATH), {
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  },

  /** Get delivery slot label from config based on current time */
  getDeliverySlot(config: AppConfig): string {
    const hours = new Date().getHours();
    const activeSlots = (config.deliverySlots || DEFAULT_APP_CONFIG.deliverySlots)
      .filter(s => s.enabled);
    const matched = activeSlots.find(s => hours >= s.orderFrom && hours < s.orderTo);
    return matched?.deliveryLabel ?? (config.lateNightSlot || DEFAULT_APP_CONFIG.lateNightSlot);
  },
};
