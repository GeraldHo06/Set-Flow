// Harmless mock exports to satisfy lingering imports
export const createClient = () => ({});
export const base44 = {
  get: () => Promise.resolve({ data: null }),
  post: () => Promise.resolve({ data: null }),
};

export default base44;