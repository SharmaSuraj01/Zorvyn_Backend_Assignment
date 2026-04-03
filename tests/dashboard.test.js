const request = require("supertest");

jest.mock("../src/db", () => require("./testDb"));

const { app, init } = require("../src/app");

let token;

beforeAll(async () => {
  await init;

  await request(app).post("/api/auth/register").send({
    name: "Dash Admin", email: "dash@x.com", password: "pass123", role: "admin",
  });

  const login = await request(app).post("/api/auth/login").send({
    email: "dash@x.com", password: "pass123",
  });
  token = login.body.token;

  // seed a couple of records
  await request(app).post("/api/records").set("Authorization", `Bearer ${token}`)
    .send({ amount: 50000, type: "income",  category: "Salary",    date: "2026-04-01" });
  await request(app).post("/api/records").set("Authorization", `Bearer ${token}`)
    .send({ amount: 15000, type: "expense", category: "Rent",      date: "2026-04-05" });
  await request(app).post("/api/records").set("Authorization", `Bearer ${token}`)
    .send({ amount: 8000,  type: "expense", category: "Groceries", date: "2026-04-10" });
});

describe("GET /api/dashboard/summary", () => {
  it("returns correct totals", async () => {
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total_income).toBe(50000);
    expect(res.body.total_expenses).toBe(23000);
    expect(res.body.net_balance).toBe(27000);
    expect(res.body.total_records).toBe(3);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/dashboard/summary");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/dashboard/by-category", () => {
  it("returns category breakdown", async () => {
    const res = await request(app)
      .get("/api/dashboard/by-category")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("category");
    expect(res.body[0]).toHaveProperty("total");
  });
});

describe("GET /api/dashboard/monthly-trends", () => {
  it("returns monthly data", async () => {
    const res = await request(app)
      .get("/api/dashboard/monthly-trends")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("month");
    expect(res.body[0]).toHaveProperty("income");
    expect(res.body[0]).toHaveProperty("expenses");
  });
});

describe("GET /api/dashboard/recent", () => {
  it("returns recent records", async () => {
    const res = await request(app)
      .get("/api/dashboard/recent")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("respects limit param", async () => {
    const res = await request(app)
      .get("/api/dashboard/recent?limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(2);
  });
});

describe("GET /api/dashboard/weekly-trends", () => {
  it("returns weekly data", async () => {
    const res = await request(app)
      .get("/api/dashboard/weekly-trends")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
