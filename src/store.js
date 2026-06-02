import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SUPABASE_URL = "https://fcajlfdykudsunczdrex.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYWpsZmR5a3Vkc3VuY3pkcmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTcwMjYsImV4cCI6MjA4ODIzMzAyNn0.ez9ue4RXqAUzFjG9pBk4sra9zDKC-CCBFC4pbelwGg8";

const DEFAULT_FORM = {
  name:"", industry:"", tagline:"", description:"",
  location:"", phone:"", email:"", cta:"Get Started Today",
  palette:"noir", vibe:"bold", logo:"", importedColours:[],
  sections:["hero","social_proof","services","about","testimonials","contact"],
};

// Supabase auth/data helper
export const sb = {
  _token: null,
  _user: null,
  async req(path, opts={}) {
    const r = await fetch(SUPABASE_URL + path, {
      ...opts,
      headers: {
        "apikey": SUPABASE_ANON,
        "Authorization": "Bearer " + (this._token || SUPABASE_ANON),
        "Content-Type": "application/json",
        "Prefer": opts.prefer || "",
        ...(opts.headers||{})
      }
    });
    const text = await r.text();
    try { return {ok: r.ok, status: r.status, data: JSON.parse(text)}; }
    catch { return {ok: r.ok, status: r.status, data: text}; }
  },
  async signUp(email, password) {
    const r = await this.req("/auth/v1/signup", { method:"POST", body: JSON.stringify({email, password}) });
    if(r.ok && r.data.access_token) { this._token = r.data.access_token; this._user = r.data.user; }
    return r;
  },
  async signIn(email, password) {
    const r = await this.req("/auth/v1/token?grant_type=password", { method:"POST", body: JSON.stringify({email, password}) });
    if(r.ok && r.data.access_token) {
      this._token = r.data.access_token;
      this._user = r.data.user;
      localStorage.setItem("sb_token", r.data.access_token);
      localStorage.setItem("sb_user", JSON.stringify(r.data.user));
    }
    return r;
  },
  async signOut() {
    await this.req("/auth/v1/logout", {method:"POST"});
    this._token = null; this._user = null;
    localStorage.removeItem("sb_token"); localStorage.removeItem("sb_user");
  },
  async getCredits() {
    if(!this._token) return 0;
    const r = await this.req("/rest/v1/credits?select=balance&limit=1");
    if(r.ok && r.data && r.data[0]) return r.data[0].balance;
    return 0;
  },
  async deductCredit() {
    if(!this._token) return false;
    const r = await this.req("/rest/v1/rpc/deduct_credit", { method:"POST", body: JSON.stringify({}), prefer:"return=representation" });
    return r.ok;
  },
  async resetPassword(email) {
    return await this.req("/auth/v1/recover", { method:"POST", body: JSON.stringify({email}) });
  },
  async updatePassword(token, newPassword) {
    return await this.req("/auth/v1/user", { method:"PUT", body: JSON.stringify({password: newPassword}), headers:{"Authorization":`Bearer ${token}`} });
  },
  restoreSession() {
    try {
      const token = localStorage.getItem("sb_token");
      const user = localStorage.getItem("sb_user");
      if(token && user) { this._token = token; this._user = JSON.parse(user); return true; }
    } catch {}
    return false;
  }
};

// Main app store
export const useAppStore = create(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      credits: 0,
      setUser: (user) => set({ user }),
      setCredits: (credits) => set({ credits }),
      refreshCredits: async () => {
        const c = await sb.getCredits();
        set({ credits: c });
        return c;
      },
      signOut: async () => {
        await sb.signOut();
        set({ user: null, credits: 0, screen: "home" });
      },

      // Screen routing
      screen: "home",
      setScreen: (screen) => set({ screen }),

      // Builder form
      form: DEFAULT_FORM,
      updateForm: (key, value) => set(s => ({ form: { ...s.form, [key]: value } })),
      resetForm: () => set({ form: DEFAULT_FORM }),
      toggleSection: (id) => set(s => {
        if(id === "hero" || id === "social_proof") return s;
        const sections = s.form.sections.includes(id)
          ? s.form.sections.filter(x => x !== id)
          : [...s.form.sections, id];
        return { form: { ...s.form, sections } };
      }),

      // Generated HTML
      generatedHtml: "",
      setGeneratedHtml: (html) => set({ generatedHtml: html }),

      // UI state
      showAuth: false,
      authMode: "signin",
      setShowAuth: (show, mode="signin") => set({ showAuth: show, authMode: mode }),
      legalScreen: null,
      setLegalScreen: (s) => set({ legalScreen: s }),
      marketingPage: null,
      setMarketingPage: (p) => set({ marketingPage: p }),
      resetToken: null,
      showReset: false,
      setResetFlow: (token) => set({ resetToken: token, showReset: true }),
      clearResetFlow: () => set({ resetToken: null, showReset: false }),
    }),
    {
      name: "sitefliq-store",
      partialize: (s) => ({ form: s.form, generatedHtml: s.generatedHtml, screen: s.screen }),
    }
  )
);