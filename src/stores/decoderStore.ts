import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { DecodeStep } from "@/types";
import { isTauri } from "@/lib/utils";
import { decodeStringJs } from "@/lib/decode-detect";

interface DecoderState {
  input: string;
  steps: DecodeStep[];
  running: boolean;
  error: string | null;

  setInput: (v: string) => void;
  decode: () => Promise<void>;
  reset: () => void;
  finalOutput: () => string;
}

export const useDecoderStore = create<DecoderState>((set, get) => ({
  input: "",
  steps: [],
  running: false,
  error: null,

  setInput: (input) => set({ input }),

  decode: async () => {
    const input = get().input.trim();
    if (!input) {
      set({ steps: [], error: "请输入待解码字符串" });
      return;
    }
    set({ running: true, error: null });
    try {
      let steps: DecodeStep[];
      if (isTauri()) {
        steps = await invoke<DecodeStep[]>("decode_string", { input });
      } else {
        // 浏览器降级：JS 实现
        steps = decodeStringJs(input);
      }
      set({ steps, running: false });
    } catch (e) {
      set({ running: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  reset: () => set({ input: "", steps: [], error: null }),

  finalOutput: () => {
    const { steps, input } = get();
    if (steps.length === 0) return input;
    return steps[steps.length - 1].output;
  },
}));
