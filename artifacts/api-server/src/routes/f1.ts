import { Router } from "express";

import {
  countryCode,
  fetchConstructorStandings,
  fetchDriverStandings,
  fetchQualifyingResults,
  fetchRace,
  fetchRaceResults,
  fetchSeason,
  fetchSprintResults,
  type JolpicaRace,
  type JolpicaResultRow,
  type SessionSlot,
} from "../lib/jolpica.js";
import { driverPhoto, fetchFPResults, fetchSprintQualiResults } from "../lib/openf1.js";

const router = Router();

type SessionType =
  | "fp1"
  | "fp2"
  | "fp3"
  | "sprint_quali"
  | "qualifying"
  | "sprint"
  | "race";

const SESSION_LABELS: Record<SessionType, string> = {
  fp1: "Essais Libres 1",
  fp2: "Essais Libres 2",
  fp3: "Essais Libres 3",
  sprint_quali: "Qualification Sprint",
  qualifying: "Qualifications",
  sprint: "Sprint",
  race: "Course",
};

const RESULTS_AVAILABLE: Record<SessionType, boolean> = {
  fp1: true,
  fp2: true,
  fp3: true,
  sprint_quali: true,
  qualifying: true,
  sprint: true,
  race: true,
};

function slotIso(slot?: SessionSlot): string | undefined {
  if (!slot) return undefined;
  return slot.time ? `${slot.date}T${slot.time}` : slot.date;
}

function isPast(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso) <= new Date();
}

function sessionsForRace(race: JolpicaRace): {
  type: SessionType;
  slot?: SessionSlot;
}[] {
  const isSprint = !!race.Sprint;
  if (isSprint) {
    return [
      { type: "fp1", slot: race.FirstPractice },
      { type: "sprint_quali", slot: race.SprintQualifying ?? race.SecondPractice },
      { type: "sprint", slot: race.Sprint },
      { type: "qualifying", slot: race.Qualifying },
      { type: "race", slot: { date: race.date, time: race.time } },
    ];
  }
  return [
    { type: "fp1", slot: race.FirstPractice },
    { type: "fp2", slot: race.SecondPractice },
    { type: "fp3", slot: race.ThirdPractice },
    { type: "qualifying", slot: race.Qualifying },
    { type: "race", slot: { date: race.date, time: race.time } },
  ];
}

function decorate(race: JolpicaRace) {
  const cc = countryCode(race.Circuit.Location.country);
  return {
    id: race.Circuit.circuitId,
    round: parseInt(race.round, 10),
    date: race.date,
    time: race.time,
    name: race.raceName,
    circuit: race.Circuit.circuitName,
    locality: race.Circuit.Location.locality,
    country: race.Circuit.Location.country,
    countryCode: cc,
    image: `https://flagcdn.com/w640/${cc}.png`,
    status: isPast(slotIso({ date: race.date, time: race.time }))
      ? ("completed" as const)
      : ("upcoming" as const),
  };
}

router.get("/gps", async (_req, res, next) => {
  try {
    const races = await fetchSeason();
    res.json(races.map(decorate));
  } catch (err) {
    next(err);
  }
});

