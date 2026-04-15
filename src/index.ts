interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * F1 MCP — Formula 1 data via the Ergast API
 *
 * Tools:
 * - get_current_standings: Get the current season driver standings
 * - get_race_results: Get results for a specific race (season + round)
 * - get_schedule: Get the full race schedule for a season
 * - get_driver: Get profile information for a driver by ID
 */


const BASE_URL = 'https://ergast.com/api/f1';

// --- Raw API types ---

type RawDriverStanding = {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: {
    driverId: string;
    permanentNumber?: string;
    code?: string;
    givenName: string;
    familyName: string;
    dateOfBirth?: string;
    nationality?: string;
  };
  Constructors: Array<{
    constructorId: string;
    name: string;
    nationality?: string;
  }>;
};

type RawStandingsTable = {
  season: string;
  round: string;
  StandingsLists: Array<{
    season: string;
    round: string;
    DriverStandings: RawDriverStanding[];
  }>;
};

type RawRaceResult = {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: {
    driverId: string;
    code?: string;
    givenName: string;
    familyName: string;
    nationality?: string;
  };
  Constructor: {
    constructorId: string;
    name: string;
  };
  grid: string;
  laps: string;
  status: string;
  Time?: { millis?: string; time?: string };
  FastestLap?: { rank: string; lap: string; Time?: { time?: string } };
};

type RawRace = {
  season: string;
  round: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location?: { locality?: string; country?: string };
  };
  date: string;
  time?: string;
  Results?: RawRaceResult[];
};

type RawDriver = {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  url?: string;
  givenName: string;
  familyName: string;
  dateOfBirth?: string;
  nationality?: string;
};

type ErgastResponse<T> = {
  MRData: {
    xmlns: string;
    series: string;
    url: string;
    limit: string;
    offset: string;
    total: string;
  } & T;
};

// --- Formatters ---

function formatDriverStanding(s: RawDriverStanding) {
  return {
    position: Number(s.position),
    points: Number(s.points),
    wins: Number(s.wins),
    driver_id: s.Driver.driverId,
    number: s.Driver.permanentNumber ?? null,
    code: s.Driver.code ?? null,
    name: `${s.Driver.givenName} ${s.Driver.familyName}`,
    nationality: s.Driver.nationality ?? null,
    constructor: s.Constructors[0]?.name ?? null,
  };
}

function formatRaceResult(r: RawRaceResult) {
  return {
    position: Number(r.position),
    number: r.number,
    driver_id: r.Driver.driverId,
    code: r.Driver.code ?? null,
    name: `${r.Driver.givenName} ${r.Driver.familyName}`,
    constructor: r.Constructor.name,
    grid: Number(r.grid),
    laps: Number(r.laps),
    status: r.status,
    points: Number(r.points),
    time: r.Time?.time ?? null,
    fastest_lap_time: r.FastestLap?.Time?.time ?? null,
  };
}

function formatRace(race: RawRace) {
  return {
    season: race.season,
    round: Number(race.round),
    name: race.raceName,
    circuit_id: race.Circuit.circuitId,
    circuit_name: race.Circuit.circuitName,
    locality: race.Circuit.Location?.locality ?? null,
    country: race.Circuit.Location?.country ?? null,
    date: race.date,
    time: race.time ?? null,
  };
}

function formatDriver(d: RawDriver) {
  return {
    driver_id: d.driverId,
    number: d.permanentNumber ?? null,
    code: d.code ?? null,
    name: `${d.givenName} ${d.familyName}`,
    date_of_birth: d.dateOfBirth ?? null,
    nationality: d.nationality ?? null,
    url: d.url ?? null,
  };
}

// --- Tool definitions ---

const tools: McpToolExport['tools'] = [
  {
    name: 'get_current_standings',
    description:
      'Get the current Formula 1 season driver championship standings. Returns position, points, wins, driver name, and constructor.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_race_results',
    description:
      'Get finishing results for a specific F1 race by season year and round number. Returns position, driver, constructor, status, and points.',
    inputSchema: {
      type: 'object',
      properties: {
        season: { type: 'string', description: 'Season year (e.g., "2025")' },
        round: { type: 'string', description: 'Round number within the season (e.g., "1")' },
      },
      required: ['season', 'round'],
    },
  },
  {
    name: 'get_schedule',
    description:
      'Get the full race calendar/schedule for an F1 season. Returns round number, race name, circuit, location, and date for each round.',
    inputSchema: {
      type: 'object',
      properties: {
        season: { type: 'string', description: 'Season year (e.g., "2025")' },
      },
      required: ['season'],
    },
  },
  {
    name: 'get_driver',
    description:
      'Get profile information for an F1 driver by their Ergast driver ID. Returns name, number, nationality, and date of birth.',
    inputSchema: {
      type: 'object',
      properties: {
        driverId: {
          type: 'string',
          description: 'Ergast driver ID (e.g., "hamilton", "verstappen", "leclerc")',
        },
      },
      required: ['driverId'],
    },
  },
];

// --- callTool dispatcher ---

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_current_standings':
      return getCurrentStandings();
    case 'get_race_results':
      return getRaceResults(args.season as string, args.round as string);
    case 'get_schedule':
      return getSchedule(args.season as string);
    case 'get_driver':
      return getDriver(args.driverId as string);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// --- Tool implementations ---

async function getCurrentStandings() {
  const res = await fetch(`${BASE_URL}/current/driverStandings.json`);
  if (!res.ok) throw new Error(`Ergast API error: ${res.status}`);

  const data = (await res.json()) as ErgastResponse<{
    StandingsTable: RawStandingsTable;
  }>;

  const list = data.MRData.StandingsTable.StandingsLists[0];
  if (!list) return { season: null, round: null, standings: [] };

  return {
    season: list.season,
    round: Number(list.round),
    standings: list.DriverStandings.map(formatDriverStanding),
  };
}

async function getRaceResults(season: string, round: string) {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(season)}/${encodeURIComponent(round)}/results.json`);
  if (!res.ok) throw new Error(`Ergast API error: ${res.status}`);

  const data = (await res.json()) as ErgastResponse<{ RaceTable: { Races: RawRace[] } }>;
  const race = data.MRData.RaceTable.Races[0];
  if (!race) throw new Error(`No race found for season ${season} round ${round}`);

  return {
    season: race.season,
    round: Number(race.round),
    name: race.raceName,
    circuit: race.Circuit.circuitName,
    date: race.date,
    results: (race.Results ?? []).map(formatRaceResult),
  };
}

async function getSchedule(season: string) {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(season)}.json`);
  if (!res.ok) throw new Error(`Ergast API error: ${res.status}`);

  const data = (await res.json()) as ErgastResponse<{ RaceTable: { Races: RawRace[] } }>;
  const races = data.MRData.RaceTable.Races;

  return {
    season,
    total: races.length,
    schedule: races.map(formatRace),
  };
}

async function getDriver(driverId: string) {
  const res = await fetch(`${BASE_URL}/drivers/${encodeURIComponent(driverId)}.json`);
  if (!res.ok) throw new Error(`Ergast API error: ${res.status}`);

  const data = (await res.json()) as ErgastResponse<{
    DriverTable: { Drivers: RawDriver[] };
  }>;

  const driver = data.MRData.DriverTable.Drivers[0];
  if (!driver) throw new Error(`Driver not found: ${driverId}`);

  return formatDriver(driver);
}

export default { tools, callTool } satisfies McpToolExport;
