/*
 * The clinical messaging platform as a small pure model. Every number the figure shows comes from
 * here: the conversation's sequence, idempotency keys, delivery attempts, the dead-letter count and
 * the rows a tenant can see, and the part counts the figure is built from. Each action returns the
 * run it causes: the hops a message makes through the machine, the world once each hop lands, and
 * the lines the platform logs as it does.
 */

/** Facts from the platform. */
export const TABLES = 34;
export const TOPICS = 13;
export const TESTS = { backend: 627, frontend: 686 };
/** Protected files travel on SAS URLs that last this long, so the API never proxies their bytes. */
export const SAS_MINUTES = 30;
/** Bounded retries: deliveries a worker gets before the message is dead-lettered. */
export const MAX_DELIVERIES = 3;
/** The figure's gateway: two replicas holding three device sockets between them. */
export const SOCKETS_PER_REPLICA = [2, 1] as const;
export const SOCKETS = SOCKETS_PER_REPLICA[0] + SOCKETS_PER_REPLICA[1];
/** Worker blocks on the topic tubes; each consumes a run of neighbouring topics. */
export const WORKERS = 3;
export const workerFor = (topic: number) => Math.floor((topic * WORKERS) / TOPICS);
/** The messages table shows its latest rows. */
const ROWS_SHOWN = 6;

export type Tenant = "a" | "b";
/** The conversation, and the sending device, belong to this tenant. */
export const HOME: Tenant = "a";
/** How far back along the cable a dropped reply gets before the connection goes. */
export const LOST_AT = 0.55;
/** The conversation's last sequence before the visitor arrives, so their first send is 41. */
const START_SEQ = 40;

export type Row = { seq: number; key: string };

/** The sending device: idle, waiting on a reply, answered, or cut off before the reply arrived. */
export type Client = "idle" | "waiting" | "ok" | "lost";

export type World = {
  /** The tenant the device is signed in as, and the one the last transaction ran as (SET LOCAL). */
  device: Tenant;
  tenant: Tenant;
  /** Last sequence the server assigned in the conversation; it has this many messages. */
  seq: number;
  /** The newest rows of the messages table, oldest first. */
  rows: Row[];
  /** Idempotency key of the last send. */
  key: string | null;
  /** The last response the device got. */
  status: string;
  client: Client;
  /** Dead-lettered messages, per topic. */
  dlq: number[];
  /** Deliveries of the message a worker holds (0 when none), and which worker holds it. */
  attempt: number;
  worker: number;
  /** Keys issued so far (seeds the next one), and poison messages published. */
  issued: number;
  poisoned: number;
};

/** One hop of a message along a run of pipe; `back` travels it in reverse. */
export type Hop =
  | { via: "cable"; back?: boolean; lostAt?: number }
  | { via: "riser"; back?: boolean }
  | { via: "emit" }
  | { via: "feed" }
  | { via: "branch"; replica: number }
  | { via: "socket"; socket: number }
  | { via: "topic"; topic: number; worker: number }
  | { via: "redeliver"; topic: number; worker: number }
  | { via: "dead"; topic: number; worker: number };

/** One-off marks as a step lands, for the figure to light. */
export type Mark =
  | { kind: "key" }
  | { kind: "row"; seq: number; replay?: boolean }
  | { kind: "sockets" }
  | { kind: "ack"; worker: number }
  | { kind: "fail"; worker: number }
  | { kind: "dead"; topic: number }
  | { kind: "lost" };

export type Line = { text: string; kind: "http" | "sql" | "bus" | "fault" };

export type Step = {
  hops: Hop[];
  /** Travel time in 16th notes, then a hold after landing. */
  beats: number;
  hold: number;
  log: Line[];
  world: World;
  marks: Mark[];
};

export type Action = "send" | "drop" | "poison" | "tenant";
export type Run = { action: Action; steps: Step[] };

/* ---------------------------------------------------------------- keys */

function hash32(n: number) {
  let t = (n + 0x9e3779b9) | 0;
  t = Math.imul(t ^ (t >>> 16), 0x85ebca6b);
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
  return (t ^ (t >>> 16)) >>> 0;
}

/** Seeded so the first key matches the platform's own example, 7f3a…. */
const KEY_SEED = 84601;

/** The n-th client idempotency key: 128 bits of hex, the same on server and client. */
export function keyOf(n: number): string {
  return [0, 1, 2, 3].map((i) => hash32(KEY_SEED + n * 4 + i).toString(16).padStart(8, "0")).join("");
}

/** A key as the log and readout print it. */
export const short = (key: string) => `${key.slice(0, 4)}…`;

/* ---------------------------------------------------------------- reads */

