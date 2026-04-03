const request = require("supertest");

jest.mock("../src/db", () => require("./testDb"));

const { app, init } = require("../src/app");

let adminToken, analystToken, viewerToken;
let analystId, recordId;

beforeAll(async () => {
  await init;

  // register 3 users
  await request(app).post("/api/auth/register").send({ name: "Admin",   email: "rec_admin@x.com",   password: "pass123", role: "admin"   });
  await request(app).post("/api/auth/register").send({ name: "Analyst", email: "rec_analyst@x.com", password: "pass123", role: "analyst" });
  await request(app).post("/api/auth/register").send({ name: "Viewer",  email: "rec_viewer@x.com",  password: "pass123", role: "viewer"  });

  const a = await request(app).post("/api/auth/login").send({ email: "rec_admin@x.com",   password: "pass123" });
  const b = await request(app).post("/api/auth/login").send({ email: "rec_analyst@x.com", password: "pass123" });
  const c = await request(app).post("/api/auth/login").send({ email: "rec_viewer@x.com",  password: "pass123" });

  adminToken   = a.body.token;
  analystToken = b.body.token;
  analystId    = b.body.user.id;
  viewerToken  = c.body.token;
});

describe("POST /api/records", () => {
  it("analyst can create a record", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ amount: 5000, type: "income", category: "Salary", date: "2026-04-01" });

    expect(res.status).toBe(201);
    expect(res.body.record).toHaveProperty("id");
    recordId = res.body.record.id;
  });

  it("viewer cannot create a record", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ amount: 1000, type: "expense", category: "Rent", date: "2026-04-01" });

    expect(res.status).toBe(403);
  });

  it("rejects invalid amount", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ amount: -100, type: "income", category: "Test", date: "2026-04-01" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/positive/i);
  });

  it("rejects invalid type", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ amount: 100, type: "transfer", category: "Test", date: "2026-04-01" });

    expect(res.status).toBe(400);
  });

  it("rejects bad date format", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ amount: 100, type: "income", category: "Test", date: "01-04-2026" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/YYYY-MM-DD/i);
  });

  it("rejects unauthenticated request", async () => {
    const res = await request(app)
      .post("/api/records")
      .send({ amount: 100, type: "income", category: "Test", date: "2026-04-01" });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/records", () => {
  it("viewer can list records", async () => {
    const res = await request(app)
      .get("/api/records")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("records");
    expect(res.body).toHaveProperty("pagination");
  });

  it("filters by type correctly", async () => {
    const res = await request(app)
      .get("/api/records?type=income")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    res.body.records.forEach(r => expect(r.type).toBe("income"));
  });

  it("rejects invalid type filter", async () => {
    const res = await request(app)
      .get("/api/records?type=invalid")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(400);
  });
});

describe("PUT /api/records/:id", () => {
  it("analyst can edit their own record", async () => {
    const res = await request(app)
      .put(`/api/records/${recordId}`)
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ amount: 9000, category: "Bonus" });

    expect(res.status).toBe(200);
    expect(res.body.record.amount).toBe(9000);
  });

  it("admin can edit any record", async () => {
    const res = await request(app)
      .put(`/api/records/${recordId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ notes: "Updated by admin" });

    expect(res.status).toBe(200);
  });

  it("viewer cannot edit a record", async () => {
    const res = await request(app)
      .put(`/api/records/${recordId}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ amount: 100 });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/records/:id", () => {
  it("analyst can soft delete their own record", async () => {
    const res = await request(app)
      .delete(`/api/records/${recordId}`)
      .set("Authorization", `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("deleted record no longer appears in list", async () => {
    const res = await request(app)
      .get(`/api/records/${recordId}`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(404);
  });
});
