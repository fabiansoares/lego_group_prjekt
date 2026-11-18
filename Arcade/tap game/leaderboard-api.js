import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const SCORES_ENDPOINT = "/rest/v1/leaderboard_scores";

export function isLeaderboardConfigured() {
return SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.trim().length > 0;
}

function getScoresUrl() {
return `${SUPABASE_URL.replace(/\/+$/, "")}${SCORES_ENDPOINT}`;
}

function getHeaders(extraHeaders = {}) {
return {
apikey: SUPABASE_ANON_KEY,
Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
...extraHeaders
};
}

async function checkResponse(response) {
if (!response.ok) {
throw new Error(`Leaderboard request failed (HTTP ${response.status}).`);
}
return response;
}

export async function getTopScores() {
const query = new URLSearchParams({
select: "player_name,score,difficulty",
order: "score.desc,created_at.asc",
limit: "5"
});
const response = await fetch(`${getScoresUrl()}?${query}`, {
headers: getHeaders()
});
const checkedResponse = await checkResponse(response);
const scores = await checkedResponse.json();
if (!Array.isArray(scores) || scores.length > 5) {
throw new Error("Leaderboard returned an invalid score list.");
}
return scores;
}

export async function submitScore(playerName, score, difficulty) {
const normalizedName = playerName.trim();
if (normalizedName.length < 1 || normalizedName.length > 20) {
throw new Error("Player name must be between 1 and 20 characters.");
}
if (!Number.isSafeInteger(score) || score < 0 || score > 1000000) {
throw new Error("Score must be a whole number between 0 and 1,000,000.");
}
if (!["easy", "normal", "hard"].includes(difficulty)) {
throw new Error("Difficulty must be easy, normal, or hard.");
}

const response = await fetch(getScoresUrl(), {
method: "POST",
headers: getHeaders({
  "Content-Type": "application/json",
  Prefer: "return=minimal"
}),
body: JSON.stringify({ player_name: normalizedName, score, difficulty })
});
await checkResponse(response);
}
