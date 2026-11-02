/*
  Demo-only view state that must survive a remount (the phone layout unmounts the app
  surface when you switch to WhatsApp). The runner resets it on Back and Reset.
*/
import { create } from 'zustand'

export type OnboardingStep = 'phone' | 'otp' | 'promise' | 'aa' | 'gmail' | 'reveal'
export const ONBOARDING_STEPS: OnboardingStep[] = ['phone', 'otp', 'promise', 'aa', 'gmail', 'reveal']

interface DemoState {
  step: OnboardingStep
  /** Digits typed for the phone number */
  phone: string
  /** Digits typed for the OTP */
  otp: string
  /** Data sources unticked on the Account Aggregator consent */
  unticked: Record<string, true>
  /** Guided mode is playing the onboarding; any click or key inside it hands control back */
  autoplay: boolean
  setStep: (step: OnboardingStep) => void
  setPhone: (phone: string) => void
  setOtp: (otp: string) => void
  setAutoplay: (on: boolean) => void
  toggleSource: (id: string) => void
  resetDemo: () => void
}

const initial = { step: 'phone' as OnboardingStep, phone: '', otp: '', unticked: {} as Record<string, true>, autoplay: false }

export const useDemo = create<DemoState>()((set) => ({
  ...initial,
  setStep: (step) => set({ step }),
  setPhone: (phone) => set({ phone }),
  setOtp: (otp) => set({ otp }),
  setAutoplay: (autoplay) => set({ autoplay }),
  toggleSource: (id) =>
    set((s) => {
      const unticked = { ...s.unticked }
      if (unticked[id]) delete unticked[id]
      else unticked[id] = true
      return { unticked }
    }),
  resetDemo: () => set({ ...initial, unticked: {} }),
}))
