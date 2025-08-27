const express = require("express");
const cors = require("cors");
const psn = require("psn-api");

const app = express();
app.use(cors());
app.use(express.json());

// --- SYNC: lista gier
app.post("/api/sync", async (req, res) => {
  try {
    const { npsso } = req.body;
    const accessCode = await psn.exchangeNpssoForAccessCode(npsso);
    const authorization = await psn.exchangeAccessCodeForAuthTokens(accessCode);

    const { trophyTitles } = await psn.getUserTitles(authorization, "me");
    res.json({ games: trophyTitles });
  } catch (err) {
    console.error("❌ Błąd /api/sync:", err);
    res.status(400).json({ error: err.message });
  }
});

// --- Szczegóły gry + trofea
app.post("/api/gameDetails", async (req, res) => {
  try {
    const { npsso, npCommunicationId, platform } = req.body;
    const accessCode = await psn.exchangeNpssoForAccessCode(npsso);
    const authorization = await psn.exchangeAccessCodeForAuthTokens(accessCode);

    const service = platform !== "PS5" ? "trophy" : undefined;

    const { trophies } = await psn.getTitleTrophies(
      authorization,
      npCommunicationId,
      "all",
      { npServiceName: service }
    );

    const { trophies: earned } = await psn.getUserTrophiesEarnedForTitle(
      authorization,
      "me",
      npCommunicationId,
      "all",
      { npServiceName: service }
    );

    const merged = trophies.map((t, i) => ({
      ...t,
      earned: earned[i]?.earned || false,
      earnedDateTime: earned[i]?.earnedDateTime || null
    }));

    const baseGame = merged.filter(t => t.trophyGroupId === "default" || t.trophyGroupId === "all");
    const dlc = merged.filter(t => t.trophyGroupId !== "default" && t.trophyGroupId !== "all");

    let metadata = {};
    try {
      metadata = await psn.getTitleMetadata(authorization, npCommunicationId, { npServiceName: service });
    } catch {}

    res.json({
      gameInfo: {
        name: metadata.name || "Brak tytułu",
        description: metadata.localizedMetadata?.["en"]?.description || "Brak opisu",
        publisher: metadata.publisher || "Nieznany",
        platform
      },
      trophies: {
        baseGame,
        dlc
      }
    });
  } catch (err) {
    console.error("❌ Błąd /api/gameDetails:", err);
    res.status(400).json({ error: err.message });
  }
});

app.listen(4000, () =>
  console.log("✅ Backend działa na http://localhost:4000")
);
