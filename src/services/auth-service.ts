export interface AuthState {
  loggedIn: boolean;
  email?: string;
  userId?: number;
}

export const authService = {
  state: { loggedIn: false } as AuthState,

  async checkAuth(): Promise<AuthState> {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        this.state = { loggedIn: true, email: data.email, userId: data.id };
      } else {
        this.state = { loggedIn: false };
      }
    } catch {
      this.state = { loggedIn: false };
    }
    return this.state;
  },

  async login(email: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    const data = await res.json();
    this.state = { loggedIn: true, email: data.email, userId: data.id };
  },

  async register(email: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Registration failed');
    }
    const data = await res.json();
    this.state = { loggedIn: true, email: data.email, userId: data.id };
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    this.state = { loggedIn: false };
  },
};
