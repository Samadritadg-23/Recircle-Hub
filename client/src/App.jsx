import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { useAuth } from "./auth.jsx";
import "./App.css";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-14565130808-af98c75f72ce?auto=format&fit=crop&w=900&q=80";

function parseRoute() {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "listing" && parts[1]) return { name: "listing", id: parts[1] };
  if (parts[0] === "create") return { name: "create" };
  if (parts[0] === "dashboard") return { name: "dashboard" };
  if (parts[0] === "wanted") return { name: "wanted" };
  if (parts[0] === "notifications") return { name: "notifications" };
  if (parts[0] === "login") return { name: "login" };
  if (parts[0] === "register") return { name: "register" };
  return { name: "browse" };
}

function go(path) {
  window.location.hash = path;
}

function modeLabel(mode) {
  if (mode === "sell") return "For sale";
  if (mode === "rent") return "For rent";
  return "Free lend";
}

function greetingForTime() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function priceLabel(listing) {
  if (listing.mode === "lend") return "Free";
  if (listing.mode === "rent") return `₹${listing.price}/week`;
  return `₹${listing.price}`;
}

function Cover({ src, alt, onClick, className }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      className={className || "cover-img"}
      src={failed || !src ? FALLBACK_IMG : src}
      alt={alt}
      onClick={onClick}
      onError={() => setFailed(true)}
    />
  );
}

function ListingCard({ listing, onOpen }) {
  return (
    <article className="card">
      <button className="cover" type="button" onClick={() => onOpen(listing.id)} aria-label={listing.title}>
        <Cover src={listing.imageUrl} alt="" />
      </button>
      <div className="card-body">
        <div className="chips">
          <span className="chip">{listing.category}</span>
          <span className={`chip ${listing.mode === "lend" ? "gold" : "clay"}`}>{modeLabel(listing.mode)}</span>
          <span className="chip muted">{listing.status}</span>
        </div>
        <h3>{listing.title}</h3>
        <div className="price">{priceLabel(listing)}</div>
        <p className="muted">{listing.pickupLocation}</p>
        
        <button className="btn small" type="button" onClick={() => onOpen(listing.id)}>
          View
        </button>
      </div>
    </article>
  );
}

function BrowsePage({ onOpen, user }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState("");
  const [meta, setMeta] = useState({ categories: [], modes: [] });
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category) params.set("category", category);
    if (mode) params.set("mode", mode);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [search, category, mode]);

  useEffect(() => {
    api("/listings/meta").then(setMeta).catch(() => { });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api(`/listings${query}`)
        .then((data) => setListings(data.listings))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const available = listings.filter((item) => item.status === "available").length;

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">{user ? greetingForTime() : "Campus reuse, not landfill"}</p>
          <h1>{user ? `Hi, ${user.name?.trim().split(/\s+/)[0] || "there"}!` : "Sell, rent, or lend what students already have."}</h1>
          {user ? (
            <p>
              Good to see you, {user.name?.trim().split(/\s+/)[0] || "there"}. Find something useful,
              pass an item on, and keep good things circulating across campus.
            </p>
          ) : (
            <p>
              ReCircle Hub is a student marketplace for textbooks, gadgets, hostel gear, and everyday
              campus stuff. Keep good items circulating instead of buying everything new.
            </p>
          )}
        </div>
        <div className="hero-card">
          <p>{user ? "Your campus community is full of useful things waiting for their next chapter." : "Browse what is already on campus, request an item, and pick it up from a hostel or classroom."}</p>
          <div className="stat-row">
            <div className="stat">
              <b>{listings.length}</b>
              listings loaded
            </div>
            <div className="stat">
              <b>{available}</b>
              available now
            </div>
          </div>
        </div>
      </section>

      <div className="filters">
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, description, or pickup spot"
        />
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {meta.categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">All modes</option>
          <option value="sell">Sell</option>
          <option value="rent">Rent</option>
          <option value="lend">Free lend</option>
        </select>
        <button
          className="btn ghost"
          type="button"
          onClick={() => {
            setSearch("");
            setCategory("");
            setMode("");
          }}
        >
          Reset
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="loading">Loading campus listings…</div> : null}
      {!loading && !error && listings.length === 0 ? (
        <div className="empty">No listings match those filters. Try a broader search or post the first item.</div>
      ) : null}

      <div className="grid">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} onOpen={onOpen} />
        ))}
      </div>
    </>
  );
}

