import { create } from 'zustand';
import { getBranches } from '../api/client';

interface BranchState {
  branches: any[];
  selectedBranchId: number | null;
  loading: boolean;
  fetchBranches: () => Promise<void>;
  selectBranch: (id: number) => void;
}

export const useBranchStore = create<BranchState>((set) => ({
  branches: [],
  selectedBranchId: null,
  loading: false,

  fetchBranches: async () => {
    set({ loading: true });
    const { data } = await getBranches();
    set({
      branches: data,
      selectedBranchId: data[0]?.id || null,
      loading: false,
    });
  },

  selectBranch: (id: number) => set({ selectedBranchId: id }),
}));
