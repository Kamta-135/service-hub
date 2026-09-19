export type Lang = "en" | "hi";

export const translations = {
  en: {
    // Landing
    "landing.tagline": "Trusted local help, when you need it.",
    "landing.subtitle": "Tell Service.Hub what's wrong and get matched with a verified provider nearby.",
    "landing.findHelp": "Find Help Near Me",
    "landing.emergency": "Emergency Help",
    "landing.login": "Log In",
    "landing.getStarted": "Get Started",
    // Login
    "login.welcome": "Welcome to Service.Hub",
    "login.needHelp": "I need help",
    "login.provideServices": "I provide services",
    "login.phone": "Phone number",
    "login.continue": "Continue",
    "login.otpHint": "We'll text you a one-time code — no password needed.",
    // Dashboard
    "dashboard.goodEvening": "Good evening",
    "dashboard.hi": "Hi",
    "dashboard.yourRequests": "Your requests",
    "dashboard.newRequest": "New request",
    "dashboard.nearMe": "Near me",
    "dashboard.logout": "Log out",
    "dashboard.myLocation": "My location",
    "dashboard.setLocation": "Set your location",
    "dashboard.locationPlaceholder": "e.g. Bhelma, Anuppur, MP",
    "dashboard.save": "Save",
  },
  hi: {
    "landing.tagline": "Bharosemand madad, jab zarurat ho.",
    "landing.subtitle": "Service.Hub ko batao kya problem hai, apne paas ke verified provider se jud jaao.",
    "landing.findHelp": "Paas Mein Madad Dhoondo",
    "landing.emergency": "Emergency Madad",
    "landing.login": "Log In",
    "landing.getStarted": "Shuru Karo",
    "login.welcome": "Service.Hub mein swagat hai",
    "login.needHelp": "Mujhe madad chahiye",
    "login.provideServices": "Main service deta hoon",
    "login.phone": "Phone number",
    "login.continue": "Aage Badho",
    "login.otpHint": "Hum aapko ek OTP bhejenge — password ki zarurat nahi.",
    "dashboard.goodEvening": "Namaste",
    "dashboard.hi": "Namaste",
    "dashboard.yourRequests": "Aapki requests",
    "dashboard.newRequest": "Nayi request",
    "dashboard.nearMe": "Paas mein",
    "dashboard.logout": "Log out",
    "dashboard.myLocation": "Meri location",
    "dashboard.setLocation": "Apni location set karo",
    "dashboard.locationPlaceholder": "jaise Bhelma, Anuppur, MP",
    "dashboard.save": "Save karo",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
