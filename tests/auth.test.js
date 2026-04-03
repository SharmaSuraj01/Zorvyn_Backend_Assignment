const request = require("supertest");

// point the app to use test DB before requiring app
jest.mock("../src/db", () => require("./testDb"));

const { app, init } = require("../src/app");

beforeAll(async () => { await init; });

describe("POST /api/auth/register", () => {
  it("registers a new user successfully", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test Admin",
      email: "testadmin@example.com",
      password: "pass1234",
      role: "admin",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("userId");
    expect(res.body.message).toBe("User registered successfully");
  });

  it("rejects duplicate email", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Dup User",
      email: "dup@example.com",
      password: "pass1234",
    });
    const res = await request(app).post("/api/auth/register").send({
      name: "Dup User 2",
      email: "dup@example.com",
      password: "pass1234",
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it("rejects missing required fields", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "noname@example.com",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("rejects invalid role", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Bad Role",
      email: "badrole@example.com",
      password: "pass1234",
      role: "superuser",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role/i);
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await request(app).post("/api/auth/register").send({
      name: "Login Test",
      email: "logintest@example.com",
      password: "mypassword",
      role: "viewer",
    });
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "logintest@example.com",
      password: "mypassword",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.role).toBe("viewer");
  });

  it("rejects wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "logintest@example.com",
      password: "wrongpass",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("rejects non-existent email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "ghost@example.com",
      password: "pass1234",
    });
    expect(res.status).toBe(401);
  });

  it("rejects missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "logintest@example.com",
    });
    expect(res.status).toBe(400);
  });
});
