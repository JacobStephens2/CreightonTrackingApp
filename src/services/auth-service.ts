export interface AuthState {
  loggedIn: boolean;
  email?: string;
  firstName?: string;
  userId?: number;
}

export const authService = {
  state: { loggedIn: false } as AuthState,

  async checkAuth(): Promise<AuthState> {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        this.state = { loggedIn: true, email: data.email, firstName: data.firstName, userId: data.id };
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
    this.state = { loggedIn: true, email: data.email, firstName: data.firstName, userId: data.id };
  },

  async register(firstName: string, email: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Registration failed');
    }
    const data = await res.json();
    this.state = { loggedIn: true, email: data.email, firstName: data.firstName, userId: data.id };

    // Upload any existing local data to the new account
    const { syncService } = await import('./sync-service');
    await syncService.upload().catch(() => {});
  },

  async updateName(firstName: string): Promise<void> {
    const res = await fetch('/api/auth/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Update failed');
    }
    this.state.firstName = firstName;
  },

  async forgotPassword(email: string): Promise<void> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Request failed');
    }
  },

  async resetPassword(token: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Reset failed');
    }
    const data = await res.json();
    if (data.id) {
      this.state = { loggedIn: true, email: data.email, firstName: data.firstName, userId: data.id };
    }
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    this.state = { loggedIn: false };
  },
};
