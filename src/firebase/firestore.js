import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

const path = (uid, name) => collection(db, 'users', uid, name);
export function watchCollection(uid, name, callback, onError) {
  return onSnapshot(path(uid, name), snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onError);
}
export async function createItem(uid, name, payload) {
  const ref = doc(path(uid, name));
  await setDoc(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
const reflectionFields = ['thoughts', 'sourceText', 'wins', 'gratitude', 'improvement'];
const cleanText = value => typeof value === 'string' ? value.trim() : '';
export async function saveReflection(uid, payload, { id = null, batch = null } = {}) {
  const normalized = {
    title: cleanText(payload.title), date: cleanText(payload.date), mood: cleanText(payload.mood),
    wins: cleanText(payload.wins), gratitude: cleanText(payload.gratitude), thoughts: cleanText(payload.thoughts),
    improvement: cleanText(payload.improvement), sourceText: cleanText(payload.sourceText),
    ...(payload.sourceLanguage ? { sourceLanguage: payload.sourceLanguage } : {}),
    ...(typeof payload.aiConfidence === 'number' ? { aiConfidence: payload.aiConfidence } : {}),
  };
  if (!reflectionFields.some(field => normalized[field])) throw new Error('Добавьте текст размышления перед сохранением.');
  if (!normalized.thoughts) normalized.thoughts = normalized.sourceText || normalized.wins || normalized.gratitude || normalized.improvement;
  if (!normalized.sourceText) normalized.sourceText = normalized.thoughts;
  if (!normalized.title) normalized.title = normalized.thoughts.slice(0, 120);
  const ref = id ? doc(db, 'users', uid, 'reflections', id) : doc(path(uid, 'reflections'));
  if (batch) { batch.set(ref, { ...normalized, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); return ref.id; }
  if (id) await updateDoc(ref, { ...normalized, updatedAt: serverTimestamp() });
  else await setDoc(ref, { ...normalized, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function createAssistantItems(uid, entries) {
  const batch = writeBatch(db);
  const ids = await Promise.all(entries.map(({ collection: name, payload }) => {
    if (name === 'reflections') return saveReflection(uid, payload, { batch });
    const ref = doc(path(uid, name));
    batch.set(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return ref.id;
  }));
  await batch.commit();
  return ids;
}
export const updateItem = (uid, name, id, payload) => updateDoc(doc(db, 'users', uid, name, id), { ...payload, updatedAt: serverTimestamp() });
export const deleteItem = (uid, name, id) => deleteDoc(doc(db, 'users', uid, name, id));
export const setProfile = (uid, payload) => setDoc(doc(db, 'users', uid, 'profile', 'main'), { ...payload, updatedAt: serverTimestamp() }, { merge: true });
export function watchProfile(uid, callback, onError) {
  return onSnapshot(doc(db, 'users', uid, 'profile', 'main'), snap => callback(snap.exists() ? snap.data() : null), onError);
}
export async function ensureOwnerProfile(uid) {
  const ref = doc(db, 'users', uid, 'profile', 'main');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: 'Алия',
      avatarUrl: '',
      quote: 'Баланс — это не про идеальность, а про честный выбор каждый день.',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
export const toggleHabitForDate = (uid, habitId, date, completed) => setDoc(doc(db, 'users', uid, 'habitLogs', `${habitId}_${date}`), { habitId, date, completed, createdAt: serverTimestamp() }, { merge: true });
export const createTask = (uid, p) => createItem(uid, 'tasks', p);
export const updateTask = (uid, id, p) => updateItem(uid, 'tasks', id, p);
export const deleteTask = (uid, id) => deleteItem(uid, 'tasks', id);
export const createProject = (uid, p) => createItem(uid, 'projects', p);
export const updateProject = (uid, id, p) => updateItem(uid, 'projects', id, p);
export const deleteProject = (uid, id) => deleteItem(uid, 'projects', id);
export const createIdea = (uid, p) => createItem(uid, 'ideas', p);
export const createReflection = (uid, p) => saveReflection(uid, p);
export const createNote = (uid, p) => createItem(uid, 'notes', p);
export const createResource = (uid, p) => createItem(uid, 'resources', p);
export const createGoal = (uid, p) => createItem(uid, 'goals', p);
