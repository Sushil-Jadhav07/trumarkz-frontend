import { useEffect, useState } from 'react';
import { industryTypesAPI } from '@/services/api';
import { FALLBACK_INDUSTRIES, parseIndustryTypes } from '@/utils/industryTypes';

// One request per entity type per page load; a failed or unsupported response is not cached, so
// the next screen tries again (the backend may simply not be deployed yet).
const cache = new Map();

export const clearIndustryTypesCache = () => cache.clear();

const fetchLive = (entityType) => {
  if (!cache.has(entityType)) {
    const request = industryTypesAPI.list(entityType)
      .then(({ data }) => parseIndustryTypes(data, entityType))
      .catch(() => null)
      .then((items) => {
        if (items === null) cache.delete(entityType);
        return items;
      });
    cache.set(entityType, request);
  }
  return cache.get(entityType);
};

// Resolves to { items, live }. `live` is false when the seeded fallback list is being used.
export const loadIndustryTypes = async (entityType) => {
  const items = await fetchLive(entityType);
  return items === null
    ? { items: FALLBACK_INDUSTRIES[entityType] || [], live: false }
    : { items, live: true };
};

export const useIndustryTypes = (entityType) => {
  const [state, setState] = useState({ items: FALLBACK_INDUSTRIES[entityType] || [], live: false, loading: true });

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true }));
    loadIndustryTypes(entityType).then((result) => {
      if (active) setState({ ...result, loading: false });
    });
    return () => { active = false; };
  }, [entityType]);

  return { ...state, names: state.items.map((item) => item.name) };
};