function ListingPage({ id, user, onNeedAuth }) {
  const [listing, setListing] = useState(null);
  const [outgoing, setOutgoing] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api(`/listings/${id}`);
      setListing(data.listing);
      if (user) {
        const mine = await api("/requests/outgoing");
        setOutgoing(mine.requests);
      } else {
        setOutgoing([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const myRequest = outgoing.find((item) => item.listing?.id === id);

  async function sendRequest(event) {
    event.preventDefault();
    if (!user) {
      onNeedAuth();
      return;
    }
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await api("/requests", { method: "POST", body: { listingId: id, message } });
      setMessage("");
      setNotice("Request sent. The owner can accept or reject it from their dashboard.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="loading">Loading listing…</div>;
  if (error && !listing) return <div className="alert error">{error}</div>;
  if (!listing) return <div className="empty">Listing not found.</div>;

  const isOwner = user && listing.owner?.id === user.id;
  const requestOwner = myRequest?.owner;
  const ownerName =
    listing.owner?.name ||
    (requestOwner?.name ? requestOwner.name : null);
  const ownerPhone = requestOwner?.phone;

  return (
    <section className="detail">
      <Cover src={listing.imageUrl} alt={listing.title} />
      <div>
        <p className="eyebrow">{listing.category}</p>
        <h1>{listing.title}</h1>
        <div className="chips">
          <span className="chip clay">{modeLabel(listing.mode)}</span>
          <span className="chip">{listing.condition}</span>
          <span className="chip muted">{listing.status}</span>
          {listing.isSample ? <span className="chip gold">Sample listing</span> : null}
        </div>
        <p className="price">{priceLabel(listing)}</p>
        <p>{listing.description}</p>
        <p className="muted">Pickup: {listing.pickupLocation}</p>
        <p className="muted">
          Owner: {ownerName || "Student"}
          {listing.owner?.hostel ? ` · ${listing.owner.hostel}` : ""}
        </p>
        {ownerPhone ? (
          <p>
            Phone: <a href={`tel:${ownerPhone}`}>{ownerPhone}</a>
          </p>
        ) : null}
        {error ? <div className="alert error">{error}</div> : null}
        {notice ? <div className="alert ok">{notice}</div> : null}

        {isOwner ? (
          <div className="banner">This is your listing. Manage incoming requests from the dashboard.</div>
        ) : listing.status !== "available" ? (
          <div className="banner">This item is currently {listing.status}.</div>
        ) : myRequest ? (
          <div className="banner">You already requested this item. Status: {myRequest.status}.</div>
        ) : (
          <form onSubmit={sendRequest}>
            <label className="field">
              Message to owner
              <textarea
                className="textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="When can you pick it up? Any questions?"
              />
            </label>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Request this item"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function CreatePage({ user, onNeedAuth, onCreated }) {
  const [meta, setMeta] = useState({ categories: [], conditions: [], modes: [] });
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Books",
    imageUrl: "",
    condition: "Good",
    mode: "sell",
    price: "",
    pickupLocation: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/listings/meta").then(setMeta).catch(() => { });
  }, []);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!user) {
      onNeedAuth();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api("/listings", {
        method: "POST",
        body: {
          ...form,
          price: form.mode === "lend" ? 0 : Number(form.price),
        },
      });
      onCreated(data.listing.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <p className="eyebrow">Share something useful</p>
      <h1>Create a listing</h1>
      {error ? <div className="alert error">{error}</div> : null}
      <div className="form-grid">
        <label className="field full">
          Title
          <input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} required minLength={3} />
        </label>
        <label className="field full">
          Description
          <textarea className="textarea" value={form.description} onChange={(e) => update("description", e.target.value)} required minLength={10} />
        </label>
        <label className="field">
          Category
          <select className="select" value={form.category} onChange={(e) => update("category", e.target.value)}>
            {meta.categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Condition
          <select className="select" value={form.condition} onChange={(e) => update("condition", e.target.value)}>
            {meta.conditions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Mode
          <select className="select" value={form.mode} onChange={(e) => update("mode", e.target.value)}>
            <option value="sell">Sell</option>
            <option value="rent">Rent (price per week)</option>
            <option value="lend">Free lend</option>
          </select>
        </label>
        <label className="field">
          Price (₹)
          <input
            className="input"
            type="number"
            min="0"
            value={form.price}
            disabled={form.mode === "lend"}
            onChange={(e) => update("price", e.target.value)}
            placeholder={form.mode === "lend" ? "Free" : "e.g. 250"}
          />
        </label>
        <label className="field full">
          Image URL
          <input className="input" value={form.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} placeholder="https://..." />
        </label>
        <label className="field full">
          Pickup location
          <input className="input" value={form.pickupLocation} onChange={(e) => update("pickupLocation", e.target.value)} required placeholder="Hostel B lobby, library foyer..." />
        </label>
      </div>
      <br />
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Publishing…" : "Publish listing"}
      </button>
    </form>
  );
}

function DashboardPage({ user }) {
  const [tab, setTab] = useState("listings");
  const [listings, setListings] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  // Exclude demo/sample listings so they do not inflate a student's impact.
  const realListings = useMemo(
    () => listings.filter((listing) => !listing.isSample),
    [listings]
  );
  const completedListings = useMemo(
    () => realListings.filter((listing) => listing.status === "completed"),
    [realListings]
  );
  const circulatingListings = useMemo(
    () => realListings.filter((listing) => ["available", "reserved"].includes(listing.status)),
    [realListings]
  );
  // Transparent gamification: 1 point per genuine listing + 4 bonus points per completed listing.
  const impactScore = realListings.length + completedListings.length * 4;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [mine, inReqs, outReqs] = await Promise.all([
        api("/listings/mine"),
        api("/requests/incoming"),
        api("/requests/outgoing"),
      ]);
      setListings(mine.listings);
      setIncoming(inReqs.requests);
      setOutgoing(outReqs.requests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(path, okMessage) {
    setNotice("");
    setError("");
    try {
      await api(path, { method: "PATCH" });
      setNotice(okMessage);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeListing(id) {
    if (!window.confirm("Remove this listing and its requests?")) return;
    try {
      await api(`/listings/${id}`, { method: "DELETE" });
      setNotice("Listing removed.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) return null;

  return (
    <section className="panel">
      <div className="profile-heading">
        <div className="profile-avatar" aria-hidden="true">
          {(user.name || "R").trim().charAt(0).toUpperCase()}
        </div>
        <div className="profile-heading-copy">
          <p className="eyebrow">Your personal space</p>
          <h1>My Space</h1>
          <p className="muted">Welcome back, {user.name?.trim().split(/\s+/)[0] || "there"}. Manage your listings, requests, and campus impact here.</p>
        </div>
      </div>

      <section className="impact-card" aria-labelledby="impact-title">
        <div className="impact-heading">
          <div>
            <p className="eyebrow">Small actions, lasting impact</p>
            <h2 id="impact-title">Your ReCircle Impact</h2>
            <p className="muted">Every useful item you list is a chance to keep something in circulation.</p>
          </div>
          <div className="impact-score" aria-label={`${impactScore} reuse points`}>
            <span>{impactScore}</span>
            <small>reuse points</small>
          </div>
        </div>

        <div className="impact-stats">
          <div className="impact-stat">
            <span className="impact-number">{realListings.length}</span>
            <span className="impact-label">Items listed for reuse</span>
          </div>
          <div className="impact-stat">
            <span className="impact-number">{completedListings.length}</span>
            <span className="impact-label">Listings marked complete</span>
          </div>
          <div className="impact-stat">
            <span className="impact-number">{circulatingListings.length}</span>
            <span className="impact-label">Items still circulating</span>
          </div>
        </div>

        <p className="impact-note">
          Reuse points = 1 point per non-demo listing + 4 bonus points per listing you mark complete. Completion is not independently verified, and waste avoided is not estimated because item weights are not recorded.
        </p>
      </section>

      <div className="tabs">
        <button className={`nav-link ${tab === "listings" ? "active" : ""}`} type="button" onClick={() => setTab("listings")}>
          My listings
        </button>
        <button className={`nav-link ${tab === "incoming" ? "active" : ""}`} type="button" onClick={() => setTab("incoming")}>
          Incoming requests
        </button>
        <button className={`nav-link ${tab === "outgoing" ? "active" : ""}`} type="button" onClick={() => setTab("outgoing")}>
          My requests
        </button>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {notice ? <div className="alert ok">{notice}</div> : null}
      {loading ? <div className="loading">Loading your activity…</div> : null}

      {!loading && tab === "listings" ? (
        listings.length === 0 ? (
          <div className="empty">You have not posted anything yet.</div>
        ) : (
          <div className="grid">
            {listings.map((listing) => (
              <article className="card" key={listing.id}>
                <Cover src={listing.imageUrl} alt="" />
                <div className="card-body">
                  <h3>{listing.title}</h3>
                  <p className="muted">{listing.status} · {modeLabel(listing.mode)}</p>
                  <div className="actions">
                    <button className="btn small ghost" type="button" onClick={() => go(`/listing/${listing.id}`)}>
                      Open
                    </button>
                    {listing.status !== "completed" ? (
                      <button className="btn small ghost" type="button" onClick={() => act(`/listings/${listing.id}/complete`, "Marked complete.")}>
                        Mark complete
                      </button>
                    ) : null}
                    <button className="btn small danger" type="button" onClick={() => removeListing(listing.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}

      {!loading && tab === "incoming" ? (
        incoming.length === 0 ? (
          <div className="empty">No one has requested your items yet.</div>
        ) : (
          <div className="request-list">
            {incoming.map((item) => (
              <div className="request-row" key={item.id}>
                <div>
                  <strong>{item.listing?.title}</strong>
                  <p className="muted">
                    From {item.requester?.name} {item.requester?.email ? `· ${item.requester.email}` : ""} · {item.status}
                  </p>
                  {item.message ? <p>{item.message}</p> : null}
                </div>
                {item.status === "pending" ? (
                  <div className="actions">
                    <button className="btn small" type="button" onClick={() => act(`/requests/${item.id}/accept`, "Request accepted.")}>
                      Accept
                    </button>
                    <button className="btn small ghost" type="button" onClick={() => act(`/requests/${item.id}/reject`, "Request rejected.")}>
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )
      ) : null}


      {!loading && tab === "outgoing" ? (
        outgoing.length === 0 ? (
          <div className="empty">You have not requested any items yet.</div>
        ) : (
          <div className="request-list">
            {outgoing.map((item) => (
              <div className="request-row" key={item.id}>
                <div>
                  <strong>{item.listing?.title}</strong>
                  <p className="muted">
                    {item.owner?.name
                      ? `Owner ${item.owner.name}`
                      : "Owner details hidden"}{" "}
                    · {item.status}
                  </p>

                  {item.owner?.phone ? (
                    <p>
                      Phone:{" "}
                      <a href={`tel:${item.owner.phone}`}>
                        {item.owner.phone}
                      </a>
                    </p>
                  ) : item.owner?.name ? (
                    <p className="muted">
                      Phone number not available.
                    </p>
                  ) : (
                    <p className="muted">
                      The owner has chosen to keep their details private
                      until they accept your request.
                    </p>
                  )}
                </div>

                {item.status === "pending" ? (
                  <button
                    className="btn small ghost"
                    type="button"
                    onClick={() =>
                      act(
                        `/requests/${item.id}/cancel`,
                        "Request cancelled."
                      )
                    }
                  >
                    Cancel request
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )
      ) : null}

    </section>
  );
}


function WantedItemsPage({ user, onNeedAuth }) {
  const [items, setItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [responsesByItem, setResponsesByItem] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [matchesByItem, setMatchesByItem] = useState({});
  const [matchingItemId, setMatchingItemId] = useState(null);
  const [matchErrors, setMatchErrors] = useState({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Other",
    notifyAll: true,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/wanted-items");
      setItems(data.wantedItems || []);
      if (user) {
        const mineData = await api("/wanted-items/mine");
        setMyItems(mineData.wantedItems || []);
      } else {
        setMyItems([]);
      }
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const myItemIds = useMemo(
    () => new Set(myItems.map((item) => String(item._id))),
    [myItems]
  );

  async function submit(event) {
    event.preventDefault();
    if (!user) { onNeedAuth(); return; }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api("/wanted-items", {
        method: "POST",
        body: form,
      });
      setNotice(result.message || "Wanted item posted successfully.");
      setForm({ title: "", description: "", category: "Other", notifyAll: true });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }


  async function findMatches(item) {
    if (!user) {
      onNeedAuth();
      return;
    }

    const itemId = String(item._id);

    setMatchingItemId(itemId);
    setMatchErrors((previous) => ({
      ...previous,
      [itemId]: "",
    }));

    try {
      const data = await api(
        `/wanted-items/${itemId}/matches`
      );

      setMatchesByItem((previous) => ({
        ...previous,
        [itemId]: data.matches || [],
      }));
    } catch (err) {
      setMatchErrors((previous) => ({
        ...previous,
        [itemId]: err.message || "Could not find matches.",
      }));
    } finally {
      setMatchingItemId(null);
    }
  }


  async function respondToItem(item, shareContact) {
    if (!user) { onNeedAuth(); return; }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api(`/wanted-items/${item._id}/respond`, {
        method: "POST",
        body: { shareContact },
      });
      setNotice(result.message || "Your response has been recorded.");
      setSelectedItem(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadResponses(item) {
    setError("");
    setNotice("");
    try {
      const data = await api(`/wanted-items/${item._id}/responses`);
      setResponsesByItem((current) => ({
        ...current,
        [item._id]: data.responses || [],
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateWantedStatus(item, status) {
    setError("");
    setNotice("");
    try {
      await api(`/wanted-items/${item._id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setNotice(status === "fulfilled" ? "Request marked as fulfilled." : "Request cancelled.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel">
      <p className="eyebrow">Community requests</p>
      <h1>Wanted items</h1>
      <p className="muted">Looking for something that nobody has listed? Ask the campus community.</p>
      {!user ? <div className="banner">Sign in to post a wanted item or offer to help.</div> : null}
      {error ? <div className="alert error">{error}</div> : null}
      {notice ? <div className="alert ok">{notice}</div> : null}

      <form className="form-card" onSubmit={submit}>
        <label className="field">Item name
          <input className="input" value={form.title} minLength={3} maxLength={100} required
            onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Scientific calculator" />
        </label>
        <label className="field">Description
          <textarea className="textarea" value={form.description} maxLength={500} required
            onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Any details, preferred condition, or urgency..." />
        </label>
        <label className="field">Category
          <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {["Books", "Electronics", "Hostel", "Clothing", "Sports", "Other"].map((category) =>
              <option key={category} value={category}>{category}</option>
            )}
          </select>
        </label>
        <label className="field">
          <span><input type="checkbox" checked={form.notifyAll}
            onChange={(e) => setForm({ ...form, notifyAll: e.target.checked })} /> Notify all campus users</span>
        </label>
        <button className="btn" type="submit" disabled={busy || !user}>
          {busy ? "Please wait…" : "Post wanted item"}
        </button>
      </form>

      <h2>What students are looking for</h2>
      {loading ? <div className="loading">Loading wanted items…</div> : null}
      {!loading && items.length === 0 ? <div className="empty">No open wanted-item requests yet.</div> : null}
      <div className="request-list">
        {items.map((item) => {
          const isMine = myItemIds.has(String(item._id));
          return (
            <article className="request-row" key={item._id}>
              <div>
                <strong>{item.title}</strong>
                <p className="muted">{item.category} · {item.requester?.name || "Student"} · {new Date(item.createdAt).toLocaleDateString()}</p>
                {item.description ? <p>{item.description}</p> : null}
                {isMine ? (
                  <>
                    <p className="muted">Your request · {item.status}</p>

                    {item.status === "open" ? (
                      <div className="matching-section">
                        <button
                          className="btn small ghost"
                          type="button"
                          disabled={matchingItemId === String(item._id)}
                          onClick={() => findMatches(item)}
                        >
                          {matchingItemId === String(item._id)
                            ? "Finding matches…"
                            : "✨ Find Matches"}
                        </button>

                        {matchErrors[item._id] ? (
                          <p role="alert" className="muted">
                            {matchErrors[item._id]}
                          </p>
                        ) : null}

                        {matchesByItem[item._id] ? (
                          <div className="response-contacts">
                            <strong>
                              {matchesByItem[item._id].length
                                ? `Found ${matchesByItem[item._id].length} potential match(es)`
                                : "No matching listings found yet."}
                            </strong>

                            {matchesByItem[item._id].map((listing) => (
                              <div className="request-row" key={listing.id}>
                                <div>
                                  <strong>{listing.title}</strong>
                                  <p className="muted">
                                    {listing.category} · {listing.condition}
                                  </p>
                                  <p>
                                    {listing.mode === "lend"
                                      ? "Free to borrow"
                                      : `₹${listing.price} · ${listing.mode}`}
                                  </p>
                                  {listing.description ? (
                                    <p>{listing.description}</p>
                                  ) : null}
                                  <p className="muted">
                                    Match:{" "}
                                    {listing.categoryMatch ? "Category" : ""}
                                    {listing.categoryMatch &&
                                      listing.matchedKeywords.length
                                      ? " + "
                                      : ""}
                                    {listing.matchedKeywords.length
                                      ? listing.matchedKeywords.join(", ")
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="actions">
                      <button className="btn small ghost" type="button" onClick={() => loadResponses(item)}>
                        View volunteers
                      </button>
                      {item.status === "open" ? (
                        <>
                          <button className="btn small" type="button" onClick={() => updateWantedStatus(item, "fulfilled")}>
                            Mark fulfilled
                          </button>
                          <button className="btn small ghost" type="button" onClick={() => updateWantedStatus(item, "cancelled")}>
                            Cancel request
                          </button>
                        </>
                      ) : null}
                    </div>
                    {responsesByItem[item._id] ? (
                      <div className="response-contacts">
                        <strong>Students who agreed to share contact details</strong>
                        {responsesByItem[item._id].length === 0 ? (
                          <p className="muted">No volunteers have shared their contact details yet.</p>
                        ) : responsesByItem[item._id].map((response) => (
                          <div key={response._id} className="request-row">
                            <div>
                              <strong>{response.volunteer?.name || "Student"}</strong>
                              {response.volunteer?.hostel ? <p className="muted">{response.volunteer.hostel}</p> : null}
                              {response.volunteer?.phone ? (
                                <p>Phone: <a href={`tel:${response.volunteer.phone}`}>{response.volunteer.phone}</a></p>
                              ) : <p className="muted">Phone number unavailable.</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : user ? (
                  <button className="btn small" type="button" onClick={() => setSelectedItem(item)}>
                    I have this item
                  </button>
                ) : (
                  <button className="btn small" type="button" onClick={onNeedAuth}>
                    Sign in to help
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {selectedItem ? (
        <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20, 24, 22, 0.62)", display: "grid", placeItems: "center", padding: "1rem" }}>
          <section className="form-card" style={{ width: "min(100%, 560px)", maxHeight: "90vh", overflowY: "auto", background: "white", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} role="dialog" aria-modal="true" aria-labelledby="wanted-consent-title">
            <p className="eyebrow">Offer to help</p>
            <h2 id="wanted-consent-title">Do you have “{selectedItem.title}”?</h2>
            <p>The requester will only receive your contact details if you choose to share them.</p>
            {error ? (
              <div className="alert error" role="alert">
                {error}
              </div>
            ) : null}
            <p className="muted">Choose “Yes” to send your name and registered phone number to the student who posted this request.</p>
            <div className="actions">
              <button className="btn" type="button" disabled={busy} onClick={() => respondToItem(selectedItem, true)}>
                {busy ? "Sending…" : "Yes, share my contact details"}
              </button>
              <button className="btn ghost" type="button" disabled={busy} onClick={() => respondToItem(selectedItem, false)}>
                No, keep my details private
              </button>
              <button className="btn ghost" type="button" disabled={busy} onClick={() => setSelectedItem(null)}>
                Go back
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function NotificationsPage({ onUnreadChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/notifications");
      setNotifications(data.notifications || []);
      onUnreadChange?.(data.unreadCount || 0);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => { load(); }, [load]);

  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((current) => current.map((n) => n._id === id ? { ...n, isRead: true } : n));
      setNotice("Notification marked as read.");
      const result = await api("/notifications/unread-count");
      onUnreadChange?.(result.unreadCount || 0);
    } catch (err) {
      setError(err.message);
    }
  }

  async function markAllRead() {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      setNotifications((current) => current.map((n) => ({ ...n, isRead: true })));
      onUnreadChange?.(0);
      setNotice("All notifications marked as read.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel">
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <div><p className="eyebrow">Stay in the loop</p><h1>Notifications</h1></div>
        <button className="btn ghost" type="button" onClick={markAllRead} disabled={!notifications.some((n) => !n.isRead)}>Mark all as read</button>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {notice ? <div className="alert ok">{notice}</div> : null}
      {loading ? <div className="loading">Loading notifications…</div> : null}
      {!loading && notifications.length === 0 ? <div className="empty">You're all caught up. No notifications yet.</div> : null}
      <div className="request-list">
        {notifications.map((item) => (
          <article className="request-row" key={item._id} style={{ opacity: item.isRead ? 0.72 : 1 }}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
              <p className="muted">{new Date(item.createdAt).toLocaleString()} · {item.isRead ? "Read" : "Unread"}</p>
              {item.wantedItem?._id && item.wantedItem.status === "open" ? (
                <button className="btn small ghost" type="button" onClick={() => go("/wanted")}>View wanted items</button>
              ) : null}
            </div>
            {!item.isRead ? <button className="btn small" type="button" onClick={() => markRead(item._id)}>Mark read</button> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function AuthPage({ mode, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    hostel: "",
    phone: "",
    hidePhoneUntilAccepted: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await onSubmit(form);
      go("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <p className="eyebrow">Student access</p>
      <h1>{isRegister ? "Create an account" : "Sign in"}</h1>

      <p className="muted">
        Auth is JWT-based. Demo account:{" "}
        <code>demo@recirclehub.campus</code> / <code>demo1234</code>
      </p>

      {error ? <div className="alert error">{error}</div> : null}

      {isRegister ? (
        <>
          <label className="field">
            Name
            <input
              className="input"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
              minLength={2}
            />
          </label>

          <label className="field">
            Hostel / area
            <input
              className="input"
              value={form.hostel}
              onChange={(e) =>
                setForm({ ...form, hostel: e.target.value })
              }
            />
          </label>

          <label className="field">
            Phone number
            <input
              className="input"
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
              placeholder="Enter your phone number"
              required
              minLength={10}
              maxLength={20}
              pattern="[+0-9() -]{10,20}"
              title="Enter a valid phone number."
            />
          </label>

          <label className="field">
            <span>
              <input
                type="checkbox"
                checked={form.hidePhoneUntilAccepted}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hidePhoneUntilAccepted: e.target.checked,
                  })
                }
              />{" "}
              Don't show my name and phone number to requesters
              until I accept their request.
            </span>
          </label>
        </>
      ) : null}

      <label className="field">
        Email
        <input
          className="input"
          type="email"
          value={form.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
          required
        />
      </label>

      <label className="field">
        Password
        <input
          className="input"
          type="password"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
          required
          minLength={6}
        />
      </label>

      <br />

      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Please wait…" : isRegister ? "Register" : "Sign in"}
      </button>
    </form>
  );
}


export default function App() {
  const { user, ready, login, register, logout } = useAuth();
  const [route, setRoute] = useState(parseRoute);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) { setUnreadCount(0); return; }
    try {
      const data = await api("/notifications/unread-count");
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Keep the app usable if notifications are temporarily unavailable.
    }
  }, [user]);

  useEffect(() => {
    refreshUnreadCount();
    if (!user) return undefined;
    const timer = window.setInterval(refreshUnreadCount, 30000);
    return () => window.clearInterval(timer);
  }, [refreshUnreadCount, user]);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHash);
    if (!window.location.hash) window.location.hash = "/";
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (ready && (route.name === "create" || route.name === "dashboard" || route.name === "notifications") && !user) {
      go("/login");
    }
  }, [ready, route.name, user]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => go("/")}>
          <span className="mark" aria-hidden="true">↻</span>
          ReCircle Hub
        </button>
        <nav className="nav-links">
          <button className={`nav-link ${route.name === "browse" ? "active" : ""}`} type="button" onClick={() => go("/")}>
            Dashboard
          </button>
          <button className={`nav-link ${route.name === "create" ? "active" : ""}`} type="button" onClick={() => go("/create")}>
            List an item
          </button>
          <button className={`nav-link ${route.name === "wanted" ? "active" : ""}`} type="button" onClick={() => go("/wanted")}>
            Wanted items
          </button>
          <button className={`nav-link ${route.name === "dashboard" ? "active" : ""}`} type="button" onClick={() => go("/dashboard")}>
            My Space
          </button>
          {user ? (
            <button className={`nav-link ${route.name === "notifications" ? "active" : ""}`} type="button" onClick={() => go("/notifications")} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
              🔔{unreadCount > 0 ? <span className="chip clay">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
            </button>
          ) : null}
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="user-chip">{user.name}</span>
              <button className="btn ghost" type="button" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button className="btn ghost" type="button" onClick={() => go("/login")}>
                Sign in
              </button>
              <button className="btn" type="button" onClick={() => go("/register")}>
                Join
              </button>
            </>
          )}
        </div>
      </header>

      <main className="page">
        {!ready ? <div className="loading">Starting ReCircle Hub…</div> : null}
        {ready && route.name === "browse" ? <BrowsePage user={user} onOpen={(id) => go(`/listing/${id}`)} /> : null}
        {ready && route.name === "listing" ? (
          <ListingPage id={route.id} user={user} onNeedAuth={() => go("/login")} />
        ) : null}
        {ready && route.name === "create" && user ? (
          <CreatePage user={user} onNeedAuth={() => go("/login")} onCreated={(id) => go(`/listing/${id}`)} />
        ) : null}
        {ready && route.name === "dashboard" && user ? <DashboardPage user={user} /> : null}
        {ready && route.name === "wanted" ? <WantedItemsPage user={user} onNeedAuth={() => go("/login")} /> : null}
        {ready && route.name === "notifications" && user ? <NotificationsPage onUnreadChange={setUnreadCount} /> : null}
        {ready && route.name === "login" ? (
          <AuthPage mode="login" onSubmit={(form) => login(form.email, form.password)} />
        ) : null}
        {ready && route.name === "register" ? (
          <AuthPage mode="register" onSubmit={(form) => register(form)} />
        ) : null}
      </main>
    </div>
  );
}