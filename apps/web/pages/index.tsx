import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type User = { id: string; username: string; email: string; status: string };
type Wallet = { balanceCents: number; pendingCents: number };
type Selection = { id: string; name: string; odds: string | number };
type Market = { id: string; name: string; selections: Selection[] };
type EventItem = { id: string; home: string; away: string; startsAt: string; markets: Market[] };
type Bet = {
  id: string;
  stakeCents: number;
  combinedOdds: string | number;
  potentialReturnCents: number;
  status: 'OPEN' | 'WON' | 'LOST' | 'VOID';
  createdAt: string;
  selections: { selectionId: string; odds: string | number }[];
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function oddsLabel(o: string | number) {
  const n = Number(o);
  return Number.isFinite(n) ? n.toFixed(2) : String(o);
}

function idem(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [amount, setAmount] = useState('50');
  const [stake, setStake] = useState('10');
  const [selected, setSelected] = useState<Selection | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  const refreshPublic = useCallback(async () => {
    try {
      const list = await api<EventItem[]>('/events');
      setEvents(list || []);
    } catch {
      setEvents([]);
    }
  }, []);

  const refreshPrivate = useCallback(async () => {
    const me = await api<User>('/auth/me');
    setUser(me);
    const [w, b] = await Promise.all([api<Wallet>('/wallet'), api<Bet[]>('/bets')]);
    setWallet(w);
    setBets(b || []);
  }, []);

  useEffect(() => {
    (async () => {
      setBooting(true);
      await refreshPublic();
      try {
        await refreshPrivate();
      } catch {
        setUser(null);
        setWallet(null);
        setBets([]);
      } finally {
        setBooting(false);
      }
    })();
  }, [refreshPublic, refreshPrivate]);

  const potential = useMemo(() => {
    if (!selected) return 0;
    const s = Math.round(Number(stake) * 100);
    const o = Number(selected.odds);
    if (!Number.isFinite(s) || !Number.isFinite(o) || s < 100) return 0;
    return Math.floor(s * o);
  }, [selected, stake]);

  async function onAuth(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (authMode === 'register') {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password }),
        });
        await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier: username || email, password }),
        });
        setMessage('Account created and signed in.');
      } else {
        await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
        });
        setMessage('Signed in.');
      }
      setPassword('');
      await refreshPrivate();
      await refreshPublic();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    setError('');
    setMessage('');
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    setUser(null);
    setWallet(null);
    setBets([]);
    setSelected(null);
    setMessage('Signed out.');
  }

  async function onDeposit() {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const cents = Math.round(Number(amount) * 100);
      if (!Number.isFinite(cents) || cents < 100) throw new Error('Minimum deposit is $1.00');
      const res = await api<{ paymentId: string; balanceCents: number; pendingCents: number }>(
        '/wallet/mock-deposit',
        {
          method: 'POST',
          headers: { 'Idempotency-Key': idem('dep') },
          body: JSON.stringify({ amountCents: cents }),
        },
      );
      setWallet({ balanceCents: res.balanceCents, pendingCents: res.pendingCents });
      setMessage(`Mock deposit ${money(cents)} completed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setLoading(false);
    }
  }

  async function onWithdraw() {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const cents = Math.round(Number(amount) * 100);
      if (!Number.isFinite(cents) || cents < 100) throw new Error('Minimum withdrawal is $1.00');
      const res = await api<{ paymentId: string; balanceCents: number; pendingCents: number }>(
        '/wallet/mock-withdrawal',
        {
          method: 'POST',
          headers: { 'Idempotency-Key': idem('wd') },
          body: JSON.stringify({ amountCents: cents }),
        },
      );
      setWallet({ balanceCents: res.balanceCents, pendingCents: res.pendingCents });
      setMessage(`Mock withdrawal ${money(cents)} completed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  }

  async function onPlaceBet() {
    setError('');
    setMessage('');
    if (!selected) {
      setError('Select an outcome first');
      return;
    }
    setLoading(true);
    try {
      const stakeCents = Math.round(Number(stake) * 100);
      if (!Number.isFinite(stakeCents) || stakeCents < 100) throw new Error('Minimum stake is $1.00');
      await api('/bets', {
        method: 'POST',
        headers: { 'Idempotency-Key': idem('bet') },
        body: JSON.stringify({ selectionId: selected.id, stakeCents }),
      });
      setMessage(`Bet placed on ${selected.name} @ ${oddsLabel(selected.odds)}`);
      setSelected(null);
      await refreshPrivate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bet failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header className="topbar">
        <div className="brand">
          <h1>
            Project Casino App
            <span className="badge">SANDBOX · MOCK MONEY</span>
          </h1>
          <p>NestJS API + Next.js · mock odds, deposits, withdrawals & settlement</p>
        </div>
        {user ? (
          <div className="row">
            <span className="muted">Signed in as <strong>{user.username}</strong></span>
            <button className="btn secondary" onClick={onLogout} disabled={loading}>Logout</button>
          </div>
        ) : null}
      </header>

      {(error || message) && (
        <div className="card" style={{ marginBottom: 16 }}>
          {error ? <div className="error">{error}</div> : null}
          {message ? <div className="ok">{message}</div> : null}
        </div>
      )}

      {booting ? (
        <div className="card">Loading…</div>
      ) : (
        <div className="grid">
          <section className="stack">
            <div className="card">
              <h2>Open events</h2>
              {events.length === 0 ? (
                <p className="muted">No open events. Start the API with seed data (`docker compose up`).</p>
              ) : (
                events.map((ev) => (
                  <article key={ev.id} className="event">
                    <strong>
                      {ev.home} vs {ev.away}
                    </strong>
                    <div className="meta">{new Date(ev.startsAt).toLocaleString()}</div>
                    {ev.markets?.map((m) => (
                      <div key={m.id}>
                        <h3>{m.name}</h3>
                        <div className="row">
                          {m.selections.map((s) => (
                            <div key={s.id} className="sel">
                              <span>
                                {s.name} <strong>({oddsLabel(s.odds)})</strong>
                              </span>
                              <button
                                className="btn success"
                                disabled={!user || loading}
                                onClick={() => setSelected(s)}
                              >
                                Select
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </article>
                ))
              )}
            </div>

            <div className="card">
              <h2>Your bets</h2>
              {!user ? (
                <p className="muted">Sign in to view bet history.</p>
              ) : bets.length === 0 ? (
                <p className="muted">No bets yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Stake</th>
                      <th>Odds</th>
                      <th>To return</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bets.map((b) => (
                      <tr key={b.id}>
                        <td>{new Date(b.createdAt).toLocaleString()}</td>
                        <td>{money(b.stakeCents)}</td>
                        <td>{oddsLabel(b.combinedOdds)}</td>
                        <td>{money(b.potentialReturnCents)}</td>
                        <td>
                          <span className={`status ${b.status}`}>{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <aside className="stack">
            {!user ? (
              <div className="card">
                <div className="tabs">
                  <button
                    className={`tab ${authMode === 'login' ? 'active' : ''}`}
                    onClick={() => setAuthMode('login')}
                    type="button"
                  >
                    Login
                  </button>
                  <button
                    className={`tab ${authMode === 'register' ? 'active' : ''}`}
                    onClick={() => setAuthMode('register')}
                    type="button"
                  >
                    Register
                  </button>
                </div>
                <form className="stack" onSubmit={onAuth}>
                  {authMode === 'register' ? (
                    <>
                      <input
                        placeholder="Username (3–24 chars)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        minLength={3}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </>
                  ) : (
                    <input
                      placeholder="Username or email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                  )}
                  <input
                    type="password"
                    placeholder="Password (min 8)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button className="btn" type="submit" disabled={loading}>
                    {authMode === 'login' ? 'Sign in' : 'Create account'}
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="card">
                  <h2>Wallet</h2>
                  <div className="balance">{wallet ? money(wallet.balanceCents) : '—'}</div>
                  <p className="muted">Mock balance in USD cents ledger</p>
                  <div className="stack" style={{ marginTop: 12 }}>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Amount USD"
                    />
                    <div className="row">
                      <button className="btn success" onClick={onDeposit} disabled={loading}>
                        Mock deposit
                      </button>
                      <button className="btn secondary" onClick={onWithdraw} disabled={loading}>
                        Mock withdraw
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h2>Place bet</h2>
                  {selected ? (
                    <p>
                      Selection: <strong>{selected.name}</strong> @ {oddsLabel(selected.odds)}
                    </p>
                  ) : (
                    <p className="muted">Pick an outcome from an open event.</p>
                  )}
                  <div className="stack">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={stake}
                      onChange={(e) => setStake(e.target.value)}
                      placeholder="Stake USD"
                    />
                    <p className="muted">Potential return: {money(potential)}</p>
                    <button className="btn" onClick={onPlaceBet} disabled={loading || !selected}>
                      Place bet
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="card">
              <h2>How to use</h2>
              <ol className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                <li>Register or login</li>
                <li>Mock-deposit funds</li>
                <li>Select an outcome and place a bet</li>
                <li>Admin can settle via <code>/sandbox/settlement/:betId/:outcome</code> with <code>x-sandbox-admin-key</code></li>
              </ol>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
