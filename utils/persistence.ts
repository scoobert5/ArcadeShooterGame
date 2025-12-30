export interface MetaData {
  metaCurrency: number;
  metaXP: number;
}

const STORAGE_KEY = 'neon_blitz_meta_v1';

export const Persistence = {
  save: (data: MetaData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save meta progress', e);
    }
  },

  load: (): MetaData => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        return {
          metaCurrency: data.metaCurrency || 0,
          metaXP: data.metaXP || 0
        };
      }
    } catch (e) {
      console.error('Failed to load meta progress', e);
    }
    // Default
    return { metaCurrency: 0, metaXP: 0 };
  }
};