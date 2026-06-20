'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppConfig, DEFAULT_APP_CONFIG } from '@smart-bazar/shared/types/firestore';
import { configService } from '@smart-bazar/shared/lib/services/configService';

interface AppConfigContextValue {
  config: AppConfig;
  loading: boolean;
  /** Get the delivery slot for right now, using live config */
  getDeliverySlot: () => string;
  /** Update config (admin only — throws if not authorized) */
  updateConfig: (data: Partial<AppConfig>) => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextValue>({
  config:  DEFAULT_APP_CONFIG,
  loading: true,
  getDeliverySlot: () => DEFAULT_APP_CONFIG.lateNightSlot,
  updateConfig: async () => {},
});

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig]   = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time Firestore listener — auto updates everywhere instantly
    const unsub = configService.subscribeToConfig((c) => {
      setConfig(c);
      setLoading(false);
    });
    return unsub;
  }, []);

  const getDeliverySlot = () => configService.getDeliverySlot(config);

  const updateConfig = async (data: Partial<AppConfig>) => {
    await configService.updateConfig(data);
    // State updates via subscription listener automatically
  };

  return (
    <AppConfigContext.Provider value={{ config, loading, getDeliverySlot, updateConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig(): AppConfigContextValue {
  return useContext(AppConfigContext);
}
