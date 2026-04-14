/**
 * Google Sheets Proxy (GAS 웹앱 + GViz 폴백)
 * - 5분 in-memory 캐시
 * - clearCache() 로 강제 리프레시
 */
import { GAS_WEB_APP_URL, SPREADSHEET_ID, CACHE_TTL_MS } from '../config.js';

const GVIZ_BASE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq`;
const _cache = new Map();

function isGASMode() {
  return GAS_WEB_APP_URL && GAS_WEB_APP_URL.length > 0;
}

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp >= CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  _cache.set(key, { data, timestamp: Date.now() });
}

async function fetchGAS(action, params = {}) {
  const key = `gas:${action}:${JSON.stringify(params)}`;
  const hit = getCached(key);
  if (hit) return hit;

  const url = new URL(GAS_WEB_APP_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  });

  const response = await fetch(url.toString());
  const data = await response.json();
  if (data.error) throw new Error(data.error);

  setCached(key, data);
  return data;
}

async function fetchGViz(sheetName, query = '') {
  const key = `gviz:${sheetName}:${query}`;
  const hit = getCached(key);
  if (hit) return hit;

  let url = `${GVIZ_BASE_URL}?sheet=${encodeURIComponent(sheetName)}`;
  if (query) url += `&tq=${encodeURIComponent(query)}`;

  const response = await fetch(url);
  const text = await response.text();
  const data = parseGViz(text);
  setCached(key, data);
  return data;
}

function parseGViz(responseText) {
  const jsonStr = responseText
    .replace(/^.*google\.visualization\.Query\.setResponse\(/, '')
    .replace(/\);?\s*$/, '');
  const json = JSON.parse(jsonStr);
  const headers = json.table.cols.map(col => col.label || col.id);
  const rows = json.table.rows.map(row => {
    const obj = {};
    row.c.forEach((cell, i) => {
      obj[headers[i]] = cell ? (cell.v !== null ? cell.v : '') : '';
    });
    return obj;
  });
  return { headers, rows };
}

export async function getPostMetrics(params = {}) {
  if (isGASMode()) {
    const result = await fetchGAS('postMetrics', params);
    return { headers: result.columns, rows: result.rows };
  }
  return fetchGViz('POST_METRICS');
}

export async function getStatsDaily(params = {}) {
  if (isGASMode()) {
    const result = await fetchGAS('statsDaily', params);
    return {
      headers: result.headers,
      rows: result.rows,
      categories: result.categories,
    };
  }
  return fetchGViz('STATS_DAILY');
}

export function clearCache() {
  _cache.clear();
}

export function getMode() {
  return isGASMode() ? 'GAS Proxy' : 'GViz Direct';
}