/** Rows the same SELECT returns in the last transaction's tenant: row-level security hides the rest. */
export const visibleRows = (w: World) => (w.tenant === HOME ? w.seq : 0);

/** Locks are shut on every table when the transaction runs as the other tenant. */
export const locked = (w: World) => w.tenant !== HOME;

export const dlqTotal = (w: World) => w.dlq.reduce((a, b) => a + b, 0);

/** The topic a message's event is published on. */
const topicFor = (n: number) => (n * 5 + 1) % TOPICS;

export function initialWorld(): World {
  const rows: Row[] = [];
  for (let s = START_SEQ - ROWS_SHOWN + 1; s <= START_SEQ; s++) rows.push({ seq: s, key: keyOf(-s) });
  return {
    device: HOME,
    tenant: HOME,
    seq: START_SEQ,
    rows,
    key: null,
    status: "Ready",
    client: "idle",
    dlq: Array.from({ length: TOPICS }, () => 0),
    attempt: 0,
    worker: -1,
    issued: 0,
    poisoned: 0,
  };
}

/* ---------------------------------------------------------------- runs */

/** What the log shows before anything has happened. */
export const readyLog = (w: World): Line[] => [
  { text: `ready  conversation at seq ${w.seq}, tenant ${w.tenant}, ${visibleRows(w)} rows`, kind: "bus" },
];

const http = (text: string): Line => ({ text, kind: "http" });
const sql = (text: string): Line => ({ text, kind: "sql" });
const bus = (text: string): Line => ({ text, kind: "bus" });
const fault = (text: string): Line => ({ text, kind: "fault" });

const INSERT = "INSERT … ON CONFLICT (idempotency_key) DO NOTHING RETURNING *";
const begin = (t: Tenant) => sql(`BEGIN; SET LOCAL app.tenant = '${t}'`);

/** Builds a run step by step, each step starting from the world the last one left. */
function runner(action: Action, start: World) {
  const steps: Step[] = [];
  let world = start;
  return {
    get world() {
      return world;
    },
    step(hops: Hop[], beats: number, log: Line[], patch: Partial<World> = {}, marks: Mark[] = [], hold = 0) {
      world = { ...world, ...patch };
      steps.push({ hops, beats, hold, log, world, marks });
    },
    done: (): Run => ({ action, steps }),
  };
}

/** The commit's fan-out: Redis carries it to both gateway replicas, which emit it to their sockets. */
function fanOut(r: ReturnType<typeof runner>, seq: number) {
  r.step(
    [{ via: "branch", replica: 0 }, { via: "branch", replica: 1 }],
    2,
    [],
  );
  r.step(
    Array.from({ length: SOCKETS }, (_, socket) => ({ via: "socket" as const, socket })),
    2,
    [bus(`delivered to ${SOCKETS} sockets on ${SOCKETS_PER_REPLICA.length} replicas  (seq ${seq})`)],
    {},
    [{ kind: "sockets" }],
  );
}

/** A send: client → REST → Postgres (a row with its seq and key) → gateway → Redis → sockets, then a worker. */
export function send(w: World): Run {
  const r = runner("send", w);
  const issued = w.issued + 1;
  const key = keyOf(issued);
  const seq = w.seq + 1;
  const topic = topicFor(seq);
  const worker = workerFor(topic);
  r.step([], 0, [], { device: HOME, issued, key, client: "waiting" }, [{ kind: "key" }]);
  r.step([{ via: "cable" }], 3, [http(`POST /messages  Idempotency-Key: ${short(key)}`), begin(HOME)], { tenant: HOME });
  r.step(
    [{ via: "riser" }],
    3,
    [sql(`${INSERT}  → seq ${seq}`)],
    { seq, rows: [...w.rows, { seq, key }].slice(-ROWS_SHOWN) },
    [{ kind: "row", seq }],
    1,
  );
  r.step([{ via: "riser", back: true }, { via: "emit" }], 2, [sql("COMMIT")]);
  r.step(
    [{ via: "cable", back: true }, { via: "feed" }],
    3,
    [http(`201 created (seq ${seq})`), bus(`Redis adapter  publish seq ${seq}`)],
    { client: "ok", status: `201 created (seq ${seq})` },
  );
  fanOut(r, seq);
  r.step(
    [{ via: "topic", topic, worker }],
    4,
    [bus(`publish  topic ${topic + 1} of ${TOPICS}`), bus(`worker  ack, idempotent consumer`)],
    {},
    [{ kind: "ack", worker }],
  );
  return r.done();
}

/**
 * A dropped connection: the send commits and fans out, but its reply is lost on the way back. The
 * device retries with the same idempotency key; the insert conflicts, and the API replays the
 * original row. The sequence does not move and nothing is delivered twice.
 */
