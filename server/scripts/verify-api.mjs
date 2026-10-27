const base = "http://127.0.0.1:5000";
const stamp = Date.now();

async function call(path, { method = "GET", body, token, expect } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  const ok = expect ? res.status === expect : res.ok;
  if (!ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${data.error || JSON.stringify(data)}`);
  }
  return { status: res.status, data };
}

async function loginOrRegister(email, password, name) {
  try {
    return await call("/api/auth/login", { method: "POST", body: { email, password } });
  } catch {
    return call("/api/auth/register", {
      method: "POST",
      body: { name, email, password, hostel: "Verify Hall" },
      expect: 201,
    });
  }
}

const results = [];
try {
  const health = await call("/api/health");
  results.push(`health ${health.status}`);

  const listings = await call("/api/listings");
  results.push(`listings ${listings.status} count=${listings.data.listings.length}`);

  const owner = await loginOrRegister("demo@recirclehub.campus", "demo1234", "Campus Demo");
  results.push(`owner auth ${owner.status}`);
  const ownerToken = owner.data.token;

  const me = await call("/api/auth/me", { token: ownerToken });
  results.push(`me ${me.status} name=${me.data.user.name}`);

  const requester = await call("/api/auth/register", {
    method: "POST",
    body: {
      name: "Test Requester",
      email: `requester.${stamp}@campus.test`,
      password: "testpass",
      hostel: "Hostel A",
    },
    expect: 201,
  });
  results.push(`register ${requester.status}`);
  const requesterToken = requester.data.token;

  const createdListing = await call("/api/listings", {
    method: "POST",
    token: ownerToken,
    body: {
      title: "Verification lamp",
      description: "Temporary listing created by the API verification script.",
      category: "Electronics",
      imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
      condition: "Good",
      mode: "lend",
      price: 0,
      pickupLocation: "Test desk",
    },
    expect: 201,
  });
  const listingId = createdListing.data.listing.id;
  results.push(`create listing ${createdListing.status}`);

  const ownReq = await call("/api/requests", {
    method: "POST",
    body: { listingId, message: "own item" },
    token: ownerToken,
    expect: 400,
  });
  results.push(`own-request blocked ${ownReq.status}`);

  const created = await call("/api/requests", {
    method: "POST",
    body: { listingId, message: "Can I pick this up tomorrow?" },
    token: requesterToken,
    expect: 201,
  });
  results.push(`create request ${created.status}`);

  const cancelled = await call(`/api/requests/${created.data.request.id}/cancel`, {
    method: "PATCH",
    token: requesterToken,
  });
  results.push(`cancel ${cancelled.status} status=${cancelled.data.request.status}`);

  const createdAgain = await call("/api/requests", {
    method: "POST",
    body: { listingId, message: "Trying again" },
    token: requesterToken,
    expect: 201,
  });

  const rejected = await call(`/api/requests/${createdAgain.data.request.id}/reject`, {
    method: "PATCH",
    token: ownerToken,
  });
  results.push(`reject ${rejected.status} status=${rejected.data.request.status}`);

  const createdThird = await call("/api/requests", {
    method: "POST",
    body: { listingId, message: "Please accept" },
    token: requesterToken,
    expect: 201,
  });
  const accepted = await call(`/api/requests/${createdThird.data.request.id}/accept`, {
    method: "PATCH",
    token: ownerToken,
  });
  results.push(`accept ${accepted.status} status=${accepted.data.request.status}`);

  const after = await call(`/api/listings/${listingId}`);
  results.push(`listing after accept ${after.data.listing.status}`);

  const extra = await call("/api/auth/register", {
    method: "POST",
    body: {
      name: "Second Requester",
      email: `second.${stamp}@campus.test`,
      password: "testpass",
    },
    expect: 201,
  });
  const extraReq = await call("/api/requests", {
    method: "POST",
    body: { listingId, message: "too late" },
    token: extra.data.token,
    expect: 400,
  });
  results.push(`request reserved item blocked ${extraReq.status}`);

  const spoof = await call(`/api/requests/${createdThird.data.request.id}/reject`, {
    method: "PATCH",
    token: requesterToken,
    expect: 403,
  });
  results.push(`non-owner reject blocked ${spoof.status}`);

  console.log("API_VERIFY_OK");
  for (const line of results) console.log(line);
} catch (error) {
  console.error("API_VERIFY_FAIL");
  console.error(error.message);
  for (const line of results) console.error(line);
  process.exit(1);
}
