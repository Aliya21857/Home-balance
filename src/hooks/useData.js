import { useEffect, useState } from 'react';
import { watchCollection, watchProfile } from '../firebase/firestore';

const names = ['tasks','projects','habits','habitLogs','ideas','reflections','notes','resources','goals','events'];
export function useData(uid) {
  const [data, setData] = useState({ ...Object.fromEntries(names.map(n => [n, []])), profile: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!uid) return;
    let pending = names.length + 1;
    const stops = names.map(name => watchCollection(uid, name, items => {
      setData(v => ({ ...v, [name]: items }));
      pending -= 1; if (pending <= 0) setLoading(false);
    }, e => { setError(e.message); setLoading(false); }));
    stops.push(watchProfile(uid, profile => {
      setData(v => ({ ...v, profile }));
      pending -= 1; if (pending <= 0) setLoading(false);
    }, e => { setError(e.message); setLoading(false); }));
    return () => stops.forEach(stop => stop());
  }, [uid]);
  return { data, loading, error };
}