router.get("/gps/:id", async (req, res, next) => {
  try {
    const races = await fetchSeason();
    const race = races.find((r) => r.Circuit.circuitId === req.params.id);
    if (!race) {
      res.json(null);
      return;
    }
    res.json({
      ...decorate(race),
      sessions: sessionsForRace(race).map((s) => {
        const iso = slotIso(s.slot);
        return {
          type: s.type,
          label: SESSION_LABELS[s.type],
          date: s.slot?.date,
          time: s.slot?.time,
          status: isPast(iso) ? "completed" : "upcoming",
          resultsAvailable: RESULTS_AVAILABLE[s.type],
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

function parseLap(s: string): number | null {
  const m = s.match(/^(?:(\d+):)?(\d+)\.(\d+)$/);
  if (!m) return null;
  const min = m[1] ? parseInt(m[1], 10) : 0;
  const sec = parseInt(m[2], 10);
  const ms = parseInt(m[3].padEnd(3, "0").slice(0, 3), 10);
  return min * 60 + sec + ms / 1000;
}

function bestQualiTime(r: JolpicaResultRow): string {
  return r.Q3 || r.Q2 || r.Q1 || "—";
}

function fmtSec(seconds: number): string {
  return `+${seconds.toFixed(3)}`;
}

function mapRaceResults(rows: JolpicaResultRow[]) {
  return rows.map((r) => {
    const pos = parseInt(r.position, 10);
    const status = r.status ?? "";
    const isClassified = !!r.Time;
    let time: string;
    let gap: string;
    if (pos === 1 && r.Time) {
      time = r.Time.time;
      gap = "—";
    } else if (isClassified && r.Time) {
      time = r.Time.time;
      gap = r.Time.time;
    } else {
      time = status || "—";
      gap = status || "—";
    }
    return {
      position: pos,
      driver: `${r.Driver.givenName} ${r.Driver.familyName}`,
      driverCode: r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(),
      team: r.Constructor.name,
      time,
      gap,
    };
  });
}

function mapQualiResults(rows: JolpicaResultRow[]) {
  const leaderTime = rows[0] ? parseLap(bestQualiTime(rows[0])) : null;
  return rows.map((r) => {
    const t = bestQualiTime(r);
    const tSec = parseLap(t);
    let gap = "—";
    if (parseInt(r.position, 10) > 1 && tSec != null && leaderTime != null) {
      gap = fmtSec(tSec - leaderTime);
    }
    return {
      position: parseInt(r.position, 10),
      driver: `${r.Driver.givenName} ${r.Driver.familyName}`,
      driverCode: r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(),
      team: r.Constructor.name,
      time: t,
      gap,
    };
  });
}

router.get("/gps/:id/sessions/:type", async (req, res, next) => {
  try {
    const type = req.params.type as SessionType;
    if (!(type in SESSION_LABELS)) {
      res.status(404).json(null);
      return;
    }
    const races = await fetchSeason();
    const race = races.find((r) => r.Circuit.circuitId === req.params.id);
    if (!race) {
      res.json(null);
      return;
    }
    const sessions = sessionsForRace(race);
    const session = sessions.find((s) => s.type === type);
    if (!session) {
      res.json(null);
      return;
    }
    const iso = slotIso(session.slot);
    const completed = isPast(iso);

    const base = {
      type,
      label: SESSION_LABELS[type],
      gpId: race.Circuit.circuitId,
      gpName: race.raceName,
      countryCode: countryCode(race.Circuit.Location.country),
      status: completed ? "completed" : "upcoming",
      resultsAvailable: RESULTS_AVAILABLE[type],
      date: session.slot?.date,
      time: session.slot?.time,
    };

    if (!completed || !RESULTS_AVAILABLE[type]) {
      res.json({ ...base, results: [] });
      return;
    }

    let results: ReturnType<typeof mapRaceResults | typeof mapQualiResults> = [];

    if (type === "fp1") {
      const fpRes = await fetchFPResults(race.FirstPractice?.date, 1);
      res.json({ ...base, results: fpRes });
      return;
    } else if (type === "fp2") {
      const fpRes = await fetchFPResults(race.SecondPractice?.date, 2);
      res.json({ ...base, results: fpRes });
      return;
    } else if (type === "fp3") {
      const fpRes = await fetchFPResults(race.ThirdPractice?.date, 3);
      res.json({ ...base, results: fpRes });
      return;
    } else if (type === "sprint_quali") {
      const sqDate = race.SprintQualifying?.date ?? race.SecondPractice?.date;
      const sqRes = await fetchSprintQualiResults(sqDate);
      res.json({ ...base, results: sqRes });
      return;
    }

    let rows: JolpicaResultRow[] = [];
    if (type === "race") rows = await fetchRaceResults(race.round);
    else if (type === "qualifying") rows = await fetchQualifyingResults(race.round);
    else if (type === "sprint") rows = await fetchSprintResults(race.round);

    results =
      type === "race" || type === "sprint"
        ? mapRaceResults(rows)
        : mapQualiResults(rows);

    res.json({ ...base, results });
  } catch (err) {
    next(err);
  }
});

router.get("/standings/drivers", async (_req, res, next) => {
  try {
    const { season, round, rows } = await fetchDriverStandings();
    const enriched = await Promise.all(
      rows.map(async (r) => {
        const photo = await driverPhoto(r.Driver.code, r.Driver.permanentNumber);
        return {
          position: parseInt(r.position, 10),
          driverId: r.Driver.driverId,
          driver: `${r.Driver.givenName} ${r.Driver.familyName}`,
          driverCode: r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(),
          driverNumber: r.Driver.permanentNumber
            ? parseInt(r.Driver.permanentNumber, 10)
            : null,
          team: r.Constructors[0]?.name ?? "—",
          points: parseFloat(r.points),
          wins: parseInt(r.wins, 10),
          photo,
        };
      }),
    );
    res.json({ season, round: parseInt(round, 10), standings: enriched });
  } catch (err) {
    next(err);
  }
});

router.get("/standings/constructors", async (_req, res, next) => {
  try {
    const { season, round, rows } = await fetchConstructorStandings();
    res.json({
      season,
      round: parseInt(round, 10),
      standings: rows.map((r) => ({
        position: parseInt(r.position, 10),
        constructorId: r.Constructor.constructorId,
        team: r.Constructor.name,
        points: parseFloat(r.points),
        wins: parseInt(r.wins, 10),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (_req, res, next) => {
  try {
    const [season, drivers, constructors] = await Promise.all([
      fetchSeason(),
      fetchDriverStandings(),
      fetchConstructorStandings(),
    ]);

    const now = new Date();
    const completedRaces = season.filter((r) =>
      isPast(slotIso({ date: r.date, time: r.time })),
    );
    const upcomingRaces = season.filter(
      (r) => !isPast(slotIso({ date: r.date, time: r.time })),
    );
    const next = upcomingRaces[0];

    const dRows = drivers.rows;
    const cRows = constructors.rows;
    const dLeader = dRows[0];
    const dSecond = dRows[1];
    const cLeader = cRows[0];
    const cSecond = cRows[1];

    const winnersSet = new Set<string>();
    for (const r of dRows) {
      const w = parseInt(r.wins, 10);
      if (w > 0) winnersSet.add(`${r.Driver.givenName} ${r.Driver.familyName}`);
    }

    res.json({
      season: drivers.season,
      currentRound: drivers.round ? parseInt(drivers.round, 10) : 0,
      totalRaces: season.length,
      racesCompleted: completedRaces.length,
      racesRemaining: upcomingRaces.length,
      driversLeader: dLeader
        ? {
            name: `${dLeader.Driver.givenName} ${dLeader.Driver.familyName}`,
            code: dLeader.Driver.code,
            points: parseFloat(dLeader.points),
            lead: dSecond
              ? parseFloat(dLeader.points) - parseFloat(dSecond.points)
              : 0,
          }
        : null,
      constructorsLeader: cLeader
        ? {
            team: cLeader.Constructor.name,
            points: parseFloat(cLeader.points),
            lead: cSecond
              ? parseFloat(cLeader.points) - parseFloat(cSecond.points)
              : 0,
          }
        : null,
      uniqueWinners: winnersSet.size,
      totalDrivers: dRows.length,
      totalTeams: cRows.length,
      totalPointsAwarded: dRows.reduce(
        (sum, r) => sum + parseFloat(r.points),
        0,
      ),
      nextGP: next
        ? {
            id: next.Circuit.circuitId,
            name: next.raceName,
            country: next.Circuit.Location.country,
            countryCode: countryCode(next.Circuit.Location.country),
            date: next.date,
            time: next.time,
            daysUntil: Math.max(
              0,
              Math.ceil(
                (new Date(
                  `${next.date}T${next.time ?? "00:00:00Z"}`,
                ).getTime() -
                  now.getTime()) /
                  (24 * 60 * 60 * 1000),
              ),
            ),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/podium/latest", async (_req, res, next) => {
  try {
    const races = await fetchSeason();
    const now = Date.now();

    type Candidate = {
      type: "race" | "sprint";
      race: JolpicaRace;
      ts: number;
    };
    const candidates: Candidate[] = [];
    for (const r of races) {
      if (r.Sprint) {
        const ts = new Date(slotIso(r.Sprint) ?? r.date).getTime();
        if (ts <= now) candidates.push({ type: "sprint", race: r, ts });
      }
      const raceTs = new Date(
        slotIso({ date: r.date, time: r.time }) ?? r.date,
      ).getTime();
      if (raceTs <= now) candidates.push({ type: "race", race: r, ts: raceTs });
    }

    if (candidates.length === 0) {
      res.json(null);
      return;
    }

    candidates.sort((a, b) => b.ts - a.ts);

    for (const candidate of candidates) {
      const round = candidate.race.round;
      const rows =
        candidate.type === "race"
          ? await fetchRaceResults(round)
          : await fetchSprintResults(round);

      if (rows.length < 3) continue;

      const top3 = rows.slice(0, 3);
      const podium = await Promise.all(
        top3.map(async (r) => {
          const photo = await driverPhoto(r.Driver.code, r.number);
          let time: string;
          let gap: string;
          if (parseInt(r.position, 10) === 1 && r.Time) {
            time = r.Time.time;
            gap = "—";
          } else if (r.Time) {
            time = r.Time.time;
            gap = r.Time.time;
          } else {
            time = r.status ?? "—";
            gap = r.status ?? "—";
          }
          return {
            position: parseInt(r.position, 10),
            driver: `${r.Driver.givenName} ${r.Driver.familyName}`,
            driverCode:
              r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(),
            driverNumber: r.number ? parseInt(r.number, 10) : null,
            team: r.Constructor.name,
            time,
            gap,
            photo,
          };
        }),
      );

      res.json({
        type: candidate.type,
        label: candidate.type === "race" ? "Course" : "Course Sprint",
        gpId: candidate.race.Circuit.circuitId,
        gpName: candidate.race.raceName,
        country: candidate.race.Circuit.Location.country,
        countryCode: countryCode(candidate.race.Circuit.Location.country),
        date: candidate.race.date,
        key: `${candidate.race.Circuit.circuitId}-${candidate.type}`,
        podium,
      });
      return;
    }

    res.json(null);
  } catch (err) {
    next(err);
  }
});

router.get("/upcoming-sessions", async (_req, res, next) => {
  try {
    const races = await fetchSeason();
    const now = Date.now();
    const out: Array<{
      gpId: string;
      gpName: string;
      country: string;
      type: SessionType;
      label: string;
      startIso: string;
    }> = [];

    for (const race of races) {
      for (const s of sessionsForRace(race)) {
        const iso = slotIso(s.slot);
        if (!iso || !s.slot?.time) continue;
        const ts = new Date(iso).getTime();
        if (ts > now && ts < now + 14 * 24 * 60 * 60 * 1000) {
          out.push({
            gpId: race.Circuit.circuitId,
            gpName: race.raceName,
            country: race.Circuit.Location.country,
            type: s.type,
            label: SESSION_LABELS[s.type],
            startIso: iso,
          });
        }
      }
    }

    res.json(out);
  } catch (err) {
    next(err);
  }
});

export { fetchRace };
export default router;
