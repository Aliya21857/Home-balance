import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
export const createReflection = (uid, p) => createItem(uid, 'reflections', p);
export const createNote = (uid, p) => createItem(uid, 'notes', p);
export const createResource = (uid, p) => createItem(uid, 'resources', p);
export const createGoal = (uid, p) => createItem(uid, 'goals', p);