export function dropConnection(w: World): Run {
  const r = runner("drop", w);
  const issued = w.issued + 1;
  const key = keyOf(issued);
  const seq = w.seq + 1;
  r.step([], 0, [], { device: HOME, issued, key, client: "waiting" }, [{ kind: "key" }]);
  r.step([{ via: "cable" }], 3, [http(`POST /messages  Idempotency-Key: ${short(key)}`), begin(HOME)], { tenant: HOME });
  r.step(
    [{ via: "riser" }],
    3,
    [sql(`${INSERT}  → seq ${seq}`)],
    { seq, rows: [...w.rows, { seq, key }].slice(-ROWS_SHOWN) },
    [{ kind: "row", seq }],
    1,
  );
  r.step([{ via: "riser", back: true }, { via: "emit" }], 2, [sql("COMMIT")]);
  r.step(
    [{ via: "cable", back: true, lostAt: LOST_AT }, { via: "feed" }],
    3,
    [http(`201 created (seq ${seq})`), fault("connection dropped, the reply never arrives"), bus(`Redis adapter  publish seq ${seq}`)],
    { client: "lost", status: "Connection dropped" },
    [{ kind: "lost" }],
  );
  fanOut(r, seq);
  r.step([], 0, [], { client: "waiting" }, [{ kind: "key" }]);
  r.step([{ via: "cable" }], 3, [http(`retry  POST /messages  Idempotency-Key: ${short(key)}, same key`), begin(HOME)]);
  r.step([{ via: "riser" }], 3, [sql(`${INSERT}  → 0 rows`)], {}, [{ kind: "row", seq, replay: true }], 1);
  r.step([{ via: "riser", back: true }], 2, [sql(`SELECT … WHERE idempotency_key = '${short(key)}'  → seq ${seq}`)]);
  r.step([{ via: "cable", back: true }], 3, [http(`200 replayed (seq ${seq})`)], {
    client: "ok",
    status: `200 replayed (seq ${seq})`,
  });
  return r.done();
}

/** A poison message: its worker fails it on every delivery, then Service Bus dead-letters it. */
export function poison(w: World): Run {
  const r = runner("poison", w);
  const poisoned = w.poisoned + 1;
  const topic = topicFor(poisoned * 3 + 2);
  const worker = workerFor(topic);
  r.step(
    [{ via: "topic", topic, worker }],
    4,
    [bus(`publish  topic ${topic + 1} of ${TOPICS}, a payload no worker can process`), fault(`worker  delivery 1 of ${MAX_DELIVERIES} failed`)],
    { poisoned, attempt: 1, worker },
    [{ kind: "fail", worker }],
    1,
  );
  for (let attempt = 2; attempt <= MAX_DELIVERIES; attempt++) {
    r.step(
      [{ via: "redeliver", topic, worker }],
      3,
      [fault(`worker  delivery ${attempt} of ${MAX_DELIVERIES} failed`)],
      { attempt },
      [{ kind: "fail", worker }],
      1,
    );
  }
  const dlq = r.world.dlq.map((n, i) => (i === topic ? n + 1 : n));
  const total = dlq.reduce((a, b) => a + b, 0);
  r.step(
    [{ via: "dead", topic, worker }],
    4,
    [bus(`dead-lettered  topic ${topic + 1}  (dlq ${total})`)],
    { dlq, attempt: 0, worker: -1, status: `Dead-lettered (dlq ${total})` },
    [{ kind: "dead", topic }],
  );
  return r.done();
}

/** The same read in the other tenant's transaction: row-level security returns nothing. */
export function switchTenant(w: World): Run {
  const r = runner("tenant", w);
  const tenant: Tenant = w.device === HOME ? "b" : HOME;
  const rows = tenant === HOME ? w.seq : 0;
  r.step([], 0, [], { device: tenant, client: "waiting" });
  r.step([{ via: "cable" }], 3, [http(`GET /messages  as tenant ${tenant}`), begin(tenant)]);
  r.step(
    [{ via: "riser" }],
    3,
    [sql(`SELECT * FROM messages WHERE conversation_id = $1  → ${rows} rows`)],
    { tenant },
    [],
    1,
  );
  r.step([{ via: "riser", back: true }], 2, []);
  r.step([{ via: "cable", back: true }], 3, [http(`200  ${rows} rows`)], {
    client: "ok",
    status: `${rows} rows for tenant ${tenant}`,
  });
  return r.done();
}

export const ACTIONS: Record<Action, (w: World) => Run> = {
  send,
  drop: dropConnection,
  poison,
  tenant: switchTenant,
};
